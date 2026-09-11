import React, { useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { dayLabel, dayStripTabLabel } from '../drink/day';
import type { DayCount } from '../drink/useDayCounts';

export interface DayStripProps {
  /** Exactly `DAY_STRIP_LENGTH` drinking-day dates, oldest first, ending at `todayDate`. */
  dates: readonly string[];
  /** One entry per `dates`, same order - `useDayCounts(dates)`'s own return. */
  counts: readonly DayCount[];
  selectedDate: string;
  /** The latest date selectable from the picker: the current drinking day, never a date that
   *  has not started yet. */
  todayDate: string;
  onSelect: (date: string) => void;
}

const MAX_PIPS = 4;

const Strip = styled.div`
  display: flex;
  gap: 7px;
  padding: 14px var(--ds-space-lg) 4px;
  overflow-x: auto;
  flex: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const dayTileBase = `
  flex: none;
  width: 54px;
  min-height: 44px;
  padding: 9px 0 8px;
  border-radius: var(--ds-radius-sm) var(--ds-radius-sm) 0 0;
  border: 0;
  background: color-mix(in srgb, var(--ds-ink-primary) 6%, transparent);
  color: var(--ds-ink-tertiary);
  font: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  -webkit-tap-highlight-color: transparent;
  transition:
    background var(--ds-motion-duration-base) var(--ds-motion-easing-standard),
    color var(--ds-motion-duration-base) var(--ds-motion-easing-standard);

  &:focus-visible {
    outline: 2px solid var(--ds-ink-primary);
    outline-offset: 2px;
  }
  &[aria-current] {
    background: var(--ds-surface-paper);
    color: var(--ds-ink-on-paper);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Day = styled.button`
  ${dayTileBase}
`;

const Weekday = styled.span`
  font-family: var(--ds-type-caption-font-family);
  font-size: 10px;
  letter-spacing: 0.04em;
`;

const DayNumber = styled.span`
  font-family: var(--ds-type-display-s-font-family);
  font-weight: var(--ds-type-display-s-font-weight);
  font-size: 22px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
`;

const Pips = styled.span`
  display: flex;
  gap: 2.5px;
  height: 5px;
  align-items: center;
`;

const Pip = styled.i`
  width: 4.5px;
  height: 4.5px;
  border-radius: 1px;
  display: block;
  background: currentColor;
`;

/** A day whose query has not settled yet: its own mark, never the same blank the strip draws for
 *  a day it has confirmed has no drinks. See the design doc's "Known gaps". */
const UnknownPip = styled.i`
  width: 8px;
  height: 1.5px;
  border-radius: 1px;
  display: block;
  background: currentColor;
  opacity: 0.55;
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const PickTile = styled.div<{ $active: boolean }>`
  ${dayTileBase}
  position: relative;
  justify-content: center;
  color: var(--ds-ink-tertiary);
  ${(p) => (p.$active ? 'background: var(--ds-surface-paper); color: var(--ds-ink-on-paper);' : '')}
`;

const PickInput = styled.input`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  border: 0;
  padding: 0;
  cursor: pointer;
`;

const CalendarIcon: React.FC = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
  </svg>
);

/** Screen-reader text for a day's own status, since the pips that carry it visually are
 *  decorative colour with no accessible equivalent otherwise. */
const statusText = (count: DayCount): string => {
  if (count.status === 'loading') return 'not loaded yet';
  if (count.status === 'error') return 'could not load';
  if (count.count === 0) return 'no drinks';
  return `${count.count} ${count.count === 1 ? 'drink' : 'drinks'}`;
};

/**
 * Seven day tabs with marks under each, the selected one taking on the paper tab's own colour so
 * it reads as growing out of the tab beneath it, plus a "pick a date" tile at the end opening a
 * native date input - the arbitrary date reach `HistoryPage` has always had, restored per the
 * design doc's "Behaviours the prototype dropped".
 *
 * A day still loading draws its own mark (`UnknownPip`), never the blank a confirmed-empty day
 * draws: `getSavedDrinksByDate` is per-day and there is no range endpoint, so this strip cannot
 * know every day up front, and claiming an unread day is empty would be a lie one refetch later
 * proves wrong.
 */
const DayStrip: React.FC<DayStripProps> = ({ dates, counts, selectedDate, todayDate, onSelect }) => {
  const stripRef = useRef<HTMLDivElement>(null);

  // The current day is the last of the seven, so on a narrow screen it starts off the right
  // edge. Without this the strip opens showing the oldest days and hiding the one it is
  // actually displaying below.
  useEffect(() => {
    const current = stripRef.current?.querySelector('[aria-current="date"]');
    current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [selectedDate]);

  return (
    <Strip ref={stripRef}>
      {dates.map((date, i) => {
        const count = counts[i];
        const { weekday, day } = dayStripTabLabel(date);
        const isCurrent = date === selectedDate;
        return (
          <Day
            key={date}
            type="button"
            aria-current={isCurrent ? 'date' : undefined}
            onClick={() => onSelect(date)}
          >
            <Weekday aria-hidden="true">{weekday}</Weekday>
            <DayNumber aria-hidden="true">{day}</DayNumber>
            <Pips aria-hidden="true">
              {count.status === 'ready' && count.swatches.slice(0, MAX_PIPS).map((colour, j) => (
                // Index keys, deliberately: a swatch has no id of its own, and a resolved day's
                // pips are never reordered or filtered, only replaced wholesale when the day
                // refetches. No eslint-disable, because this repo does not configure the rule it
                // would have suppressed, and a disable for an unknown rule is itself an error.
                <Pip key={`${date}-${j}`} style={{ color: colour }} />
              ))}
              {count.status !== 'ready' && <UnknownPip />}
            </Pips>
            <VisuallyHidden>
              {dayLabel(date, todayDate)}, {statusText(count)}
            </VisuallyHidden>
          </Day>
        );
      })}
      <PickTile $active={!dates.includes(selectedDate)}>
        <CalendarIcon />
        <PickInput
          type="date"
          aria-label="Pick a date"
          value={selectedDate}
          max={todayDate}
          onChange={(e) => {
            if (e.target.value) {
              onSelect(e.target.value);
            }
          }}
        />
      </PickTile>
    </Strip>
  );
};

export default DayStrip;
