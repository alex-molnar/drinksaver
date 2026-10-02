import { useState, type SyntheticEvent } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { apiErrorMessage, apiStatus } from '../../api/errors';
import { getDefaultBrands, getDefaultTypes, getGlassware, getPalettes, getUserBrands, getUserFlavours, getUserSubtypes, getUserTypes, publishBrand, publishFlavour, publishSubtype, publishType } from '../../api/admin';
import { keys, parsePositiveId } from '../../api/queries';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DrinkPreview } from '../../components/DrinkPreview';
import { PageState } from '../../components/PageState';
import type { AlcoholSubtype, AlcoholType, BeerFlavour, Brand } from '../../types/api';

type Kind = 'types' | 'subtypes' | 'brands' | 'flavours';
type Item = AlcoholType | AlcoholSubtype | Brand | BeerFlavour;
const kinds: Kind[] = ['types', 'subtypes', 'brands', 'flavours'];
const parentKind = (kind: Kind) => kind === 'subtypes' ? 'types' : kind === 'flavours' ? 'brands' : undefined;

export const UserDefinedPage = () => {
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const kind = kinds.includes(params.get('kind') as Kind) ? params.get('kind') as Kind : 'types';
  const rawParentId = params.get('parentId') ?? undefined;
  const parentId = parsePositiveId(rawParentId);
  const [search, setSearch] = useState('');
  const [inspecting, setInspecting] = useState<Item | null>(null);
  const [publishing, setPublishing] = useState<Item | null>(null);
  const types = useQuery({ queryKey: keys.types, queryFn: getDefaultTypes, enabled: kind === 'subtypes' });
  const brands = useQuery({ queryKey: keys.brands, queryFn: getDefaultBrands, enabled: kind === 'flavours' });
  const userTypes = useQuery({ queryKey: keys.userTypes, queryFn: getUserTypes, enabled: kind === 'types' });
  const userBrands = useQuery({ queryKey: keys.userBrands, queryFn: getUserBrands, enabled: kind === 'brands' });
  const parent = kind === 'subtypes' ? types.data?.find((item) => item.id === parentId) : brands.data?.find((item) => item.id === parentId);
  const userSubtypes = useQuery({ queryKey: keys.userSubtypes(parentId ?? 0), queryFn: () => getUserSubtypes(parentId!), enabled: kind === 'subtypes' && !!parent && parentId !== undefined });
  const userFlavours = useQuery({ queryKey: keys.userFlavours(parentId ?? 0), queryFn: () => getUserFlavours(parentId!), enabled: kind === 'flavours' && !!parent && parentId !== undefined });
  const palettes = useQuery({ queryKey: keys.palettes, queryFn: getPalettes });
  const glassware = useQuery({ queryKey: keys.glassware, queryFn: getGlassware });
  const invalidateSource = async (item: Item, itemKind: Kind) => {
    if (itemKind === 'subtypes') await Promise.all([client.invalidateQueries({ queryKey: keys.userSubtypes((item as AlcoholSubtype).alcoholTypeId) }), client.invalidateQueries({ queryKey: keys.subtypes((item as AlcoholSubtype).alcoholTypeId) })]);
    else if (itemKind === 'flavours') await Promise.all([client.invalidateQueries({ queryKey: keys.userFlavours((item as BeerFlavour).brandId) }), client.invalidateQueries({ queryKey: keys.flavours((item as BeerFlavour).brandId) })]);
    else await Promise.all([client.invalidateQueries({ queryKey: itemKind === 'types' ? keys.userTypes : keys.userBrands }), client.invalidateQueries({ queryKey: itemKind === 'types' ? keys.types : keys.brands })]);
  };
  const publish = useMutation({
    mutationFn: ({ kind: itemKind, id }: { kind: Kind; id: number }) => itemKind === 'types' ? publishType(id) : itemKind === 'subtypes' ? publishSubtype(id) : itemKind === 'brands' ? publishBrand(id) : publishFlavour(id),
    onSuccess: async (_, variables) => {
      const current = collections.find((item) => item.id === variables.id);
      if (current) await invalidateSource(current, variables.kind);
      await Promise.all([client.invalidateQueries({ queryKey: keys.recommendations }), client.invalidateQueries({ queryKey: keys.types }), client.invalidateQueries({ queryKey: keys.brands })]);
      setPublishing(null);
    },
    onError: async (error) => { if (apiStatus(error) === 404) await refetch(); },
  });
  const collections = kind === 'types' ? userTypes.data ?? [] : kind === 'subtypes' ? userSubtypes.data ?? [] : kind === 'brands' ? userBrands.data ?? [] : userFlavours.data ?? [];
  const palettesById = new Map((palettes.data ?? []).map((row) => [row.id, row]));
  const glassById = new Map((glassware.data ?? []).map((row) => [row.id, row]));
  const rows = collections.filter((item) => item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const parentQuery = kind === 'subtypes' ? types : kind === 'flavours' ? brands : undefined;
  const collectionQuery = kind === 'types' ? userTypes : kind === 'brands' ? userBrands : kind === 'subtypes' ? userSubtypes : userFlavours;
  const queries = [parentQuery, collectionQuery, palettes, glassware].filter((query) => query?.isEnabled !== false);
  const loading = queries.some((query) => query?.isPending);
  const failed = queries.find((query) => query?.isError);
  const refetch = () => { for (const query of queries) if (query?.isError) void query.refetch(); };
  const changeKind = (_: SyntheticEvent, value: Kind) => { setSearch(''); setParams(value === 'types' ? {} : { kind: value }); };
  const setParent = (value: string) => setParams({ kind, ...(value ? { parentId: value } : {}) });
  const parentRows = parentKind(kind) === 'types' ? types.data ?? [] : brands.data ?? [];
  const requiresParent = kind === 'subtypes' || kind === 'flavours';
  const invalidParent = requiresParent && (parentId === undefined || !parent);

  return <section>
    <Typography variant="h1" className="page-title">User-defined catalogue</Typography>
    <Tabs value={kind} onChange={changeKind} aria-label="User-defined collection type" variant="scrollable" scrollButtons="auto">
      <Tab id="user-tab-types" aria-controls="user-panel" value="types" label="Types" /><Tab id="user-tab-subtypes" aria-controls="user-panel" value="subtypes" label="Subtypes" /><Tab id="user-tab-brands" aria-controls="user-panel" value="brands" label="Brands" /><Tab id="user-tab-flavours" aria-controls="user-panel" value="flavours" label="Flavours" />
    </Tabs>
    <div id="user-panel" role="tabpanel" aria-labelledby={`user-tab-${kind}`} tabIndex={0}>
    {requiresParent && <TextField select fullWidth label={`Default ${parentKind(kind) === 'types' ? 'alcohol type' : 'beer brand'}`} value={parent && parentId !== undefined ? String(parentId) : ''} onChange={(event) => setParent(event.target.value)} sx={{ my: 2 }}>
      {parentRows.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
    </TextField>}
    {invalidParent ? <Alert severity="info" role="status">Choose a default {parentKind(kind) === 'types' ? 'alcohol type' : 'beer brand'} to inspect its user-defined {kind}.</Alert> : <>
      <TextField fullWidth label={`Search user-defined ${kind}`} value={search} onChange={(event) => setSearch(event.target.value)} sx={{ my: 2 }} />
      <PageState loading={loading} error={failed ? apiErrorMessage(failed.error, 'load') : undefined} onRetry={refetch} empty={!loading && rows.length === 0} filteredEmpty={!!search.trim()}>
        <div className="catalog-grid">{rows.map((item) => {
          const inheritedPaletteId = 'alcoholTypeId' in item ? types.data?.find((row) => row.id === item.alcoholTypeId)?.colorPaletteId : 'brandId' in item ? brands.data?.find((row) => row.id === item.brandId)?.colorPaletteId : null;
          const paletteId = typeof item.colorPaletteId === 'number' ? item.colorPaletteId : typeof inheritedPaletteId === 'number' ? inheritedPaletteId : undefined;
          const directGlasswareId = 'glasswareId' in item && typeof item.glasswareId === 'number' ? item.glasswareId : undefined;
          const inheritedGlasswareId = 'alcoholTypeId' in item ? types.data?.find((row) => row.id === item.alcoholTypeId)?.glasswareId : undefined;
          const glasswareId = directGlasswareId ?? inheritedGlasswareId;
          const palette = paletteId === undefined ? undefined : palettesById.get(paletteId); const glass = glasswareId != null ? glassById.get(glasswareId) : undefined;
          return <article className="recommendation-card" key={item.id}>
            <div className="recommendation-summary"><Typography variant="h2">{item.name}</Typography><Typography className="catalog-detail">{parent && `${parent.name} · `}{'userId' in item ? `Owner: ${item.userId ?? 'Unknown'}` : ''}{palette ? ` · Palette: ${palette.name}` : ''}{glass ? ` · Glassware: ${glass.name}` : ''}</Typography><DrinkPreview label={item.name} glassware={glass} palette={palette} /></div>
            <div className="recommendation-actions"><Button onClick={() => setInspecting(item)}>Inspect {item.name}</Button><Button variant="contained" onClick={() => { publish.reset(); setPublishing(item); }}>Publish {item.name}</Button></div>
          </article>;
        })}</div>
      </PageState>
    </>}
    <Dialog open={!!inspecting} onClose={() => setInspecting(null)} aria-labelledby="inspect-title"><DialogTitle id="inspect-title">Inspect {inspecting?.name}</DialogTitle><DialogContent><pre>{inspecting ? JSON.stringify(inspecting, null, 2) : ''}</pre></DialogContent><DialogActions><Button onClick={() => setInspecting(null)}>Close</Button></DialogActions></Dialog>
    <ConfirmDialog open={!!publishing} title={`Publish ${publishing?.name ?? 'entry'}?`} description="Publishing moves this entry into the default catalogue. There is no undo; any user-defined children remain user-defined." pending={publish.isPending} error={publish.error ? apiErrorMessage(publish.error) : undefined} onClose={() => { if (!publish.isPending) setPublishing(null); }} onConfirm={() => publishing && void publish.mutateAsync({ kind, id: publishing.id }).catch(() => undefined)} />
    </div>
  </section>;
};

export default UserDefinedPage;
