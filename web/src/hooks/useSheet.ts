import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export interface UseSheetResult<P> {
  isOpen: boolean;
  /** The pushed panel stack, root first. Component state, not URL: see the module doc. */
  panels: readonly P[];
  open: (initialPanel?: P) => void;
  pushPanel: (panel: P) => void;
  /** Pops one panel. Dismisses the whole sheet instead, once there is nothing left under the
   *  current one - a header "back" affordance never has to know which case it is in. */
  popPanel: () => void;
  /** Pops every panel above the root in one go. Used where a flow's own destination is the root
   *  panel regardless of how many panels were pushed to get here - e.g. creating a catalogue entry
   *  from several levels deep should land back on the main menu, not unwind one level at a time. */
  popToRoot: () => void;
  /** Ends the sheet entirely. Wired to the Drawer's own close (Escape, the scrim, and the
   *  physical back button all reach this, whether directly or via the URL's `sheet` param
   *  disappearing on its own). */
  dismiss: () => void;
}

interface SheetLocationState<P> {
  /** How many router history entries this sheet's own `open()` pushed, so `dismiss` knows how
   *  many to pop. Stamped via `navigate(to, { state })`, which React Router serialises into
   *  `history.state`, so unlike a plain in-memory counter it survives a reload and bfcache. See
   *  the design doc, "Sheets are routes". */
  sheetDismissDepth?: number;
  sheetInitialPanel?: P;
}

/**
 * The sheet stack primitive: one bit of URL (`?sheet=<sheetId>`) for whether the sheet is open at
 * all, with the panel stack inside it kept as ordinary component state.
 *
 * `open()` always pushes a fresh history entry stamped with a dismiss depth of 1, so `dismiss()`
 * can always get back to wherever the sheet was opened from with a single `navigate(-1)`. The
 * one case that entry has no stamped depth is a cold load straight onto the sheet's URL - a
 * stale bookmark, a shared link, or a redirect that lands here via `replace` - where there is no
 * "before" entry in this session to pop back to at all. `dismiss()` tells the two apart by
 * reading the depth back off `history.state` rather than counting in memory, which is exactly
 * what makes it survive a reload: per the design doc, an earlier draft's in-memory counter did
 * not.
 *
 * Safe to call from more than one place at once - a "Something else" plate that opens the sheet
 * fresh, and `SheetHost`, which renders it - because `isOpen` is derived from the shared router
 * location rather than from this hook's own local state. Only the caller that actually renders
 * panels (`SheetHost`) needs to read `panels`/`pushPanel`/`popPanel` for anything; a caller that
 * only wants `open()` can ignore the rest.
 */
export const useSheet = <P,>(sheetId: string, initialPanel: P): UseSheetResult<P> => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isOpen = searchParams.get('sheet') === sheetId;
  const requestedPanel = (location.state as SheetLocationState<P> | null)?.sheetInitialPanel;
  const initialPanels = requestedPanel === undefined ? [initialPanel] : [initialPanel, requestedPanel];

  const [panels, setPanels] = useState<P[]>(() => {
    if (!isOpen) return [];
    return initialPanels;
  });
  const [previousIsOpen, setPreviousIsOpen] = useState(isOpen);
  const wasOpenRef = useRef(isOpen);

  // A location change can open an already mounted host whose local stack is still empty (or
  // left over from a prior visit). Synchronize during render so the first committed panel is the
  // requested one; the effect below continues to own the state for later push/pop operations.
  if (isOpen !== previousIsOpen) {
    setPreviousIsOpen(isOpen);
    if (isOpen) {
      setPanels(initialPanels);
    }
  }

  // Whenever the sheet transitions from closed to open - including a fresh mount that lands
  // already open - the stack starts over at the root panel. A cold load must never resume a
  // dot-joined deep link's panel (that whole encoding is gone; see the design doc), and a plain
  // reopen should not show wherever a previous visit left off either.
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setPanels(initialPanels);
    }
    wasOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const open = useCallback((initialPanel?: P) => {
    const nextParams = new URLSearchParams(location.search);
    nextParams.set('sheet', sheetId);
    const state: SheetLocationState<P> = {
      sheetDismissDepth: 1,
      sheetInitialPanel: initialPanel,
    };
    navigate({ pathname: location.pathname, search: `?${nextParams.toString()}` }, { state });
  }, [location.pathname, location.search, navigate, sheetId]);

  const dismiss = useCallback(() => {
    const depth = (location.state as SheetLocationState<P> | null)?.sheetDismissDepth ?? 0;
    if (depth > 0) {
      navigate(-depth);
      return;
    }
    const nextParams = new URLSearchParams(location.search);
    nextParams.delete('sheet');
    const search = nextParams.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
  }, [location.pathname, location.search, location.state, navigate]);

  const pushPanel = useCallback((panel: P) => {
    setPanels((current) => [...current, panel]);
  }, []);

  const popPanel = useCallback(() => {
    if (panels.length <= 1) {
      dismiss();
      return;
    }
    setPanels((current) => current.slice(0, -1));
  }, [panels.length, dismiss]);

  const popToRoot = useCallback(() => {
    if (panels.length <= 1) {
      dismiss();
      return;
    }
    setPanels((current) => current.slice(0, 1));
  }, [panels.length, dismiss]);

  return { isOpen, panels, open, pushPanel, popPanel, popToRoot, dismiss };
};

export default useSheet;
