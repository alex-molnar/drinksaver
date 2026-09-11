import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useCreateCatalogueEntry } from './useCreateCatalogueEntry';
import { useDraft } from './useDraft';
import { DraftProvider } from './DraftProvider';
import {
  createAlcoholType,
  createVolumeForAlcoholType,
  createSubtypeForAlcoholType,
  createBrand,
  createBeerFlavour,
} from '../api/endpoints';

vi.mock('../api/endpoints');

let client: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <DraftProvider>{children}</DraftProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

const useHarness = (onAdopted?: () => void) => ({
  draft: useDraft(),
  mutation: useCreateCatalogueEntry(onAdopted),
});

beforeEach(() => {
  vi.mocked(createAlcoholType).mockResolvedValue({ id: 101, name: 'Whiskey', volumeIds: [] });
  vi.mocked(createVolumeForAlcoholType).mockResolvedValue({ id: 102, name: 'Shot', volume: 0.04 });
  vi.mocked(createSubtypeForAlcoholType).mockResolvedValue({ id: 103, alcoholTypeId: 2, name: 'Single Malt' });
  vi.mocked(createBrand).mockResolvedValue({ id: 104, name: 'Corona' });
  vi.mocked(createBeerFlavour).mockResolvedValue({ id: 105, brandId: 50, name: 'Radler' });
});

describe('useCreateCatalogueEntry', () => {
  it('creates an alcohol type, invalidates its query, and adopts it into the draft', async () => {
    const onAdopted = vi.fn();
    const { result } = renderHook(() => useHarness(onAdopted), { wrapper });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    act(() => {
      result.current.mutation.mutate({ field: 'alcoholType', name: 'Whiskey' });
    });

    await waitFor(() => expect(result.current.draft.draft.alcoholTypeId).toBe(101));
    expect(createAlcoholType).toHaveBeenCalledWith({ name: 'Whiskey' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['alcoholTypes'] });
    expect(onAdopted).toHaveBeenCalled();
  });

  it('creates a volume for the given alcohol type and adopts it', async () => {
    const { result } = renderHook(() => useHarness(), { wrapper });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    act(() => {
      result.current.mutation.mutate({ field: 'volume', name: 'Shot', alcoholTypeId: 7, volume: 0.04 });
    });

    await waitFor(() => expect(result.current.draft.draft.volumeId).toBe(102));
    expect(createVolumeForAlcoholType).toHaveBeenCalledWith(7, { name: 'Shot', volume: 0.04 });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['volumes', 7] });
  });

  it('creates a subtype for the given alcohol type and adopts it', async () => {
    const { result } = renderHook(() => useHarness(), { wrapper });

    act(() => {
      result.current.mutation.mutate({ field: 'subtype', name: 'Single Malt', alcoholTypeId: 2 });
    });

    await waitFor(() => expect(result.current.draft.draft.subtypeId).toBe(103));
    expect(createSubtypeForAlcoholType).toHaveBeenCalledWith(2, 'Single Malt');
  });

  it('creates a brand and adopts it, clearing any previously chosen flavour', async () => {
    const { result } = renderHook(() => useHarness(), { wrapper });

    act(() => {
      result.current.draft.dispatch({ type: 'select', field: 'beerFlavour', id: 999 });
    });
    act(() => {
      result.current.mutation.mutate({ field: 'brand', name: 'Corona' });
    });

    await waitFor(() => expect(result.current.draft.draft.brandId).toBe(104));
    expect(result.current.draft.draft.beerFlavourId).toBeNull();
  });

  it('creates a beer flavour for the given brand and adopts it', async () => {
    const { result } = renderHook(() => useHarness(), { wrapper });

    act(() => {
      result.current.mutation.mutate({ field: 'beerFlavour', name: 'Radler', brandId: 50 });
    });

    await waitFor(() => expect(result.current.draft.draft.beerFlavourId).toBe(105));
    expect(createBeerFlavour).toHaveBeenCalledWith(50, 'Radler');
  });

  it('rejects a volume creation missing its alcohol type context rather than silently misfiling it', async () => {
    const { result } = renderHook(() => useHarness(), { wrapper });

    act(() => {
      result.current.mutation.mutate({ field: 'volume', name: 'Shot' });
    });

    await waitFor(() => expect(result.current.mutation.isError).toBe(true));
    expect(createVolumeForAlcoholType).not.toHaveBeenCalled();
  });

  it('rejects a beer flavour creation missing its brand context', async () => {
    const { result } = renderHook(() => useHarness(), { wrapper });

    act(() => {
      result.current.mutation.mutate({ field: 'beerFlavour', name: 'Radler' });
    });

    await waitFor(() => expect(result.current.mutation.isError).toBe(true));
    expect(createBeerFlavour).not.toHaveBeenCalled();
  });
});
