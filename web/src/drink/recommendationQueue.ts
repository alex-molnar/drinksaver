import type { DraftSnapshot } from './recommendationDraft';

/**
 * The recommendations page's own deferred-write queue. Deliberately separate from
 * `saveQueueReducer.ts` rather than an extra entry kind on it: that queue is shaped around
 * drinks (a drinking day, a list of drink ids, a `saveDrink` payload, a keepalive DELETE on
 * pagehide) and none of that applies here. See D5 in the plan.
 *
 * Both kinds defer, so both start `undoable`; there is no equivalent of the drink queue's
 * `saving -> saved` split, because nothing on this page fires a request the moment it is queued.
 * `undone` is a status rather than a flag so the hidden-id set can distinguish "this delete was
 * retracted" from "this delete has landed", which look identical from `committed` alone.
 */
export type RecQueueStatus = 'undoable' | 'undoing' | 'undone' | 'sending' | 'committed' | 'failed';

export interface RecQueueError {
  readonly kind: string;
  readonly message: string;
}

interface BaseRecEntry {
  readonly id: string;
  readonly status: RecQueueStatus;
  /** Wall clock ms the window ends at, not a countdown. Same reasoning as `saveQueueReducer`. */
  readonly undoUntil: number | null;
  readonly error: RecQueueError | null;
  readonly seq: number;
  readonly createdAt: number;
}

export interface RecDeleteEntry extends BaseRecEntry {
  readonly kind: 'delete';
  readonly recommendationId: number;
  /** The row's name at the moment it was crossed off, for the strip's message. */
  readonly label: string;
}

export interface RecSaveEntry extends BaseRecEntry {
  readonly kind: 'save';
  /** The arrangement to put back if this save is undone. */
  readonly snapshot: DraftSnapshot;
}

export type RecQueueEntry = RecDeleteEntry | RecSaveEntry;

export interface RecQueueState {
  readonly entries: readonly RecQueueEntry[];
}

export const EMPTY_REC_QUEUE: RecQueueState = { entries: [] };

export type RecQueueAction =
  | {
      type: 'delete/started';
      id: string;
      seq: number;
      now: number;
      label: string;
      recommendationId: number;
      undoUntil: number;
    }
  | { type: 'save/started'; id: string; seq: number; now: number; snapshot: DraftSnapshot; undoUntil: number }
  | { type: 'undo-window/extended'; id: string; now: number; undoUntil: number }
  | { type: 'undo/requested'; id: string; now: number }
  | { type: 'undo/succeeded'; id: string; now: number }
  | { type: 'op/failed'; id: string; now: number; error: RecQueueError }
  | { type: 'retry/requested'; id: string; now: number }
  | { type: 'commit'; id: string; now: number };

const updateEntry = (
  state: RecQueueState,
  id: string,
  update: (entry: RecQueueEntry) => RecQueueEntry,
): RecQueueState => ({ entries: state.entries.map((e) => (e.id === id ? update(e) : e)) });

/**
 * Finalizing an entry means "stop offering undo, send it now". Both kinds defer, so for both
 * that is `sending`, which the hook's flush effect notices. This is what implements D4: raising
 * a save supersedes an open delete, moving it to `sending`, and the save's own flush then waits
 * on those deletes before the PATCH goes out.
 */
const finalize = (e: RecQueueEntry): RecQueueEntry => ({ ...e, status: 'sending', undoUntil: null });

/** One undoable entry at a time, so the strip is never ambiguous. Mirrors the drink queue. */
const supersede = (entries: readonly RecQueueEntry[], keepId: string): RecQueueEntry[] =>
  entries.map((e) => (e.id !== keepId && e.status === 'undoable' ? finalize(e) : e));

export const recQueueReducer = (state: RecQueueState, action: RecQueueAction): RecQueueState => {
  switch (action.type) {
    case 'delete/started': {
      const entry: RecDeleteEntry = {
        id: action.id,
        kind: 'delete',
        status: 'undoable',
        recommendationId: action.recommendationId,
        label: action.label,
        undoUntil: action.undoUntil,
        error: null,
        seq: action.seq,
        createdAt: action.now,
      };
      return { entries: supersede([...state.entries, entry], action.id) };
    }

    case 'save/started': {
      const entry: RecSaveEntry = {
        id: action.id,
        kind: 'save',
        status: 'undoable',
        snapshot: action.snapshot,
        undoUntil: action.undoUntil,
        error: null,
        seq: action.seq,
        createdAt: action.now,
      };
      return { entries: supersede([...state.entries, entry], action.id) };
    }

    case 'undo-window/extended':
      return updateEntry(state, action.id, (e) =>
        e.status === 'undoable' ? { ...e, undoUntil: action.undoUntil } : e,
      );

    case 'undo/requested':
      // A click landing after the sweep already finalized this entry must change nothing. The
      // identity check keeps that a genuine no-op rather than a new-but-equal state.
      return state.entries.find((e) => e.id === action.id)?.status === 'undoable'
        ? updateEntry(state, action.id, (e) => ({ ...e, status: 'undoing' }))
        : state;

    case 'undo/succeeded':
      return updateEntry(state, action.id, (e) =>
        e.status === 'undoing' ? { ...e, status: 'undone', undoUntil: null } : e,
      );

    case 'op/failed':
      return updateEntry(state, action.id, (e) =>
        e.status === 'sending' ? { ...e, status: 'failed', error: action.error, undoUntil: null } : e,
      );

    case 'retry/requested':
      return updateEntry(state, action.id, (e) =>
        e.status === 'failed' ? { ...e, status: 'sending', error: null } : e,
      );

    case 'commit':
      return updateEntry(state, action.id, (e) =>
        e.status === 'sending' || e.status === 'undoable'
          ? { ...e, status: 'committed', undoUntil: null }
          : e,
      );

    default:
      return state;
  }
};

/** Same reference when nothing was due, so a timer tick need not cause a render. */
export const sweepRecQueue = (state: RecQueueState, now: number): RecQueueState => {
  let changed = false;
  const entries = state.entries.map((e) => {
    if (e.status !== 'undoable' || e.undoUntil === null || now < e.undoUntil) {
      return e;
    }
    changed = true;
    return finalize(e);
  });
  return changed ? { entries } : state;
};

/**
 * The statuses under which a delete's row must stay off screen: the delete is pending, in
 * flight, or done. `undone` and `failed` both mean the row is still there, for opposite
 * reasons, and both must show it again.
 */
const HIDES_ROW: ReadonlySet<RecQueueStatus> = new Set(['undoable', 'undoing', 'sending', 'committed']);

export const hiddenRecommendationIds = (state: RecQueueState): ReadonlySet<number> => {
  const ids = new Set<number>();
  for (const e of state.entries) {
    if (e.kind === 'delete' && HIDES_ROW.has(e.status)) {
      ids.add(e.recommendationId);
    }
  }
  return ids;
};

/** Deletes whose DELETE has not landed yet. A save's flush waits on these first (D4). */
export const pendingDeletes = (state: RecQueueState): RecDeleteEntry[] =>
  state.entries.filter(
    (e): e is RecDeleteEntry =>
      e.kind === 'delete' && (e.status === 'undoable' || e.status === 'undoing' || e.status === 'sending'),
  );

/** The single entry the strip shows, or null. A failed entry never expires on its own. */
export const currentRecEntry = (state: RecQueueState): RecQueueEntry | null => {
  let current: RecQueueEntry | null = null;
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
