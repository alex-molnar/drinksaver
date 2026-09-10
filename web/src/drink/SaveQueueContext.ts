import { createContext } from 'react';
import type { SaveDrinkPayload, SaveQueueEntry, SaveQueueState } from './saveQueueReducer';
import type { UseUndoTimerHandlers } from '../hooks/useUndoTimer';

/** What `save()` needs beyond the payload itself: the label and date are queue bookkeeping the
 *  API call itself does not need but the strip and the read model do. */
export interface SaveQueueSaveInput {
  label: string;
  date: string;
  alcoholTypeId: number;
  /** `date` is supplied separately above and merged in by the provider, so a caller building this
   *  from a recommendation does not have to repeat it. */
  payload: Omit<SaveDrinkPayload, 'date'>;
}

export interface SaveQueueRemoveInput {
  label: string;
  date: string;
  drinkIds: number[];
}

export interface SaveQueueContextType {
  /** Read-only snapshot, for `useDrinksForDate`'s merge. */
  queue: SaveQueueState;
  /** The single entry the strip shows, or null. */
  current: SaveQueueEntry | null;
  /** Saves immediately. Fire-and-forget in spirit - the queue owns the rest of the lifecycle,
   *  including raising the strip once the server confirms it - but returns the entry's id so a
   *  caller that wants to show its own "this tile is saving" spinner can tell when its own entry
   *  in particular has left 'saving', without guessing from the label alone. */
  save: (input: SaveQueueSaveInput) => string;
  /** Defers a delete until the undo window closes or a flush trigger fires. */
  remove: (input: SaveQueueRemoveInput) => void;
  /** Undoes whatever the strip currently shows. A no-op if nothing is undoable. */
  undo: () => void;
  /** Retries whatever the strip currently shows as failed. A no-op otherwise. */
  retry: () => void;
  /** Spread onto the strip's root: pausing while focus or hover is inside it is what satisfies
   *  WCAG 2.2 SC 2.2.1. */
  stripHandlers: UseUndoTimerHandlers;
}

export const SaveQueueContext = createContext<SaveQueueContextType | null>(null);
