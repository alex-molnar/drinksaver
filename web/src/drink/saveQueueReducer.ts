/**
 * The save queue's state machine. Pure: every transition takes `now` as an argument, and nothing
 * in this module reads the clock itself, so the window, the sweep and the expiry are all testable
 * without faking time. See `useUndoTimer.ts` for the 6.5s window constant and the pause-on-hover
 * mechanics, and `SaveQueueProvider.tsx` for the timers, mutations and lifecycle listeners that
 * drive this reducer.
 *
 * Two kinds of entry share one state machine, on purpose, because "saving is immediate, deleting
 * is deferred" (see the design doc) is an asymmetry in *when the network call happens*, not a
 * reason for two queues:
 *
 * - A **save** fires its POST immediately, so it starts in `saving`, moves to `saved` once the
 *   server confirms the ids, and only then becomes `undoable`.
 * - A **delete** has nothing to send yet when it is created, so it starts directly in
 *   `undoable`: the row is hidden right away, and the DELETE itself is deferred until the window
 *   closes (or a flush trigger fires), at which point it becomes `saving` again - now meaning "the
 *   DELETE is in flight" rather than "the POST is in flight" - and finally `committed`.
 *
 * `undoing -> undone` is the mirror of that for whichever kind is undone: undoing a save deletes
 * the ids it created (a real network call), undoing a delete simply means the DELETE is never
 * sent (no call at all), but both are the same reducer transition either way, decided by the
 * provider rather than by this module.
 */

import type { saveDrink } from '../api/endpoints';
import type { EditableDrink } from '../types/api';

export type SaveQueueEntryKind = 'save' | 'delete';

export type SaveQueueEntryStatus =
  | 'saving'
  | 'saved'
  | 'undoable'
  | 'undoing'
  | 'undone'
  | 'committed'
  | 'failed';

/** The shape `saveDrink` accepts, reused rather than redeclared so the two cannot drift apart. */
export type SaveDrinkPayload = Parameters<typeof saveDrink>[0];

export interface SaveQueueError {
  /** A `RetryClassification` from `retryPolicy.ts`, kept as a bare string so this module does not
   *  depend on that one; the provider is what ties classification to queue state. */
  readonly kind: string;
  readonly message: string;
  /** Only set for a 'timeout' failure: the day's row count at the moment it failed, so a retry
   *  can refetch and compare rather than blindly re-POSTing a request that may already have
   *  landed. See the provider's retry handler. */
  readonly rowCountBaseline?: number;
}

interface BaseEntry {
  /** A client-assigned correlation id. Never sent to the server, and never reused. */
  readonly id: string;
  readonly status: SaveQueueEntryStatus;
  /** The drink's display name, both for the strip's "which save Undo refers to" and, for a save
   *  entry, as the provisional row name the read model shows until a refetch replaces it with the
   *  server's composed name. */
  readonly label: string;
  /** The drinking day this entry belongs to, so `useDrinksForDate(date)` can filter to just it. */
  readonly date: string;
  /** For a save: the ids the server returned, once known. For a delete: the ids being deleted. */
  readonly drinkIds: readonly number[];
  /** Wall clock timestamp the undo window ends at. Not a countdown: see the module doc. */
  readonly undoUntil: number | null;
  readonly error: SaveQueueError | null;
  /** Monotonic creation order, used to break ties when more than one entry could be "current". */
  readonly seq: number;
  readonly createdAt: number;
}

export interface SaveEntry extends BaseEntry {
  readonly kind: 'save';
  /** The second rung of `drinkIdentity`'s lookup, needed to render a provisional history row. */
  readonly alcoholTypeId: number;
  /** Kept so a retry can re-issue the exact same POST. */
  readonly payload: SaveDrinkPayload;
}

export interface DeleteEntry extends BaseEntry {
  readonly kind: 'delete';
}

export type SaveQueueEntry = SaveEntry | DeleteEntry;

export interface SaveQueueState {
  readonly entries: readonly SaveQueueEntry[];
}

export const EMPTY_QUEUE: SaveQueueState = { entries: [] };

