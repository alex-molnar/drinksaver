# React hooks lint fixes: plan

**Goal:** `npm run lint` reports zero errors, then becomes a blocking CI step. Behaviour is
preserved except where a hook defect is masking a real bug, which gets fixed and called out.

**Order:** characterisation tests first, then the restructure. Every test written in phase 1
must still pass, unchanged, after phase 2. That is the whole safety mechanism, so do not
edit a test to make the restructure pass. If a test has to change, stop and say why.

## The 12 errors

| File | Line | Rule |
|---|---|---|
| `auth/KeycloakProvider.tsx` | 16 | `react-refresh/only-export-components` |
| `pages/DetailedPage.tsx` | 114, 123 | `react-hooks/set-state-in-effect` |
| `pages/DetailedPage.tsx` | 137 | `react-hooks/preserve-manual-memoization` |
| `pages/NewAlcoholPage.tsx` | 99 | `react-hooks/preserve-manual-memoization` |
| `pages/NewBeerBrandPage.tsx` | 44 | `react-hooks/preserve-manual-memoization` |
| `pages/NewBeerFlavourPage.tsx` | 52 | `rules-of-hooks` + `preserve-manual-memoization` |
| `pages/NewSubtypePage.tsx` | 52 | `rules-of-hooks` + `preserve-manual-memoization` |
| `pages/NewVolumePage.tsx` | 95 | `rules-of-hooks` + `preserve-manual-memoization` |

## Root causes, not symptoms

**Cause 1, accounts for 9 errors.** Every one of these pages declares

```tsx
const isFormValid = () => { ... };
```

and then calls `isFormValid()` inside a `useCallback` whose dependency array does not list
it. A new function identity is created every render, so the React Compiler cannot prove the
memoization is safe and reports `preserve-manual-memoization`.

It is not a stale-closure bug today, because the values `isFormValid` closes over are
already in the dependency arrays. So this is a genuine false alarm about correctness but a
real obstacle to compilation, and the fix is a simplification.

**Cause 2, accounts for 3 errors.** `NewSubtypePage`, `NewBeerFlavourPage` and
`NewVolumePage` early-return an error card when `location.state` is missing, and declare
`useCallback` *after* that return. Hook count therefore differs between the two branches.

This is a real defect, not a lint preference. It has not bitten yet only because
`location.state` is fixed for the lifetime of a mounted route. The moment a navigation
swaps state on an already-mounted instance, React throws "Rendered fewer hooks than
expected" and the page crashes.

**Cause 3, 2 errors.** `DetailedPage` resets dependent form fields from `useEffect`, which
triggers a second render pass on every change.

## Phase 1: characterisation tests

Write these BEFORE touching any component. They must pass against the code as it is today.

### 1a. Shared harness

Create `src/test/test-utils.tsx`:

```tsx
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderOptions } from '@testing-library/react';

/**
 * A fresh QueryClient per render, with retries off. Retries make a failing
 * query take seconds and turn an assertion failure into a timeout.
 */
export const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  state?: unknown;
}

export const renderWithProviders = (ui: ReactElement, { route = '/', state, ...options }: Options = {}) => {
  const client = makeQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: route, state }]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return { client, ...render(ui, { wrapper: Wrapper, ...options }) };
};
```

`MemoryRouter` with `initialEntries` carrying `state` is what makes `useLocation().state`
work without mocking react-router. Prefer that over mocking the router.

`useAppNavigation` wraps `useNavigate`, so mock the module `../hooks/useNavigation` per
test file with `vi.mock` and assert on the returned spies. Read
`src/hooks/useNavigation.ts` first and mock the real exported names.

Mock `../api/endpoints` with `vi.mock` and assert on call arguments.

### 1b. Tests per page

For each of `NewSubtypePage`, `NewBeerFlavourPage`, `NewVolumePage`, cover:

1. With no `location.state`, the error card renders, the form does not, and the "Back to
   Home" button calls the home navigation.
2. With valid state, the form renders and shows the contextual name from state.
3. The submit control is disabled while the form is invalid and enabled once valid.
4. A successful submit calls the right endpoint with the right arguments and navigates to
   success with a message containing the entered name.
5. A rejected endpoint navigates to error and does not navigate to success.
6. `NewVolumePage` additionally validates the numeric volume field. Read its validation and
   pin both the accepted and rejected input.

For `NewAlcoholPage` and `NewBeerBrandPage`, cover 3, 4, 5, plus adding and removing the
repeated sub-entries (volumes/subtypes, flavours) since that is their real logic.

For `DetailedPage`, the important ones:

7. Choosing an alcohol type clears volume, subtype, consumption type, brand and flavour.
   **This is the behaviour the effect currently provides and the restructure must keep.**
8. Choosing a brand clears the beer flavour.
9. Beer-specific fields appear only for the beer type, and validity requires a consumption
   type for beer but not otherwise.
10. Save posts the expected payload and navigates to success.

For `KeycloakProvider`, cover that it renders children once initialisation resolves, and
exposes `isAuthenticated`, `userId` and `username` from the parsed token. Mock `./keycloak`.

