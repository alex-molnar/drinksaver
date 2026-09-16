import React from 'react';
import styled from '@emotion/styled';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import RecommendationRow from './RecommendationRow';
import type { SavedRecommendation } from '../drink/savedRecommendations';

export type RecommendationTabStatus = 'loading' | 'error' | 'ready';

/**
 * The cream paper surface listing a user's saved recommendations: a header with a live count,
 * a `DndContext`/`SortableContext` pair driving pointer and keyboard reordering, and the
 * loading/error/empty states a query can be in before it is ready.
 *
 * States: loading (a status region, no rows); error (an alert, no rows); ready with rows (one
 * `RecommendationRow` per entry, in `rows` order); ready and empty (the "Nothing saved yet"
 * message, matching History's own empty state per D10).
 */
export interface RecommendationTabProps {
  status: RecommendationTabStatus;
  /** Display order, including rows mid strike-through. */
  rows: readonly SavedRecommendation[];
  /** Ids mid strike-through. Rendered in place, inert, until their animation completes. */
  goneIds: ReadonlySet<number>;
  editingId: number | null;
  editingValue: string;
  onReorder: (visibleOrder: number[]) => void;
  onEditStart: (id: number) => void;
  onEditChange: (value: string) => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
  onDelete: (row: SavedRecommendation) => void;
  onExitComplete: (id: number) => void;
}

const Tab = styled.div`
  position: relative;
  isolation: isolate;
  margin: 0 var(--ds-space-lg) var(--ds-space-xl);
  color: var(--ds-ink-on-paper);
  padding: 16px 18px 4px;
`;

const Surface = styled.div`
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: var(--ds-surface-paper);
  border-radius: 0 var(--ds-radius-sm) var(--ds-radius-sm) var(--ds-radius-sm);
  box-shadow: var(--ds-elevation-overlay);
`;

const Header = styled.div`
  font-family: var(--ds-type-display-s-font-family);
  font-weight: var(--ds-type-display-s-font-weight);
  font-size: var(--ds-type-display-s-font-size);
  padding-bottom: 10px;
  border-bottom: 2px solid color-mix(in srgb, var(--ds-ink-on-paper) 35%, transparent);
  display: flex;
  align-items: baseline;
`;

const Count = styled.span`
  margin-left: auto;
  font-family: var(--ds-type-caption-font-family);
  font-size: var(--ds-type-caption-font-size);
  font-weight: var(--ds-type-caption-font-weight);
`;

const Empty = styled.div`
  text-align: center;
  padding: 48px 24px;
  font-family: var(--ds-type-caption-font-family);
  font-size: 13.5px;
  line-height: 1.6;
`;

const EmptyTitle = styled.strong`
  display: block;
  font-family: var(--ds-type-display-s-font-family);
  font-weight: var(--ds-type-display-s-font-weight);
  font-size: 20px;
  margin-bottom: 6px;
`;

const countText = (n: number): string => `${n} saved`;

const RecommendationTab: React.FC<RecommendationTabProps> = ({
  status,
  rows,
  goneIds,
  editingId,
  editingValue,
  onReorder,
  onEditStart,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onDelete,
  onExitComplete,
}) => {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');

  const sensors = useSensors(
    // A small distance so a tap that drifts a pixel is still a tap. The grip is the only
    // activator, so there is no drag-versus-scroll ambiguity left for a delay to solve.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = rows.map((row) => row.id);
  const nameOf = (id: UniqueIdentifier) => rows.find((row) => row.id === Number(id))?.name ?? '';
  const positionOf = (id: UniqueIdentifier) => ids.indexOf(Number(id)) + 1;

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onReorder(arrayMove(ids, ids.indexOf(Number(active.id)), ids.indexOf(Number(over.id))));
  };

  const liveCount = rows.filter((row) => !goneIds.has(row.id)).length;

  return (
    <Tab>
      <Surface data-recommendation-paper aria-hidden="true" />
      <Header>
        Saved
        <Count>
          {status === 'loading' ? 'loading…' : status === 'error' ? 'unavailable' : countText(liveCount)}
        </Count>
      </Header>

      {status === 'error' && (
        <Empty role="alert">
          <EmptyTitle>Couldn&apos;t load your recommendations</EmptyTitle>
          Check your connection and try again.
        </Empty>
      )}

      {status === 'loading' && (
        <Empty role="status">
          <EmptyTitle>Loading…</EmptyTitle>
        </Empty>
      )}

      {status === 'ready' && rows.length === 0 && (
        <Empty>
          <EmptyTitle>Nothing saved yet</EmptyTitle>
          Save a drink with &apos;add to recommendations&apos; and it will show up here.
        </Empty>
      )}

      {status === 'ready' && rows.length > 0 && (
        // `useHistoryLayoutMotion` is deliberately not used here. It reads `offsetTop` and
        // writes `transform` on every row, which is exactly what dnd-kit's sortable already does
        // during a drag. Running both means two writers for one property. Reorder motion is
        // dnd-kit's own `transition`; delete motion is `strikeOff` inside the row.
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
          accessibility={{
            announcements: {
              onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}, position ${positionOf(active.id)} of ${ids.length}.`,
              onDragOver: ({ active, over }) =>
                over ? `${nameOf(active.id)} moved to position ${positionOf(over.id)} of ${ids.length}.` : undefined,
              onDragEnd: ({ active, over }) =>
                over
                  ? `${nameOf(active.id)} dropped at position ${positionOf(over.id)} of ${ids.length}.`
                  : `${nameOf(active.id)} returned to its place.`,
              onDragCancel: ({ active }) => `Reordering ${nameOf(active.id)} cancelled.`,
            },
          }}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {rows.map((row, index) => (
              <RecommendationRow
                key={row.id}
                row={row}
                index={index}
                gone={goneIds.has(row.id)}
                editing={editingId === row.id}
                editingValue={editingId === row.id ? editingValue : ''}
                reduced={reduced}
                onEditStart={onEditStart}
                onEditChange={onEditChange}
                onEditCommit={onEditCommit}
                onEditCancel={onEditCancel}
                onDelete={onDelete}
                onExitComplete={onExitComplete}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </Tab>
  );
};

export default RecommendationTab;
