import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppFrame from '../components/AppFrame';
import RecommendationTab from '../components/RecommendationTab';
import RecommendationStrip from '../components/RecommendationStrip';
import { useAuth } from '../auth';
import { getRecommendations } from '../api/endpoints';
import { savedRecommendations, type SavedRecommendation } from '../drink/savedRecommendations';
import {
  EMPTY_DRAFT,
  editPayload,
  isDirty,
  recommendationDraftReducer,
  visibleRows,
  type DraftSnapshot,
} from '../drink/recommendationDraft';
import { useRecommendationQueue } from '../drink/useRecommendationQueue';
import { useSetPageFeedbackContainer } from '../components/PageFeedbackContext';
import type { RecSaveEntry } from '../drink/recommendationQueue';

const Scroll = styled.section`
  flex: 1;
  min-height: 44px;
  min-width: 0;
  overflow-y: auto;
  overscroll-behavior-y: contain;

  &:focus-visible {
    outline: 2px solid var(--ds-ink-primary);
    outline-offset: -2px;
  }
`;

const FeedbackSlot = styled.div`
  flex: 0 1 auto;
  min-height: 0;
  max-height: 40%;
  overflow-y: auto;
`;

const Bar = styled.div`
  flex: none;
  display: flex;
  justify-content: center;
  gap: var(--ds-space-sm);
  padding: var(--ds-space-sm) var(--ds-space-lg) var(--ds-space-lg);
`;

const GhostButton = styled.button`
  min-height: 44px;
  padding: 0 var(--ds-space-lg);
  border: 1px solid color-mix(in srgb, var(--ds-ink-primary) 35%, transparent);
  border-radius: var(--ds-radius-sm);
  background: none;
  color: var(--ds-ink-primary);
  font-family: var(--ds-type-display-family);
  font-size: 1rem;
  cursor: pointer;
`;

const PrimaryButton = styled.button`
  min-height: 44px;
  padding: 0 var(--ds-space-lg);
  border: 0;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-accent-active);
  color: var(--ds-ink-primary);
  font-family: var(--ds-type-display-family);
  font-size: 1rem;
  cursor: pointer;
`;

interface RecommendationsPageProps {
  /**
   * The undo window, overridable. Defaults to the real 6.5s. Injectable for the same reason
   * `SaveQueueProvider`'s is: otherwise a test races a real 6.5 second deadline against a real
   * render, and under parallel workers the sweep can commit before React has painted the strip.
   */
  undoWindowMs?: number;
}

