import { useRef, useState, type FormEvent } from 'react';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, apiStatus } from '../../api/errors';
import { createRecommendation, deleteRecommendation, getConsumptionTypes, getDefaultBrands, getDefaultFlavours, getDefaultSubtypes, getDefaultTypes, getGlassware, getPalettes, getRecommendations, getVolumesByType, updateRecommendations } from '../../api/admin';
import { keys } from '../../api/queries';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DesignSelect } from '../../components/DesignSelect';
import { DrinkPreview } from '../../components/DrinkPreview';
import { EditorDialog } from '../../components/EditorDialog';
import { PageState } from '../../components/PageState';
import type { DefaultRecommendation, NewDefaultRecommendation } from '../../types/api';
import { renamePayload } from './recommendationUtils';

export const RecommendationsPage = () => {
  const client = useQueryClient();
  const recommendations = useQuery({ queryKey: keys.recommendations, queryFn: getRecommendations });
  const types = useQuery({ queryKey: keys.types, queryFn: getDefaultTypes });
  const brands = useQuery({ queryKey: keys.brands, queryFn: getDefaultBrands });
  const palettes = useQuery({ queryKey: keys.palettes, queryFn: getPalettes });
  const glassware = useQuery({ queryKey: keys.glassware, queryFn: getGlassware });
  const consumption = useQuery({ queryKey: keys.consumptionTypes, queryFn: getConsumptionTypes });
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<DefaultRecommendation | null | undefined>();
  const [deleting, setDeleting] = useState<DefaultRecommendation | null>(null);
  const [notice, setNotice] = useState('');
  const orderWritePending = useRef(false);
  const rows = recommendations.data ?? [];
  const visible = rows.filter((row) => row.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const ids = [...new Set(visible.map((row) => row.alcoholTypeId))];
  const brandIds = [...new Set(visible.flatMap((row) => row.brandId === null ? [] : [row.brandId]))];
  const subtypes = useQueries({ queries: ids.map((id) => ({ queryKey: keys.subtypes(id), queryFn: () => getDefaultSubtypes(id) })) });
  const flavours = useQueries({ queries: brandIds.map((id) => ({ queryKey: keys.flavours(id), queryFn: () => getDefaultFlavours(id) })) });
  const save = useMutation({ mutationFn: (input: NewDefaultRecommendation) => createRecommendation(input), onSuccess: async () => { await client.invalidateQueries({ queryKey: keys.recommendations }); setEditing(undefined); }, onError: async (error) => { if (apiStatus(error) === 404) await client.invalidateQueries({ queryKey: keys.recommendations }); } });
  const rename = useMutation({ mutationFn: updateRecommendations, onSuccess: (rows) => { client.setQueryData(keys.recommendations, rows); setNotice(''); setEditing(undefined); }, onError: (error) => { setNotice(`${apiErrorMessage(error)} The server order was reloaded.`); void client.invalidateQueries({ queryKey: keys.recommendations }); } });
  const remove = useMutation({ mutationFn: deleteRecommendation, onSuccess: async () => { await client.invalidateQueries({ queryKey: keys.recommendations }); setDeleting(null); }, onError: async (error) => { if (apiStatus(error) === 404) await client.invalidateQueries({ queryKey: keys.recommendations }); } });
  const typeById = new Map((types.data ?? []).map((row) => [row.id, row]));
  const brandById = new Map((brands.data ?? []).map((row) => [row.id, row]));
  const paletteById = new Map((palettes.data ?? []).map((row) => [row.id, row]));
  const glassById = new Map((glassware.data ?? []).map((row) => [row.id, row]));
  const subById = new Map(subtypes.flatMap((result) => (result.data ?? []).map((row) => [row.id, row] as const)));
  const flavourById = new Map(flavours.flatMap((result) => (result.data ?? []).map((row) => [row.id, row] as const)));
  const consumptionById = new Map((consumption.data ?? []).map((row) => [row.id, row]));
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const persistOrder = (next: DefaultRecommendation[]) => {
    if (orderWritePending.current) return;
    orderWritePending.current = true;
    const payload = next.map(({ id, name }) => ({ id, name }));
    rename.mutate(payload, { onSettled: () => { orderWritePending.current = false; } });
  };
  const move = (id: number, offset: number) => {
    if (orderWritePending.current || search.trim() || recommendations.isFetching) return;
    const from = rows.findIndex((row) => row.id === id);
    const to = Math.max(0, Math.min(rows.length - 1, from + offset));
    if (from !== to) persistOrder(arrayMove(rows, from, to));
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || search.trim() || rename.isPending || recommendations.isFetching || orderWritePending.current) return;
    const from = rows.findIndex((row) => row.id === active.id);
    const to = rows.findIndex((row) => row.id === over.id);
    persistOrder(arrayMove(rows, from, to));
  };
  const submit = (event: FormEvent<HTMLFormElement>, value: NewDefaultRecommendation | string) => {
    event.preventDefault();
    setNotice('');
    if (editing) persistPayload(renamePayload(rows, editing.id, String(value)));
    else save.mutate(value as NewDefaultRecommendation);
  };
  const persistPayload = (payload: { id: number; name: string }[]) => {
    if (orderWritePending.current) return;
    orderWritePending.current = true;
    rename.mutate(payload, { onSettled: () => { orderWritePending.current = false; } });
  };
  const loading = recommendations.isPending || types.isPending || brands.isPending || palettes.isPending || glassware.isPending || consumption.isPending;
  const error = [recommendations, types, brands, palettes, glassware, consumption].find((query) => query.isError);

  return <section>
    <div className="page-heading-row"><Typography variant="h1" className="page-title">Recommendations</Typography><Button variant="contained" disabled={!types.data?.length || !palettes.data?.length || !glassware.data?.length} onClick={() => { save.reset(); setEditing(null); }}>New recommendation</Button></div>
    <TextField fullWidth label="Search recommendations" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 3 }} />
    {notice && <Alert severity="info" role="status">{notice}</Alert>}
    <PageState loading={loading} error={error ? apiErrorMessage(error.error, 'load') : undefined} onRetry={() => { void recommendations.refetch(); void types.refetch(); void brands.refetch(); }} empty={!loading && visible.length === 0} filteredEmpty={!!search.trim()} emptyAction={<Button variant="outlined" disabled={!types.data?.length || !palettes.data?.length || !glassware.data?.length} onClick={() => setEditing(null)}>Add recommendation</Button>}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={visible.map((row) => row.id)} strategy={verticalListSortingStrategy}>
          <div className="recommendation-list">{visible.map((row) => {
            const type = typeById.get(row.alcoholTypeId); const brand = row.brandId === null ? undefined : brandById.get(row.brandId);
            const subtype = row.alcoholSubtypeId === null ? undefined : subById.get(row.alcoholSubtypeId); const flavour = row.beerFlavourId === null ? undefined : flavourById.get(row.beerFlavourId);
            const glass = glassById.get(row.glasswareId); const palette = paletteById.get(row.colorPaletteId);
            const detail = [type?.name ?? `Type #${row.alcoholTypeId}`, subtype?.name ?? (row.alcoholSubtypeId === null ? '' : `Subtype #${row.alcoholSubtypeId}`), brand?.name ?? (row.brandId === null ? '' : `Brand #${row.brandId}`), flavour?.name ?? (row.beerFlavourId === null ? '' : `Flavour #${row.beerFlavourId}`), row.alcoholVolumeId === null ? '' : `Volume #${row.alcoholVolumeId}`, row.consumptionTypeId === null ? '' : consumptionById.get(row.consumptionTypeId)?.name ?? `Consumption #${row.consumptionTypeId}`, palette?.name ?? `Palette #${row.colorPaletteId}`, glass?.name ?? `Glassware #${row.glasswareId}`].filter(Boolean).join(' · ');
            return <SortableRecommendation key={row.id} row={row} index={rows.findIndex((item) => item.id === row.id)} count={rows.length} detail={detail} glass={glass} palette={palette} disabled={rename.isPending || recommendations.isFetching || !!search.trim()} onMove={move} onEdit={() => { rename.reset(); save.reset(); void recommendations.refetch().then(({ data }) => setEditing(data?.find((item) => item.id === row.id) ?? row)); }} onDelete={() => { remove.reset(); setDeleting(row); }} />;
          })}</div>
        </SortableContext>
      </DndContext>
    </PageState>
    {editing !== undefined && <RecommendationEditor key={editing?.id ?? 'new-recommendation'} initial={editing ?? undefined} types={types.data ?? []} brands={brands.data ?? []} palettes={palettes.data ?? []} glassware={glassware.data ?? []} consumption={consumption.data ?? []} error={save.error ? apiErrorMessage(save.error) : rename.error ? apiErrorMessage(rename.error) : undefined} pending={save.isPending || rename.isPending} onClose={() => { if (!save.isPending && !rename.isPending) setEditing(undefined); }} onSubmit={submit} />}
    <ConfirmDialog open={Boolean(deleting)} title={`Delete ${deleting?.name ?? 'recommendation'}?`} description="This removes the default recommendation from future recommendations." pending={remove.isPending} error={remove.error ? apiErrorMessage(remove.error, 'delete') : undefined} onClose={() => { if (!remove.isPending) setDeleting(null); }} onConfirm={() => deleting && void remove.mutateAsync(deleting.id).catch(() => undefined)} />
  </section>;
};

