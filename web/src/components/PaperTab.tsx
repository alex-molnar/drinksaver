import React, { useCallback, useLayoutEffect, useRef } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { strikeOff } from './historyMotion';
import { useHistoryLayoutMotion } from './useHistoryLayoutMotion';
import styled from '@emotion/styled';
import { Glass } from '../drink/glassware';
import { drinkIdentity } from '../drink/identity';
import type { EditableDrink } from '../types/api';

export type PaperTabStatus = 'loading' | 'error' | 'ready';

/** A live row or an explicitly crossed-off row retained in its original slot until its
 * animation finishes. Live data wins on Undo; the token identifies this particular exit. */
export interface PaperTabRow {
  drink: EditableDrink;
  selected: boolean;
  gone: boolean;
  token?: number;
  /**
   * The serving detail shown after the dotted leader ("0.5 L draft"), if there is one to show.
   * `EditableDrink` - what `getSavedDrinksByDate` actually returns - carries no such field today;
   * the composed server name already folds serving information into `drink.name` itself (see
   * `identity.ts`'s module doc: "Gin (Long drink - 0.25l)"). This stays optional, and unrendered
   * when absent (see `Plate.tsx`'s identical treatment of its own optional caption), rather than
   * inventing a value this PR has no real data for.
   */
  detail?: string;
}

export interface PaperTabProps {
  /** "Today", "Yesterday", or a full weekday-and-date - see `drink/day.ts`'s `dayLabel`. */
  label: string;
  status: PaperTabStatus;
  rows: readonly PaperTabRow[];
  onToggleSelect: (drink: EditableDrink) => void;
  onDeleteOne: (drink: EditableDrink) => void;
  onExitComplete?: (id: number, token: number) => void;
}

/**
 * The one light surface in an otherwise dark-only app: a cream card with dark ink on it, per the
 * design doc's Utolsó Kör direction. `--ds-surface-paper` / `--ds-ink-on-paper` measure 12.32:1
 * (`contrast.ts`'s own maths, verified independently while building this component), well clear
 * of the 4.5:1 this row text needs.
 */
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
  transform-origin: top;
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

/** The pen draws with a transform, leaving row width and text layout unchanged. */
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

/** No height cap or layout-property transition: long names determine their real height. */
const Row = styled.div`
  display: flex;
  align-items: baseline;
  gap: 9px;
  padding: 13px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--ds-ink-on-paper) 16%, transparent);
  position: relative;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:last-of-type { border-bottom: 0; }
  &:focus-visible {
    outline: 2px solid var(--ds-ink-on-paper);
    outline-offset: -3px;
  }
  &[data-gone] { pointer-events: none; }
`;

const RowGlass = styled.span`
  flex: none;
  width: 22px;
  height: 32px;
  display: flex;
  align-items: flex-end;
`;

const Name = styled.span`
  font-family: var(--ds-type-display-s-font-family);
  font-weight: var(--ds-type-display-s-font-weight);
  font-size: 17px;
  /* Takes the width it needs and wraps rather than being held to a share of the row. The leader
     keeps a few dots either way; it is decoration, and the name is the content. */
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const Lead = styled.span`
  flex: 0 1 auto;
  height: 0;
  border-bottom: 2px dotted color-mix(in srgb, var(--ds-ink-on-paper) 30%, transparent);
  transform: translateY(-5px);
  min-width: 14px;
`;

const Detail = styled.span`
  font-family: var(--ds-type-caption-font-family);
  font-size: var(--ds-type-caption-font-size);
  flex: none;
`;

/** Visually a checkmark tile; never itself the click target (`pointer-events: none`), so the
 *  row's own click handler is the single source of truth for toggling selection and there is
 *  never a race between a native checkbox toggle and the row's own state update. */
const CheckTile = styled.input`
  flex: none;
  width: 20px;
  height: 20px;
  margin: 0;
  accent-color: var(--ds-ink-on-paper);
  pointer-events: none;
