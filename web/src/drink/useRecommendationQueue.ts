import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteRecommendation, editRecommendations } from '../api/endpoints';
import { classify } from './retryPolicy';
import { useUndoTimer, UNDO_WINDOW_MS, type UseUndoTimerHandlers } from '../hooks/useUndoTimer';
import {
  EMPTY_REC_QUEUE,
  currentRecEntry,
  hiddenRecommendationIds,
  pendingDeletes,
  recQueueReducer,
  sweepRecQueue,
  type RecDeleteEntry,
  type RecQueueAction,
  type RecQueueEntry,
  type RecQueueState,
  type RecSaveEntry,
} from './recommendationQueue';
import type { DraftSnapshot } from './recommendationDraft';
import type { RecommendationEdit } from '../types/api';

export interface UseRecommendationQueueResult {
  /** Ids the list must not show, because a delete for them is pending or has landed. */
  hidden: ReadonlySet<number>;
  /** All entries in the queue, for callers that need to observe lifecycle (e.g., committed saves). */
  entries: readonly RecQueueEntry[];
  current: RecQueueEntry | null;
  stripHandlers: UseUndoTimerHandlers;
  removeRecommendation: (input: { recommendationId: number; label: string }) => void;
  saveArrangement: (input: { snapshot: DraftSnapshot; payload: () => RecommendationEdit[] }) => void;
  undo: () => void;
  retry: () => void;
}

export interface UseRecommendationQueueOptions {
  /** Called when a save is undone, with the arrangement to put back. */
  onUndoSave: (snapshot: DraftSnapshot) => void;
  /**
   * The undo window, overridable. Defaults to the real 6.5s. Injectable for the same reason
   * `SaveQueueProvider`'s is: otherwise a test races a real 6.5 second deadline against a real
   * render, and the sweep can commit the entry before React has painted the strip.
   */
  undoWindowMs?: number;
}

/**
 * Owns the recommendations page's deferred writes: the queue state, the two mutations, the undo
 * timer and the lifecycle flush. Deliberately not part of `SaveQueueProvider`: see
 * `recommendationQueue.ts`'s module doc.
 */
