import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { saveDrink, deleteDrinksByIds, getSavedDrinksByDate } from '../api/endpoints';
import { API_BASE_URL } from '../api/client';
import keycloak from '../auth/keycloak';
import { classify } from './retryPolicy';
import { useUndoTimer, UNDO_WINDOW_MS } from '../hooks/useUndoTimer';
import TapeStrip from '../components/TapeStrip';
import { PageFeedbackContext } from '../components/PageFeedbackContext';
import { useSheetPortalContainer } from '../components/AddSheet/SheetPortalContext';
import { SaveQueueContext, type SaveQueueSaveInput, type SaveQueueRemoveInput } from './SaveQueueContext';
import {
  EMPTY_QUEUE,
  reduce,
  sweep,
  currentStripEntry,
  type SaveQueueState,
  type SaveQueueAction,
  type SaveDrinkPayload,
  type DeleteEntry,
} from './saveQueueReducer';
import type { EditableDrink } from '../types/api';

interface SaveQueueProviderProps {
  children: React.ReactNode;
  /**
   * The undo window, overridable. Defaults to the real 6.5s.
   *
   * It is injectable for the same reason `useUndoTimer` takes a `now`: otherwise a test races a
   * real 6.5 second deadline against a real render. Under the full suite's parallel workers the
   * first save in a worker pays the MUI and emotion first-render cost, and the sweep can commit
   * the entry before React has painted the strip, so the strip never appears at all and the
   * assertion waits forever on something that has already been and gone. Raising the test's
   * timeout does not help, because the entry is gone rather than late.
   */
  undoWindowMs?: number;
}

const PENDING_DELETES_KEY = 'drinksaver:pending-deletes';

/** The minimal shape needed to re-fire a delete after a reload or bfcache restore reconciles it
 *  on `pageshow`. Deliberately smaller than a full `DeleteEntry`: this is all a fresh page load
 *  can act on, since everything else in the queue does not survive a real reload anyway. */
interface PersistedPendingDelete {
  id: string;
  drinkIds: number[];
}

const readPersistedPendingDeletes = (): PersistedPendingDelete[] => {
  try {
    const raw = sessionStorage.getItem(PENDING_DELETES_KEY);
    return raw ? (JSON.parse(raw) as PersistedPendingDelete[]) : [];
  } catch {
    return [];
  }
};

const writePersistedPendingDeletes = (entries: PersistedPendingDelete[]): void => {
  try {
    if (entries.length === 0) {
      sessionStorage.removeItem(PENDING_DELETES_KEY);
    } else {
      sessionStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(entries));
    }
  } catch {
    // Best effort: losing this list only weakens the pageshow backstop, it does not stop the
    // pagehide/visibilitychange flush below from running.
  }
};

/** The keepalive DELETE used when the tab is going away. Not the axios client: XHR-based
 *  requests are aborted by unload, which is the entire reason this exists. Fire-and-forget - by
 *  the time it would resolve the page may already be gone, so nothing here awaits it. */
const flushByKeepalive = (drinkIds: readonly number[]): void => {
  const params = drinkIds.map((id) => `drinkIds=${id}`).join('&');
  const headers: Record<string, string> = {};
  if (keycloak.token) {
    headers.Authorization = `Bearer ${keycloak.token}`;
  }
  try {
    fetch(`${API_BASE_URL}/v1/drinks/byIds?${params}`, { method: 'DELETE', keepalive: true, headers }).catch(() => {
      // Nothing to do: the page is unloading and there is no UI left to report to.
    });
  } catch {
    // Some environments (very old Safari) throw synchronously for a keepalive request over a
    // body size limit. There is no body here, but the guard costs nothing.
  }
};

/**
 * Owns the save queue: its state, the mutations that drive it, the undo timer, and the
 * lifecycle listeners that make a deferred delete survive the tab dying. Mounted above
 * `<Routes>` in `App.tsx` so the undo strip survives a route change.
 *
 * `setQueryData` is used nowhere in this file. The TanStack Query cache holds server truth only;
 * optimism lives entirely in `saveQueueReducer.ts`'s selectors, read by `useDrinksForDate`. See
 * the design doc, "Optimism without optimistic cache writes".
 */
