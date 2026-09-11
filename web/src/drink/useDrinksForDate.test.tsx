import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDrinksForDate } from './useDrinksForDate';
import { SaveQueueContext, type SaveQueueContextType } from './SaveQueueContext';
import { getSavedDrinksByDate } from '../api/endpoints';
import { EMPTY_QUEUE, type SaveQueueEntry, type SaveQueueState } from './saveQueueReducer';
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

const serverRows: EditableDrink[] = [
  { id: 1, name: 'Heineken (Draft/Tap - 0.50l)', alcoholTypeId: 4 },
  { id: 2, name: 'Red Wine', alcoholTypeId: 30 },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDrinksForDate', () => {
  it('is loading while the query is pending', () => {
    mockGetSavedDrinksByDate.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useDrinksForDate('2026-09-10'), { wrapper: wrapperWithQueue(EMPTY_QUEUE) });
    expect(result.current).toEqual({ status: 'loading' });
  });

  it('is an error when the query rejects', async () => {
    mockGetSavedDrinksByDate.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useDrinksForDate('2026-09-10'), { wrapper: wrapperWithQueue(EMPTY_QUEUE) });
    await waitFor(() => expect(result.current).toEqual({ status: 'error' }));
  });

  it('is ready with the server rows when the queue is empty', async () => {
    mockGetSavedDrinksByDate.mockResolvedValue(serverRows);
    const { result } = renderHook(() => useDrinksForDate('2026-09-10'), { wrapper: wrapperWithQueue(EMPTY_QUEUE) });
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', rows: serverRows }));
  });

  it('hides a row whose id a pending delete suppresses', async () => {
    mockGetSavedDrinksByDate.mockResolvedValue(serverRows);
    const deleteEntry: SaveQueueEntry = {
      id: 'd1',
      kind: 'delete',
      status: 'undoable',
      label: 'Heineken',
      date: '2026-09-10',
      drinkIds: [1],
      undoUntil: 9000,
      error: null,
      seq: 1,
      createdAt: 1000,
    };
    const { result } = renderHook(() => useDrinksForDate('2026-09-10'), {
      wrapper: wrapperWithQueue({ entries: [deleteEntry] }),
    });
    await waitFor(() =>
      expect(result.current).toEqual({ status: 'ready', rows: [{ id: 2, name: 'Red Wine', alcoholTypeId: 30 }] })
    );
  });

  it('adds a pending save as a provisional row', async () => {
    mockGetSavedDrinksByDate.mockResolvedValue(serverRows);
    const saveEntry: SaveQueueEntry = {
      id: 's1',
      kind: 'save',
      status: 'undoable',
      label: 'Duvel bottle',
      date: '2026-09-10',
      drinkIds: [42],
      alcoholTypeId: 4,
      payload: { alcoholTypeId: 4, alcoholVolumeId: 10 },
      undoUntil: 9000,
      error: null,
      seq: 1,
      createdAt: 1000,
    };
    const { result } = renderHook(() => useDrinksForDate('2026-09-10'), {
      wrapper: wrapperWithQueue({ entries: [saveEntry] }),
    });
    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'ready',
        rows: [...serverRows, { id: 42, name: 'Duvel bottle', alcoholTypeId: 4 }],
      })
    );
  });

  it('does not duplicate a pending save once the server row for it has arrived', async () => {
    mockGetSavedDrinksByDate.mockResolvedValue(serverRows);
    const saveEntry: SaveQueueEntry = {
      id: 's1',
      kind: 'save',
      status: 'undoable',
      label: 'Heineken (Draft/Tap - 0.50l)',
      date: '2026-09-10',
      drinkIds: [1], // already present in serverRows
      alcoholTypeId: 4,
      payload: { alcoholTypeId: 4, alcoholVolumeId: 10 },
      undoUntil: 9000,
      error: null,
      seq: 1,
      createdAt: 1000,
    };
    const { result } = renderHook(() => useDrinksForDate('2026-09-10'), {
      wrapper: wrapperWithQueue({ entries: [saveEntry] }),
    });
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', rows: serverRows }));
  });

  it('ignores queue entries for a different date', async () => {
    mockGetSavedDrinksByDate.mockResolvedValue(serverRows);
    const saveEntry: SaveQueueEntry = {
      id: 's1',
      kind: 'save',
      status: 'undoable',
      label: 'Duvel bottle',
      date: '2026-09-09',
      drinkIds: [42],
      alcoholTypeId: 4,
      payload: { alcoholTypeId: 4, alcoholVolumeId: 10 },
      undoUntil: 9000,
      error: null,
      seq: 1,
      createdAt: 1000,
    };
    const { result } = renderHook(() => useDrinksForDate('2026-09-10'), {
      wrapper: wrapperWithQueue({ entries: [saveEntry] }),
    });
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', rows: serverRows }));
  });
});
