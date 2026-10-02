import { useState, type FormEvent } from 'react';
import { Alert, Button, Link as MuiLink, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { createDefaultFlavour, deleteFlavour, getDefaultBrands, getDefaultFlavours, getPalettes, updateFlavour } from '../../api/admin';
import { apiErrorMessage, apiStatus } from '../../api/errors';
import { hasValidParentId, keys, parsePositiveId } from '../../api/queries';
import { CatalogCard } from '../../components/CatalogCard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DesignSelect } from '../../components/DesignSelect';
import { DrinkPreview } from '../../components/DrinkPreview';
import { EditorDialog } from '../../components/EditorDialog';
import { PageState } from '../../components/PageState';
import type { BeerFlavour, NewBeerFlavour } from '../../types/api';

export const BeerFlavoursPage = () => {
  const { brandId: rawBrandId } = useParams();
  const parentId = parsePositiveId(rawBrandId);
  const queryClient = useQueryClient();
  const parents = useQuery({ queryKey: keys.brands, queryFn: getDefaultBrands });
  const parent = parentId === undefined ? undefined : parents.data?.find((row) => row.id === parentId);
  const flavours = useQuery({ queryKey: keys.flavours(parentId ?? 0), queryFn: () => getDefaultFlavours(parentId as number), enabled: hasValidParentId(parentId ?? 0) && parent !== undefined });
  const palettes = useQuery({ queryKey: keys.palettes, queryFn: getPalettes });
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<BeerFlavour | null | undefined>();
  const [deleting, setDeleting] = useState<BeerFlavour | null>(null);
  const invalidate = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.flavours(parentId ?? 0) }),
    queryClient.invalidateQueries({ queryKey: keys.recommendations }),
  ]);
  const saveMutation = useMutation({
    mutationFn: ({ id, input }: { id?: number; input: NewBeerFlavour | Partial<Pick<BeerFlavour, 'name' | 'colorPaletteId'>> }) => id ? updateFlavour(id, input) : createDefaultFlavour(parentId as number, input as NewBeerFlavour),
    onSuccess: async () => { await invalidate(); setEditor(undefined); },
    onError: async (error) => { if (apiStatus(error) === 404) await invalidate(); },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteFlavour,
    onSuccess: async () => { await invalidate(); setDeleting(null); },
    onError: async (error) => { if (apiStatus(error) === 404) await invalidate(); },
  });
  const rows = (flavours.data ?? []).filter((row) => row.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const paletteById = new Map((palettes.data ?? []).map((palette) => [palette.id, palette]));
  const submit = async (event: FormEvent<HTMLFormElement>, values: FlavourFormValues) => {
    event.preventDefault();
    const input = editor
      ? { name: values.name, ...(values.colorPaletteId !== undefined && values.colorPaletteId !== editor.colorPaletteId ? { colorPaletteId: values.colorPaletteId } : {}) }
      : { name: values.name, colorPaletteId: values.colorPaletteId as number };
    try { await saveMutation.mutateAsync({ id: editor?.id, input }); } catch { /* keep the draft for correction or retry */ }
  };

  if (parents.isPending) return <PageState loading>Loading beer brands</PageState>;
  if (parents.isError) return <PageState error={apiErrorMessage(parents.error, 'load')} onRetry={() => void parents.refetch()}>Beer brands</PageState>;
  if (!parent) return <section><Typography variant="h1" className="page-title">Parent brand not found</Typography><Typography sx={{ mb: 2 }}>Choose a default beer brand before managing its flavours.</Typography><MuiLink component={Link} to="/beer-brands">Back to beer brands</MuiLink></section>;

  return <section>
    <MuiLink component={Link} to="/beer-brands" className="breadcrumb-link">Beer brands</MuiLink>
    <div className="page-heading-row">
      <Typography variant="h1" className="page-title">Flavours for {parent.name}</Typography>
      <Button variant="contained" disabled={!palettes.data?.length} onClick={() => { saveMutation.reset(); setEditor(null); }}>New flavour</Button>
    </div>
    <TextField fullWidth label="Search flavours" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 3 }} />
    <PageState loading={flavours.isPending || palettes.isPending} error={flavours.error ? apiErrorMessage(flavours.error, 'load') : undefined} onRetry={() => void flavours.refetch()} empty={flavours.isSuccess && rows.length === 0} filteredEmpty={search.trim().length > 0} emptyAction={<Button variant="outlined" disabled={!palettes.data?.length} onClick={() => setEditor(null)}>Add flavour</Button>}>
      <div className="catalog-grid">{rows.map((flavour) => {
        const paletteId = flavour.colorPaletteId ?? parent.colorPaletteId;
        const palette = paletteId === null ? undefined : paletteById.get(paletteId);
        const paletteName = flavour.colorPaletteId === null && parent.colorPaletteId !== null ? `Inherited from ${parent.name}${palette ? ` (${palette.name})` : ''}` : palette?.name ?? 'Not assigned';
        return <CatalogCard key={flavour.id} name={flavour.name} onEdit={() => { saveMutation.reset(); setEditor(flavour); }} onDelete={() => { deleteMutation.reset(); setDeleting(flavour); }} preview={<DrinkPreview label={flavour.name} palette={palette} />} details={<Typography className="catalog-detail">Palette: {paletteName}</Typography>} />;
      })}</div>
    </PageState>
    {palettes.isError && <Alert severity="error" role="alert" action={<Button color="inherit" onClick={() => void palettes.refetch()}>Retry</Button>}>{apiErrorMessage(palettes.error, 'load')}</Alert>}
    {palettes.isSuccess && palettes.data.length === 0 && <Alert severity="info">Create a palette before adding a flavour.</Alert>}
    {editor !== undefined && <FlavourEditor initial={editor ?? undefined} palettes={palettes.data ?? []} pending={saveMutation.isPending} error={saveMutation.error ? apiErrorMessage(saveMutation.error) : undefined} onClose={() => { if (!saveMutation.isPending) setEditor(undefined); }} onSubmit={(event, values) => void submit(event, values)} />}
    <ConfirmDialog open={Boolean(deleting)} title={`Delete ${deleting?.name ?? 'flavour'}?`} description="This entry can only be deleted if no other records refer to it." pending={deleteMutation.isPending} error={deleteMutation.error ? apiErrorMessage(deleteMutation.error, 'delete') : undefined} onClose={() => { if (!deleteMutation.isPending) setDeleting(null); }} onConfirm={() => deleting && void deleteMutation.mutateAsync(deleting.id).catch(() => undefined)} />
  </section>;
};

