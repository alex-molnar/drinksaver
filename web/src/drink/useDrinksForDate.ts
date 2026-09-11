import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSavedDrinksByDate } from '../api/endpoints';
import { useSaveQueue } from './useSaveQueue';
import { pendingInsertsForDate, suppressedIdsForDate } from './saveQueueReducer';
import type { EditableDrink } from '../types/api';

/**
 * A discriminated status, never a bare array. A bare array is a confident lie while the query is
 * still pending: a day with six saved drinks would render as zero, then jump to six once it
 * resolves, and a caller with no way to tell "empty" from "not loaded yet" cannot tell the
 * difference either.
 */
export type DrinksForDate =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; rows: EditableDrink[] };

/**
 * The read model both `IndexPage` and `HistoryPage` build on. Merges the server's rows for
 * `date` with the save queue: server rows minus ids a pending delete suppresses, plus the
 * queue's pending inserts, deduped against whatever the server has already returned. See the
 * design doc, "Optimism without optimistic cache writes" - `setQueryData` is never used, so this
 * merge, not the cache, is where the optimism lives.
 */
export const useDrinksForDate = (date: string): DrinksForDate => {
  const { queue } = useSaveQueue();
  const query = useQuery({ queryKey: ['drinks', date], queryFn: () => getSavedDrinksByDate(date) });

  return useMemo(() => {
    if (query.isPending) {
      return { status: 'loading' };
    }
    if (query.isError) {
      return { status: 'error' };
    }

    const suppressed = suppressedIdsForDate(queue, date);
    const kept = query.data.filter((row) => !suppressed.has(row.id));

    const keptIds = new Set(kept.map((row) => row.id));
    const pending = pendingInsertsForDate(queue, date).filter((row) => !keptIds.has(row.id));

    return { status: 'ready', rows: [...kept, ...pending] };
  }, [query.isPending, query.isError, query.data, queue, date]);
};
