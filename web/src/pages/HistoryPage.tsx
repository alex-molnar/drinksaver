import React, { useCallback, useMemo, useReducer, useRef, useState } from 'react';
import styled from '@emotion/styled';
import AppFrame from '../components/AppFrame';
import DayStrip from '../components/DayStrip';
import PaperTab from '../components/PaperTab';
import { useDrinksForDate } from '../drink/useDrinksForDate';
import { useDayCounts } from '../drink/useDayCounts';
import { useSaveQueue } from '../drink/useSaveQueue';
import { dayStripDates, dayLabel, drinkingDay } from '../drink/day';
import type { EditableDrink } from '../types/api';
import { useSetPageFeedbackContainer } from '../components/PageFeedbackContext';

import { EMPTY_HISTORY_PRESENCE, historyPresenceReducer, historyRows } from '../drink/historyPresence';
import { suppressedIdsForDate } from '../drink/saveQueueReducer';

const HistoryScroll = styled.section`
  flex: 1;
  /* Keep one control's worth of list visible when bulk actions and feedback coexist. */
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

const BulkBar = styled.div`
  flex: none;
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

/** A keyed instance owns only one date's selection and visual exits. The queue outlives it. */
const HistoryDay: React.FC<{ date: string; label: string }> = ({ date, label }) => {
  const setFeedbackContainer = useSetPageFeedbackContainer();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [presence, dispatch] = useReducer(historyPresenceReducer, EMPTY_HISTORY_PRESENCE);
  const sequence = useRef(0);
  const { remove, queue } = useSaveQueue();
  const drinksForDate = useDrinksForDate(date);
  const liveRows = drinksForDate.status === 'ready' ? drinksForDate.rows : [];
  const rows = historyRows(liveRows, presence, suppressedIdsForDate(queue, date), selectedIds);

  const finishExit = useCallback((id: number, token: number) => {
    dispatch({ type: 'finish', id, token });
  }, []);

  const crossOff = (drinks: readonly EditableDrink[], label: string) => {
    if (drinks.length === 0) return;
    const drinkIds = drinks.map((drink) => drink.id);
    // Capture order and row data before the same event suppresses them in the read model.
    dispatch({ type: 'remove', drinks, order: rows.map((row) => row.drink.id), token: ++sequence.current });
    remove({ label, date, drinkIds });
    setSelectedIds((previous) => new Set([...previous].filter((id) => !drinkIds.includes(id))));
  };

  const toggleSelect = (drink: EditableDrink) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(drink.id)) next.delete(drink.id);
      else next.add(drink.id);
      return next;
    });
  };

  const selected = liveRows.filter((drink) => selectedIds.has(drink.id));
  return (
    <>
      <HistoryScroll aria-label="Drinks for selected day" tabIndex={0}>
        <PaperTab
          label={label}
          status={drinksForDate.status}
          rows={rows}
          onToggleSelect={toggleSelect}
          onDeleteOne={(drink) => crossOff([drink], drink.name)}
          onExitComplete={finishExit}
        />
      </HistoryScroll>
      <FeedbackSlot ref={setFeedbackContainer} />
      {selected.length > 0 ? (
        <BulkBar>
          <BulkButton
            type="button"
            onClick={() => crossOff(selected, `${selected.length} ${selected.length === 1 ? 'drink' : 'drinks'}`)}
            aria-label="Delete selected"
          >
            {`Cross off ${selected.length}`}
          </BulkButton>
        </BulkBar>
      ) : null}
    </>
  );
};

const HistoryPage: React.FC = () => {
  const todayDate = drinkingDay(new Date());
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const dates = useMemo(() => dayStripDates(todayDate), [todayDate]);
  const counts = useDayCounts(dates);
  const label = dayLabel(selectedDate, todayDate);

  return (
    <AppFrame title="History" subtitle={label}>
      <DayStrip dates={dates} counts={counts} selectedDate={selectedDate} todayDate={todayDate} onSelect={setSelectedDate} />
      <HistoryDay key={selectedDate} date={selectedDate} label={label} />
    </AppFrame>
  );
};

export default HistoryPage;