`;

const CrossButton = styled.button`
  margin-left: 6px;
  width: 34px;
  height: 34px;
  min-width: 44px;
  min-height: 44px;
  margin-top: -5px;
  margin-bottom: -5px;
  border-radius: var(--ds-radius-sm);
  border: 0;
  background: none;
  color: color-mix(in srgb, var(--ds-ink-on-paper) 45%, transparent);
  cursor: pointer;
  display: grid;
  place-items: center;
  flex: none;
  align-self: center;
  transition:
    color var(--ds-motion-duration-fast) var(--ds-motion-easing-standard),
    background var(--ds-motion-duration-fast) var(--ds-motion-easing-standard);

  &:hover {
    color: var(--ds-accent-danger);
    background: color-mix(in srgb, var(--ds-accent-danger) 12%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--ds-ink-on-paper);
    outline-offset: -3px;
  }
`;

const CrossIcon: React.FC = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

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

const countText = (n: number): string => {
  if (n === 0) return 'nothing';
  return `${n} ${n === 1 ? 'drink' : 'drinks'}`;
};

const HistoryRow: React.FC<{
  row: PaperTabRow;
  reduced: boolean;
  onToggleSelect: PaperTabProps['onToggleSelect'];
  onDeleteOne: PaperTabProps['onDeleteOne'];
  onExitComplete: PaperTabProps['onExitComplete'];
}> = ({ row: { drink, selected, gone, detail, token }, reduced, onToggleSelect, onDeleteOne, onExitComplete }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const strokeRef = useRef<HTMLSpanElement>(null);
  const finish = useCallback(() => {
    if (token !== undefined) onExitComplete?.(drink.id, token);
  }, [drink.id, token, onExitComplete]);
  useLayoutEffect(() => {
    if (gone) return strikeOff(rowRef.current!, strokeRef.current!, finish, reduced);
  }, [gone, reduced, finish]);
  const identity = drinkIdentity(drink.name, drink.alcoholTypeId);

  return (
    <Row
      ref={rowRef}
      role="button"
      tabIndex={gone ? -1 : 0}
      inert={gone}
      aria-label={drink.name}
      data-history-row={drink.id}
      data-gone={gone ? '' : undefined}
      onClick={() => onToggleSelect(drink)}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onToggleSelect(drink);
        }
      }}
    >
      <Strike ref={strokeRef} data-history-strike aria-hidden="true" />
      <CheckTile type="checkbox" checked={selected} readOnly tabIndex={-1} aria-label={drink.name} />
      <RowGlass aria-hidden="true"><Glass kind={identity.glass} chroma={identity.chroma} tone="ink" /></RowGlass>
      <Name>{drink.name}</Name>
      <Lead aria-hidden="true" />
      {detail ? <Detail>{detail}</Detail> : null}
      <CrossButton
        type="button"
        disabled={gone}
        aria-label={`Cross off ${drink.name}`}
        onClick={(event) => { event.stopPropagation(); onDeleteOne(drink); }}
      ><CrossIcon /></CrossButton>
    </Row>
  );
};

/** Counts come from live rows; visual exit rows remain keyed until their own sequence finishes. */
const PaperTab: React.FC<PaperTabProps> = ({ label, status, rows, onToggleSelect, onDeleteOne, onExitComplete }) => {
  const tabRef = useRef<HTMLDivElement>(null);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  useHistoryLayoutMotion(tabRef, rows, reduced);
  const liveCount = rows.filter((row) => !row.gone).length;
  return (
    <Tab ref={tabRef}>
      <Surface data-history-paper aria-hidden="true" />
      <Header>
        {label}
        <Count>
          {status === 'loading' ? 'loading…' : status === 'error' ? 'unavailable' : countText(liveCount)}
        </Count>
      </Header>

      {status === 'error' && (
        <Empty role="alert">
          <EmptyTitle>Couldn&apos;t load this day</EmptyTitle>
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
          <EmptyTitle>Nothing on this day</EmptyTitle>
          Days with drinks carry a mark under the date.
        </Empty>
      )}

      {status === 'ready' && rows.map((row) => (
        <HistoryRow key={row.drink.id} row={row} reduced={reduced}
          onToggleSelect={onToggleSelect} onDeleteOne={onDeleteOne} onExitComplete={onExitComplete} />
      ))}
    </Tab>
  );
};

export default PaperTab;
