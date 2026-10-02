import { useState, type FormEvent } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDefaultType, deleteType, getDefaultTypes, getGlassware, getPalettes, updateType } from '../../api/admin';
import { apiErrorMessage, apiStatus } from '../../api/errors';
import { keys } from '../../api/queries';
import { CatalogCard } from '../../components/CatalogCard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DesignSelect } from '../../components/DesignSelect';
import { DrinkPreview } from '../../components/DrinkPreview';
import { EditorDialog } from '../../components/EditorDialog';
import { PageState } from '../../components/PageState';
import type { AlcoholType, NewAlcoholType } from '../../types/api';

export const AlcoholTypesPage = () => {
  const queryClient = useQueryClient();
  const types = useQuery({ queryKey: keys.types, queryFn: getDefaultTypes });
  const palettes = useQuery({ queryKey: keys.palettes, queryFn: getPalettes });
  const glassware = useQuery({ queryKey: keys.glassware, queryFn: getGlassware });
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<AlcoholType | null | undefined>();
  const [deleting, setDeleting] = useState<AlcoholType | null>(null);

  const invalidateType = async (includeChildren = false) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.types }),
      queryClient.invalidateQueries({ queryKey: keys.recommendations }),
      ...(includeChildren ? [queryClient.invalidateQueries({ queryKey: ['default', 'subtypes'] })] : []),
    ]);
  };
  const saveMutation = useMutation({
    mutationFn: ({ id, input }: { id?: number; input: NewAlcoholType | Partial<Pick<AlcoholType, 'name' | 'colorPaletteId' | 'glasswareId'>> }) =>
      id ? updateType(id, input) : createDefaultType(input as NewAlcoholType),
    onSuccess: async (saved, variables) => {
      await invalidateType();
      if (variables.id === undefined) await queryClient.invalidateQueries({ queryKey: keys.subtypes(saved.id) });
      setEditor(undefined);
    },
    onError: async (error) => { if (apiStatus(error) === 404) await invalidateType(); },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteType,
    onSuccess: async () => { await invalidateType(true); setDeleting(null); },
    onError: async (error) => { if (apiStatus(error) === 404) await invalidateType(true); },
  });

  const rows = (types.data ?? []).filter((row) => row.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const paletteById = new Map((palettes.data ?? []).map((palette) => [palette.id, palette]));
  const glassById = new Map((glassware.data ?? []).map((item) => [item.id, item]));

  const submit = async (event: FormEvent<HTMLFormElement>, values: TypeFormValues) => {
    event.preventDefault();
    const childNames = values.alcoholSubtypes?.map((name) => name.trim()).filter(Boolean) ?? [];
    const input = editor
      ? { name: values.name, ...(values.colorPaletteId !== undefined && values.colorPaletteId !== editor.colorPaletteId ? { colorPaletteId: values.colorPaletteId } : {}), ...(values.glasswareId !== undefined && values.glasswareId !== editor.glasswareId ? { glasswareId: values.glasswareId } : {}) }
      : { name: values.name, colorPaletteId: values.colorPaletteId as number, glasswareId: values.glasswareId as number, ...(childNames.length ? { alcoholSubtypes: childNames } : {}) };
    try { await saveMutation.mutateAsync({ id: editor?.id, input }); } catch { /* the dialog keeps the draft and shows the mutation error */ }
  };

  return (
    <section>
      <div className="page-heading-row">
        <Typography variant="h1" className="page-title">Alcohol types</Typography>
        <Button variant="contained" disabled={!palettes.data?.length || !glassware.data?.length} onClick={() => { saveMutation.reset(); setEditor(null); }}>New alcohol type</Button>
      </div>
      <TextField fullWidth label="Search alcohol types" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 3 }} />
      <PageState loading={types.isPending || palettes.isPending || glassware.isPending} error={types.error ? apiErrorMessage(types.error, 'load') : undefined} onRetry={() => void types.refetch()} empty={types.isSuccess && rows.length === 0} filteredEmpty={search.trim().length > 0} emptyAction={<Button variant="outlined" disabled={!palettes.data?.length || !glassware.data?.length} onClick={() => setEditor(null)}>Add alcohol type</Button>}>
        <div className="catalog-grid">
          {rows.map((type) => {
            const palette = type.colorPaletteId === null ? undefined : paletteById.get(type.colorPaletteId);
            const glass = type.glasswareId === null ? undefined : glassById.get(type.glasswareId);
            return <CatalogCard key={type.id} name={type.name} childHref={`/alcohol-types/${type.id}/subtypes`} childLabel={`View subtypes for ${type.name}`} onEdit={() => { saveMutation.reset(); setEditor(type); }} onDelete={() => { deleteMutation.reset(); setDeleting(type); }} preview={<DrinkPreview label={type.name} glassware={glass} palette={palette} />} details={<Typography className="catalog-detail">Palette: {palette?.name ?? 'Not assigned'} · Glassware: {glass?.name ?? 'Not assigned'}</Typography>} />;
          })}
        </div>
      </PageState>

      {palettes.isError && <Alert severity="error" role="alert" action={<Button color="inherit" onClick={() => void palettes.refetch()}>Retry</Button>}>{apiErrorMessage(palettes.error, 'load')}</Alert>}
      {glassware.isError && <Alert severity="error" role="alert" action={<Button color="inherit" onClick={() => void glassware.refetch()}>Retry</Button>}>{apiErrorMessage(glassware.error, 'load')}</Alert>}
      {((palettes.isSuccess && !palettes.data.length) || (glassware.isSuccess && !glassware.data.length)) && <Alert severity="info">Create a palette and glassware entry before adding an alcohol type.</Alert>}
      {editor !== undefined && <TypeEditor open initial={editor ?? undefined} palettes={palettes.data ?? []} glassware={glassware.data ?? []} pending={saveMutation.isPending} error={saveMutation.error ? apiErrorMessage(saveMutation.error) : undefined} onClose={() => { if (!saveMutation.isPending) setEditor(undefined); }} onSubmit={(event, values) => void submit(event, values)} />}
      <ConfirmDialog open={Boolean(deleting)} title={`Delete ${deleting?.name ?? 'type'}?`} description="This entry can only be deleted if no other records refer to it." pending={deleteMutation.isPending} error={deleteMutation.error ? apiErrorMessage(deleteMutation.error, 'delete') : undefined} onClose={() => { if (!deleteMutation.isPending) setDeleting(null); }} onConfirm={() => deleting && void deleteMutation.mutateAsync(deleting.id).catch(() => undefined)} />
    </section>
  );
};