export const useRecommendationQueue = ({
  onUndoSave,
  undoWindowMs = UNDO_WINDOW_MS,
}: UseRecommendationQueueOptions): UseRecommendationQueueResult => {
  const [queue, setQueue] = useState<RecQueueState>(EMPTY_REC_QUEUE);

  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  });

  const seqRef = useRef(0);
  /** Entry id to its in-flight promise. Both the double-send guard and the handle a save awaits,
   *  which is what keeps one DELETE from being sent twice when a save also depends on it. */
  const flushingRef = useRef(new Map<string, Promise<void>>());
  /** Each save entry's payload thunk, called at flush time rather than at queue time so a rename
   *  or a delete raised during the undo window is still reflected in what goes out. */
  const payloadRef = useRef(new Map<string, () => RecommendationEdit[]>());
  const onUndoSaveRef = useRef(onUndoSave);
  useEffect(() => {
    onUndoSaveRef.current = onUndoSave;
  });

  const dispatch = useCallback(
    (action: RecQueueAction) => setQueue((q) => recQueueReducer(q, action)),
    [],
  );

  const flushDelete = useCallback(
    (entry: RecDeleteEntry): Promise<void> => {
      const existing = flushingRef.current.get(entry.id);
      if (existing) {
        return existing;
      }
      const promise = deleteRecommendation(entry.recommendationId)
        .then(() => {
          dispatch({ type: 'commit', id: entry.id, now: Date.now() });
        })
        .catch((error: unknown) => {
          dispatch({
            type: 'op/failed',
            id: entry.id,
            now: Date.now(),
            error: { kind: classify(error), message: "Couldn't delete." },
          });
        })
        .finally(() => {
          flushingRef.current.delete(entry.id);
        });
      flushingRef.current.set(entry.id, promise);
      return promise;
    },
    [dispatch],
  );

  const flushSave = useCallback(
    (entry: RecSaveEntry): Promise<void> => {
      const existing = flushingRef.current.get(entry.id);
      if (existing) {
        return existing;
      }
      const promise = (async () => {
        // D4: every outstanding delete goes first, so the order this PATCH declares can never
        // omit a row the user is still able to bring back. `allSettled`, not `all`: a delete
        // that fails has already raised its own strip entry, and blocking the save on it would
        // strand the user's other edits.
        await Promise.allSettled(pendingDeletes(queueRef.current).map(flushDelete));
        const build = payloadRef.current.get(entry.id);
        await editRecommendations(build ? build() : []);
      })()
        .then(() => {
          dispatch({ type: 'commit', id: entry.id, now: Date.now() });
        })
        .catch((error: unknown) => {
          dispatch({
            type: 'op/failed',
            id: entry.id,
            now: Date.now(),
            error: { kind: classify(error), message: "Couldn't save your changes." },
          });
        })
        .finally(() => {
          flushingRef.current.delete(entry.id);
        });
      flushingRef.current.set(entry.id, promise);
      return promise;
    },
    [dispatch, flushDelete],
  );

  // The one place a deferred write actually goes out. `sending` is the reducer's signal that an
  // entry's window is over, whether it expired, was superseded, or was retried.
  useEffect(() => {
    for (const entry of queue.entries) {
      if (entry.status !== 'sending' || flushingRef.current.has(entry.id)) {
        continue;
      }
      if (entry.kind === 'delete') {
        flushDelete(entry);
      } else {
        flushSave(entry);
      }
    }
  }, [queue, flushDelete, flushSave]);

  const current = currentRecEntry(queue);

  const handleExpire = useCallback(() => setQueue((q) => sweepRecQueue(q, Date.now())), []);

  const handleExtend = useCallback(
    (undoUntil: number) => {
      const entry = currentRecEntry(queueRef.current);
      if (entry) {
        dispatch({ type: 'undo-window/extended', id: entry.id, now: Date.now(), undoUntil });
      }
    },
    [dispatch],
  );

  const { handlers: stripHandlers } = useUndoTimer({
    undoUntil: current?.status === 'undoable' ? current.undoUntil : null,
    onExpire: handleExpire,
    onExtend: handleExtend,
  });

  const removeRecommendation = useCallback(
    ({ recommendationId, label }: { recommendationId: number; label: string }) => {
      seqRef.current += 1;
      const seq = seqRef.current;
      const now = Date.now();
      dispatch({
        type: 'delete/started',
        id: `delete-${seq}`,
        seq,
        now,
        label,
        recommendationId,
        undoUntil: now + undoWindowMs,
      });
    },
    [dispatch, undoWindowMs],
  );

  const saveArrangement = useCallback(
    ({ snapshot, payload }: { snapshot: DraftSnapshot; payload: () => RecommendationEdit[] }) => {
      seqRef.current += 1;
      const seq = seqRef.current;
      const id = `save-${seq}`;
      const now = Date.now();
      payloadRef.current.set(id, payload);
      dispatch({ type: 'save/started', id, seq, now, snapshot, undoUntil: now + undoWindowMs });
    },
    [dispatch, undoWindowMs],
  );

  const undo = useCallback(() => {
    const entry = currentRecEntry(queueRef.current);
    if (!entry || entry.status !== 'undoable') {
      return;
    }
    const now = Date.now();
    dispatch({ type: 'undo/requested', id: entry.id, now });
    // Neither kind has sent anything yet, so undoing either is exactly "do not send it". No
    // network call on this path at all, unlike the drink queue, where undoing a save must
    // delete rows the server already created.
    dispatch({ type: 'undo/succeeded', id: entry.id, now: Date.now() });
    if (entry.kind === 'save') {
      payloadRef.current.delete(entry.id);
      onUndoSaveRef.current(entry.snapshot);
    }
  }, [dispatch]);

  const retry = useCallback(() => {
    const entry = currentRecEntry(queueRef.current);
    if (!entry || entry.status !== 'failed') {
      return;
    }
    dispatch({ type: 'retry/requested', id: entry.id, now: Date.now() });
    // The flush effect notices the new `sending` status and takes it from here.
  }, [dispatch]);

  // Leaving the page must not strand a write the user believes landed. Unlike the drink queue
  // there is no keepalive fetch: a tab killed mid-window loses the write, which is an accepted
  // tradeoff here, because a rename or a reorder is cosmetic and redoable, where a logged drink
  // is not. Moving each entry to `sending` lets the flush effect send it if the page survives.
  useEffect(() => {
    // Sweeping against a deadline nothing can outlast closes every open window through the one
    // code path that already means "the window is over, send it", rather than a second way of
    // finalizing that could drift from `sweepRecQueue`.
    const finalizeAll = () => setQueue((q) => sweepRecQueue(q, Number.MAX_SAFE_INTEGER));
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        finalizeAll();
      } else {
        setQueue((q) => sweepRecQueue(q, Date.now()));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', finalizeAll);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', finalizeAll);
    };
  }, []);

  return {
    hidden: hiddenRecommendationIds(queue),
    entries: queue.entries,
    current,
    stripHandlers,
    removeRecommendation,
    saveArrangement,
    undo,
    retry,
  };
};
