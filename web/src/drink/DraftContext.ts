import { createContext } from 'react';
import type { Dispatch } from 'react';
import type { DraftAction, DraftState } from './draftReducer';

export interface DraftContextType {
  draft: DraftState;
  dispatch: Dispatch<DraftAction>;
}

export const DraftContext = createContext<DraftContextType | null>(null);
