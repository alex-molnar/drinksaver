# DrinkSaver admin panel implementation plan

Replanned 2026-10-02 against `admin-panel` at `d92856e`.
Visual direction: **Workspace**, approved by Alex.

**Goal:** Deliver the approved catalogue administration pages using the existing backend
contract and completed admin foundation.

**Specification:** [Approved Workspace design](../specs/2026-10-02-admin-panel-visual-directions.md).
**Architecture decision:** [Retained architecture](../specs/2026-09-21-admin-panel-design.md).
**Canonical contract:** [OpenAPI](../../api-docs.yaml), checked against controller source.

This replaces the entire original plan. Its unchecked tasks are future implementation,
not work completed by this planning commit. Execute tasks in dependency order, with a
failing targeted test before new behaviour, then implementation and passing verification.
Use the current installed skills and repository instructions; do not assume an unavailable
plugin or reviewer ran. Commit implementation in independently reviewable concerns.
Push, PR, merge and deployment boundaries require the authorization for that later work.

## 1. Preserve these decisions

- Independent `admin/` application, image, chart, runtime configuration and Keycloak client.
- Existing React 19, TypeScript 6, Vite 8, MUI 9, TanStack Query 5, React Router 7, axios,
  keycloak-js 26, dnd-kit, Vitest 5/jsdom/Testing Library and ESLint stack.
- nginx, Helm, GitHub Actions and root `VERSION`; Node 24 in CI.
- Existing web theme primitives and self-hosted Familjen Grotesk/Fraunces fonts.
- No new workspace, dependencies, generic CRUD framework or shared-package extraction.
- No unpublish, user-defined editing/deletion, volume CRUD, volume ownership work,
  recommendation composition editing or automatic child publication.
- ID-based PATCH/DELETE stay in their existing shared routes. Default/user-defined
  distinctions are supplied by GET/POST and publication contracts.
- Default creation/publication uses configured `ADMIN_USER_UUID`, not the caller's UUID.
  The client sends no `userId`.
- Database deletion protection is an existing responsibility confirmed by Alex.
  Handle 409; do not add browser usage-count checks, cascade policy or blanket schema work.

## 2. Completed work and what remains

Source inspection establishes presence, not a fresh test-suite result.

| Existing work | Evidence | Treatment |
| --- | --- | --- |
| Scaffold and installed dependencies | `admin/package.json`, lockfile, Vite/TS/ESLint configs, smoke test | Keep; do not regenerate |
| Runtime configuration | `admin/src/config.ts`, config test, `public/config.js` | Keep distinct admin global and runtime precedence |
| Authentication components | `admin/src/auth/`, provider/gate/group tests | Keep; integrate and correct exact group matching |
| Default catalogue reads/creates | `AdminAlcoholDefaultController`, `AdminBeerDefaultController` | Already implemented |
| Catalogue update/delete | `AdminAlcoholController`, `AdminBeerController` | Already implemented |
| User-defined reads/publication | `AdminAlcoholUserController`, `AdminBeerUserController` | Already implemented |
| Design CRUD | `AdminDesignController` | Already implemented |
| Recommendation CRUD/name/order | `AdminRecommendationsController` | Already implemented; freshness fix remains |
| PostgreSQL deletion/FK work | `backend/sql/foreign_keys.sql`, existing integration tests | Retain; verify target deployment behaviour |

`admin/src/main.tsx` still renders a placeholder. API adapters, theme integration,
working shell, all product pages, container/chart, admin CI and real admin journeys remain.
The previous plan's first three tasks are substantially delivered, not fourteen open
tasks to rebuild. Its missing-endpoint and volume-ownership prerequisites are removed.

## 3. Actual endpoint inventory

Paths below are relative to `/v1`. Each adapter unwraps `response.data`; responses are
plain arrays/entities, not a new envelope. All admin routes require exact `/admin`.
Controller files are under `backend/src/main/java/com/drinksaver/controller/admin/`.

