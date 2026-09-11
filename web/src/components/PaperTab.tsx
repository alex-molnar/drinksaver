import React from 'react';
import styled from '@emotion/styled';
import { Glass } from '../drink/glassware';
import { drinkIdentity } from '../drink/identity';
import type { EditableDrink } from '../types/api';

export type PaperTabStatus = 'loading' | 'error' | 'ready';

/**
 * One row as `PaperTab` renders it: the drink the row is for, whether it is currently selected
 * for a bulk delete, and whether it is mid exit - struck through and collapsing, no longer part
 * of `useDrinksForDate`'s merged read model but kept mounted a beat longer so the strike-then-
 * collapse animation has somewhere to play. `HistoryPage` computes `gone` by diffing the live
 * read model against what it last rendered; `PaperTab` itself owns no timers, so it stays a
 * plain function of its props, the same way `PlateGrid` does.
 */
export interface PaperTabRow {
  drink: EditableDrink;
  selected: boolean;
  gone: boolean;
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
}

/**
 * The one light surface in an otherwise dark-only app: a cream card with dark ink on it, per the
 * design doc's Utolsó Kör direction. `--ds-surface-paper` / `--ds-ink-on-paper` measure 12.32:1
 * (`contrast.ts`'s own maths, verified independently while building this component), well clear
 * of the 4.5:1 this row text needs.
 */
const Tab = styled.div`
  margin: 0 var(--ds-space-lg) var(--ds-space-xl);
  background: var(--ds-surface-paper);
  color: var(--ds-ink-on-paper);
  border-radius: 0 var(--ds-radius-sm) var(--ds-radius-sm) var(--ds-radius-sm);
  padding: 16px 18px 4px;
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

/**
 * The red pen stroke. Driven by its own `data-gone` attribute rather than a `[data-gone] &`
 * parent selector referencing `Row`: emotion's component selectors need the babel or SWC plugin,
 * which this project's plain `@vitejs/plugin-react` setup does not run, so `HistoryPage` sets the
 * same attribute on both `Row` and `Strike` instead of this component reaching up to its parent.
 */
const Strike = styled.span`
  position: absolute;
  left: -2%;
  top: 52%;
  height: 2.5px;
  width: 0;
  background: var(--ds-accent-danger);
  border-radius: 2px;
  transform: rotate(-1.2deg);
  opacity: 0.9;
  transition: width 260ms var(--ds-motion-easing-standard);

  &[data-gone] {
    width: 104%;
    transition-delay: 0ms;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/**
 * One history row. A `div[role=button]`, not a native `<button>`: the nested checkbox and
 * cross-off control are both interactive elements, and a `<button>` may not contain other
 * interactive content per the HTML content model. `tabIndex`/`onKeyDown` below restore the
 * keyboard behaviour a native button would have given for free.
 *
 * `data-gone` drives the exit: the row's own height and opacity collapse 220ms after the strike
 * has had time to draw, matching the approved prototype's timing (`.hrow.gone`). Both transitions
 * are skipped under reduced motion; the row is removed from the DOM by `HistoryPage` on the same
 * timer either way; see that file's module doc for why the timer itself does not vary.
 */
const Row = styled.div`
  display: flex;
  align-items: baseline;
  gap: 9px;
  padding: 13px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--ds-ink-on-paper) 16%, transparent);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  /* Generous, not snug. This cap exists so the row has something to animate to zero from, but
     it also clips: composed server names run to "Guinness (Draft/Tap - 0.50l)" and wrap to two
     lines, which a 70px cap cut in half. Any realistic row fits well inside this. */
  max-height: 240px;
  transition:
    max-height var(--ds-motion-duration-slow) var(--ds-motion-easing-standard) 220ms,
    opacity var(--ds-motion-duration-base) var(--ds-motion-easing-standard) 220ms,
    padding var(--ds-motion-duration-slow) var(--ds-motion-easing-standard) 220ms;

  &:last-of-type {
    border-bottom: 0;
  }
  &:focus-visible {
    outline: 2px solid var(--ds-ink-on-paper);
    outline-offset: -3px;
  }
  &[data-gone] {
    max-height: 0;
    opacity: 0;
    padding-top: 0;
    padding-bottom: 0;
    border-bottom-color: transparent;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
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

/**
 * The bar tab: a cream card listing the selected day's drinks, each row struck through before it
 * collapses on delete. `HistoryPage` owns the selection set, the save queue and the exit timing;
 * this component only renders what it is given, exactly the split `PlateGrid` already uses for
 * Quick Save.
 */
const PaperTab: React.FC<PaperTabProps> = ({ label, status, rows, onToggleSelect, onDeleteOne }) => {
  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, drink: EditableDrink) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleSelect(drink);
    }
  };

  return (
    <Tab>
      <Header>
        {label}
        <Count>
          {status === 'loading' ? 'loading…' : status === 'error' ? 'unavailable' : countText(rows.length)}
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

      {status === 'ready' &&
        rows.map(({ drink, selected, gone, detail }) => {
          const identity = drinkIdentity(drink.name, drink.alcoholTypeId);
          return (
            <Row
              key={drink.id}
              role="button"
              tabIndex={0}
              aria-label={drink.name}
              data-gone={gone ? '' : undefined}
              onClick={() => onToggleSelect(drink)}
              onKeyDown={(e) => handleRowKeyDown(e, drink)}
            >
              <Strike aria-hidden="true" data-gone={gone ? '' : undefined} />
              <CheckTile type="checkbox" checked={selected} readOnly tabIndex={-1} aria-label={drink.name} />
              <RowGlass aria-hidden="true">
                <Glass kind={identity.glass} chroma={identity.chroma} tone="ink" />
              </RowGlass>
              <Name>{drink.name}</Name>
              <Lead aria-hidden="true" />
              {detail ? <Detail>{detail}</Detail> : null}
              <CrossButton
                type="button"
                aria-label={`Cross off ${drink.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteOne(drink);
                }}
              >
                <CrossIcon />
              </CrossButton>
            </Row>
          );
        })}
    </Tab>
  );
};

export default PaperTab;
