# Header Hamburger Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the header sign-out control with an accessible hamburger menu that exposes the requested actions and starts the existing alcohol-type creation flow directly.

**Architecture:** `AppFrame` owns the visible header menu and continues to use the shared sheet URL primitive. `useSheet` will accept an optional initial panel in router history state, so every consumer sees the same starting panel without encoding the panel stack in the URL; `SheetHost` then renders the already-existing `CreatePanel`.

**Tech Stack:** React 19, TypeScript, React Router 7, Emotion, MUI 9 behavior primitives, Vitest 5, React Testing Library.

**Spec:** User-confirmed interaction design in this session; preserves the existing UI-redesign constraint in `docs/superpowers/specs/2026-09-09-ui-redesign-design.md` that the sheet stack remains component state rather than URL state.

## Global Constraints

- The menu order is Settings, Recommendations, Add new type, Logout.
- Settings and Recommendations remain visibly disabled until routes exist.
- Add new type opens the existing `CreatePanel` for `alcoholType` directly; it must not create a new route or form.
- Logout calls the existing auth `logout` function unchanged.
- Use semantic controls, keyboard-operable MUI menu behavior, visible focus styling, and 44px targets.
- Do not run E2E/Playwright tests or Docker Compose.

---

### Task 1: Support a requested initial add-sheet panel

**Files:**
- Modify: `web/src/hooks/useSheet.ts`
- Test: `web/src/hooks/useSheet.test.tsx`

**Interfaces:**
- Consumes: `useNavigate`, `useLocation`, and the existing `ADD_SHEET_ID` query convention.
- Produces: `UseSheetResult<P>.open(initialPanel?: P)`, where a provided panel becomes the first panel above the root when the sheet opens.

- [ ] **Step 1: Write the failing test**

```tsx
act(() => result.current.sheet.open({ kind: 'create', field: 'alcoholType' }));
expect(result.current.sheet.panels).toEqual([
  { kind: 'menu' },
  { kind: 'create', field: 'alcoholType' },
]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/useSheet.test.tsx`
Expected: FAIL because `open` does not accept a panel and the stack starts only at the menu panel.

- [ ] **Step 3: Write minimal implementation**

```tsx
open: (panel?: P) => void;

const panelsForOpen = (): P[] => {
  const requested = (location.state as SheetLocationState<P> | null)?.sheetInitialPanel;
  return requested === undefined ? [initialPanel] : [initialPanel, requested];
};
```

Store `sheetInitialPanel` beside `sheetDismissDepth` in the pushed router state, and use `panelsForOpen` for both initial state and closed-to-open transitions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useSheet.test.tsx`
Expected: PASS.

### Task 2: Replace header sign-out with the action menu

**Files:**
- Modify: `web/src/components/AppFrame.tsx`
- Test: `web/src/components/AppFrame.test.tsx`

**Interfaces:**
- Consumes: `useSheet<AddSheetPanel>(ADD_SHEET_ID, MENU_PANEL)` and `useAuth().logout`.
- Produces: a labelled hamburger button; disabled future actions; direct alcohol-type sheet opening; unchanged logout invocation.

- [ ] **Step 1: Write the failing tests**

```tsx
await user.click(screen.getByRole('button', { name: 'Open menu' }));
expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveAttribute('aria-disabled', 'true');
expect(screen.getByRole('menuitem', { name: 'Recommendations' })).toHaveAttribute('aria-disabled', 'true');

await user.click(screen.getByRole('menuitem', { name: 'Add new type' }));
expect(screen.getByTestId('search')).toHaveTextContent('?sheet=add');

await user.click(screen.getByRole('menuitem', { name: 'Logout' }));
expect(logout).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/AppFrame.test.tsx`
Expected: FAIL because no Open menu button or menu items exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
<IconButton aria-label="Open menu" aria-haspopup="menu" aria-expanded={menuOpen ? 'true' : undefined}>
  <MenuIcon />
</IconButton>
```