interface TypeEditorProps {
  open: boolean;
  initial?: AlcoholType;
  palettes: { id: number; name: string }[];
  glassware: { id: number; name: string }[];
  pending: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, values: TypeFormValues) => void;
}

interface TypeFormValues { name: string; colorPaletteId?: number; glasswareId?: number; alcoholSubtypes?: string[] }

const TypeEditor = ({ open, initial, palettes, glassware, pending, error, onClose, onSubmit }: TypeEditorProps) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [paletteId, setPaletteId] = useState<number | ''>(initial?.colorPaletteId ?? '');
  const [glasswareId, setGlasswareId] = useState<number | ''>(initial?.glasswareId ?? '');
  const [subtypes, setSubtypes] = useState<string[]>([]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (!initial && (paletteId === '' || glasswareId === '')) return;
    onSubmit(event, { name: name.trim(), ...(paletteId === '' ? {} : { colorPaletteId: paletteId }), ...(glasswareId === '' ? {} : { glasswareId }), ...(initial ? {} : { alcoholSubtypes: subtypes }) });
  };
  return <EditorDialog key={initial?.id ?? 'new-type'} open={open} title={initial ? 'Edit alcohol type' : 'Create alcohol type'} submitLabel={initial ? 'Save type' : 'Create type'} pending={pending} error={error} onClose={onClose} onSubmit={submit}>
    <Stack spacing={2} sx={{ pt: 1 }}>
      <TextField required label="Name" value={name} onChange={(event) => setName(event.target.value)} slotProps={{ htmlInput: { maxLength: 100, pattern: '.*\\S.*' } }} />
      <DesignSelect label="Palette" value={paletteId} rows={palettes} required={!initial} onChange={setPaletteId} />
      <DesignSelect label="Glassware" value={glasswareId} rows={glassware} required={!initial} onChange={setGlasswareId} />
      {!initial && <div className="initial-children">
        <Typography variant="subtitle1">Initial subtypes (optional)</Typography>
        {subtypes.map((value, index) => <div className="repeatable-field" key={index}>
          <TextField label={`Initial subtype ${index + 1}`} value={value} onChange={(event) => setSubtypes((current) => current.map((item, i) => i === index ? event.target.value : item))} />
          <Button aria-label={`Remove initial subtype ${index + 1}`} onClick={() => setSubtypes((current) => current.filter((_, i) => i !== index))}>Remove</Button>
        </div>)}
        <Button disabled={subtypes.length >= 50} onClick={() => setSubtypes((current) => [...current, ''])}>Add initial subtype</Button>
      </div>}
    </Stack>
  </EditorDialog>;
};

export default AlcoholTypesPage;