interface FlavourFormValues { name: string; colorPaletteId?: number }
const FlavourEditor = ({ initial, palettes, pending, error, onClose, onSubmit }: { initial?: BeerFlavour; palettes: { id: number; name: string }[]; pending: boolean; error?: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>, values: FlavourFormValues) => void }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [paletteId, setPaletteId] = useState<number | ''>(initial?.colorPaletteId ?? '');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (!initial && paletteId === '') return;
    onSubmit(event, { name: name.trim(), ...(paletteId === '' ? {} : { colorPaletteId: paletteId }) });
  };
  return <EditorDialog key={initial?.id ?? 'new-flavour'} open title={initial ? `Edit ${initial.name}` : 'Create flavour'} submitLabel={initial ? 'Save flavour' : 'Create flavour'} pending={pending} error={error} onClose={onClose} onSubmit={submit}>
    <Stack spacing={2} sx={{ pt: 1 }}>
      <TextField required label="Name" value={name} onChange={(event) => setName(event.target.value)} slotProps={{ htmlInput: { maxLength: 100, pattern: '.*\\S.*' } }} />
      <DesignSelect label="Palette" value={paletteId} rows={palettes} required={!initial} onChange={setPaletteId} />
    </Stack>
  </EditorDialog>;
};

export default BeerFlavoursPage;