| Purpose | Read | Create | Update / delete |
| --- | --- | --- | --- |
| Default types | GET `/admin/default/alcohol/types` | POST same | PATCH / DELETE `/admin/alcohol/types/{id}` |
| Default subtypes | GET `/admin/default/alcohol/types/{id}/subtypes` | POST same | PATCH / DELETE `/admin/alcohol/subtypes/{id}` |
| Default brands | GET `/admin/default/beer/brands` | POST same | PATCH / DELETE `/admin/beer/brands/{id}` |
| Default flavours | GET `/admin/default/beer/brands/{id}/flavours` | POST same | PATCH / DELETE `/admin/beer/brands/flavours/{id}` |
| Consumption types | GET `/admin/default/beer/consumption-types` | POST same | PATCH / DELETE `/admin/beer/consumption-types/{id}` |
| Palettes | GET `/admin/design/color-palettes` | POST `/admin/design/color-palette` | PATCH / DELETE `/admin/design/color-palette/{id}` |
| Glassware | GET `/admin/design/glassware` | POST same | PATCH / DELETE `/admin/design/glassware/{id}` |
| Recommendations | GET `/admin/recommendations/list` | POST `/admin/recommendations` | PATCH `/admin/recommendations/edit`; DELETE `/admin/recommendations/{id}` |

| User-defined kind | Read | Publish (POST, no body) |
| --- | --- | --- |
| Types | `/admin/user-defined/alcohol/types` | `/admin/user-defined/alcohol/types/{id}/publish` |
| Subtypes | `/admin/user-defined/alcohol/types/{parentId}/subtypes` | `/admin/user-defined/alcohol/subtypes/{id}/publish` |
| Brands | `/admin/user-defined/beer/brands` | `/admin/user-defined/beer/brands/{id}/publish` |
| Flavours | `/admin/user-defined/beer/brands/{parentId}/flavours` | `/admin/user-defined/beer/brands/flavours/{id}/publish` |

Read-only volumes: GET `/v1/alcohol/types/{id}/volumes`. It is the existing consumer
route, not a default-only or ownership-filtered volume contract. Do not claim otherwise.

### Payloads and responses

DTO files are under `backend/src/main/java/com/drinksaver/model/dto/post/` and `patch/`.
Palette/glassware DTOs live directly under `model/dto/`.
Response fields come from `model/db/` and `model/db/admin/DefaultRecommendation.java`.
Copy only needed interfaces into `admin/src/types/api.ts`; nullable design fields stay nullable.

| Action | Request fields the UI sends | Result / constraints |
| --- | --- | --- |
| Create type | `name, colorPaletteId, glasswareId, alcoholSubtypes?: string[]` | Entity, 200; omit volumes; max name 100, max initial subtypes 50 |
| Create subtype | `alcoholTypeId, name, colorPaletteId, glasswareId` | Entity, 200; body parent required even though route parent is authoritative |
| Create brand | `name, colorPaletteId, flavours?: string[]` | Entity, 200 |
| Create flavour | `name, colorPaletteId` | Entity, 200; parent in route |
| Create consumption type | `name, glasswareId` | Entity, 200 |
| Catalogue edit | Name and supported design IDs only | Entity, 200; omitted/null IDs leave existing value unchanged |
| Create palette | `name, field, inkLight?, inkDark?` | Entity, 200; both ink fields nullable |
| Edit palette | Changed fields from create shape | Entity, 200; empty string clears nullable ink; null means unchanged |
| Create glassware | `name, g, l, f?` | Entity, 200; outline/liquid/foam paths |
| Edit glassware | Changed fields from create shape | Entity, 200; empty string clears foam; null means unchanged |
| Create recommendation | `name, alcoholTypeId, colorPaletteId, glasswareId` plus optional `alcoholSubtypeId, alcoholVolumeId, brandId, beerFlavourId, consumptionTypeId` | Entity, 200; new row appended by server |
| Rename/reorder recommendations | Full ordered array of `{id, name}` | Complete list, 200; array position determines order |
| Delete recommendation | No body | 200 with no body; absent 404 |
| Delete catalogue/design | No body | 204; absent 404; referenced entry 409 |
| Publish | No body | 200 entity; missing 404; already default is idempotent |

Bundled initial children have names and ownership, with null individual design fields.
Read their effective inherited appearance where available; edit their assignments separately.
Do not expose reset-to-inheritance for catalogue PATCH while null means unchanged.
Nested child GET returns an empty list for an unknown parent: establish parent existence
through the default-parent query rather than treating an empty result as proof of existence.

## 4. Backend work still required

No required admin CRUD route is missing. The following are correctness/integration tasks,
not a request to invent a different API.

### B1 — Complete consumption-type listing