export const SaveQueueProvider: React.FC<SaveQueueProviderProps> = ({ children, undoWindowMs = UNDO_WINDOW_MS }) => {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<SaveQueueState>(EMPTY_QUEUE);
  // The add sheet's own container while it is open, or null: see `SheetPortalContext.ts`'s module
  // doc for why the strip must not stay on `document.body` while a sheet is open.
  const stripContainer = useSheetPortalContainer();
  const [pageFeedbackContainer, setPageFeedbackContainer] = useState<HTMLDivElement | null>(null);

  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  });

  const seqRef = useRef(0);
  const flushingRef = useRef<Set<string>>(new Set());
  const recommendationsDirtyRef = useRef(false);

  const dispatch = useCallback((action: SaveQueueAction) => setQueue((q) => reduce(q, action)), []);
  const runSweep = useCallback((now: number) => setQueue((q) => sweep(q, now)), []);

  const performSave = useCallback(
    async (id: string, date: string, payload: SaveDrinkPayload) => {
      try {
        const saved = await saveDrink(payload);
        const drinkIds = saved.map((row) => row.id);
        const now = Date.now();
        dispatch({ type: 'save/succeeded', id, now, drinkIds });
        dispatch({ type: 'undo-window/started', id, now, undoUntil: now + undoWindowMs });

        queryClient.invalidateQueries({ queryKey: ['drinks', date], refetchType: 'active' });
        // Recommendations only actually change every five saves (they are server cached), so
        // marking them stale here without refetching is what makes the eventual refetch below
        // free four times out of five, and deferring it until the queue idles is what keeps a
        // tile from moving under a finger that is already on its way to a second tap.
        queryClient.invalidateQueries({ queryKey: ['recommendations'], refetchType: 'none' });
        recommendationsDirtyRef.current = true;
      } catch (error) {
        const kind = classify(error);
        let rowCountBaseline: number | undefined;
        if (kind === 'timeout') {
          // A timed-out POST may have completed on the server anyway. Recording the row count
          // now is what lets a later retry tell the two cases apart instead of guessing.
          const cached = queryClient.getQueryData<EditableDrink[]>(['drinks', date]);
          rowCountBaseline = cached?.length ?? 0;
        }
        dispatch({
          type: 'op/failed',
          id,
          now: Date.now(),
          error: { kind, message: 'Could not save.', rowCountBaseline },
        });
      }
    },
    [dispatch, queryClient, undoWindowMs]
  );

  const performDeleteFlush = useCallback(
    async (entry: DeleteEntry) => {
      if (flushingRef.current.has(entry.id)) {
        return;
      }
      flushingRef.current.add(entry.id);
      try {
        await deleteDrinksByIds([...entry.drinkIds]);
        dispatch({ type: 'commit', id: entry.id, now: Date.now() });
      } catch (error) {
        dispatch({
          type: 'op/failed',
          id: entry.id,
          now: Date.now(),
          error: { kind: classify(error), message: 'Could not delete.' },
        });
      } finally {
        flushingRef.current.delete(entry.id);
      }
    },
    [dispatch]
  );

  // The single place a deferred delete's DELETE actually fires for the "ordinary" paths: the
  // window expiring (via sweep) and being superseded by a newer undoable entry (rule 5) both
  // move a delete to 'saving' rather than straight to 'committed', specifically so this notices
  // and sends it. The hidden/pagehide path below is the exception: it cannot afford to wait for
  // this render-driven effect, so it flushes directly instead.
  useEffect(() => {
    for (const entry of queue.entries) {
      if (entry.kind === 'delete' && entry.status === 'saving' && !flushingRef.current.has(entry.id)) {
        performDeleteFlush(entry);
      }
    }
  }, [queue, performDeleteFlush]);

  // Deferred recommendations refetch: fires once, the first time the queue goes idle after a
  // save actually changed something.
  useEffect(() => {
    const idle = queue.entries.every(
      (e) => e.status !== 'saving' && e.status !== 'undoable' && e.status !== 'undoing'
    );
    if (idle && recommendationsDirtyRef.current) {
      recommendationsDirtyRef.current = false;
      queryClient.refetchQueries({ queryKey: ['recommendations'] });
    }
  }, [queue, queryClient]);

  // Persists exactly what a fresh pageshow would need to reconcile: which pending deletes exist
  // and what ids they cover. Rewritten on every queue change rather than only on the tab hiding,
  // since `sessionStorage` availability under a real unload event is not guaranteed and this way
  // it is never more than one render stale.
  useEffect(() => {
    const pending = queue.entries
      .filter((e): e is DeleteEntry => e.kind === 'delete' && e.status === 'undoable')
      .map((e) => ({ id: e.id, drinkIds: [...e.drinkIds] }));
    writePersistedPendingDeletes(pending);
  }, [queue]);

  const save = useCallback(
    ({ label, date, alcoholTypeId, payload }: SaveQueueSaveInput) => {
      seqRef.current += 1;
      const seq = seqRef.current;
      const id = `save-${seq}`;
      const now = Date.now();
      const fullPayload: SaveDrinkPayload = { ...payload, date };

      dispatch({ type: 'save/started', id, seq, now, label, date, alcoholTypeId, payload: fullPayload });
      performSave(id, date, fullPayload);
      return id;
    },
    [dispatch, performSave]
  );

  const remove = useCallback(
    ({ label, date, drinkIds }: SaveQueueRemoveInput) => {
      if (drinkIds.length === 0) {
        return;
      }
      seqRef.current += 1;
      const seq = seqRef.current;
      const id = `delete-${seq}`;
      const now = Date.now();
      dispatch({ type: 'delete/started', id, seq, now, label, date, drinkIds, undoUntil: now + undoWindowMs });
    },
    [dispatch, undoWindowMs]
  );

  const undo = useCallback(() => {
    const entry = currentStripEntry(queueRef.current);
    if (!entry || entry.status !== 'undoable') {
      return;
    }
    const now = Date.now();
    dispatch({ type: 'undo/requested', id: entry.id, now });

    if (entry.kind === 'delete') {
      // Nothing was ever sent, so undoing it is exactly "do not send it" - no network call.
      dispatch({ type: 'undo/succeeded', id: entry.id, now: Date.now() });
      return;
    }

    deleteDrinksByIds([...entry.drinkIds])
      .then(() => {
        dispatch({ type: 'undo/succeeded', id: entry.id, now: Date.now() });
        queryClient.invalidateQueries({ queryKey: ['drinks', entry.date], refetchType: 'active' });
      })
      .catch((error) => {
        dispatch({
          type: 'undo/failed',
          id: entry.id,
          now: Date.now(),
          error: { kind: classify(error), message: 'Could not undo.' },
        });
      });
  }, [dispatch, queryClient]);

  const retry = useCallback(() => {
    const entry = currentStripEntry(queueRef.current);
    if (!entry || entry.status !== 'failed') {
      return;
    }
    const now = Date.now();
    dispatch({ type: 'retry/requested', id: entry.id, now });

    if (entry.kind === 'delete') {
      // The generic flush effect above notices the new 'saving' status and takes it from here.
      return;
    }

    const baseline = entry.error?.kind === 'timeout' ? entry.error.rowCountBaseline : undefined;
    if (baseline === undefined) {
      performSave(entry.id, entry.date, entry.payload);
      return;
    }

    // A timed-out POST may have already landed. Verify before re-sending it: refetching and
    // comparing costs one GET, and a naive retry on the connection that just timed out is
    // exactly how a drink gets logged twice on bar wifi.
    queryClient
      .fetchQuery({ queryKey: ['drinks', entry.date], queryFn: () => getSavedDrinksByDate(entry.date) })
      .then((rows) => {
        if (rows.length > baseline) {
          dispatch({ type: 'commit', id: entry.id, now: Date.now() });
          queryClient.invalidateQueries({ queryKey: ['drinks', entry.date], refetchType: 'active' });
          return;
        }
        performSave(entry.id, entry.date, entry.payload);
      })
      .catch(() => {
        // The verifying refetch itself failed; falling back to a normal retry is safer than
        // leaving the entry stuck in 'saving' forever.
        performSave(entry.id, entry.date, entry.payload);
      });
  }, [dispatch, performSave, queryClient]);

  // Rule 3: a deferred delete must survive the tab dying. `beforeunload` is not used - it does
  // not fire reliably on mobile Safari, which is exactly the device this app is for. `pagehide`
  // does, and it also covers `keycloak.logout()`: that call navigates the page away, and a real
  // navigation fires `pagehide` like any other, so there is no separate code path needed for it.
  useEffect(() => {
    const flushAllUndoable = () => {
      const now = Date.now();
      for (const entry of queueRef.current.entries) {
        if (entry.status !== 'undoable') {
          continue;
        }
        if (entry.kind === 'delete') {
          flushByKeepalive(entry.drinkIds);
        }
        // Treat hidden as commit-and-retract, in the same tick, for saves too: an Undo that can
        // no longer be honoured (the tab may already be gone) must never be left on screen.
        dispatch({ type: 'commit', id: entry.id, now });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushAllUndoable();
      } else {
        runSweep(Date.now());
      }
    };

    const handlePageHide = () => flushAllUndoable();

    const handlePageShow = () => {
      const persisted = readPersistedPendingDeletes();
      if (persisted.length === 0) {
        return;
      }
      const now = Date.now();
      for (const p of persisted) {
        flushByKeepalive(p.drinkIds);
        if (queueRef.current.entries.some((e) => e.id === p.id)) {
          dispatch({ type: 'commit', id: p.id, now });
        }
      }
      writePersistedPendingDeletes([]);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [dispatch, runSweep]);

  const current = currentStripEntry(queue);

  const handleExpire = useCallback(() => runSweep(Date.now()), [runSweep]);

  const handleExtend = useCallback(
    (undoUntil: number) => {
      const entry = currentStripEntry(queueRef.current);
      if (entry) {
        dispatch({ type: 'undo-window/extended', id: entry.id, now: Date.now(), undoUntil });
      }
    },
    [dispatch]
  );

  const { handlers: stripHandlers } = useUndoTimer({
    undoUntil: current?.status === 'undoable' ? current.undoUntil : null,
    onExpire: handleExpire,
    onExtend: handleExtend,
  });

  return (
    <SaveQueueContext.Provider value={{ queue, current, save, remove, undo, retry, stripHandlers }}>
      <PageFeedbackContext.Provider value={setPageFeedbackContainer}>
        {children}
      </PageFeedbackContext.Provider>
      <TapeStrip
        entry={current}
        onUndo={undo}
        onRetry={retry}
        stripHandlers={stripHandlers}
        container={stripContainer ?? pageFeedbackContainer}
        inline={!stripContainer && pageFeedbackContainer !== null}
      />
    </SaveQueueContext.Provider>
  );
};

export default SaveQueueProvider;
