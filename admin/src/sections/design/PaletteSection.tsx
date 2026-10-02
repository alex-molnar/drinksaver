import { useState, type FormEvent } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPalette, deletePalette, getGlassware, getPalettes, updatePalette } from '../../api/admin';
import { apiErrorMessage, apiStatus } from '../../api/errors';
import { keys } from '../../api/queries';
import { CatalogCard } from '../../components/CatalogCard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DesignSelect } from '../../components/DesignSelect';
import { DrinkPreview } from '../../components/DrinkPreview';
import { EditorDialog } from '../../components/EditorDialog';
import { PageState } from '../../components/PageState';
import { darkTokens, lightTokens } from '../../theme/tokens';
import type { ColorPalette, NewColorPalette, UpdateColorPalette } from '../../types/api';

type PaletteValues = { name: string; field: string; inkLight: string; inkDark: string };
type PaletteSave = { id: number; input: UpdateColorPalette } | { id?: undefined; input: NewColorPalette };

const invalidateDesign = (client: ReturnType<typeof useQueryClient>) => Promise.all([
  client.invalidateQueries({ queryKey: ['design'] }),
  client.invalidateQueries({ queryKey: ['default'] }),
]);

const validHex = (value: string) => /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value);
const colorControlValue = (value: string) => validHex(value)
  ? value.length === 4 ? `#${[...value.slice(1)].map((digit) => digit + digit).join('')}` : value
  : darkTokens.accent.active;

export const PaletteSection = () => {
  const client = useQueryClient();
  const palettes = useQuery({ queryKey: keys.palettes, queryFn: getPalettes });
  const glassware = useQuery({ queryKey: keys.glassware, queryFn: getGlassware });
  const [editor, setEditor] = useState<ColorPalette | null | undefined>();
  const [deleting, setDeleting] = useState<ColorPalette | null>(null);
  const save = useMutation({
    mutationFn: ({ id, input }: PaletteSave) => id === undefined ? createPalette(input as NewColorPalette) : updatePalette(id, input as UpdateColorPalette),
    onSuccess: async () => { await invalidateDesign(client); setEditor(undefined); },
    onError: async (error) => { if (apiStatus(error) === 404) await invalidateDesign(client); },
  });
  const remove = useMutation({
    mutationFn: deletePalette,
    onSuccess: async () => { await invalidateDesign(client); setDeleting(null); },
    onError: async (error) => { if (apiStatus(error) === 404) await invalidateDesign(client); },
  });
  const submit = async (values: PaletteValues) => {
    const input: NewColorPalette | UpdateColorPalette = editor
      ? {
          ...(values.name !== editor.name ? { name: values.name } : {}),
          ...(values.field !== editor.field ? { field: values.field } : {}),
          ...(values.inkLight !== (editor.inkLight ?? '') ? { inkLight: values.inkLight } : {}),
          ...(values.inkDark !== (editor.inkDark ?? '') ? { inkDark: values.inkDark } : {}),
        }
      : { name: values.name, field: values.field, ...(values.inkLight ? { inkLight: values.inkLight } : {}), ...(values.inkDark ? { inkDark: values.inkDark } : {}) };
    if (editor && Object.keys(input).length === 0) { setEditor(undefined); return; }
    try { await save.mutateAsync({ id: editor?.id, input } as PaletteSave); } catch { /* keep the form draft for correction or retry */ }
  };

  return <section aria-labelledby="palettes-heading">
    <div className="page-heading-row">
      <Typography id="palettes-heading" variant="h2" className="section-title">Palettes</Typography>
      <Button variant="contained" onClick={() => { save.reset(); setEditor(null); }}>New palette</Button>
    </div>
    <PageState loading={palettes.isPending} error={palettes.isError ? apiErrorMessage(palettes.error, 'load') : undefined} onRetry={() => void palettes.refetch()} empty={palettes.isSuccess && palettes.data.length === 0} emptyAction={<Button variant="outlined" onClick={() => setEditor(null)}>Add palette</Button>}>
      <div className="catalog-grid">{(palettes.data ?? []).map((palette) => <CatalogCard key={palette.id} name={palette.name} preview={<div className="palette-swatches" aria-hidden="true">
        <span aria-hidden="true" style={{ backgroundColor: palette.field }} />
        <span aria-hidden="true" style={{ backgroundColor: palette.inkLight ?? 'transparent' }} />
        <span aria-hidden="true" style={{ backgroundColor: palette.inkDark ?? 'transparent' }} />
      </div>} details={<Typography className="catalog-detail">Field: {palette.field} · Light ink: {palette.inkLight ?? 'Not assigned'} · Dark ink: {palette.inkDark ?? 'Not assigned'}</Typography>} onEdit={() => { save.reset(); setEditor(palette); }} onDelete={() => { remove.reset(); setDeleting(palette); }} />)}</div>
    </PageState>
    {glassware.isError && <Alert severity="error" role="alert" action={<Button color="inherit" onClick={() => void glassware.refetch()}>Retry</Button>}>Preview glassware could not be loaded.</Alert>}
    {editor !== undefined && <PaletteEditor key={editor?.id ?? 'new-palette'} initial={editor ?? undefined} glassware={glassware.data ?? []} pending={save.isPending} error={save.error ? apiErrorMessage(save.error) : undefined} onClose={() => { if (!save.isPending) setEditor(undefined); }} onSubmit={(values) => void submit(values)} />}
    <ConfirmDialog open={Boolean(deleting)} title={`Delete ${deleting?.name ?? 'palette'}?`} description="This entry can only be deleted if no other records refer to it." pending={remove.isPending} error={remove.error ? apiErrorMessage(remove.error, 'delete') : undefined} onClose={() => { if (!remove.isPending) setDeleting(null); }} onConfirm={() => deleting && void remove.mutateAsync(deleting.id).catch(() => undefined)} />
  </section>;
};

