# Catalogue design selection implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable add-sheet catalogue and recommendation saves to select and submit their documented palette and glassware metadata while preserving inheritance.

**Architecture:** Expose real design entries alongside the existing ID lookup catalogue, then share an accessible selector between the create and recommendation panels. Nullable child selections represent inheritance; the request boundary resolves recommendation overrides to concrete IDs.

**Tech Stack:** React 19, TypeScript, Emotion, TanStack Query, Vitest/React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-15-catalogue-design-selection-design.md`

## Global Constraints

- Use only IDs returned by the design API; never submit the display fallback ID `0`
- Palette and glassware inheritance remain independent.
- Beer brands/flavours support palette only, exactly as documented.
- Preserve the existing user-owned untracked `design/` and `docs/reviews/` directories.
- Keep new controls keyboard-accessible and touch targets at least 44px

### Task 1: Expose typed design choices and request metadata

**Files:**
- Modify: `web/src/types/api.ts`
- Modify: `web/src/api/endpoints.ts`
- Modify: `web/src/drink/designCatalogue.ts`
- Modify: `web/src/drink/useCreateCatalogueEntry.ts`
- Test: `web/src/api/endpoints.test.ts`
- Test: `web/src/drink/useCreateCatalogueEntry.test.tsx`

**Interfaces:**
- Produces: all four `New*` request types and `CreateCatalogueEntryInput` accept optional integer palette/glassware IDs as their OpenAPI schemas allow.
- Produces: `DesignCatalogue` gives selectors the live palette and glassware arrays as well as ID resolvers.

- [ ] **Step 1: Write failing endpoint and mutation tests**

Assert an alcohol type POST includes `{ name: 'Whiskey', colorPaletteId: 3, glasswareId: 4 }`, a
subtype includes both IDs, and brand/flavour include their palette ID.

- [ ] **Step 2: Run the focused tests and verify the missing metadata fails**

Run: `cd web && npm test -- src/api/endpoints.test.ts src/drink/useCreateCatalogueEntry.test.tsx`

- [ ] **Step 3: Add the types and thread values through the endpoint/mutation boundary**

Make all creation payload shapes match `docs/api-docs.yaml`. Preserve `undefined` child overrides
by omitting them from the JSON body.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `cd web && npm test -- src/api/endpoints.test.ts src/drink/useCreateCatalogueEntry.test.tsx`

### Task 2: Build the reusable inherited design selector

**Files:**
- Create: `web/src/components/AddSheet/DesignSelector.tsx`
- Create: `web/src/components/AddSheet/DesignSelector.test.tsx`
- Modify: `web/src/drink/designCatalogue.ts`
- Modify: `web/src/drink/DesignProvider.tsx`

**Interfaces:**
- Consumes: real `ColorPalette[]` and `Glassware[]` from `DesignCatalogue`.
- Produces: `DesignSelector` accepts nullable values, inherited preview IDs, optional glassware support, and change callbacks.

- [ ] **Step 1: Write failing selector tests**

Verify the initial inherited option is selected, changing a labelled select emits an actual backend
ID, the glassware control is absent for palette-only resources, and controls cannot submit fallback
ID `0` while design data is unavailable.

- [ ] **Step 2: Run the selector test and verify it fails because the component is absent**

Run: `cd web && npm test -- src/components/AddSheet/DesignSelector.test.tsx`

- [ ] **Step 3: Implement the minimal selector and expose live arrays**

Use native labelled selects with swatch/glass previews. Keep the inherited option value empty and
disable selectors that have no successful API entries.

- [ ] **Step 4: Run the selector test and verify it passes**

Run: `cd web && npm test -- src/components/AddSheet/DesignSelector.test.tsx`

### Task 3: Wire creation and recommendation state

**Files:**
- Modify: `web/src/components/AddSheet/CreatePanel.tsx`
- Modify: `web/src/components/AddSheet/OptionPanel.tsx`
- Modify: `web/src/drink/draftReducer.ts`
- Modify: `web/src/drink/designSelection.ts`
- Modify: `web/src/drink/useSaveDraft.ts`
- Test: `web/src/components/AddSheet/CreatePanel.test.tsx`
- Test: `web/src/components/AddSheet/OptionPanel.test.tsx`
- Test: `web/src/drink/draftReducer.test.ts`
- Test: `web/src/drink/designSelection.test.ts`

**Interfaces:**
- Consumes: `DesignSelector` and existing hierarchy resolution helpers.
- Produces: creation requests preserve child inheritance, and recommendation saves apply only explicit draft overrides over the normal resolved design.

- [ ] **Step 1: Write failing form and reducer tests**

Cover subtype inherited defaults, explicit subtype IDs, brand/flavour palette-only bodies, alcohol
type required selections, recommendation override reset when recommendation is unchecked, and
concrete final recommendation request IDs.

- [ ] **Step 2: Run the focused tests and verify the missing controls/state fail**

Run: `cd web && npm test -- src/components/AddSheet/CreatePanel.test.tsx src/components/AddSheet/OptionPanel.test.tsx src/drink/draftReducer.test.ts src/drink/designSelection.test.ts`

- [ ] **Step 3: Add nullable selectors and reducer actions**

Place the controls as final form inputs. Derive inherited preview IDs with the existing chain and
do not write those IDs into a child unless the person selects a concrete option.

- [ ] **Step 4: Run focused tests and verify they pass**

Run: `cd web && npm test -- src/components/AddSheet/CreatePanel.test.tsx src/components/AddSheet/OptionPanel.test.tsx src/drink/draftReducer.test.ts src/drink/designSelection.test.ts`

### Task 4: Verify the full browser journey and document the component

**Files:**
- Modify: `web/e2e/tests/add-sheet-identity.spec.ts`
- Modify: `web/README.md`

- [ ] **Step 1: Add failing Playwright request assertions**

Create each applicable item through the sheet and assert its POST receives the expected selection
or omitted inherited override. Save a recommendation with explicit palette and glassware overrides
and assert concrete IDs on `/v1/drinks/new`.

- [ ] **Step 2: Run the focused E2E suite and verify it fails before implementation**

Run: `cd web && npm run e2e -- add-sheet-identity.spec.ts`

- [ ] **Step 3: Document the selector’s inputs, inheritance states, and API constraint**

Add a concise README component entry explaining palette-only beer entries, independent fields, and
the inherited/default state.

- [ ] **Step 4: Run E2E and browser accessibility checks**

Run the targeted Playwright test at project-configured mobile sizes and interact with controls by
keyboard. Inspect the rendered page only after network idle.

### Task 5: Review and final verification

**Files:**
- Modify: changed files above only

- [ ] **Step 1: Run `git diff --check`, frontend lint, full frontend test suite, and production build**

- [ ] **Step 2: Review UI against current web guidelines and obtain an independent WCAG 2.2 AA review**

- [ ] **Step 3: Perform the differential security review and requirements/code-quality reviews**

- [ ] **Step 4: Commit the feature changes, push `provide-color-picker`, and open a PR to `main` without merging**
