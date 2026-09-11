import { createContext, useContext } from 'react';

/**
 * Where the undo strip should portal while the add sheet is open, instead of `document.body`.
 * `SheetHost` is the sole writer: it registers the Drawer's own container while open and clears
 * it back to `null` on close. `SaveQueueProvider` is the sole reader, passing the value straight
 * through to `TapeStrip`'s `container` prop.
 *
 * A context, not a prop, because the two live on opposite sides of the tree that renders them:
 * `SaveQueueProvider` renders `TapeStrip` above `App.tsx`'s `<Routes>`, and `SheetHost` (which
 * knows the container) is mounted inside `SaveQueueProvider`'s own children. React context does
 * not flow sideways or upward, so this needs a provider that is an ancestor of both - see
 * `App.tsx`, and the design doc's "Sheets are routes" section on the strip's portal.
 *
 * The default value (`container: null`, a no-op setter) is what every existing test that renders
 * `SaveQueueProvider` without this provider keeps working against: no sheet means no container,
 * which means `TapeStrip` falls back to its own default of `document.body`, exactly as before
 * this PR.
 */
export interface SheetPortalContextValue {
  container: HTMLElement | null;
  setContainer: (node: HTMLElement | null) => void;
}

const noopSetContainer = (): void => {};

export const SheetPortalContext = createContext<SheetPortalContextValue>({
  container: null,
  setContainer: noopSetContainer,
});

export const useSheetPortalContainer = (): HTMLElement | null => useContext(SheetPortalContext).container;

export const useSetSheetPortalContainer = (): ((node: HTMLElement | null) => void) =>
  useContext(SheetPortalContext).setContainer;
