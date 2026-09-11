import { useContext } from 'react';
import { DraftContext, type DraftContextType } from './DraftContext';

export const useDraft = (): DraftContextType => {
  const context = useContext(DraftContext);

  if (!context) {
    throw new Error('useDraft must be used within a DraftProvider');
  }

  return context;
};

export default useDraft;