**Affected:** `AdminBeerDefaultController.java`, `repository/BeerRepository.java`,
`repository/schema/ConsumptionTypesTable.java`, relevant controller/repository tests,
`docs/api-docs.yaml`.

- [ ] Add a failing real-Postgres test with at least eleven consumption types; assert all
  are returned by the admin collection. Existing controller calls `getConsumptionTypes(10)`.
- [ ] Use an unbounded repository read for this admin maintenance collection; retain the
  consumer's existing amount parameter. Do not replace ten with another hidden fixed limit.
- [ ] Run targeted tests and backend `mvn verify`; assert integration tests ran.
- [ ] Document full-list semantics, then commit this concern.

**Accept:** An admin can find/edit/delete the eleventh record and select it for creation.

### B2 — Fresh recommendations after successful mutations

**Affected:** `AdminRecommendationsController.java`, `AdminRecommendationsRepository.java`,
`RecommendationCacheService.java` only if needed, controller/cache integration tests.

- [ ] Add a failing regression: warm a consumer recommendation cache, create a default,
  then read again; prove the committed catalogue change is reflected. Cover rename/order
  and delete through the same mechanism.
- [ ] Create currently does not invalidate; edit/delete invalidate before writing.
  Place invalidation after successful committed changes. Trace existing transaction
  boundaries first; add the smallest shared mutation boundary necessary, no cache framework.
- [ ] Test failed writes do not advertise success; exercise the eviction-before-write race
  with a controlled interleaving or an ordering assertion plus committed integration proof.
- [ ] Run backend verification and commit. Inspect relevant publication/design/catalogue
  mutations for the same user-visible cached recommendation effect; add only demonstrated fixes.

**Accept:** Successful mutations become visible without waiting for the 24-hour cache TTL.
Client query invalidation cannot satisfy this backend requirement.

### B3 — Resolve subtype identifier inconsistency

**Affected:** `model/db/AlcoholSubtype.java`, `repository/schema/AlcoholSubtypesTable.java`,
subtype callers in `AlcoholRepository.java`, admin/user controllers, DTOs and OpenAPI
only where the chosen consistent representation requires changes.

- [ ] Inspect actual PostgreSQL column type and every subtype-ID caller. Entity ID is
  currently Long; JpaRepository ID and route arguments are Integer.
- [ ] Add a real-Postgres create/read/PATCH/publish/DELETE regression through HTTP before
  changing types. Include unknown-ID behaviour. Keep a failing scenario as evidence.
- [ ] Align entity/repository/DTO/route types to the actual supported database contract.
  Do not assume a schema migration is necessary or cast silently.
- [ ] Update any affected consumer schema/types and OpenAPI; run backend verification,
  then commit the type correction.

**Accept:** A subtype created by the API can be mutated and published with its returned ID;
no provider-specific identifier mismatch remains.

### B4 — Verify existing integrity, without a new policy

- [ ] Exercise database-protected deletes through HTTP: referenced palette/glassware,
  parent with children and records referenced by recommendations return the implemented
  conflict response; unreferenced deletion succeeds. Confirm manual FK migration status
  in the target test environment using read-only inspection.
- [ ] Test recommendation creation with existing IDs and valid parent/child combinations,
  then missing references. Record which rejection is enforced by current constraints.
  Current creation saves directly; UI filtering alone is not server-integrity evidence.
- [ ] If accepted database protections or existing validation fail, fix that specific
  gap and its response mapping before release. Do not add strict default-parent enforcement,
  volume ownership, usage-count endpoints or a new publication/deletion policy.

**Accept:** Honest 404/409 handling and no dangling references from supported UI flows.
These are verification gates; do not report hypothetical failures as confirmed bugs.

## 5. Application structure and integration rules

Create only the following application areas as their task needs them:

```text
admin/src/
  App.tsx
  api/client.ts, admin.ts, queries.ts
  types/api.ts
  theme/                     existing web token/font pattern copied locally
  components/Workspace.tsx, PageState.tsx, ConfirmDialog.tsx, DrinkPreview.tsx
  sections/recommendations/RecommendationsPage.tsx, RecommendationForm.tsx
  sections/alcohol/AlcoholTypesPage.tsx, AlcoholSubtypesPage.tsx, AlcoholForm.tsx
  sections/beer/BeerBrandsPage.tsx, BeerFlavoursPage.tsx, BeerForm.tsx
  sections/user-defined/UserDefinedPage.tsx
  sections/design/DesignPage.tsx, PaletteForm.tsx, GlasswareForm.tsx, ConsumptionTypeForm.tsx
```

