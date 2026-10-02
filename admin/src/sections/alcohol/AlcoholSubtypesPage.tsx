import { useState, type FormEvent } from 'react';
import { Alert, Button, Link as MuiLink, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { createDefaultSubtype, deleteSubtype, getDefaultSubtypes, getDefaultTypes, getGlassware, getPalettes, updateSubtype } from '../../api/admin';
import { apiErrorMessage, apiStatus } from '../../api/errors';
import { hasValidParentId, keys, parsePositiveId } from '../../api/queries';
import { CatalogCard } from '../../components/CatalogCard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DesignSelect } from '../../components/DesignSelect';
import { DrinkPreview } from '../../components/DrinkPreview';
import { EditorDialog } from '../../components/EditorDialog';
import { PageState } from '../../components/PageState';
import type { AlcoholSubtype, NewAlcoholSubtype } from '../../types/api';

export const AlcoholSubtypesPage = () => {
  const { typeId: rawTypeId } = useParams();
  const parentId = parsePositiveId(rawTypeId);
  const queryClient = useQueryClient();
  const parents = useQuery({ queryKey: keys.types, queryFn: getDefaultTypes });
  const parent = parentId === undefined ? undefined : parents.data?.find((row) => row.id === parentId);
  const subtypes = useQuery({ queryKey: keys.subtypes(parentId ?? 0), queryFn: () => getDefaultSubtypes(parentId as number), enabled: hasValidParentId(parentId ?? 0) && parent !== undefined });
  const palettes = useQuery({ queryKey: keys.palettes, queryFn: getPalettes });
  const glassware = useQuery({ queryKey: keys.glassware, queryFn: getGlassware });
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<AlcoholSubtype | null | undefined>();
  const [deleting, setDeleting] = useState<AlcoholSubtype | null>(null);
  const invalidate = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.subtypes(parentId ?? 0) }),
    queryClient.invalidateQueries({ queryKey: keys.recommendations }),
  ]);
  const saveMutation = useMutation({
    mutationFn: ({ id, input }: { id?: number; input: NewAlcoholSubtype | Partial<Pick<AlcoholSubtype, 'name' | 'colorPaletteId' | 'glasswareId'>> }) => id ? updateSubtype(id, input) : createDefaultSubtype(parentId as number, input as NewAlcoholSubtype),
    onSuccess: async () => { await invalidate(); setEditor(undefined); },
    onError: async (error) => { if (apiStatus(error) === 404) await invalidate(); },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteSubtype,
    onSuccess: async () => { await invalidate(); setDeleting(null); },
    onError: async (error) => { if (apiStatus(error) === 404) await invalidate(); },
  });
  const rows = (subtypes.data ?? []).filter((row) => row.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const paletteById = new Map((palettes.data ?? []).map((palette) => [palette.id, palette]));
  const glassById = new Map((glassware.data ?? []).map((item) => [item.id, item]));
  const submit = async (event: FormEvent<HTMLFormElement>, values: ChildFormValues) => {
    event.preventDefault();
    const input = editor
      ? { name: values.name, ...(values.colorPaletteId !== undefined && values.colorPaletteId !== editor.colorPaletteId ? { colorPaletteId: values.colorPaletteId } : {}), ...(values.glasswareId !== undefined && values.glasswareId !== editor.glasswareId ? { glasswareId: values.glasswareId } : {}) }
      : { name: values.name, colorPaletteId: values.colorPaletteId as number, glasswareId: values.glasswareId as number };
    try { await saveMutation.mutateAsync({ id: editor?.id, input }); } catch { /* leave the editor open with its draft */ }
  };

  if (parents.isPending) return <PageState loading>Loading alcohol types</PageState>;
  if (parents.isError) return <PageState error={apiErrorMessage(parents.error, 'load')} onRetry={() => void parents.refetch()}>Alcohol types</PageState>;
  if (!parent) return <section><Typography variant="h1" className="page-title">Parent type not found</Typography><Typography sx={{ mb: 2 }}>Choose a default alcohol type before managing its subtypes.</Typography><MuiLink component={Link} to="/alcohol-types">Back to alcohol types</MuiLink></section>;

  return <section>
    <MuiLink component={Link} to="/alcohol-types" className="breadcrumb-link">Alcohol types</MuiLink>
    <div className="page-heading-row">
      <Typography variant="h1" className="page-title">Subtypes for {parent.name}</Typography>
      <Button variant="contained" disabled={!palettes.data?.length || !glassware.data?.length} onClick={() => { saveMutation.reset(); setEditor(null); }}>New subtype</Button>
    </div>
    <TextField fullWidth label="Search subtypes" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 3 }} />
    <PageState loading={subtypes.isPending || palettes.isPending || glassware.isPending} error={subtypes.error ? apiErrorMessage(subtypes.error, 'load') : undefined} onRetry={() => void subtypes.refetch()} empty={subtypes.isSuccess && rows.length === 0} filteredEmpty={search.trim().length > 0} emptyAction={<Button variant="outlined" disabled={!palettes.data?.length || !glassware.data?.length} onClick={() => setEditor(null)}>Add subtype</Button>}>
      <div className="catalog-grid">{rows.map((subtype) => {
        const paletteId = subtype.colorPaletteId ?? parent.colorPaletteId;
        const glasswareId = subtype.glasswareId ?? parent.glasswareId;
        const palette = paletteId === null ? undefined : paletteById.get(paletteId);
        const glass = glasswareId === null ? undefined : glassById.get(glasswareId);
        const paletteName = subtype.colorPaletteId === null && parent.colorPaletteId !== null ? `Inherited from ${parent.name}${palette ? ` (${palette.name})` : ''}` : palette?.name ?? 'Not assigned';
        const glassName = subtype.glasswareId === null && parent.glasswareId !== null ? `Inherited from ${parent.name}${glass ? ` (${glass.name})` : ''}` : glass?.name ?? 'Not assigned';
        return <CatalogCard key={subtype.id} name={subtype.name} onEdit={() => { saveMutation.reset(); setEditor(subtype); }} onDelete={() => { deleteMutation.reset(); setDeleting(subtype); }} preview={<DrinkPreview label={subtype.name} glassware={glass} palette={palette} />} details={<Typography className="catalog-detail">Palette: {paletteName} · Glassware: {glassName}</Typography>} />;
      })}</div>
    </PageState>
    {(palettes.isError || glassware.isError) && <Alert severity="error" role="alert" action={<Button color="inherit" onClick={() => { void palettes.refetch(); void glassware.refetch(); }}>Retry</Button>}>Design options could not be loaded. Retry before adding a subtype.</Alert>}
    {((palettes.isSuccess && !palettes.data.length) || (glassware.isSuccess && !glassware.data.length)) && <Alert severity="info">Create a palette and glassware entry before adding a subtype.</Alert>}
    {editor !== undefined && <SubtypeEditor initial={editor ?? undefined} palettes={palettes.data ?? []} glassware={glassware.data ?? []} pending={saveMutation.isPending} error={saveMutation.error ? apiErrorMessage(saveMutation.error) : undefined} onClose={() => { if (!saveMutation.isPending) setEditor(undefined); }} onSubmit={(event, values) => void submit(event, values)} />}
    <ConfirmDialog open={Boolean(deleting)} title={`Delete ${deleting?.name ?? 'subtype'}?`} description="This entry can only be deleted if no other records refer to it." pending={deleteMutation.isPending} error={deleteMutation.error ? apiErrorMessage(deleteMutation.error, 'delete') : undefined} onClose={() => { if (!deleteMutation.isPending) setDeleting(null); }} onConfirm={() => deleting && void deleteMutation.mutateAsync(deleting.id).catch(() => undefined)} />
  </section>;
};