Use MUI `Menu` and `MenuItem` for its established focus, Escape, and dismissal behavior. Style it with DrinkSaver tokens; call `openAddSheet({ kind: 'create', field: 'alcoholType' })` for Add new type and `logout` for Logout.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/components/AppFrame.test.tsx`
Expected: PASS.

### Task 3: Document and verify the public UI behavior

**Files:**
- Modify: `web/README.md`

**Interfaces:**
- Documents: `AppFrame` header menu states and action behavior for frontend maintainers.

- [ ] **Step 1: Add the header-menu behavior to the frontend documentation**

```markdown
### Header menu

The `AppFrame` hamburger menu exposes Settings, Recommendations, Add new type, and Logout.
The first two are disabled until routes are available; Add new type opens the existing alcohol-type
create panel over the current page; Logout delegates to Keycloak auth.
```

- [ ] **Step 2: Verify source and docs alignment**

Run: `rg -n 'Header menu|Add new type|Settings|Recommendations|Logout' web/README.md web/src/components/AppFrame.tsx`
Expected: all documented menu actions occur in the component in the same order.

### Task 4: Validate and review

**Files:**
- Verify: `web/src/hooks/useSheet.test.tsx`, `web/src/components/AppFrame.test.tsx`, `web/README.md`

- [ ] **Step 1: Run focused behavior tests**

Run: `npm test -- src/hooks/useSheet.test.tsx src/components/AppFrame.test.tsx`
Expected: PASS.

- [ ] **Step 2: Run frontend quality checks**

Run: `npm test && npm run lint && npm run build`
Expected: all checks exit 0; no E2E or Compose commands are run.

- [ ] **Step 3: Review the diff**

Run: `git diff --check && git diff -- web/src/hooks/useSheet.ts web/src/components/AppFrame.tsx web/README.md`
Expected: no whitespace errors; the diff contains no changed logout implementation, enabled future routes, or URL-encoded sheet panel stack.

### Task 5: Address final-review accessibility and lifecycle findings

**Files:**
- Modify: `web/src/hooks/useSheet.ts`
- Modify: `web/src/hooks/useSheet.test.tsx`
- Modify: `web/src/components/AppFrame.tsx`
- Modify: `web/src/components/AppFrame.test.tsx`
- Modify: `web/src/components/AddSheet/SheetHost.test.tsx`
- Modify: `web/src/pages/QuickSavePage.tsx`

**Interfaces:**
- Preserves: `UseSheetResult<P>.open(initialPanel?: P)` as an application-generic API.
- Produces: a first-rendered requested create panel, an ARIA-complete hamburger trigger, and real host coverage for the direct-create flow.

- [ ] **Step 1: Write the failing ARIA tests**

```tsx
const trigger = screen.getByRole('button', { name: 'Open menu' });
expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
expect(trigger).toHaveAttribute('aria-expanded', 'false');
await user.click(trigger);
expect(trigger).toHaveAttribute('aria-expanded', 'true');
expect(trigger).toHaveAttribute('aria-controls', 'header-action-menu');
```

- [ ] **Step 2: Remove event-shaped generic handling**

Wrap ordinary React click call sites in zero-argument callbacks, then restore the exact `open(initialPanel?: P)` signature. Do not inspect panel shape for DOM-event fields.

- [ ] **Step 3: Make a requested panel available to SheetHost's opening render**

When `?sheet=add` transitions from closed to open, derive the visible panel stack from the requested history-state panel during that render, then synchronize it to local stack state in the existing effect. The URL remains one sheet bit and later panel navigation remains local state.

- [ ] **Step 4: Add real SheetHost integration coverage**

Render `SheetHost` with an initial `?sheet=add` location state requesting `{ kind: 'create', field: 'alcoholType' }`; assert the mocked create panel is rendered and the root menu panel is absent.

- [ ] **Step 5: Run focused checks**

Run: `npm test -- src/hooks/useSheet.test.tsx src/components/AppFrame.test.tsx src/components/AddSheet/SheetHost.test.tsx`

Expected: PASS with the new ARIA and direct-host coverage.
