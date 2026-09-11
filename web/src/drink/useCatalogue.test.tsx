import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCatalogue } from './useCatalogue';
import { initialDraftState, reduceDraft } from './draftReducer';
import {
  getAlcoholTypes,
  getVolumesByAlcoholType,
  getSubtypesByAlcoholType,
  getConsumptionTypes,
  getBrands,
  getBeerFlavours,
} from '../api/endpoints';

vi.mock('../api/endpoints');

const TODAY = '2026-09-10';

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  vi.mocked(getAlcoholTypes).mockResolvedValue([
    { id: 1, name: 'Beer', volumeIds: [] },
    { id: 2, name: 'Wine', volumeIds: [] },
  ]);
  vi.mocked(getVolumesByAlcoholType).mockResolvedValue([{ id: 10, name: 'Pint', volume: 0.5 }]);
  vi.mocked(getSubtypesByAlcoholType).mockResolvedValue([{ id: 30, name: 'Red', alcoholTypeId: 2 }]);
  vi.mocked(getConsumptionTypes).mockResolvedValue([{ id: 40, name: 'Draft' }]);
  vi.mocked(getBrands).mockResolvedValue([{ id: 50, name: 'Heineken' }]);
  vi.mocked(getBeerFlavours).mockResolvedValue([{ id: 60, name: 'Lager', brandId: 50 }]);
});

describe('useCatalogue', () => {
  it('always fetches alcohol types, and nothing else, before a type is chosen', async () => {
    const { result } = renderHook(() => useCatalogue(initialDraftState(TODAY)), { wrapper });

    await waitFor(() => expect(result.current.alcoholTypes.data).toBeDefined());
    expect(getVolumesByAlcoholType).not.toHaveBeenCalled();
    expect(getSubtypesByAlcoholType).not.toHaveBeenCalled();
    expect(getConsumptionTypes).not.toHaveBeenCalled();
    expect(getBrands).not.toHaveBeenCalled();
    expect(getBeerFlavours).not.toHaveBeenCalled();
    expect(result.current.isBeer).toBe(false);
  });

  it('fetches volumes and subtypes, but not beer-only queries, once a non-beer type is chosen', async () => {
    const draft = reduceDraft(initialDraftState(TODAY), { type: 'select', field: 'alcoholType', id: 2 });
    const { result } = renderHook(() => useCatalogue(draft), { wrapper });

    await waitFor(() => expect(result.current.subtypes.data).toBeDefined());
    expect(getVolumesByAlcoholType).toHaveBeenCalledWith(2);
    expect(getSubtypesByAlcoholType).toHaveBeenCalledWith(2);
    expect(getConsumptionTypes).not.toHaveBeenCalled();
    expect(getBrands).not.toHaveBeenCalled();
    expect(result.current.isBeer).toBe(false);
  });

  it('fetches consumption types and brands, not subtypes, once Beer is chosen', async () => {
    // Realistic sequencing, not Beer selected from the first render: a user can only pick Beer
    // from a list `alcoholTypes` has already populated, so the type list is resolved first and
    // the draft is updated after, the same order `MenuPanel` and `OptionPanel` produce it in.
    const { result, rerender } = renderHook((draft) => useCatalogue(draft), {
      wrapper,
      initialProps: initialDraftState(TODAY),
    });
    await waitFor(() => expect(result.current.alcoholTypes.data).toBeDefined());

    rerender(reduceDraft(initialDraftState(TODAY), { type: 'select', field: 'alcoholType', id: 1 }));

    await waitFor(() => expect(result.current.isBeer).toBe(true));
    await waitFor(() => expect(result.current.brands.data).toBeDefined());
    expect(getConsumptionTypes).toHaveBeenCalled();
    expect(getBrands).toHaveBeenCalled();
    expect(getSubtypesByAlcoholType).not.toHaveBeenCalled();
    expect(getBeerFlavours).not.toHaveBeenCalled();
  });

  it('fetches beer flavours only once a brand is also chosen', async () => {
    const draft = [
      { type: 'select' as const, field: 'alcoholType' as const, id: 1 },
      { type: 'select' as const, field: 'brand' as const, id: 50 },
    ].reduce(reduceDraft, initialDraftState(TODAY));
    const { result } = renderHook(() => useCatalogue(draft), { wrapper });

    await waitFor(() => expect(result.current.beerFlavours.data).toBeDefined());
    expect(getBeerFlavours).toHaveBeenCalledWith(50);
  });
});
