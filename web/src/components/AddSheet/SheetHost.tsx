import React, { Suspense, lazy, useCallback } from 'react';
import { Drawer } from '@mui/material';
import styled from '@emotion/styled';
import { useSheet } from '../../hooks/useSheet';
import { ADD_SHEET_ID } from '../../drink/draftReducer';
import { useSetSheetPortalContainer } from './SheetPortalContext';
import { MENU_PANEL, type AddSheetPanel } from './panels';

const MenuPanel = lazy(() => import('./MenuPanel'));
const OptionPanel = lazy(() => import('./OptionPanel'));
const CreatePanel = lazy(() => import('./CreatePanel'));

const StyledDrawer = styled(Drawer)`
  & .MuiDrawer-paper {
    background: var(--ds-surface-panel);
    color: var(--ds-ink-primary);
    border-radius: var(--ds-radius-lg) var(--ds-radius-lg) 0 0;
    max-height: 88vh;
  }
`;

const Grab = styled.span`
  display: block;
  width: 44px;
  height: 4px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-line-hairline);
  margin: 11px auto 4px;
  flex: none;
`;

const PanelFallback = styled.p`
  padding: var(--ds-space-xxl) var(--ds-space-lg);
  text-align: center;
  color: var(--ds-ink-tertiary);
`;

/**
 * The one Drawer for the whole add-sheet panel stack, swapping its content by the top panel
 * rather than mounting a fresh Drawer per panel. A fresh Drawer per panel would restart the focus
 * trap and replay the slide-up transition on every push - see the design doc and this component's
 * own module doc reference in the PR plan.
 *
 * A sibling of `<Routes>` in `App.tsx`, inside the app-level `Suspense`: this component supplies
 * its own nested `Suspense` around the lazily loaded panels so a panel's chunk loading cannot
 * blank the whole screen the way it would if it only had the outer boundary to fall back on.
 *
 * Also owns the strip's portal slot: a plain `div` rendered inside the Drawer while it is open,
 * registered with `SheetPortalContext` so `SaveQueueProvider` can portal the undo strip there
 * instead of `document.body`. See `SheetPortalContext.ts`'s module doc for why that matters.
 */
const SheetHost: React.FC = () => {
  const sheet = useSheet<AddSheetPanel>(ADD_SHEET_ID, MENU_PANEL);
  const setStripContainer = useSetSheetPortalContainer();

  const stripSlotRef = useCallback(
    (node: HTMLDivElement | null) => setStripContainer(node),
    [setStripContainer]
  );

  const top = sheet.panels[sheet.panels.length - 1] ?? MENU_PANEL;

  return (
    <StyledDrawer anchor="bottom" open={sheet.isOpen} onClose={sheet.dismiss} aria-labelledby="add-sheet-heading">
      <Grab aria-hidden="true" />
      <Suspense fallback={<PanelFallback role="status">Loading…</PanelFallback>}>
        {top.kind === 'menu' && <MenuPanel onPushPanel={sheet.pushPanel} onDismiss={sheet.dismiss} />}
        {top.kind === 'option' && (
          <OptionPanel field={top.field} onPushPanel={sheet.pushPanel} onPopPanel={sheet.popPanel} />
        )}
        {top.kind === 'create' && <CreatePanel field={top.field} onPopPanel={sheet.popPanel} />}
      </Suspense>
      {sheet.isOpen && <div ref={stripSlotRef} />}
    </StyledDrawer>
  );
};

export default SheetHost;
