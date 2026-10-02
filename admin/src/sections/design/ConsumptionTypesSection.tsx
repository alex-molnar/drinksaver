import { useState, type FormEvent } from 'react';
import { Alert, Button, Link as MuiLink, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createConsumptionType, deleteConsumptionType, getConsumptionTypes, getGlassware, updateConsumptionType } from '../../api/admin';
import { apiErrorMessage, apiStatus } from '../../api/errors';
import { keys } from '../../api/queries';
import { CatalogCard } from '../../components/CatalogCard';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DesignSelect } from '../../components/DesignSelect';
import { DrinkPreview } from '../../components/DrinkPreview';
import { EditorDialog } from '../../components/EditorDialog';
import { PageState } from '../../components/PageState';
import type { ConsumptionType, NewConsumptionType } from '../../types/api';

type ConsumptionValues = { name: string; glasswareId: number | '' };
type ConsumptionSave = { id: number; input: Partial<Pick<ConsumptionType, 'name' | 'glasswareId'>> } | { id?: undefined; input: NewConsumptionType };

const invalidateDesign = (client: ReturnType<typeof useQueryClient>) => Promise.all([
  client.invalidateQueries({ queryKey: ['design'] }),
  client.invalidateQueries({ queryKey: ['default'] }),
]);

export const ConsumptionTypesSection = () => {
  const client = useQueryClient();
  const consumptionTypes = useQuery({ queryKey: keys.consumptionTypes, queryFn: getConsumptionTypes });
  const glassware = useQuery({ queryKey: keys.glassware, queryFn: getGlassware });
  const [editor, setEditor] = useState<ConsumptionType | null | undefined>();
  const [deleting, setDeleting] = useState<ConsumptionType | null>(null);
  const save = useMutation({
    mutationFn: ({ id, input }: ConsumptionSave) => id === undefined ? createConsumptionType(input as NewConsumptionType) : updateConsumptionType(id, input as Partial<Pick<ConsumptionType, 'name' | 'glasswareId'>>),
    onSuccess: async () => { await invalidateDesign(client); setEditor(undefined); },
    onError: async (error) => { if (apiStatus(error) === 404) await invalidateDesign(client); },
  });
  const remove = useMutation({
    mutationFn: deleteConsumptionType,
    onSuccess: async () => { await invalidateDesign(client); setDeleting(null); },
    onError: async (error) => { if (apiStatus(error) === 404) await invalidateDesign(client); },
  });
  const submit = async (values: ConsumptionValues) => {
    if (values.glasswareId === '') return;
    const input = editor
      ? { ...(values.name !== editor.name ? { name: values.name } : {}), ...(values.glasswareId !== editor.glasswareId ? { glasswareId: values.glasswareId } : {}) }
      : { name: values.name, glasswareId: values.glasswareId };
    if (editor && Object.keys(input).length === 0) { setEditor(undefined); return; }
    try { await save.mutateAsync({ id: editor?.id, input } as ConsumptionSave); } catch { /* keep the form draft for correction or retry */ }
  };
  const glassById = new Map((glassware.data ?? []).map((row) => [row.id, row]));

  return <section aria-labelledby="consumption-heading">
    <div className="page-heading-row">
      <Typography id="consumption-heading" variant="h2" className="section-title">Consumption types</Typography>
      <Button variant="contained" disabled={!glassware.data?.length} onClick={() => { save.reset(); setEditor(null); }}>New consumption type</Button>
    </div>
    <PageState loading={consumptionTypes.isPending} error={consumptionTypes.isError ? apiErrorMessage(consumptionTypes.error, 'load') : undefined} onRetry={() => void consumptionTypes.refetch()} empty={consumptionTypes.isSuccess && consumptionTypes.data.length === 0} emptyAction={<Button variant="outlined" disabled={!glassware.data?.length} onClick={() => setEditor(null)}>Add consumption type</Button>}>
      <div className="catalog-grid">{(consumptionTypes.data ?? []).map((item) => {
        const glass = item.glasswareId === null ? undefined : glassById.get(item.glasswareId);
        return <CatalogCard key={item.id} name={item.name} preview={<DrinkPreview label={item.name} glassware={glass} />} details={<Typography className="catalog-detail">Glassware: {glass?.name ?? 'Not assigned'}</Typography>} onEdit={() => { save.reset(); setEditor(item); }} onDelete={() => { remove.reset(); setDeleting(item); }} />;
      })}</div>
    </PageState>
    {glassware.isError && <Alert severity="error" role="alert" action={<Button color="inherit" onClick={() => void glassware.refetch()}>Retry</Button>}>Glassware options could not be loaded.</Alert>}
    {glassware.isSuccess && glassware.data.length === 0 && <Alert severity="info" action={<MuiLink component={Link} to="/design?tab=glassware">Open Glassware</MuiLink>}>Create glassware before adding a consumption type.</Alert>}
    {editor !== undefined && <ConsumptionEditor key={editor?.id ?? 'new-consumption-type'} initial={editor ?? undefined} glassware={glassware.data ?? []} pending={save.isPending} error={save.error ? apiErrorMessage(save.error) : undefined} onClose={() => { if (!save.isPending) setEditor(undefined); }} onSubmit={(values) => void submit(values)} />}
    <ConfirmDialog open={Boolean(deleting)} title={`Delete ${deleting?.name ?? 'consumption type'}?`} description="This entry can only be deleted if no other records refer to it." pending={remove.isPending} error={remove.error ? apiErrorMessage(remove.error, 'delete') : undefined} onClose={() => { if (!remove.isPending) setDeleting(null); }} onConfirm={() => deleting && void remove.mutateAsync(deleting.id).catch(() => undefined)} />
  </section>;
};

const ConsumptionEditor = ({ initial, glassware, pending, error, onClose, onSubmit }: { initial?: ConsumptionType; glassware: { id: number; name: string }[]; pending: boolean; error?: string; onClose: () => void; onSubmit: (values: ConsumptionValues) => void }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [glasswareId, setGlasswareId] = useState<number | ''>(initial?.glasswareId ?? '');
  const [validationError, setValidationError] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || glasswareId === '') { setValidationError('Enter a name and choose glassware.'); return; }
    setValidationError('');
    onSubmit({ name: name.trim(), glasswareId });
  };
  return <EditorDialog open title={initial ? `Edit ${initial.name}` : 'Create consumption type'} submitLabel={initial ? 'Save consumption type' : 'Create consumption type'} pending={pending} error={error} noValidate onClose={onClose} onSubmit={submit}>
    <Stack spacing={2} sx={{ pt: 1 }}>
      <TextField required label="Name" value={name} onChange={(event) => setName(event.target.value)} />
      <DesignSelect label="Glassware" value={glasswareId} rows={glassware} required onChange={setGlasswareId} />
      {validationError && <Alert severity="error" role="alert">{validationError}</Alert>}
    </Stack>
  </EditorDialog>;
};

export default ConsumptionTypesSection;