**Commit phase 1 on its own**, with all tests green against unmodified components.

## Phase 2: the restructure

### 2a. `isFormValid` becomes a derived boolean (all 6 page files)

This single change clears all 6 `preserve-manual-memoization` errors.

```tsx
// before
const isFormValid = () => {
  return subtypeName.trim().length > 0;
};
// ... used as isFormValid() in JSX and inside useCallback

// after
const isFormValid = subtypeName.trim().length > 0;
// ... used as isFormValid in JSX, and listed in the useCallback deps
```

Update every call site: `isFormValid()` becomes `isFormValid`, including inside `Zoom in=`
and `disabled=`. Add `isFormValid` to the dependency array of the callback that reads it.

`DetailedPage`, `NewVolumePage` and `NewAlcoholPage` have multi-clause validity. Keep the
exact same conditions, just as an expression rather than a function body.

### 2b. Hoist hooks above the guard (the 3 rules-of-hooks pages)

Move `useCallback` above the `if (!state)` block. `state` may be null there, so read its
fields defensively and keep the guard inside the callback:

```tsx
const state = location.state as NewSubtypePageState | null;
const alcoholTypeId = state?.alcoholTypeId;
const alcoholTypeName = state?.alcoholTypeName;

const [subtypeName, setSubtypeName] = useState('');
const [saving, setSaving] = useState(false);
const isFormValid = subtypeName.trim().length > 0;

const handleSubmit = useCallback(async () => {
  if (!isFormValid || alcoholTypeId === undefined) return;
  setSaving(true);
  try {
    await createSubtypeForAlcoholType(alcoholTypeId, subtypeName.trim());
    navigateToSuccess(`Subtype "${subtypeName}" has been created for ${alcoholTypeName}!`);
  } catch (error) {
    console.error('Failed to create subtype:', error);
    setSaving(false);
    navigateToError('Failed to create subtype. Please try again.');
  }
}, [alcoholTypeId, alcoholTypeName, subtypeName, isFormValid, navigateToSuccess, navigateToError]);

if (!state) {
  return ( /* unchanged error card */ );
}
```

Note `setSaving(false)` in the catch. Today the flag is left true forever on failure. It is
masked because the error navigation unmounts the page, but it is wrong and cheap to fix.
**This is a deliberate bug fix, so call it out in the PR** and add a test for it if the
component is observable after failure; if it is not observable, say so rather than writing
a test that cannot fail.

Keep the error card's JSX byte-identical. Only its position moves.

### 2c. `DetailedPage` effects become handler resets

Delete both `useEffect` blocks. Move the resets into the change handlers:

```tsx
const handleAlcoholTypeChange = (event: SelectChangeEvent<number | ''>) => {
  setAlcoholTypeId(event.target.value as number | '');
  setVolumeId('');
  setSubtypeId('');
  setConsumptionTypeId('');
  setBrandId('');
  setBeerFlavourId('');
};

const handleBrandChange = (event: SelectChangeEvent<number | ''>) => {
  setBrandId(event.target.value as number | '');
  setBeerFlavourId('');
};
```

**Before doing this, verify there is exactly one path that sets each field.** Search the
file for every `setAlcoholTypeId` and `setBrandId` call. If any path other than the handler
sets them, this change alters behaviour and you must stop and report instead. Wire
`handleBrandChange` into the brand `Select`, replacing whatever inline handler it uses.

Tests 7 and 8 from phase 1 are what prove this equivalent.

### 2d. Extract the auth context

Create `src/auth/AuthContext.ts` holding `AuthContextType` and
`export const AuthContext = createContext<AuthContextType | null>(null);`. Remove both from
`KeycloakProvider.tsx` and import from the new file. Update `src/auth/useAuth.ts` and
`src/auth/index.ts` and any other importer. Find them with
`grep -rn "AuthContext\|AuthContextType" src/`.

`KeycloakProvider.tsx` must then export only the component.

While there: the `setInterval` for token refresh is never cleared. If that is trivially
fixable by returning a cleanup from the effect, do it and mention it. If it entangles with
the `didInit` ref guard, leave it and report it.

## Phase 3: the gate

Only once `npx eslint .` reports **0 errors**.

Add to `.github/workflows/build.yml` and `.github/workflows/deploy-test-web.yml`, in the
existing "Run web tests" step, before the test command:

```yaml
          npm run lint
```

Warnings stay non-blocking: do not add `--max-warnings=0`. There are 9 warnings, mostly
`react-hooks/exhaustive-deps`, and they are out of scope.

## Verification

1. `npx eslint .` reports 0 errors.
2. `npm run test:coverage` passes, including every phase 1 test unmodified.
3. `npm run build` succeeds. This is what typechecks `vite.config.ts` and the whole app;
   the test command alone does not.
4. Confirm the CI YAML parses.

## Do not

- Do not weaken or delete a characterisation test to make the restructure pass.
- Do not add `eslint-disable` comments. The point is to fix the causes.
- Do not touch the 9 warnings.
- Do not reformat untouched code; keep the diff reviewable.