Co-locate tests with modules. Extract a helper only when used; no registry for hypothetical
future areas, no per-entity service classes, no barrel-file boilerplate.

Routes:

| Route | Page |
| --- | --- |
| `/` | Redirect to recommendations |
| `/recommendations` | Ordered default recommendations |
| `/alcohol-types` | Default types |
| `/alcohol-types/:typeId/subtypes` | Default subtypes of default type |
| `/beer-brands` | Default brands |
| `/beer-brands/:brandId/flavours` | Default flavours of default brand |
| `/user-defined` | Four kind tabs, selected kind/parent in search parameters |
| `/design` | Three design tabs, selected tab in search parameters |
| Unknown route | Named not-found screen with navigation |

Use positive integer route IDs; reject invalid IDs before querying. Keep kind/parent
selection in URL so back/reload work. Switching kind clears incompatible parent selection.
All pages render inside KeycloakProvider → AdminGate → theme/query/router shell.

### Query/cache contract

Use a small key object in `api/queries.ts`, not a new query framework:

```ts
export const keys = {
  types: ['default', 'types'] as const,
  subtypes: (id: number) => ['default', 'subtypes', id] as const,
  brands: ['default', 'brands'] as const,
  flavours: (id: number) => ['default', 'flavours', id] as const,
  consumptionTypes: ['default', 'consumption-types'] as const,
  palettes: ['design', 'palettes'] as const,
  glassware: ['design', 'glassware'] as const,
  recommendations: ['default', 'recommendations'] as const,
  userTypes: ['user-defined', 'types'] as const,
  userSubtypes: (id: number) => ['user-defined', 'subtypes', id] as const,
  userBrands: ['user-defined', 'brands'] as const,
  userFlavours: (id: number) => ['user-defined', 'flavours', id] as const,
  volumes: (id: number) => ['volumes', id] as const,
};
```

Parent-dependent queries are disabled until a valid selected default parent exists.
Clear visible stale child options immediately when changing parent; late responses must
stay under their own parent key. Fetch default parents once per kind/cache lifecycle,
reuse across pages, and invalidate after mutation/publication. Do not enumerate all parents'
children in the user-defined page.

| Successful mutation | Invalidate / update |
| --- | --- |
| Type/brand create | Parent collection and bundled child key when ID is returned |
| Type/brand edit/delete | Parent collection, affected child queries, recommendation summaries |
| Child CRUD | Its parent child key, recommendation summaries |
| Palette/glassware CRUD | Design collection and previews using it |
| Consumption-type CRUD | Consumption collection and recommendation summaries |
| Publish parent | User parent collection, default parent collection, relevant selectors |
| Publish child | User/default child keys for that parent, recommendation selectors |
| Recommendation PATCH | Replace recommendations cache with complete returned list |
| Recommendation create/delete | Refetch recommendations after success |

After a stale-item 404, keep a readable message and refresh the affected list.
409 keeps the dialog/draft intact. A 403 is forbidden, not an empty collection.
No tokens, payloads containing owner data, or raw server stack traces in UI/logs.

## 6. Implementation tasks

### P0 — Baseline and contract checks

**Files:** Existing admin tests/configs; backend test reports; canonical OpenAPI.
**Depends:** None. Backend B1–B4 can proceed alongside frontend work; release waits for them.

- [x] Read current instructions, status and source again; preserve unrelated dirty/untracked work.
  Use a task branch/worktree for implementation as authorized; do not work on main.
- [x] Start bounded caffeinate for sustained work. Record Node/Java/Docker versions.
- [x] Run existing admin tests, lint and build before changes. Run backend baseline when
  backend code will change. For Colima use the exact environment in `docs/DEPLOYMENT.md`.
- [x] Check every admin controller method/path against OpenAPI, response codes and DTO
  required fields. Subtype publish path and RecommendationUpdate required fields were
  corrected in this replanning commit; do not reintroduce the old route.
- [x] Record baseline results and commit only task changes when there are changes.