export type SaveQueueAction =
  | {
      type: 'save/started';
      id: string;
      seq: number;
      now: number;
      label: string;
      date: string;
      alcoholTypeId: number;
      payload: SaveDrinkPayload;
    }
  | { type: 'save/succeeded'; id: string; now: number; drinkIds: number[] }
  | { type: 'op/failed'; id: string; now: number; error: SaveQueueError }
  | {
      type: 'delete/started';
      id: string;
      seq: number;
      now: number;
      label: string;
      date: string;
      drinkIds: number[];
      undoUntil: number;
    }
  | { type: 'undo-window/started'; id: string; now: number; undoUntil: number }
  | { type: 'undo-window/extended'; id: string; now: number; undoUntil: number }
  | { type: 'undo/requested'; id: string; now: number }
  | { type: 'undo/succeeded'; id: string; now: number }
  | { type: 'undo/failed'; id: string; now: number; error: SaveQueueError }
  | { type: 'retry/requested'; id: string; now: number }
  | { type: 'commit'; id: string; now: number };

const updateEntry = (
  state: SaveQueueState,
  id: string,
  update: (entry: SaveQueueEntry) => SaveQueueEntry
): SaveQueueState => ({
  entries: state.entries.map((e) => (e.id === id ? update(e) : e)),
});

/**
 * Finalizes an entry that is being superseded or has hit the end of its window. A save needs no
 * further network call: committing it only means "stop offering undo". A delete's DELETE has not
 * been sent yet either way, so finalizing it means "start sending it now", which is exactly what
 * moving it to `saving` signals to the provider's flush effect.
 */
const finalizeEntry = (e: SaveQueueEntry): SaveQueueEntry =>
  e.kind === 'save' ? { ...e, status: 'committed' } : { ...e, status: 'saving' };

/**
 * Rule: only one entry is ever undoable at a time, so a strip is never ambiguous about which
 * drink Undo refers to. Called whenever an entry newly becomes undoable.
 */
const supersedeOtherUndoables = (entries: readonly SaveQueueEntry[], keepId: string): SaveQueueEntry[] =>
  entries.map((e) => (e.id !== keepId && e.status === 'undoable' ? finalizeEntry(e) : e));

export const reduce = (state: SaveQueueState, action: SaveQueueAction): SaveQueueState => {
  switch (action.type) {
    case 'save/started':
      return {
        entries: [
          ...state.entries,
          {
            id: action.id,
            kind: 'save',
            status: 'saving',
            label: action.label,
            date: action.date,
            drinkIds: [],
            alcoholTypeId: action.alcoholTypeId,
            payload: action.payload,
            undoUntil: null,
            error: null,
            seq: action.seq,
            createdAt: action.now,
          },
        ],
      };

    case 'save/succeeded':
      return updateEntry(state, action.id, (e) =>
        e.status === 'saving' ? { ...e, status: 'saved', drinkIds: action.drinkIds, error: null } : e
      );

    case 'op/failed':
      return updateEntry(state, action.id, (e) =>
        e.status === 'saving' ? { ...e, status: 'failed', error: action.error } : e
      );

    case 'delete/started': {
      const withNew: SaveQueueState = {
        entries: [
          ...state.entries,
          {
            id: action.id,
            kind: 'delete',
            status: 'undoable',
            label: action.label,
            date: action.date,
            drinkIds: action.drinkIds,
            undoUntil: action.undoUntil,
            error: null,
            seq: action.seq,
            createdAt: action.now,
          },
        ],
      };
      return { entries: supersedeOtherUndoables(withNew.entries, action.id) };
    }

    case 'undo-window/started': {
      const started = updateEntry(state, action.id, (e) =>
        e.status === 'saved' ? { ...e, status: 'undoable', undoUntil: action.undoUntil } : e
      );
      return { entries: supersedeOtherUndoables(started.entries, action.id) };
    }

    case 'undo-window/extended':
      return updateEntry(state, action.id, (e) =>
        e.status === 'undoable' ? { ...e, undoUntil: action.undoUntil } : e
      );

    case 'undo/requested':
      // The no-op guard here is what makes "undo must not race its own timeout" true: a click
      // that lands after sweep has already committed this entry changes nothing.
      return updateEntry(state, action.id, (e) => (e.status === 'undoable' ? { ...e, status: 'undoing' } : e));

    case 'undo/succeeded':
      return updateEntry(state, action.id, (e) => (e.status === 'undoing' ? { ...e, status: 'undone' } : e));

    case 'undo/failed':
      return updateEntry(state, action.id, (e) =>
        e.status === 'undoing' ? { ...e, status: 'failed', error: action.error } : e
      );

    case 'retry/requested':
      return updateEntry(state, action.id, (e) =>
        e.status === 'failed' ? { ...e, status: 'saving', error: null } : e
      );

    case 'commit':
      return updateEntry(state, action.id, (e) =>
        e.status === 'undoable' || e.status === 'saving' ? { ...e, status: 'committed' } : e
      );

    default:
      return state;
  }
};

