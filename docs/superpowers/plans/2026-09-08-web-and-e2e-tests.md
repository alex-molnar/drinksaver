# Web and end-to-end test plan

The lint work already covered the six form pages, `KeycloakProvider`, `QuantitySelector`
and `config.ts`, and added `src/test/test-utils.tsx`. This covers what is left, chosen by
what the code actually decides rather than by what is easy to reach.

## Web: what is left, in value order

### 1. `api/client.ts`, the highest-value untested file

It is the security boundary between the browser and the API, and it has real branching.

- A request carries `Authorization: Bearer <token>` when Keycloak holds a token.
- A request carries no `Authorization` header when it does not, rather than the string
  `Bearer undefined`.
- A 401 triggers `keycloak.updateToken(5)`, then retries the original request with the
  refreshed token, and the caller sees the retried response rather than the 401.
- When the refresh rejects, `keycloak.logout()` is called and the original error propagates.
- A non-401 error propagates untouched and does not attempt a refresh.
- `getCurrentUserId` returns the token subject, and undefined when there is no token.

Drive it with a mocked adapter or `axios-mock-adapter` rather than mocking axios wholesale,
so the interceptors under test actually run. Mock `../auth/keycloak`.

### 2. `api/endpoints.ts`

One test per exported function: the HTTP method, the URL including path and query
parameters, and the request body shape. These are the contract with the backend, and the
`userId` query parameters are exactly what finding F1 concerns, so pinning them makes a
future authorization change visible rather than silent.

### 3. `auth/ProtectedRoute.tsx` and `auth/useAuth.ts`

- `ProtectedRoute` renders a spinner while loading, renders children once authenticated,
  and does whatever it currently does when unauthenticated. Read it and pin the real
  behaviour.
- `useAuth` throws a useful error when used outside the provider, and returns the context
  value inside it.

### 4. `pages/IndexPage.tsx`

The main screen, and it has three states plus a save flow.

- Renders a spinner while the recommendations query is loading.
- Renders the error state when the query rejects.
- Renders one tile per recommendation, capped at `maxRecommendations` from
  `useResponsiveTileCount`.
- Tapping a tile posts exactly the six id fields (no name, no quantity) and navigates to
  success with the drink's name in the message.
- A rejected save navigates to error and mentions the drink name.
- `getRecommendationKey` distinguishes two recommendations that share a null id but differ
  in type, volume or brand. That helper exists precisely because ids can be null, so it is
  worth a direct test.

### 5. `pages/HistoryPage.tsx`

Read it first. Expect: fetching a day's drinks, changing the date, deleting selected
entries, and empty state. Cover each, including that delete sends the selected ids.

### 6. `components/Layout.tsx`, `RecommendationButton.tsx`, `LoadingButton.tsx`

- `Layout`: title renders, back button appears only when asked and navigates back,
  bottom navigation hides when `hideBottomNav` is set.
- `RecommendationButton`: renders the name, shows a spinner while saving, calls back on
  press, is not clickable while saving.
- `LoadingButton`: swaps children for a spinner when loading, and is disabled when either
  `loading` or `disabled` is set. Small but it is shared.

### 7. `hooks/useResponsiveTileCount.ts` and `hooks/useNavigation.ts`

- `useResponsiveTileCount` returns different counts per breakpoint. Drive it by stubbing
  `matchMedia` or the MUI theme breakpoints, whichever it actually uses. Read it first.
- `useNavigation`: each helper navigates to the right route with the right state payload.

### 8. `pages/SuccessPage.tsx` and `pages/ErrorPage.tsx`

Small: they render the message passed through router state and offer a way back. Cover the
missing-state fallback, which is the branch that would otherwise crash.

## Not worth testing

`main.tsx`, `auth/keycloak.ts` (a configured singleton), `types/api.ts`, `auth/index.ts`
re-exports. Add them to the coverage `exclude` list rather than writing hollow tests, so the
percentage describes real code.

## End to end, Playwright against compose

Blocking on `main` only, per the decision. Feature branches stay fast.

### Setup

- `web/e2e/` with its own `playwright.config.ts`. Keep it out of the Vitest `include` so the
  two runners never collide.
- Base URL `http://localhost:3000`. Chromium only to start.
- A global setup that waits for the backend health endpoint and Keycloak readiness before
  any test runs, rather than a fixed sleep.
- Log in as `dev` / `dev` through the real Keycloak form once in a setup project, then reuse
  `storageState` so each test does not repeat the login. Keep exactly one test that performs
  the full interactive login, since that is the part most likely to break.

### Journeys, smallest set that would catch a real regression

1. **Log in.** Unauthenticated visit redirects to Keycloak, submitting `dev`/`dev` lands on
   the home screen with recommendation tiles.
2. **Quick save.** Tap a recommendation tile, land on the success screen naming the drink,
   and see that drink in today's history.
3. **Detailed save.** Create a drink through the detailed form choosing type, volume and,
   for beer, brand, flavour and consumption type; confirm it appears in history.
4. **Create a subtype.** Exercises one of the pages the hooks restructure touched, end to
   end through the real API.
5. **History delete.** Save a drink, delete it, confirm it is gone after reload.

Assert on user-visible text and on the API responses the page received, not on CSS.

### CI

A `e2e.yml` workflow triggered on push to `main` and by `workflow_dispatch`. It brings up
`docker-compose up -d --build`, waits for health, runs Playwright, uploads the HTML report
and traces on failure, and tears down in an `always()` step. Fail the job on test failure.

Because it is `main` only, it runs after merge, so it gates the release rather than the
feature branch. That is the tradeoff the owner chose.