**Execution record (2026-10-02, branch `admin-panel-p0-p3`):** The unrelated untracked
files listed by `git status` were preserved. Node 26.8.1, Java 21.0.10 and Docker 29.7.2
are available. After `npm ci`, admin baseline passed: 5 files / 18 tests, ESLint, and
TypeScript plus Vite production build. Backend code is outside P0–P3, so no backend
baseline was needed. The preceding replan checked the 40 admin controller operations
against this OpenAPI contract; the current controller mapping inventory still matches
the documented route groups, including subtype publish at
`/v1/admin/user-defined/alcohol/subtypes/{id}/publish`.

### P1 — Auth, API adapters and query keys

**Modify:** `auth/adminGroup.ts` and test, `main.tsx` when wiring.
**Create:** `types/api.ts`, `api/client.ts`, `api/admin.ts`, `api/queries.ts` and tests.
**Reuse:** `web/src/api/client.ts` and its tests; DTO/OpenAPI fields.

- [ ] Write failing group tests: accept exactly `/admin`; reject bare `admin`,
  `/drinksaver/admin`, absent/non-array claims, and malformed members.
- [ ] Implement exact membership; retain existing provider and gate.
- [ ] Port axios bearer/single-401-retry behaviour using admin config/keycloak imports.
  Test refreshed header, refresh failure, second 401, ordinary errors and no 403 retry.
- [ ] Add named typed adapters for every endpoint in section 3. Test method, full path,
  parent/body agreement, body omission for publish/delete, data unwrapping and failures.
- [ ] Add query keys and parent enabling rules. Test isolated parent caches and
  late responses after changing selection. Keep no mixed default/user endpoint fallback.
- [ ] Run targeted tests, then full admin tests/lint/build; commit.

Representative adapter contract (response type is copied from the existing entity):

```ts
type CreateSubtype = {
  name: string;
  colorPaletteId: number;
  glasswareId: number;
};
export async function createSubtype(parentId: number, input: CreateSubtype): Promise<AlcoholSubtype> {
  const response = await apiClient.post<AlcoholSubtype>(
    `/v1/admin/default/alcohol/types/${parentId}/subtypes`,
    { ...input, alcoholTypeId: parentId },
  );
  return response.data;
}
```

Test exact subtype publication URL; testing only mocked section calls would miss the
previous documented `/types/subtypes` error.

### P2 — Workspace theme, shell and common states

**Create:** `App.tsx`, `components/Workspace.tsx`, `PageState.tsx`, `ConfirmDialog.tsx`,
`DrinkPreview.tsx`, local theme files and tests.
**Modify:** `main.tsx`, `index.css`.
**Reuse:** `web/src/theme/{primitives,tokens,cssVars}.ts`, `fonts.css`,
`web/src/assets/fonts/`, `web/src/drink/glassware.tsx`.

- [ ] Write failing tests for gated shell, routes/back/deep links, active navigation,
  loading/error/empty distinction, retry, dialog focus/labels and unknown route.
- [ ] Build selected Workspace: dark umber top navigation, five primary links,
  centred 1260px content, 40px desktop inset, 46px Fraunces headings, 18px card gaps,
  two columns to one at narrow widths. Below 900px expose compact labelled navigation.
- [ ] Derive MUI theme from copied tokens; use CSS variables in section/component code.
  Existing hairline tokens are insufficient as form-control boundaries: use a stronger
  existing ink token and verify 3:1 non-text contrast.
- [ ] Copy minimum SVG rendering using React `d` attributes, never raw HTML injection.
  Preview uses consumer light/dark materials, labelled adjacent text and decorative SVG.
  Missing assignments get readable fallback, not a crash.
- [ ] Common confirmation props: `open, title, description, pending, error, onConfirm, onClose`.
  Page-state props distinguish loading/error/empty with retry/empty action.
  Document these states/props in `docs/admin-panel.md` as components land.
- [ ] Use MUI's existing dialog semantics; preserve focus, cancellation and draft on failure.
  Respect reduced motion. Add a route error boundary using the existing consumer pattern
  where lazy loading is actually used; do not add lazy infrastructure just for this task.
- [ ] Run admin suite/lint/build and browser-check shell at desktop, 390px and 200% zoom; commit.

### P3 — Default types, brands and child subpages

**Create:** Alcohol/beer files in section 5, with co-located tests.
**Depends:** P1–P2. Use actual backend as soon as local integration is available.

- [ ] Write failing tests for default-only adapters, child deep links, absent parent,
  CRUD payloads, nullable assignments, server errors and pending submission.
