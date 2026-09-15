import React, { useCallback, useLayoutEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { strikeOff } from './historyMotion';
import type { SavedRecommendation } from '../drink/savedRecommendations';

/**
 * One row of the recommendations list: a grip for reordering, the name (or its editor while
 * renaming), a pencil or checkmark, and a trashcan, with an absolute strike-through overlay
 * played while `gone` is true.
 *
 * States: at rest (grip, name, pencil, trashcan); editing (grip disabled, a text input replaces
 * the name, checkmark replaces the pencil); gone (inert, struck through, every control disabled,
 * removed once `onExitComplete` fires).
 */
export interface RecommendationRowProps {
  row: SavedRecommendation;
  /** Position in the rendered list. Stamped as `data-recommendation-index`, which is what the
   *  jsdom rect stub keys off so dnd-kit's keyboard sensor has geometry to work with. */
  index: number;
  /** True while this row's strike-through delete is playing. */
  gone: boolean;
  editing: boolean;
  editingValue: string;
  reduced: boolean;
  onEditStart: (id: number) => void;
  onEditChange: (value: string) => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
  onDelete: (row: SavedRecommendation) => void;
  onExitComplete?: (id: number) => void;
}

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 13px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--ds-ink-on-paper) 16%, transparent);
  position: relative;

  &:last-of-type { border-bottom: 0; }
`;

const Strike = styled.span`
  position: absolute;
  left: 0;
  top: 52%;
  height: 2.5px;
  width: 100%;
  background: var(--ds-accent-danger);
  border-radius: 2px;
  transform: rotate(-1.2deg) scaleX(0);
  transform-origin: left center;
  opacity: 0.9;
  pointer-events: none;
`;

const IconButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  border: 0;
  border-radius: var(--ds-radius-sm);
  background: none;
  color: color-mix(in srgb, var(--ds-ink-on-paper) 45%, transparent);
  cursor: pointer;
  display: grid;
  place-items: center;
  flex: none;
  transition:
    color var(--ds-motion-duration-fast) var(--ds-motion-easing-standard),
    background var(--ds-motion-duration-fast) var(--ds-motion-easing-standard);

  &:hover {
    color: var(--ds-ink-on-paper);
    background: color-mix(in srgb, var(--ds-ink-on-paper) 12%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--ds-ink-on-paper);
    outline-offset: -3px;
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const DeleteButton = styled(IconButton)`
  &:hover {
    color: var(--ds-accent-danger);
    background: color-mix(in srgb, var(--ds-accent-danger) 12%, transparent);
  }
`;

const Name = styled.span`
  font-family: var(--ds-type-display-s-font-family);
  font-weight: var(--ds-type-display-s-font-weight);
  font-size: 17px;
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const NameInput = styled.input`
  font-family: var(--ds-type-display-s-font-family);
  font-weight: var(--ds-type-display-s-font-weight);
  font-size: 17px;
  flex: 1 1 auto;
  min-width: 0;
  background: var(--ds-surface-paper);
  color: var(--ds-ink-on-paper);
  border: 1px solid color-mix(in srgb, var(--ds-ink-on-paper) 35%, transparent);
  border-radius: var(--ds-radius-sm);
  padding: 4px 6px;

  &:focus-visible {
    outline: 2px solid var(--ds-ink-on-paper);
    outline-offset: -2px;
  }
`;

const GripIcon: React.FC = () => (
  <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden="true">
    <circle cx="4" cy="3" r="1.6" />
    <circle cx="10" cy="3" r="1.6" />
    <circle cx="4" cy="10" r="1.6" />
    <circle cx="10" cy="10" r="1.6" />
    <circle cx="4" cy="17" r="1.6" />
    <circle cx="10" cy="17" r="1.6" />
  </svg>
);

const PencilIcon: React.FC = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

const RecommendationRow: React.FC<RecommendationRowProps> = ({
  row,
  index,
  gone,
  editing,
  editingValue,
  reduced,
  onEditStart,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onDelete,
  onExitComplete,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: gone || editing,
  });
  const rowRef = useRef<HTMLDivElement>(null);
  const strokeRef = useRef<HTMLSpanElement>(null);

  const finish = useCallback(() => onExitComplete?.(row.id), [row.id, onExitComplete]);
  useLayoutEffect(() => {
    if (gone) return strikeOff(rowRef.current!, strokeRef.current!, finish, reduced);
  }, [gone, reduced, finish]);

  return (
    <Row
      ref={(node) => {
        rowRef.current = node;
        setNodeRef(node);
      }}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 1 : undefined }}
      {...attributes}
      inert={gone}
      data-recommendation-row={row.id}
      data-recommendation-index={index}
    >
      <Strike ref={strokeRef} data-recommendation-strike aria-hidden="true" />
      <IconButton
        type="button"
        disabled={gone}
        aria-label={`Reorder ${row.name}`}
        {...listeners}
      >
        <GripIcon />
      </IconButton>

      {editing ? (
        <NameInput
          value={editingValue}
          onChange={(event) => onEditChange(event.target.value)}
          autoFocus
          aria-label={`Name for ${row.name}`}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onEditCommit();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              onEditCancel();
            }
          }}
          // Escape calls onEditCancel first, and the page clears editingId synchronously, so the
          // input is gone from the tree before its own blur could fire and re-commit.
          onBlur={onEditCommit}
        />
      ) : (
        <Name>{row.name}</Name>
      )}

      {editing ? (
        <IconButton type="button" aria-label={`Save name for ${row.name}`} onClick={onEditCommit}>
          <CheckIcon />
        </IconButton>
      ) : (
        <IconButton type="button" disabled={gone} aria-label={`Rename ${row.name}`} onClick={() => onEditStart(row.id)}>
          <PencilIcon />
        </IconButton>
      )}

      <DeleteButton type="button" disabled={gone} aria-label={`Delete ${row.name}`} onClick={() => onDelete(row)}>
        <TrashIcon />
      </DeleteButton>
    </Row>
  );
};

export default RecommendationRow;