interface ChildFormValues { name: string; colorPaletteId?: number; glasswareId?: number }
interface ChildEditorProps { initial?: AlcoholSubtype; palettes: { id: number; name: string }[]; glassware: { id: number; name: string }[]; pending: boolean; error?: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>, values: ChildFormValues) => void }
const SubtypeEditor = ({ initial, palettes, glassware, pending, error, onClose, onSubmit }: ChildEditorProps) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [paletteId, setPaletteId] = useState<number | ''>(initial?.colorPaletteId ?? '');
  const [glasswareId, setGlasswareId] = useState<number | ''>(initial?.glasswareId ?? '');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (!initial && (paletteId === '' || glasswareId === '')) return;
    onSubmit(event, { name: name.trim(), ...(paletteId === '' ? {} : { colorPaletteId: paletteId }), ...(glasswareId === '' ? {} : { glasswareId }) });
  };
  return <EditorDialog key={initial?.id ?? 'new-subtype'} open title={initial ? `Edit ${initial.name}` : 'Create subtype'} submitLabel={initial ? 'Save subtype' : 'Create subtype'} pending={pending} error={error} onClose={onClose} onSubmit={submit}>
    <Stack spacing={2} sx={{ pt: 1 }}>
      <TextField required label="Name" value={name} onChange={(event) => setName(event.target.value)} slotProps={{ htmlInput: { pattern: '.*\\S.*' } }} />
      <DesignSelect label="Palette" value={paletteId} rows={palettes} required={!initial} onChange={setPaletteId} />
      <DesignSelect label="Glassware" value={glasswareId} rows={glassware} required={!initial} onChange={setGlasswareId} />
    </Stack>
  </EditorDialog>;
};

export default AlcoholSubtypesPage;
