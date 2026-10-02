import { useState, type FormEvent } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDefaultBrand, deleteBrand, getDefaultBrands, getPalettes, updateBrand } from '../../api/admin';
import { apiErrorMessage, apiStatus } from '../../api/errors';
import { keys } from '../../api/queries';
import { CatalogCard } from '../../components/CatalogCard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DesignSelect } from '../../components/DesignSelect';
import { DrinkPreview } from '../../components/DrinkPreview';
import { EditorDialog } from '../../components/EditorDialog';
import { PageState } from '../../components/PageState';
import type { Brand, NewBrand } from '../../types/api';

export const BeerBrandsPage = () => {
  const queryClient = useQueryClient();
  const brands = useQuery({ queryKey: keys.brands, queryFn: getDefaultBrands });
  const palettes = useQuery({ queryKey: keys.palettes, queryFn: getPalettes });
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<Brand | null | undefined>();
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const invalidate = async (children = false) => Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.brands }),
    queryClient.invalidateQueries({ queryKey: keys.recommendations }),
    ...(children ? [queryClient.invalidateQueries({ queryKey: ['default', 'flavours'] })] : []),
  ]);
  const saveMutation = useMutation({
    mutationFn: ({ id, input }: { id?: number; input: NewBrand | Partial<Pick<Brand, 'name' | 'colorPaletteId'>> }) => id ? updateBrand(id, input) : createDefaultBrand(input as NewBrand),
    onSuccess: async (saved, variables) => {
      await invalidate();
      if (variables.id === undefined) await queryClient.invalidateQueries({ queryKey: keys.flavours(saved.id) });
      setEditor(undefined);
    },
    onError: async (error) => { if (apiStatus(error) === 404) await invalidate(); },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteBrand,
    onSuccess: async () => { await invalidate(true); setDeleting(null); },
    onError: async (error) => { if (apiStatus(error) === 404) await invalidate(true); },
  });
  const rows = (brands.data ?? []).filter((row) => row.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const paletteById = new Map((palettes.data ?? []).map((palette) => [palette.id, palette]));
  const submit = async (event: FormEvent<HTMLFormElement>, values: BrandFormValues) => {
    event.preventDefault();
    const childNames = values.flavours?.map((name) => name.trim()).filter(Boolean) ?? [];
    const input = editor
      ? { name: values.name, ...(values.colorPaletteId !== undefined && values.colorPaletteId !== editor.colorPaletteId ? { colorPaletteId: values.colorPaletteId } : {}) }
      : { name: values.name, colorPaletteId: values.colorPaletteId as number, ...(childNames.length ? { flavours: childNames } : {}) };
    try { await saveMutation.mutateAsync({ id: editor?.id, input }); } catch { /* preserve the editor draft on failure */ }
  };

  return <section>
    <div className="page-heading-row">
      <Typography variant="h1" className="page-title">Beer brands</Typography>
      <Button variant="contained" disabled={!palettes.data?.length} onClick={() => { saveMutation.reset(); setEditor(null); }}>New beer brand</Button>
    </div>
    <TextField fullWidth label="Search beer brands" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 3 }} />
    <PageState loading={brands.isPending || palettes.isPending} error={brands.error ? apiErrorMessage(brands.error, 'load') : undefined} onRetry={() => void brands.refetch()} empty={brands.isSuccess && rows.length === 0} filteredEmpty={search.trim().length > 0} emptyAction={<Button variant="outlined" disabled={!palettes.data?.length} onClick={() => setEditor(null)}>Add beer brand</Button>}>
      <div className="catalog-grid">
        {rows.map((brand) => {
          const palette = brand.colorPaletteId === null ? undefined : paletteById.get(brand.colorPaletteId);
          return <CatalogCard key={brand.id} name={brand.name} childHref={`/beer-brands/${brand.id}/flavours`} childLabel={`View flavours for ${brand.name}`} onEdit={() => { saveMutation.reset(); setEditor(brand); }} onDelete={() => { deleteMutation.reset(); setDeleting(brand); }} preview={<DrinkPreview label={brand.name} palette={palette} />} details={<Typography className="catalog-detail">Palette: {palette?.name ?? 'Not assigned'}</Typography>} />;
        })}
      </div>
    </PageState>
    {palettes.isError && <Alert severity="error" role="alert" action={<Button color="inherit" onClick={() => void palettes.refetch()}>Retry</Button>}>{apiErrorMessage(palettes.error, 'load')}</Alert>}
    {palettes.isSuccess && palettes.data.length === 0 && <Alert severity="info">Create a palette before adding a beer brand.</Alert>}
    {editor !== undefined && <BrandEditor initial={editor ?? undefined} palettes={palettes.data ?? []} pending={saveMutation.isPending} error={saveMutation.error ? apiErrorMessage(saveMutation.error) : undefined} onClose={() => { if (!saveMutation.isPending) setEditor(undefined); }} onSubmit={(event, values) => void submit(event, values)} />}
    <ConfirmDialog open={Boolean(deleting)} title={`Delete ${deleting?.name ?? 'brand'}?`} description="This entry can only be deleted if no other records refer to it." pending={deleteMutation.isPending} error={deleteMutation.error ? apiErrorMessage(deleteMutation.error, 'delete') : undefined} onClose={() => { if (!deleteMutation.isPending) setDeleting(null); }} onConfirm={() => deleting && void deleteMutation.mutateAsync(deleting.id).catch(() => undefined)} />
  </section>;
};

interface BrandFormValues { name: string; colorPaletteId?: number; flavours?: string[] }
const BrandEditor = ({ initial, palettes, pending, error, onClose, onSubmit }: { initial?: Brand; palettes: { id: number; name: string }[]; pending: boolean; error?: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>, values: BrandFormValues) => void }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [paletteId, setPaletteId] = useState<number | ''>(initial?.colorPaletteId ?? '');
  const [flavours, setFlavours] = useState<string[]>([]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (!initial && paletteId === '') return;
    onSubmit(event, { name: name.trim(), ...(paletteId === '' ? {} : { colorPaletteId: paletteId }), ...(initial ? {} : { flavours }) });
  };
  return <EditorDialog key={initial?.id ?? 'new-brand'} open title={initial ? 'Edit beer brand' : 'Create beer brand'} submitLabel={initial ? 'Save brand' : 'Create brand'} pending={pending} error={error} onClose={onClose} onSubmit={submit}>
    <Stack spacing={2} sx={{ pt: 1 }}>
      <TextField required label="Name" value={name} onChange={(event) => setName(event.target.value)} slotProps={{ htmlInput: { maxLength: 100, pattern: '.*\\S.*' } }} />
      <DesignSelect label="Palette" value={paletteId} rows={palettes} required={!initial} onChange={setPaletteId} />
      {!initial && <div className="initial-children">
        <Typography variant="subtitle1">Initial flavours (optional)</Typography>
        {flavours.map((value, index) => <div className="repeatable-field" key={index}>
          <TextField label={`Initial flavour ${index + 1}`} value={value} onChange={(event) => setFlavours((current) => current.map((item, i) => i === index ? event.target.value : item))} />
          <Button aria-label={`Remove initial flavour ${index + 1}`} onClick={() => setFlavours((current) => current.filter((_, i) => i !== index))}>Remove</Button>
        </div>)}
        <Button onClick={() => setFlavours((current) => [...current, ''])}>Add initial flavour</Button>
      </div>}
    </Stack>
  </EditorDialog>;
};

export default BeerBrandsPage;