- [ ] Cards show name, applicable design labels/preview and explicit Edit/Delete/Children.
  Client name search distinguishes filtered-empty from an empty collection.
- [ ] Type form: name/palette/glassware. Brand form: name/palette.
  Creation adds optional repeatable initial child-name fields; remove blanks, show max
  50 initial subtypes from current DTO, enforce actual documented name limits.
  Do not invent a server-enforced limit where DTO has none.
- [ ] Child form fixes parent from route; subtype needs name/palette/glassware,
  flavour needs name/palette. Editing cannot reparent. Show inherited/null assignments
  honestly; no null-as-reset operation.
- [ ] Use default parent GET for breadcrumb/parent validation. Invalid/not-default parent
  shows missing-parent screen; no child creation on that route.
- [ ] Confirm deletion by name; pending controls prevent duplicates. 409 displays server
  conflict without deleting locally; 404 refetches. Invalidate section 5 keys after success.
- [ ] Test initial children appear on subpage after parent creation without extra POSTs.
  Test type editing sends no volume fields, owner or child replacement list.
- [ ] Run full admin checks, exercise real CRUD/409 once stack is ready, commit by concern.

### P4 — Design maintenance

**Create:** `sections/design/` files in section 5 and tests.
**Depends:** P1–P2; B1 before acceptance.

- [ ] Write failing tests for three tabs, create/edit/delete, nullable-field clearing,
  missing dependencies, preview draft updates and conflict preservation.
- [ ] Palette editor: name and field colour, optional light/dark ink; pair labelled hex
  and native colour controls for colour fields. Validate supported hex input in UI.
  Existing unsupported values stay visible for correction; do not silently alter them.
- [ ] For nullable ink update, untouched means omitted; explicit clear serializes `''`.
  Creation uses nullable/omitted values. Test both ink fields independently.
- [ ] Glassware editor: name, outline `g`, liquid `l`, optional foam `f`; preview palette
  selection is local only. Explicit foam clear PATCHes `''`. Render paths as attributes,
  not markup. Test geometry visually in a real browser; do not claim jsdom or Path2D
  exceptions provide a complete SVG-path validator.
- [ ] Consumption-type editor: name/glassware; full list, preview and conflict handling.
  Disable submission with actionable message if required glassware is unavailable.
- [ ] Name/colour/shape semantics stay accessible; swatches are supplemental. No invented
  complete usage counts, cascade action or volume tab.
- [ ] Run checks and real browser light/dark preview comparisons; commit.

### P5 — Recommendations

**Create:** `sections/recommendations/` files and tests.
**Depends:** P1–P4; B2 before acceptance.

- [ ] Write failing tests for persisted order, create/name-only edit/delete, full rename
  payload, reorder keyboard/buttons, filtered reorder disabled and failed-save recovery.
- [ ] Cards show ordinal, name, readable composition/design summary, preview and actions.
  Resolve labels through default collections; missing referenced records show ID/fallback.
  Fetch only distinct referenced parent child collections for visible summaries.
- [ ] Create form loads default types/brands/design/consumption types. Optional subtype,
  volume, flavour and consumption type have None. Palette/glassware/type/name are required.
  Child selectors load only for selected parent; changing type clears subtype/volume,
  changing brand clears flavour. Existing volumes display litres; no volume writes.
- [ ] Name edit submits the complete ordered `{id,name}` list, changing just the selected
  name. No composition or design editing. Explain creation of a new recommendation.
- [ ] Reorder with installed dnd-kit plus explicit Move up/down buttons, keyboard sensor,
  announcements and focus retention. Disable at boundaries, while filtered and during
  a write. Serialize writes so a rename cannot race a reorder in the same session.
- [ ] Use complete PATCH response as authority. On failure restore prior order and keep
  intended edit/error available. Do not interpret omission as deletion or send filtered rows.
- [ ] Confirm delete; refetch after create/delete. Avoid promising multi-admin concurrency
  protection: the existing contract has no revision/ETag. Test refetch before a new edit
  session and document remaining last-write-wins behaviour.
- [ ] Run admin checks and real consumer freshness checks, then commit.

Pure payload rule, with a runnable regression to add in the page test:

