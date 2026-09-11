import React, { useEffect, useReducer, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DraftContext } from './DraftContext';
import { ADD_SHEET_ID, initialDraftState, reduceDraft } from './draftReducer';
import { drinkingDay } from './day';

interface DraftProviderProps {
  children: React.ReactNode;
}

/**
 * Owns the add-draft for the whole session. Mounted above `<Routes>` in `App.tsx`, next to
 * `SaveQueueProvider` and as a sibling of the sheet host: the sheet host renders over any route,
 * and React context does not flow sideways, so a provider mounted inside a route element would
 * leave the sheet reading a null context and throwing on first open. See the design doc, "Sheets
 * are routes".
 *
 * Resets the draft itself, watching the same `?sheet=add` parameter `useSheet` does, rather than
 * leaving every opener to remember to dispatch `reset`. A cold load straight into `?sheet=add`
 * (a stale `/detailed` bookmark, redirected) must show an empty draft precisely because there is
 * no session to resume - see the design doc's "a deep URL is meaningless on a cold load" - and
 * driving the reset off the URL rather than off each call site makes that true unconditionally,
 * including for that cold-load case, without every future opener needing to know about it.
 */
export const DraftProvider: React.FC<DraftProviderProps> = ({ children }) => {
  const [draft, dispatch] = useReducer(reduceDraft, undefined, () => initialDraftState(drinkingDay(new Date())));
  const [searchParams] = useSearchParams();
  const isSheetOpen = searchParams.get('sheet') === ADD_SHEET_ID;
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isSheetOpen && !wasOpenRef.current) {
      dispatch({ type: 'reset', today: drinkingDay(new Date()) });
    }
    wasOpenRef.current = isSheetOpen;
  }, [isSheetOpen]);

  return <DraftContext.Provider value={{ draft, dispatch }}>{children}</DraftContext.Provider>;
};

export default DraftProvider;