const PaletteEditor = ({ initial, glassware, pending, error, onClose, onSubmit }: { initial?: ColorPalette; glassware: { id: number; name: string; g: string; l: string; f: string | null }[]; pending: boolean; error?: string; onClose: () => void; onSubmit: (values: PaletteValues) => void }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [field, setField] = useState(initial?.field ?? '');
  const [inkLight, setInkLight] = useState(initial?.inkLight ?? '');
  const [inkDark, setInkDark] = useState(initial?.inkDark ?? '');
  const [previewGlasswareId, setPreviewGlasswareId] = useState<number | ''>(glassware[0]?.id ?? '');
  const [validationError, setValidationError] = useState('');
  const previewPalette = { id: initial?.id ?? -1, name: name || 'Palette sample', field, inkLight: inkLight || null, inkDark: inkDark || null };
  const activePreviewGlasswareId = previewGlasswareId || glassware[0]?.id || '';
  const previewGlass = glassware.find((item) => item.id === activePreviewGlasswareId);
  const update = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = !name.trim() || !validHex(field) || (inkLight !== '' && !validHex(inkLight)) || (inkDark !== '' && !validHex(inkDark));
    if (invalid) { setValidationError('Enter a name and valid three- or six-digit hex colours.'); return; }
    setValidationError('');
    onSubmit({ name: name.trim(), field, inkLight, inkDark });
  };
  return <EditorDialog open title={initial ? `Edit ${initial.name}` : 'Create palette'} submitLabel={initial ? 'Save palette' : 'Create palette'} pending={pending} error={error} noValidate onClose={onClose} onSubmit={update}>
    <Stack spacing={2} sx={{ pt: 1 }}>
      <TextField required label="Name" value={name} onChange={(event) => setName(event.target.value)} />
      <ColourField label="Field colour" value={field} onChange={setField} required helperText={field && !validHex(field) ? 'Use a three- or six-digit hex value.' : undefined} />
      <ColourField label="Light ink" value={inkLight} onChange={setInkLight} optional onClear={() => setInkLight('')} helperText={inkLight && !validHex(inkLight) ? 'Use a three- or six-digit hex value or clear this value.' : undefined} />
      <ColourField label="Dark ink" value={inkDark} onChange={setInkDark} optional onClear={() => setInkDark('')} helperText={inkDark && !validHex(inkDark) ? 'Use a three- or six-digit hex value or clear this value.' : undefined} />
      {glassware.length > 0 && <DesignSelect label="Preview glassware" value={activePreviewGlasswareId} rows={glassware} required={false} onChange={setPreviewGlasswareId} />}
      <div className="palette-preview-pair">
        <PaletteThemePreview mode="light" palette={previewPalette} glassware={previewGlass} />
        <PaletteThemePreview mode="dark" palette={previewPalette} glassware={previewGlass} />
      </div>
      {glassware.length === 0 && <Typography variant="body2">Add glassware to preview this palette on a drink shape.</Typography>}
      {validationError && <Alert severity="error" role="alert">{validationError}</Alert>}
      {initial && <Typography variant="body2">Leave ink unchanged to keep its current value; Clear sends an empty value.</Typography>}
    </Stack>
  </EditorDialog>;
};

const PaletteThemePreview = ({ mode, palette, glassware }: { mode: 'light' | 'dark'; palette: ColorPalette; glassware?: { id: number; name: string; g: string; l: string; f: string | null } }) => {
  const ink = mode === 'light' ? palette.inkLight ?? palette.inkDark ?? lightTokens.ink.primary : palette.inkDark ?? darkTokens.ink.primary;
  const themedPalette = { ...palette, inkDark: ink };
  const surface = mode === 'light' ? lightTokens.surface.panel : darkTokens.surface.panel;
  return <div className={`palette-mode-sample palette-mode-${mode}`} role="group" aria-label={`${mode === 'light' ? 'Light' : 'Dark'} theme preview`} data-testid={`palette-preview-${mode}`} style={{ backgroundColor: surface, color: ink }}>
    <Typography variant="subtitle2">{mode === 'light' ? 'Light theme' : 'Dark theme'}</Typography>
    <DrinkPreview label={palette.name} glassware={glassware ? { ...glassware, f: null } : undefined} palette={themedPalette} />
  </div>;
};

const ColourField = ({ label, value, onChange, required, optional, onClear, helperText }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; optional?: boolean; onClear?: () => void; helperText?: string }) => {
  const id = `colour-${label.toLowerCase().replaceAll(' ', '-')}`;
  return <div className="colour-field">
    <TextField id={id} required={required} error={Boolean(helperText)} helperText={helperText} label={label} value={value} onChange={(event) => onChange(event.target.value)} slotProps={{ htmlInput: { spellCheck: false } }} />
    <label className="colour-picker-label" htmlFor={`${id}-picker`}>Choose {label.toLowerCase()}</label>
    <input id={`${id}-picker`} aria-label={`Choose ${label.toLowerCase()}`} className="colour-picker" type="color" value={colorControlValue(value)} onChange={(event) => onChange(event.target.value)} />
    {optional && <Button type="button" onClick={onClear}>Clear {label.toLowerCase()}</Button>}
  </div>;
};

export default PaletteSection;