```ts
export const renamePayload = (
  rows: readonly Pick<DefaultRecommendation, 'id' | 'name'>[],
  id: number,
  name: string,
): RecommendationUpdate[] => rows.map(row => ({
  id: row.id,
  name: row.id === id ? name : row.name,
}));

it('keeps all rows and their order when renaming', () => {
  expect(renamePayload([{ id: 7, name: 'Beer' }, { id: 3, name: 'Wine' }], 3, 'Red'))
    .toEqual([{ id: 7, name: 'Beer' }, { id: 3, name: 'Red' }]);
});
```

### P6 — User-defined inspection and publication

**Create:** `sections/user-defined/UserDefinedPage.tsx` and tests.
**Depends:** P1–P3; B3 before subtype acceptance.

- [ ] Write failing tests for four kinds, default-parent child filter, no child query before
  parent selection, cached parent reuse, inspect-only controls and publication transitions.
- [ ] Types/brands use user-defined root GETs. Child tabs present searchable default parents;
  then use existing user-defined children GET for exactly the chosen parent.
  Invalid URL parent gets an actionable selection state, not a fallback user parent.
- [ ] Show name, applicable design, owner UUID where useful, Inspect and Publish.
  Inspection is read-only. Name search filters current collection; no new global-child GET.
- [ ] Confirmation explains change to default ownership, no undo and unaffected children.
  Show pending/error; successful publication invalidates both source/default keys.
- [ ] Test parent publication leaves children user-defined; newly published parent becomes
  available in the child filter after parent-list invalidation. Test repeat publication
  success, missing 404, forbidden 403, server failure and resulting empty collection.
- [ ] Ensure there is no edit/delete/unpublish in DOM or keyboard actions.
- [ ] Run admin checks and real publication flow, then commit.

### P7 — Local integration and deployment packaging

**Create:** `admin/Dockerfile`, `admin/nginx.conf`, `admin/docker-entrypoint.sh`,
`admin/helm/drinksaver-admin/` chart files matching the web chart structure,
`deploy/values/admin-test.yaml`, `admin-prod.yaml`.
**Modify:** `compose.yaml`, local realm import under `deploy/local/`,
`admin/vite.config.ts`, backend CORS values, `docs/keycloak-admin-setup.md`,
`docs/DEPLOYMENT.md`, `docs/admin-panel.md`.
**Read first:** Current deployment guide, consumer Docker/entrypoint/chart and realm files.

- [ ] Add regression checks for runtime substitution, deep-link nginx fallback, config.js
  caching and rendered chart values/probes. Copy existing consumer container pattern.
- [ ] Use localhost:3001 consistently for local admin container and Vite dev server
  (strict port). Keep consumer localhost:3000.
- [ ] Replace obsolete local `ADMIN_USER_LIST` with `ADMIN_USER_UUID` matching seeded
  default ownership. Add admin local origin and PATCH to CORS; retain consumer origins.
  Add test/prod admin origins in backend environment values.
- [ ] Import local public admin client with localhost:3001 redirects/web origin, PKCE,
  exact full-path groups mapper and dedicated admin test user in `/admin`.
  Keep an ordinary consumer test user for denial tests. Do not broaden backend authority.
- [ ] Fix Keycloak guide's conflicting bare/nested-group acceptance statements and obsolete
  environment name. Distinguish catalogue owner UUID from login authorization.
- [ ] Chart/image name `drinksaver-admin`; test host `test.admin.drinksaver.kak.im`,
  prod host `admin.drinksaver.kak.im`; namespaces `drinksaver-test` / `drinksaver`.
  Test realm/client: `test-drinksaver` / `test-drinksaver-admin`; production:
  `drinksaver` / `drinksaver-admin`. Values supply actual API/Keycloak runtime configuration.
  No client secret for public SPA.
- [ ] Retain the original security decisions: public ingress with group-protected API,
  `Content-Security-Policy: frame-ancestors 'none'`, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and
  `X-Robots-Tag: noindex, nofollow`. Check headers on deep links and error responses.
- [ ] Keep root VERSION stamping; no environment baked into bundle. Add chart lint/template
  checks and runtime smoke with login, direct child URL reload and API preflight/PATCH.
- [ ] Record packaging evidence and docs; commit. Local validation is not authorization
  to publish images/charts or change cluster/Keycloak state.

### P8 — Real journeys, CI and final acceptance