const SortableRecommendation = ({ row, index, count, detail, glass, palette, disabled, onMove, onEdit, onDelete }: { row: DefaultRecommendation; index: number; count: number; detail: string; glass?: ReturnType<typeof getGlassware> extends Promise<(infer T)[]> ? T : never; palette?: ReturnType<typeof getPalettes> extends Promise<(infer T)[]> ? T : never; disabled: boolean; onMove: (id: number, offset: number) => void; onEdit: () => void; onDelete: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id, disabled });
  return <article ref={setNodeRef} className="recommendation-card" style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}>
    <div className="recommendation-summary"><Typography variant="h2"><span className="recommendation-order">{index + 1}.</span> {row.name}</Typography><Typography className="catalog-detail">{detail}</Typography><DrinkPreview label={row.name} glassware={glass} palette={palette} /></div>
    <div className="recommendation-actions"><Button {...attributes} {...listeners} disabled={disabled} aria-label={`Drag ${row.name} to reorder`}>Move</Button><Button disabled={disabled || index === 0} onClick={() => onMove(row.id, -1)}>Move up</Button><Button disabled={disabled || index === count - 1} onClick={() => onMove(row.id, 1)}>Move down</Button><Button disabled={disabled} onClick={onEdit}>Rename {row.name}</Button><Button disabled={disabled} color="error" onClick={onDelete}>Delete {row.name}</Button></div>
  </article>;
};

