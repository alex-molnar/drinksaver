import { useState, type FormEvent } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createGlassware, deleteGlassware, getGlassware, getPalettes, updateGlassware } from '../../api/admin';
import { apiErrorMessage, apiStatus } from '../../api/errors';
import { keys } from '../../api/queries';
import { CatalogCard } from '../../components/CatalogCard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DesignSelect } from '../../components/DesignSelect';
import { DrinkPreview } from '../../components/DrinkPreview';
import { EditorDialog } from '../../components/EditorDialog';
import { PageState } from '../../components/PageState';
import type { Glassware, NewGlassware, UpdateGlassware } from '../../types/api';

type GlassValues = { name: string; g: string; l: string; f: string; previewPaletteId: number | '' };
type GlassSave = { id: number; input: UpdateGlassware } | { id?: undefined; input: NewGlassware };

const invalidateDesign = (client: ReturnType<typeof useQueryClient>) => Promise.all([
  client.invalidateQueries({ queryKey: ['design'] }),
  client.invalidateQueries({ queryKey: ['default'] }),
]);

export const GlasswareSection = () => {
  const client = useQueryClient();
  const glassware = useQuery({ queryKey: keys.glassware, queryFn: getGlassware });
  const palettes = useQuery({ queryKey: keys.palettes, queryFn: getPalettes });
  const [editor, setEditor] = useState<Glassware | null | undefined>();
  const [deleting, setDeleting] = useState<Glassware | null>(null);
  const save = useMutation({
    mutationFn: ({ id, input }: GlassSave) => id === undefined ? createGlassware(input as NewGlassware) : updateGlassware(id, input as UpdateGlassware),
    onSuccess: async () => { await invalidateDesign(client); setEditor(undefined); },
    onError: async (error) => { if (apiStatus(error) === 404) await invalidateDesign(client); },
  });
  const remove = useMutation({
    mutationFn: deleteGlassware,
    onSuccess: async () => { await invalidateDesign(client); setDeleting(null); },
    onError: async (error) => { if (apiStatus(error) === 404) await invalidateDesign(client); },
  });
  const submit = async (values: GlassValues) => {
    const input: NewGlassware | UpdateGlassware = editor
      ? {
          ...(values.name !== editor.name ? { name: values.name } : {}),
          ...(values.g !== editor.g ? { g: values.g } : {}),
          ...(values.l !== editor.l ? { l: values.l } : {}),
          ...(values.f !== (editor.f ?? '') ? { f: values.f } : {}),
        }
      : { name: values.name, g: values.g, l: values.l, ...(values.f ? { f: values.f } : {}) };
    if (editor && Object.keys(input).length === 0) { setEditor(undefined); return; }
    try { await save.mutateAsync({ id: editor?.id, input } as GlassSave); } catch { /* keep the form draft for correction or retry */ }
  };
  return <section aria-labelledby="glassware-heading">
    <div className="page-heading-row">
      <Typography id="glassware-heading" variant="h2" className="section-title">Glassware</Typography>
      <Button variant="contained" onClick={() => { save.reset(); setEditor(null); }}>New glassware</Button>
    </div>
    <PageState loading={glassware.isPending} error={glassware.isError ? apiErrorMessage(glassware.error, 'load') : undefined} onRetry={() => void glassware.refetch()} empty={glassware.isSuccess && glassware.data.length === 0} emptyAction={<Button variant="outlined" onClick={() => setEditor(null)}>Add glassware</Button>}>
      <div className="catalog-grid">{(glassware.data ?? []).map((item) => <CatalogCard key={item.id} name={item.name} preview={<DrinkPreview label={item.name} glassware={item} />} details={<Typography className="catalog-detail">Outline and liquid paths{item.f ? ' · foam path' : ''}</Typography>} onEdit={() => { save.reset(); setEditor(item); }} onDelete={() => { remove.reset(); setDeleting(item); }} />)}</div>
    </PageState>
    {palettes.isError && <Alert severity="error" role="alert" action={<Button color="inherit" onClick={() => void palettes.refetch()}>Retry</Button>}>Preview palettes could not be loaded.</Alert>}
    {editor !== undefined && <GlasswareEditor key={editor?.id ?? 'new-glassware'} initial={editor ?? undefined} palettes={palettes.data ?? []} pending={save.isPending} error={save.error ? apiErrorMessage(save.error) : undefined} onClose={() => { if (!save.isPending) setEditor(undefined); }} onSubmit={(values) => void submit(values)} />}
    <ConfirmDialog open={Boolean(deleting)} title={`Delete ${deleting?.name ?? 'glassware'}?`} description="This entry can only be deleted if no other records refer to it." pending={remove.isPending} error={remove.error ? apiErrorMessage(remove.error, 'delete') : undefined} onClose={() => { if (!remove.isPending) setDeleting(null); }} onConfirm={() => deleting && void remove.mutateAsync(deleting.id).catch(() => undefined)} />
  </section>;
};

const GlasswareEditor = ({ initial, palettes, pending, error, onClose, onSubmit }: { initial?: Glassware; palettes: { id: number; name: string; field: string; inkLight: string | null; inkDark: string | null }[]; pending: boolean; error?: string; onClose: () => void; onSubmit: (values: GlassValues) => void }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [g, setG] = useState(initial?.g ?? '');
  const [l, setL] = useState(initial?.l ?? '');
  const [f, setF] = useState(initial?.f ?? '');
  const [previewPaletteId, setPreviewPaletteId] = useState<number | ''>(palettes[0]?.id ?? '');
  const [validationError, setValidationError] = useState('');
  const glassware: Glassware = { id: initial?.id ?? -1, name, g, l, f: f || null };
  const palette = palettes.find((row) => row.id === previewPaletteId);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !g.trim() || !l.trim()) { setValidationError('Enter a name, outline path and liquid path.'); return; }
    setValidationError('');
    onSubmit({ name: name.trim(), g, l, f, previewPaletteId });
  };
  return <EditorDialog open title={initial ? `Edit ${initial.name}` : 'Create glassware'} submitLabel={initial ? 'Save glassware' : 'Create glassware'} pending={pending} error={error} noValidate onClose={onClose} onSubmit={submit}>
    <Stack spacing={2} sx={{ pt: 1 }}>
      <TextField required label="Name" value={name} onChange={(event) => setName(event.target.value)} />
      <TextField required multiline minRows={2} label="Outline path" value={g} onChange={(event) => setG(event.target.value)} />
      <TextField required multiline minRows={2} label="Liquid path" value={l} onChange={(event) => setL(event.target.value)} />
      <TextField multiline minRows={2} label="Foam path" value={f} onChange={(event) => setF(event.target.value)} />
      {initial?.f && <Button type="button" onClick={() => setF('')}>Clear foam path</Button>}
      {palettes.length > 0 && <DesignSelect label="Preview palette" value={previewPaletteId} rows={palettes} required={false} onChange={setPreviewPaletteId} />}
      <div className="glassware-draft-preview" data-testid="glassware-preview"><Typography variant="subtitle2">Draft preview</Typography><DrinkPreview label={name || 'Glassware'} glassware={glassware} palette={palette} /></div>
      {validationError && <Alert severity="error" role="alert">{validationError}</Alert>}
      <Typography variant="body2">Preview palette is not saved with the glassware. SVG path values are stored as entered.</Typography>
    </Stack>
  </EditorDialog>;
};

export default GlasswareSection;
