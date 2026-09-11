import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDayCounts } from './useDayCounts';
import { SaveQueueContext, type SaveQueueContextType } from './SaveQueueContext';
import { getSavedDrinksByDate } from '../api/endpoints';
import { EMPTY_QUEUE, type SaveQueueEntry, type SaveQueueState } from './saveQueueReducer';
import { drinkIdentity } from './identity';
import type { EditableDrink } from '../types/api';

vi.mock('../api/endpoints');

const mockGetSavedDrinksByDate = vi.mocked(getSavedDrinksByDate);

const stubSaveQueue = (queue: SaveQueueState): SaveQueueContextType => ({
  queue,
  current: null,
  save: vi.fn(),
  remove: vi.fn(),
  undo: vi.fn(),
  retry: vi.fn(),
  stripHandlers: { onPointerEnter: vi.fn(), onPointerLeave: vi.fn(), onFocus: vi.fn(), onBlur: vi.fn() },
});

const wrapperWithQueue = (queue: SaveQueueState) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <SaveQueueContext.Provider value={stubSaveQueue(queue)}>{children}</SaveQueueContext.Provider>
    </QueryClientProvider>
  );
  return Wrapper;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDayCounts', () => {
  /**
   * The distinction the whole day strip rests on. `getSavedDrinksByDate` is per-day and there is
   * no range endpoint, so the strip cannot know every day up front: a day it has not fetched yet
   * must report a status distinct from a day it has fetched and found empty, or the strip cannot
   * help but draw them the same way - an unread day would silently claim to be an empty one.
   */
  it('reports a day still loading as distinct from a day that resolved to zero drinks', async () => {
    mockGetSavedDrinksByDate.mockImplementation((date: string) =>
      date === '2026-09-10' ? new Promise<EditableDrink[]>(() => {}) : Promise.resolve([])
    );

    const { result } = renderHook(() => useDayCounts(['2026-09-09', '2026-09-10']), {
      wrapper: wrapperWithQueue(EMPTY_QUEUE),
    });

    await waitFor(() => expect(result.current[0]).toEqual({ status: 'ready', count: 0, swatches: [] }));
    // Still not resolved - must not be reported the same way as the day above, which is
    // genuinely, confirmedly empty.
    expect(result.current[1]).toEqual({ status: 'loading' });
  });

  it("is an error when a day's query rejects", async () => {
    mockGetSavedDrinksByDate.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useDayCounts(['2026-09-10']), { wrapper: wrapperWithQueue(EMPTY_QUEUE) });

    await waitFor(() => expect(result.current[0]).toEqual({ status: 'error' }));
  });

  it('returns one entry per date, in the same order given', async () => {
    mockGetSavedDrinksByDate.mockResolvedValue([]);
    const dates = ['2026-09-04', '2026-09-05', '2026-09-06'];

    const { result } = renderHook(() => useDayCounts(dates), { wrapper: wrapperWithQueue(EMPTY_QUEUE) });

    await waitFor(() => expect(result.current.every((d) => d.status === 'ready')).toBe(true));
    expect(result.current).toHaveLength(3);
  });

  it('counts the server rows for a day with no queue activity', async () => {
    mockGetSavedDrinksByDate.mockResolvedValue([{ id: 1, name: 'Heineken pint', alcoholTypeId: 4 }]);

    const { result } = renderHook(() => useDayCounts(['2026-09-08']), { wrapper: wrapperWithQueue(EMPTY_QUEUE) });

    await waitFor(() => expect(result.current[0].status).toBe('ready'));
    expect(result.current[0]).toMatchObject({ status: 'ready', count: 1 });
  });

  it('excludes an id a pending delete suppresses from the count', async () => {
    mockGetSavedDrinksByDate.mockResolvedValue([
      { id: 1, name: 'Heineken pint', alcoholTypeId: 4 },
      { id: 2, name: 'Red Wine', alcoholTypeId: 30 },
    ]);
    const deleteEntry: SaveQueueEntry = {
      id: 'd1',
      kind: 'delete',
      status: 'undoable',
      label: 'Heineken pint',
      date: '2026-09-08',
      drinkIds: [1],
      undoUntil: 9000,
      error: null,
      seq: 1,
      createdAt: 1000,
    };

    const { result } = renderHook(() => useDayCounts(['2026-09-08']), {
      wrapper: wrapperWithQueue({ entries: [deleteEntry] }),
    });

    await waitFor(() => expect(result.current[0].status).toBe('ready'));
    expect(result.current[0]).toMatchObject({ status: 'ready', count: 1 });
  });

  it('includes a pending insert not yet reflected by the server in the count', async () => {
    mockGetSavedDrinksByDate.mockResolvedValue([]);
    const saveEntry: SaveQueueEntry = {
      id: 's1',
      kind: 'save',
      status: 'undoable',
      label: 'Duvel bottle',
      date: '2026-09-08',
      drinkIds: [42],
      alcoholTypeId: 4,
      payload: { alcoholTypeId: 4, alcoholVolumeId: 10 },
      undoUntil: 9000,
      error: null,
      seq: 1,
      createdAt: 1000,
    };

    const { result } = renderHook(() => useDayCounts(['2026-09-08']), {
      wrapper: wrapperWithQueue({ entries: [saveEntry] }),
    });

    await waitFor(() => expect(result.current[0].status).toBe('ready'));
    expect(result.current[0]).toMatchObject({ status: 'ready', count: 1 });
  });

  it("derives swatches from each row's drink identity field, in row order", async () => {
    mockGetSavedDrinksByDate.mockResolvedValue([
      { id: 1, name: 'Heineken pint', alcoholTypeId: 4 },
      { id: 2, name: 'Glass of red', alcoholTypeId: 30 },
    ]);

    const { result } = renderHook(() => useDayCounts(['2026-09-08']), { wrapper: wrapperWithQueue(EMPTY_QUEUE) });

    await waitFor(() => expect(result.current[0].status).toBe('ready'));
    expect(result.current[0]).toMatchObject({
      swatches: [drinkIdentity('Heineken pint', 4).field, drinkIdentity('Glass of red', 30).field],
    });
  });

  it('caps swatches at four even when a day has more drinks, without capping the count', async () => {
    mockGetSavedDrinksByDate.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: 'Heineken pint', alcoholTypeId: 4 }))
    );

    const { result } = renderHook(() => useDayCounts(['2026-09-08']), { wrapper: wrapperWithQueue(EMPTY_QUEUE) });

    await waitFor(() => expect(result.current[0].status).toBe('ready'));
    const entry = result.current[0];
    expect(entry).toMatchObject({ count: 6 });
    if (entry.status === 'ready') {
      expect(entry.swatches).toHaveLength(4);
    }
  });
});
