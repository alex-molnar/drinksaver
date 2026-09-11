import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { getSavedDrinksByDate } from '../api/endpoints';
import { useSaveQueue } from './useSaveQueue';
import { pendingInsertsForDate, suppressedIdsForDate, type SaveQueueState } from './saveQueueReducer';
import { drinkIdentity } from './identity';
import type { EditableDrink } from '../types/api';

/**
 * How many decorative pips `DayStrip` draws per day at most. Matches the approved prototype's
 * `.pips` row, which slices to the same number before mapping to swatches.
 */
const MAX_SWATCHES = 4;

/**
 * A day's read state for the seven day strip. Mirrors `DrinksForDate`'s discriminated shape for
 * exactly the same reason: a bare number would be a confident lie while the day's query is still
 * pending, since a day with six drinks and a day nobody has asked about yet would both render as
 * "0" without this distinction. See the design doc's "Known gaps": marks are drawn only for days
 * already fetched, and a day still loading gets its own mark rather than an empty one.
 */
export type DayCount =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      count: number;
      /** Up to `MAX_SWATCHES` enamel field colours, one per drink, oldest first - decorative
       *  only (see `identity.ts`'s module doc on why a field colour is never contrast gated on
       *  its own), so a day with more drinks than swatches still reports its true `count`. */
      swatches: readonly string[];
    };

/**
 * One day's count and decorative swatches, read the same way `useDrinksForDate` reads a single
 * day: the server's rows for `date`, minus whatever the save queue is suppressing, plus the
 * queue's own pending inserts. Applying the same merge here is what keeps a day's pip in the
 * strip agreeing with the paper tab's row count the instant a save or delete is queued, rather
 * than only once a refetch lands.
 */
const readDay = (date: string, result: UseQueryResult<EditableDrink[], Error>, queue: SaveQueueState): DayCount => {
  if (result.isPending) {
    return { status: 'loading' };
  }
  if (result.isError) {
    return { status: 'error' };
  }

  const suppressed = suppressedIdsForDate(queue, date);
  const kept = result.data.filter((row) => !suppressed.has(row.id));

  const keptIds = new Set(kept.map((row) => row.id));
  const pending = pendingInsertsForDate(queue, date).filter((row) => !keptIds.has(row.id));

  const rows = [...kept, ...pending];
  const swatches = rows.slice(0, MAX_SWATCHES).map((row) => drinkIdentity(row.name, row.alcoholTypeId).field);

  return { status: 'ready', count: rows.length, swatches };
};

/**
 * Per-day counts for the seven day strip, read with `useQueries` rather than seven separate
 * `useDrinksForDate` calls so the number of hooks does not vary with the number of dates. Each
 * query shares its cache entry (`['drinks', date]`) with `useDrinksForDate`, so viewing a date
 * that is also one of the seven costs no extra request, and deleting or saving on that date
 * updates both places from the same queue read.
 *
 * A long `staleTime`: these are decorative marks under a day tab, not the record `PaperTab`
 * renders from, so refetching them aggressively buys nothing, and a rolling seven day window
 * would otherwise re-request the same six days on every mount.
 */
const DAY_COUNT_STALE_TIME_MS = 5 * 60 * 1000;

export const useDayCounts = (dates: readonly string[]): readonly DayCount[] => {
  const { queue } = useSaveQueue();

  const results = useQueries({
    queries: dates.map((date) => ({
      queryKey: ['drinks', date],
      queryFn: () => getSavedDrinksByDate(date),
      staleTime: DAY_COUNT_STALE_TIME_MS,
    })),
  });

  return results.map((result, i) => readDay(dates[i], result, queue));
};

export default useDayCounts;