/**
 * Expires undo windows. The only two ways time moves an entry forward, since every other
 * transition is a response to a network call or a user action. Returns the same reference when
 * nothing was due, so a consumer driving this from a timer or a visibility event can bail out of
 * a re-render instead of always producing a new (but equal) state.
 */
export const sweep = (state: SaveQueueState, now: number): SaveQueueState => {
  let changed = false;
  const entries = state.entries.map((e) => {
    if (e.status !== 'undoable' || e.undoUntil === null || now < e.undoUntil) {
      return e;
    }
    changed = true;
    return finalizeEntry(e);
  });
  return changed ? { entries } : state;
};

/**
 * The single entry the strip shows, or null. At most one entry is ever `undoable` (see
 * `supersedeOtherUndoables`), but a `failed` entry never transitions on its own, so without this
 * selector an old error could sit in the strip forever even after a newer undoable entry should
 * plainly take over. "Never auto dismiss" (the design doc, on errors) governs the *timer* - a
 * failed entry does not expire on its own - not whether the very next action supersedes it.
 */
export const currentStripEntry = (state: SaveQueueState): SaveQueueEntry | null => {
  let current: SaveQueueEntry | null = null;
  for (const e of state.entries) {
    if (
      (e.status === 'undoable' || e.status === 'undoing' || e.status === 'failed') &&
      (current === null || e.seq > current.seq)
    ) {
      current = e;
    }
  }
  return current;
};

/**
 * Every status except `undone` and `failed` means the entry's real-world effect either already
 * happened server-side or is actively becoming true. Both excluded statuses mean "as if this
 * entry had never been queued": an undone save's row is gone again and a failed save never made
 * one; an undone delete's row was never touched and a failed delete flush leaves it alone too.
 * That symmetry is what lets one set answer both `pendingInsertsForDate` and
 * `suppressedIdsForDate` below.
 */
const REFLECTS_IN_VIEW: ReadonlySet<SaveQueueEntryStatus> = new Set([
  'saving',
  'saved',
  'undoable',
  'undoing',
  'committed',
]);

/** The queue's optimistic rows for `date`: real ids the server already returned, not a client-side guess. */
export const pendingInsertsForDate = (state: SaveQueueState, date: string): EditableDrink[] =>
  state.entries
    .filter((e): e is SaveEntry => e.kind === 'save' && e.date === date && REFLECTS_IN_VIEW.has(e.status))
    .flatMap((e) => e.drinkIds.map((id) => ({ id, name: e.label, alcoholTypeId: e.alcoholTypeId })));

/** The ids `date`'s server rows must hide because a delete for them is pending or already sent. */
export const suppressedIdsForDate = (state: SaveQueueState, date: string): ReadonlySet<number> => {
  const ids = new Set<number>();
  for (const e of state.entries) {
    if (e.kind === 'delete' && e.date === date && REFLECTS_IN_VIEW.has(e.status)) {
      for (const id of e.drinkIds) {
        ids.add(id);
      }
    }
  }
  return ids;
};

/**
 * True once nothing is in flight or on the strip. Recommendations are server cached and only
 * actually change every five saves, so refetching them the moment one resolves is wasted four
 * times out of five, and a tile that moves between the decision to tap and the tap is a wrong
 * drink logged - the provider defers that refetch until this is true.
 */
export const isQueueIdle = (state: SaveQueueState): boolean =>
  state.entries.every((e) => e.status !== 'saving' && e.status !== 'undoable' && e.status !== 'undoing');
