import { createContext, useContext } from 'react';

/** Registers an in-flow home for the queue's feedback without moving its timers into a page.
 * The ref clears on unmount. An open add sheet takes priority over this page slot. */
export const PageFeedbackContext = createContext<(node: HTMLDivElement | null) => void>(() => {});

export const useSetPageFeedbackContainer = () => useContext(PageFeedbackContext);
