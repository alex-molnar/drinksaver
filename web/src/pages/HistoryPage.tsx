import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from '@emotion/styled';
import AppFrame from '../components/AppFrame';
import DayStrip from '../components/DayStrip';
import PaperTab from '../components/PaperTab';
import type { PaperTabRow } from '../components/PaperTab';
import { useDrinksForDate } from '../drink/useDrinksForDate';
import { useDayCounts } from '../drink/useDayCounts';
import { useSaveQueue } from '../drink/useSaveQueue';
import { dayStripDates, dayLabel, drinkingDay } from '../drink/day';
import type { EditableDrink } from '../types/api';

/** How long a struck-through row stays mounted so its exit can play. Matches PaperTab's CSS. */
const EXIT_MS = 320;

const BulkBar = styled.div`
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: center;
  padding: var(--ds-space-sm) var(--ds-space-lg) var(--ds-space-lg);
`;

const BulkButton = styled.button`
  min-height: 44px;
  padding: 0 var(--ds-space-lg);
  border: 0;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-accent-danger);
  color: var(--ds-ink-primary);
  font-family: var(--ds-type-display-family);
  font-size: 1rem;
  cursor: pointer;
`;

/**
 * The bar tab. A seven day strip across the top, and the selected day's drinks on a cream paper
 * card below it.
 *
 * Deleting keeps the semantics `useSaveQueue` already owns: the row is suppressed from the merged
 * read model at once and the DELETE itself is deferred until the undo window closes, because
 * there is no undelete endpoint and `getSavedDrinksByDate` returns too little to write a row
 * back. This page only decides how that looks.
 *
 * The one piece of state that is genuinely this page's own is `leaving`: a row the read model has
 * already dropped, kept mounted a beat longer so the strike-through has somewhere to play. The
 * queue is the source of truth for whether the drink exists; this is only about the animation.
 */
const HistoryPage: React.FC = () => {
  const todayDate = drinkingDay(new Date());
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [leaving, setLeaving] = useState<readonly EditableDrink[]>([]);

  const { remove } = useSaveQueue();
  const drinksForDate = useDrinksForDate(selectedDate);
  const dates = useMemo(() => dayStripDates(todayDate), [todayDate]);
  const counts = useDayCounts(dates);

  // Memoised, not computed inline: this feeds an effect's dependency list, and a fresh `[]`
  // literal on every non-ready render would make that effect run on every render.
  const liveRows = useMemo(
    () => (drinksForDate.status === 'ready' ? drinksForDate.rows : []),
    [drinksForDate]
  );
  const lastLive = useRef<readonly EditableDrink[]>([]);

  const exitTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Whatever the read model dropped since the previous render is on its way out. Held in an
  // effect rather than computed during render because it has to outlive the render that noticed
  // it, which is the whole point of the exit.
  //
  // The timer is deliberately not cleared when this effect re-runs. An earlier version returned
  // `() => clearTimeout(timer)`, which meant the very next render cancelled the pending removal,
  // so a struck-through row stayed mounted for good and the same drink appeared twice once undo
  // put it back. Each dropped batch owns its own timer and only unmount cancels them.
  useEffect(() => {
    if (drinksForDate.status !== 'ready') {
      return;
    }
    const liveIds = new Set(liveRows.map((r) => r.id));
    const dropped = lastLive.current.filter((r) => !liveIds.has(r.id));
    lastLive.current = liveRows;
    if (dropped.length === 0) {
      return;
    }
    setLeaving((prev) => [...prev, ...dropped]);
    exitTimers.current.push(
      setTimeout(
        () => setLeaving((prev) => prev.filter((r) => !dropped.some((d) => d.id === r.id))),
        EXIT_MS
      )
    );
  }, [drinksForDate.status, liveRows]);

  useEffect(() => {
    const timers = exitTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedIds(new Set());
  }, []);

  const handleToggleSelect = useCallback((drink: EditableDrink) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(drink.id)) {
        next.delete(drink.id);
      } else {
        next.add(drink.id);
      }
      return next;
    });
  }, []);

  const handleDeleteOne = useCallback(
    (drink: EditableDrink) => {
      remove({ label: drink.name, date: selectedDate, drinkIds: [drink.id] });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(drink.id);
        return next;
      });
    },
    [remove, selectedDate]
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) {
      return;
    }
    const drinkIds = Array.from(selectedIds);
    const label = `${drinkIds.length} ${drinkIds.length === 1 ? 'drink' : 'drinks'}`;
    remove({ label, date: selectedDate, drinkIds });
    setSelectedIds(new Set());
  }, [selectedIds, remove, selectedDate]);

  const rows: PaperTabRow[] = useMemo(
    () => [
      ...liveRows.map((drink) => ({ drink, selected: selectedIds.has(drink.id), gone: false })),
      ...leaving.map((drink) => ({ drink, selected: false, gone: true })),
    ],
    [liveRows, leaving, selectedIds]
  );

  return (
    <AppFrame title="History" subtitle={dayLabel(selectedDate, todayDate)}>
      <DayStrip
        dates={dates}
        counts={counts}
        selectedDate={selectedDate}
        todayDate={todayDate}
        onSelect={handleSelectDate}
      />
      <PaperTab
        label={dayLabel(selectedDate, todayDate)}
        status={drinksForDate.status}
        rows={rows}
        onToggleSelect={handleToggleSelect}
        onDeleteOne={handleDeleteOne}
      />
      {selectedIds.size > 0 ? (
        <BulkBar>
          <BulkButton type="button" onClick={handleDeleteSelected} aria-label="Delete selected">
            {`Cross off ${selectedIds.size}`}
          </BulkButton>
        </BulkBar>
      ) : null}
    </AppFrame>
  );
};

export default HistoryPage;