**Create:** `web/e2e/admin.playwright.config.ts`, `web/e2e/admin/` journeys using
already-installed Playwright, `.github/workflows/deploy-test-admin.yml`,
`.github/workflows/apply-values-admin.yml`.
**Modify:** `web/package.json`, existing `web/e2e/playwright.config.ts`,
`.github/workflows/{build,deploy,e2e}.yml`, `admin/vite.config.ts`, deployment/component docs.
**Depends:** B1–B4 and P1–P7.

- [ ] Configure separate admin baseURL localhost:3001/auth state/report location and one
  worker for shared test data. Exclude admin tests from consumer config. Add `e2e:admin`
  script using the separate config, with real Keycloak login and isolated seeded fixtures.
- [ ] Journeys cover every page's create/edit/delete, initial children, parent deep links,
  filtered user publication, child independence, recommendation order/name-only edit,
  read-only volumes, design previews, 409 and non-admin denial.
- [ ] Use unique test names/IDs and deliberate cleanup. Do not delete local persistent
  volumes as routine cleanup; CI may tear down its own ephemeral stack.
- [ ] Add admin unit/lint/coverage/build gate before image publishing. Measure actual
  coverage, set documented floors and ratchet upward; existing admin zero floors are temporary.
- [ ] Extend main build publication/summary with independent admin image/chart. Add optional
  production `deploy-admin` input defaulting false; production stays manual only.
- [ ] Add non-main admin test deploy and admin-values redeploy using existing safe workflow
  patterns/path filters. Extend E2E main gate with admin readiness and journeys.
  Review permissions, secret handling and untrusted input interpolation before enabling.
- [ ] Check consumer test/lint/build if its package or E2E configuration changed; backend
  integration tests must actually run when backend code changes.
- [ ] Independent WCAG 2.2 AA review plus real interaction checks: keyboard/focus/dialogs,
  accessible names, contrast, 200% zoom, narrow reflow, error/status announcements, touch
  targets and reduced motion. Report assistive-technology behaviour not actually tested.
- [ ] Compare every item in approved scope and visual spec against final app, with screenshots
  of desktop/narrow/loading/error/empty/form states. Fix missing requirements and rerun checks.
- [ ] Document components' props/states, API changes and deployment commands from actual
  implementation. Review full diff including new files; commit the finished concern.

## 7. Verification commands and completion evidence

Commands below run from repo root, using shell working-directory options for app commands.
These are future implementation checks; this planning commit did not run application suites.

| Check | Command / working directory |
| --- | --- |
| Admin unit tests | `npm run test` in `admin/` |
| Admin coverage | `npm run test:coverage` in `admin/` |
| Admin lint/build | `npm run lint`, then `npm run build` in `admin/` |
| Backend coverage/integration | `mvn verify` in `backend/`, then `./scripts/assert-integration-tests-ran.sh` |
| Consumer checks when touched | `npm run test:coverage`, `npm run lint`, `npm run build` in `web/` |
| Admin real browser journeys | `npm run e2e:admin` in `web/`, after local stack/seed readiness |
| Consumer journeys when configuration changes | `npm run e2e` in `web/` |
| Container configuration | `docker compose config --quiet` |
| Chart | `helm lint admin/helm/drinksaver-admin`; render with each admin values file |
| Prose/diff | `git diff --check`, verify local links and current executable examples |

Use the session's required RTK wrapper for shell execution. Never claim integration passed
from skipped Testcontainers, visual parity from unit tests, or live deployment from chart rendering.

Completion evidence must record baseline/head, exact commands/results/skips, real browser
journeys, database conflict/freshness results, accessibility limitations and visual review.
Plan-only approval does not authorize implementation, push, PR creation, merge or deployment.

## 8. Delivery checklist

- [ ] All seven product pages/subpages and user-defined/design tabs match approved scope.
- [ ] Existing technology and delivered foundation preserved.
- [ ] All adapters use existing verified routes, including shared PATCH and corrected publish.
- [ ] B1 full-list, B2 cache freshness, B3 subtype ID consistency and B4 integrity verified.
- [ ] No volume management, unpublish, recommendation composition edit or user-defined edit.
- [ ] Parent creation supports initial children; publication never promotes children implicitly.
- [ ] Defaults filter correctly; user child selection uses cached default parents.
- [ ] Form drafts, error states, focus and pending behaviour survive real failures.
- [ ] Auth/CORS/runtime config/container/chart/CI match the separate admin deployment.
- [ ] Source-derived docs, tests, real journeys, independent accessibility and final review complete.
