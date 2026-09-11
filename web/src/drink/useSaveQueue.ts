import { useContext } from 'react';
import { SaveQueueContext, type SaveQueueContextType } from './SaveQueueContext';

export const useSaveQueue = (): SaveQueueContextType => {
  const context = useContext(SaveQueueContext);

  if (!context) {
    throw new Error('useSaveQueue must be used within a SaveQueueProvider');
  }

  return context;
};

export default useSaveQueue;