const RecommendationEditor = ({ initial, types, brands, palettes, glassware, consumption, pending, error, onClose, onSubmit }: { initial?: DefaultRecommendation; types: Awaited<ReturnType<typeof getDefaultTypes>>; brands: Awaited<ReturnType<typeof getDefaultBrands>>; palettes: Awaited<ReturnType<typeof getPalettes>>; glassware: Awaited<ReturnType<typeof getGlassware>>; consumption: Awaited<ReturnType<typeof getConsumptionTypes>>; pending: boolean; error?: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>, value: NewDefaultRecommendation | string) => void }) => {
  const [name, setName] = useState(initial?.name ?? ''); const [typeId, setTypeId] = useState<number | ''>(initial?.alcoholTypeId ?? ''); const [subtypeId, setSubtypeId] = useState<number | ''>(initial?.alcoholSubtypeId ?? ''); const [volumeId, setVolumeId] = useState<number | ''>(initial?.alcoholVolumeId ?? ''); const [brandId, setBrandId] = useState<number | ''>(initial?.brandId ?? ''); const [flavourId, setFlavourId] = useState<number | ''>(initial?.beerFlavourId ?? ''); const [consumptionId, setConsumptionId] = useState<number | ''>(initial?.consumptionTypeId ?? ''); const [paletteId, setPaletteId] = useState<number | ''>(initial?.colorPaletteId ?? ''); const [glassId, setGlassId] = useState<number | ''>(initial?.glasswareId ?? '');
  const subtypes = useQuery({ queryKey: keys.subtypes(Number(typeId)), queryFn: () => getDefaultSubtypes(Number(typeId)), enabled: typeId !== '' });
  const volumes = useQuery({ queryKey: keys.volumes(Number(typeId)), queryFn: () => getVolumesByType(Number(typeId)), enabled: typeId !== '' });
  const flavours = useQuery({ queryKey: keys.flavours(Number(brandId)), queryFn: () => getDefaultFlavours(Number(brandId)), enabled: brandId !== '' });
  const clearType = (value: number | '') => { setTypeId(value); setSubtypeId(''); setVolumeId(''); };
  const clearBrand = (value: number | '') => { setBrandId(value); setFlavourId(''); };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (initial) { onSubmit(event, name.trim()); return; }
    if (!name.trim() || typeId === '' || paletteId === '' || glassId === '') return;
    onSubmit(event, { name: name.trim(), alcoholTypeId: typeId, colorPaletteId: paletteId, glasswareId: glassId, ...(subtypeId === '' ? {} : { alcoholSubtypeId: subtypeId }), ...(volumeId === '' ? {} : { alcoholVolumeId: volumeId }), ...(brandId === '' ? {} : { brandId }), ...(flavourId === '' ? {} : { beerFlavourId: flavourId }), ...(consumptionId === '' ? {} : { consumptionTypeId: consumptionId }) });
  };
  return <EditorDialog open title={initial ? `Rename ${initial.name}` : 'Create recommendation'} submitLabel={initial ? 'Save name' : 'Create recommendation'} pending={pending} error={error} onClose={onClose} onSubmit={submit}>
    <Stack spacing={2} sx={{ pt: 1 }}>
      <TextField required label="Name" slotProps={{ htmlInput: { pattern: '.*\\S.*', title: 'Enter at least one non-space character.' } }} value={name} onChange={(event) => setName(event.target.value)} />
      {initial ? <Typography>To change a recommendation's composition or design, create a new recommendation and delete this one.</Typography> : <>
        <DesignSelect label="Alcohol type" value={typeId} rows={types} required onChange={clearType} />
        <DesignSelect label="Alcohol subtype (optional)" value={subtypeId} rows={subtypes.data ?? []} required={false} onChange={setSubtypeId} />
        <TextField select label="Alcohol volume (optional)" value={volumeId} onChange={(event) => setVolumeId(event.target.value === '' ? '' : Number(event.target.value))}><MenuItem value="">None</MenuItem>{(volumes.data ?? []).map((volume) => <MenuItem key={volume.id} value={volume.id}>{volume.name} ({volume.volume} L)</MenuItem>)}</TextField>
        <DesignSelect label="Beer brand (optional)" value={brandId} rows={brands} required={false} onChange={clearBrand} />
        <DesignSelect label="Beer flavour (optional)" value={flavourId} rows={flavours.data ?? []} required={false} onChange={setFlavourId} />
        <DesignSelect label="Consumption type (optional)" value={consumptionId} rows={consumption} required={false} onChange={setConsumptionId} />
        <DesignSelect label="Palette" value={paletteId} rows={palettes} required onChange={setPaletteId} />
        <DesignSelect label="Glassware" value={glassId} rows={glassware} required onChange={setGlassId} />
      </>}
    </Stack>
  </EditorDialog>;
};