const RecommendationsPage: React.FC<RecommendationsPageProps> = ({ undoWindowMs }) => {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const setFeedbackContainer = useSetPageFeedbackContainer();

  const { data, isLoading, error } = useQuery({
    queryKey: ['recommendations'],
    queryFn: getRecommendations,
    staleTime: 5 * 60 * 1000,
  });

  const rows = useMemo(() => savedRecommendations(data, userId), [data, userId]);

  const [draft, dispatch] = useReducer(recommendationDraftReducer, EMPTY_DRAFT);

  useEffect(() => {
    if (data) dispatch({ type: 'sync', rows });
  }, [data, rows]);

  const onUndoSave = useCallback(
    (snapshot: DraftSnapshot) => dispatch({ type: 'restore', snapshot }),
    [],
  );

  const queue = useRecommendationQueue({ onUndoSave, undoWindowMs });

  const visible = useMemo(() => visibleRows(draft, queue.hidden), [draft, queue.hidden]);
  const dirty = isDirty(draft, queue.hidden);

  // Rows currently being struck off, retained in their own slot until their exit animation
  // completes. `queue.hidden` already excludes a retained row from `visible`; live data wins the
  // instant an undo un-hides it, which is the same rule `historyPresence.ts` states and for the
  // same reason: an interrupted exit must not strand an invisible retained row.
  const [exiting, setExiting] = useState<ReadonlyMap<number, SavedRecommendation>>(new Map());

  const handleDelete = useCallback(
    (row: SavedRecommendation) => {
      setExiting((previous) => new Map(previous).set(row.id, row));
      queue.removeRecommendation({ recommendationId: row.id, label: row.name });
    },
    [queue],
  );

  const handleExitComplete = useCallback((id: number) => {
    setExiting((previous) => {
      if (!previous.has(id)) return previous;
      const next = new Map(previous);
      next.delete(id);
      return next;
    });
  }, []);

  const tabRows = useMemo(
    () =>
      draft.order.flatMap((id) => {
        const live = visible.find((row) => row.id === id);
        if (live) return [live];
        const leaving = exiting.get(id);
        return leaving ? [leaving] : [];
      }),
    [draft.order, visible, exiting],
  );
  const goneIds = useMemo(
    () => new Set([...exiting.keys()].filter((id) => queue.hidden.has(id))),
    [exiting, queue.hidden],
  );

  const draftRef = useRef(draft);
  const hiddenRef = useRef(queue.hidden);
  useEffect(() => {
    draftRef.current = draft;
    hiddenRef.current = queue.hidden;
  });

  const handleSave = useCallback(() => {
    const snapshot = draftRef.current.committed;
    // A thunk: the payload is read when the entry commits, not now, so a rename made during the
    // undo window is still carried, and a delete raised during it is still excluded.
    const payload = () => editPayload(draftRef.current, hiddenRef.current);
    dispatch({ type: 'saved' });
    queue.saveArrangement({ snapshot, payload });
  }, [queue]);

  const handleCancel = useCallback(() => dispatch({ type: 'cancel' }), []);

  // Refetch deletes once the strip is empty. Saves use the awaited refetch in the navigation
  // effect below; sharing this idle invalidation path would let the list request race the edit.
  const lastCommittedDeleteRef = useRef<string | null>(null);
  useEffect(() => {
    const committedDelete = [...queue.entries]
      .reverse()
      .find((entry) => entry.kind === 'delete' && entry.status === 'committed');
    if (queue.current === null && committedDelete && committedDelete.id !== lastCommittedDeleteRef.current) {
      lastCommittedDeleteRef.current = committedDelete.id;
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    }
  }, [queue, queryClient]);

  // Navigate to home page after a save is committed, but only if user hasn't navigated away
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const lastCommittedSaveRef = useRef<string | null>(null);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Find the most recent save entry that was just committed
    const committedSave = [...queue.entries]
      .reverse()
      .find(
        (e): e is RecSaveEntry =>
          e.kind === 'save' && e.status === 'committed' && e.id !== lastCommittedSaveRef.current,
      );

    if (committedSave && mountedRef.current) {
      lastCommittedSaveRef.current = committedSave.id;
      void queryClient
        .refetchQueries({ queryKey: ['recommendations'] })
        .then(() => {
          if (mountedRef.current) {
            navigate('/', { replace: true });
          }
        });
    }
  }, [queue.entries, navigate, queryClient]);

  return (
    <AppFrame title="Recommendations" subtitle={`${visible.length} saved`}>
      <Scroll aria-label="Saved recommendations" tabIndex={0}>
        <RecommendationTab
          status={error ? 'error' : isLoading ? 'loading' : 'ready'}
          rows={tabRows}
          goneIds={goneIds}
          editingId={draft.editingId}
          editingValue={draft.editingValue}
          onReorder={(visibleOrder) => dispatch({ type: 'reorder', visibleOrder })}
          onEditStart={(id) => dispatch({ type: 'edit/start', id })}
          onEditChange={(value) => dispatch({ type: 'edit/change', value })}
          onEditCommit={() => dispatch({ type: 'edit/commit' })}
          onEditCancel={() => dispatch({ type: 'edit/cancel' })}
          onDelete={handleDelete}
          onExitComplete={handleExitComplete}
        />
      </Scroll>
      <FeedbackSlot ref={setFeedbackContainer} />
      <RecommendationStrip
        entry={queue.current}
        onUndo={queue.undo}
        onRetry={queue.retry}
        stripHandlers={queue.stripHandlers}
      />
      {dirty ? (
        <Bar>
          <GhostButton type="button" onClick={handleCancel}>Cancel</GhostButton>
          <PrimaryButton type="button" onClick={handleSave}>Save</PrimaryButton>
        </Bar>
      ) : null}
    </AppFrame>
  );
};

export default RecommendationsPage;
