# DrinkSaver admin panel: design

Date: 2026-09-21
Status: accepted, not yet implemented

A third deployable application in this monorepo, alongside `backend/` and `web/`. It is the
tool through which an administrator curates the reference data the consumer app reads:
color palettes, glassware, the default recommendations every user starts with, and the
alcohol types, brands and flavours that users create for themselves.

## 1. Why a separate application

The consumer app is a mobile-first drink tracker used by everyone. The admin panel is a
desktop-first curation tool used by a handful of people. They share an API and an identity
provider and nothing else: different audience, different layout register, different release
risk, different authorization. Shipping admin code inside `web/` would send it to every
phone and would couple two very different change rates through one image, one chart and one
test suite.

So: `admin/`, a sibling of `web/`, with its own image, chart, ingress, Keycloak client and
GitHub Actions workflows, sharing only the root `VERSION` file.

### Code sharing: none, deliberately

No npm workspace and no shared package. The admin app copies what it needs from `web/`:
`config.ts`, `api/client.ts`, the four files under `auth/`, and the three theme files. That
is roughly 400 lines.

The alternative, a workspace with a `shared/` package, removes the duplication but changes
`web/`'s build context, its Dockerfile, its CI cache keys and its coverage configuration,
all of which currently assume `web/` is self-contained. That is a real cost paid up front
against a drift risk that is small and slow.

The drift is bounded on purpose. `admin/src/types/api.ts` declares only the entities the
admin panel touches, so a change to a web-only type cannot silently rot the admin build,
and a change to a shared entity breaks the admin TypeScript compile in CI, which is where
you want to hear about it.

## 2. Authentication and authorization

### The token

`keycloak-js` initialised with `onLoad: 'login-required'`, matching `web/`. An
unauthenticated visitor is redirected to Keycloak before the shell renders, which is the
behaviour asked for.

Two new Keycloak clients, created by hand alongside the group:

| Environment | Realm | Client ID |
| --- | --- | --- |
| Test | `test-drinksaver` | `test-drinksaver-admin` |
| Production | `drinksaver` | `drinksaver-admin` |

Each needs a Group Membership protocol mapper writing the `groups` claim into the access
token. Whether the mapper emits full paths is not the app's business: the check normalises
a leading slash, so both `admin` and `/admin` satisfy it.

### The gate

After `keycloak.init` resolves, the app reads `tokenParsed.groups` and requires `admin`. A
user outside the group sees a full-page "Not authorised" screen with a sign-out button. No
navigation renders and no queries fire, so an unauthorised session cannot produce a wall of
403s.

This client-side check is a user experience guard and nothing more. The backend rejecting
every `/v1/admin/**` call from a non-member is the actual control. A 403 reaching the client
is surfaced as an error, never swallowed into an empty table, because an empty table and a
forbidden table look identical to a user and mean completely different things.

## 3. Structure, and room for admin features that do not exist yet

The one abstraction this design introduces is a section registry.

```
admin/src/sections/
  registry.tsx         // SectionDescriptor[]
  palettes/
  glassware/
  recommendations/
  catalogue/
```

Each section folder exports a descriptor:

```ts
export interface SectionDescriptor {
  id: string;
  label: string;
  icon: ReactNode;
  path: string;
  element: ReactNode;
}
```

`registry.tsx` collects them into an array. Navigation and routes are both derived from that
array, so adding a future admin area is one folder plus one line. There is no plugin
system, no dynamic import machinery and no configuration file, because a registry array is
the whole of what "ready for more features" actually requires here.

### Layout

Persistent left rail at 900px and above. Below that, an `AppBar` with a temporary `Drawer`.
Tables collapse into stacked cards rather than scrolling horizontally, which is what makes
the mobile experience genuinely usable rather than merely responsive. The breakpoint is
MUI's `md`.

### Visual register

`theme/primitives.ts`, `theme/tokens.ts` and `theme/cssVars.ts` are copied from `web/`
byte for byte, so the admin panel paints on `--ds-surface-ground`, `--ds-ink-primary`,
`--ds-line-hairline` and the rest of the same generated custom properties the consumer app
uses. Only the MUI theme on top of them is this application's own.

Copying rather than re-declaring is a correctness requirement, not laziness. An administrator
editing `inkDark` needs the preview to show what a real user will see, and a parallel token
set that merely looks similar today would drift into a preview that lies. The admin theme's
test asserts that every `var(--ds-*)` it names is one the copied files actually define, so a
plausible but non-existent variable fails the suite rather than rendering as nothing.

What differs is density, not colour: data tables, inline editing, a persistent rail, small
controls, very little motion. The panel is dark only, because it is used at a desk rather
than in a bar at midnight and on a terrace at noon; the palette editor renders both modes
side by side regardless, which is the one place both are needed.

## 4. The four sections

### 4.1 Color palettes

A `ColorPalette` is `{ id, name, field, inkLight, inkDark }`, three CSS colors and a name.

List view: one row per palette, showing the three colors as swatches, the name, and a usage
count. Editor: the name plus three color controls, each a native `<input type="color">`
paired with a hex text field writing the same piece of state, so a value can be picked or
pasted. `inkLight` is nullable and an empty field means null.

Alongside the controls, a live preview renders a plate-style chip in light and dark mode
side by side, using the real tokens. This is the point of the section, so it is the largest
thing on the screen, not an afterthought in a corner.

Create, edit and delete. Delete is disabled, with the reason stated, when the usage count is
above zero.

### 4.2 Glassware

A `Glassware` is `{ id, name, g, l, f }` where `g`, `l` and `f` are raw SVG path strings and
`f` is nullable.

Editor: three monospace textareas and a live preview of the assembled glass, tinted by a
palette chosen from a dropdown, because glassware and palette are only meaningful together.

Each path is validated in the browser before save by constructing a `Path2D` and rendering
it to an offscreen canvas. A path the browser cannot parse is rejected at the form, with the
offending field marked, rather than being written to the database and discovered later as an
invisible glass in someone's history.

Create, edit and delete, with the same usage-count rule as palettes.

### 4.3 Default recommendations

The recommendations every user sees before they have created any of their own.

A table of the current defaults with drag reordering, using `@dnd-kit` exactly as `web/`
does, inline name editing, and delete. Creation opens a dialog composing the full
recommendation: alcohol type, optional subtype, volume, optional brand, optional flavour,
optional consumption type, and a required palette and glassware. The selects are
populated from the admin catalogue endpoints and cascade, so choosing an alcohol type
narrows the subtype and volume options.

Reordering is optimistic, since latency is felt directly in a drag.

### 4.4 Catalogue review

The section where user-defined values are reviewed and published.

Tabs for alcohol types, alcohol subtypes, volumes, brands, beer flavours and consumption
types. Each tab is a table of every row across all users, with columns for name, owner,
design assignment and shared state. The default filter is "user-defined only", because
reviewing what users have created is the job; showing everything is the exception.

This is the one screen with no natural ceiling, since it holds every row every user has ever
created, so it carries a name filter and shows how many rows the filters are hiding. The
filtering is client-side over the full list, which is honest into the low thousands of rows
and becomes a server-side query parameter after that, not a faster filter.

Per row: rename, change the palette or glassware assignment, and publish. Publishing calls
the dedicated action endpoint (section 5), is confirmed in a dialog naming the entry, and is
applied optimistically with a rollback on failure. Unpublish is the mirror image.

The owner column shows who created an entry and survives publication, which is what makes
unpublish coherent and gives the table an audit trail at no extra cost.

## 5. Backend contract

The backend is being restructured so that authorization is fully Keycloak-backed and
reference data is no longer keyed on an administrator's user id. The admin panel is written
against the post-restructure contract described here.

Every path below is rejected with 403 for a caller outside the `admin` group.

### Design

| Method | Path |
| --- | --- |
| GET | `/v1/admin/design/color-palettes` |
| POST | `/v1/admin/design/color-palette` |
| PATCH | `/v1/admin/design/color-palette/{id}` |
| DELETE | `/v1/admin/design/color-palette/{id}` |
| GET | `/v1/admin/design/glassware` |
| POST | `/v1/admin/design/glassware` |
| PATCH | `/v1/admin/design/glassware/{id}` |
| DELETE | `/v1/admin/design/glassware/{id}` |

DELETE on a palette or glassware still referenced by reference data responds 409, never a
cascading null. The panel disables the button when it knows the count is non-zero, and
reports the 409 plainly when the server knows better than the client does.

### Recommendations

The existing recommendation schema, prefixed with `admin`, plus a real create. The consumer
app only ever creates a recommendation as a side effect of saving a drink
(`addToRecommendations`), which is not a path an administrator can use to author a default.

| Method | Path |
| --- | --- |
| GET | `/v1/admin/recommendations/list` |
| POST | `/v1/admin/recommendations` |
| PATCH | `/v1/admin/recommendations/edit` |
| DELETE | `/v1/admin/recommendations/{id}` |

### Types

Every existing type GET, prefixed with `admin`, plus a PATCH per entity. Admin GETs return
rows for all users, each carrying its owner and its shared state. Without that the catalogue
section has nothing to review, since the consumer GETs are scoped to the caller.

| Method | Path |
| --- | --- |
| GET, PATCH | `/v1/admin/alcohol/types`, `/v1/admin/alcohol/types/{id}` |
| GET, PATCH | `/v1/admin/alcohol/types/{id}/subtypes`, `/v1/admin/alcohol/subtypes/{id}` |
| GET, PATCH | `/v1/admin/alcohol/types/{id}/volumes`, `/v1/admin/alcohol/volumes/{id}` |
| GET, PATCH | `/v1/admin/beer/brands`, `/v1/admin/beer/brands/{id}` |
| GET, PATCH | `/v1/admin/beer/brands/{id}/flavours`, `/v1/admin/beer/flavours/{id}` |
| GET, PATCH | `/v1/admin/beer/consumption-types`, `/v1/admin/beer/consumption-types/{id}` |

### Publishing

Publication is a dedicated action rather than a field on the entity, so the client never
constructs ownership or sharing state itself:

```
POST /v1/admin/<entity path>/{id}/publish
POST /v1/admin/<entity path>/{id}/unpublish
```

The list GET returns the resulting state on each row so the table can render it. The client
sends no user id anywhere, in keeping with the rule the consumer app already follows: the
server derives identity from the JWT.

### Usage counts

Computed client-side by cross-referencing the admin catalogue responses, which already carry
`colorPaletteId` and `glasswareId`. Saved drinks are not counted, because no admin endpoint
exposes them. The label therefore reads "referenced by reference data" rather than implying
a complete count, and the 409 remains the authority.

## 6. Data layer

`admin/src/api/admin.ts` holds one function per endpoint, no generic resource abstraction.
TanStack Query with keys shaped `['admin', <resource>]` and `['admin', <resource>, id]`.

Mutations invalidate their own list. Optimistic updates are used only for reordering
recommendations and for publishing, the two places where the delay is felt as lag rather
than as saving. Everywhere else the button shows a pending state and the list refetches,
which is simpler and cannot desynchronise.

Errors surface through the existing `errors.ts` pattern copied from `web/`: a 403 reads as
"not permitted", a 409 as the specific conflict, and anything else as a retryable failure.

## 7. Runtime configuration

Identical mechanism to `web/`: one image serves every environment, and
`docker-entrypoint.sh` writes `/config.js` before nginx starts. The global is
`window.__DRINKSAVER_ADMIN_CONFIG__`, distinct from the consumer app's so the two can never
be confused if they are ever served from one origin.

Four values: `apiUrl`, `keycloakUrl`, `keycloakRealm`, `keycloakClientId`. The same
placeholder-detection rule applies, so an unsubstituted `${API_URL}` is treated as absent
rather than passed to axios.

## 8. Deployment

Own chart at `admin/helm/drinksaver-admin`, own values at `deploy/values/admin-test.yaml`
and `deploy/values/admin-prod.yaml`, own image `ghcr.io/alex-molnar/drinksaver-admin`.

| Environment | Namespace | Host |
| --- | --- | --- |
| Test | `drinksaver-test` | `test.admin.drinksaver.kak.im` |
| Production | `drinksaver` | `admin.drinksaver.kak.im` |

Both on the existing traefik ingress class with the `letsencrypt-prod` cluster issuer.

### Exposure, and what is accepted

The panel sits on the public internet behind Keycloak and nothing else: no IP allowlist, no
VPN, no ingress-level authentication. That is an accepted risk, in keeping with how SEC-4 is
recorded, and it is written down rather than left implicit. The controls that do apply are
the group gate, the backend rejecting `/v1/admin/**` for a non-member, and the response
headers below.

`admin/nginx.conf` sets `Content-Security-Policy: frame-ancestors 'none'` and
`X-Frame-Options: DENY`, plus `X-Content-Type-Options: nosniff` and
`Referrer-Policy: no-referrer`. The consumer app sets none of these. The difference is that
this panel's buttons publish reference data to every user of the product, so a framed copy
of it and one misdirected click is a cheap way to make an administrator publish something
they never read. `X-Robots-Tag: noindex, nofollow` covers every response, not just the
document the meta tag covers.

Four workflow changes, mirroring the web pipeline exactly:

1. `.github/workflows/deploy-test-admin.yml`, on any non-main push touching `admin/**`.
2. `.github/workflows/apply-values-admin.yml`, on a push touching
   `deploy/values/admin-test.yaml`, sharing a concurrency group with the above.
3. An `admin` job in `build.yml`, publishing image and chart on a push to `main`.
4. An `admin` job in `deploy.yml`, for the manual production release.

Versioning is unchanged: the root `VERSION` file is the single source of truth, stamped into
`admin/package.json` by the same `jq` step web uses, and used for the image tag and both
chart versions.

## 9. Testing

Vitest with jsdom and React Testing Library, v8 coverage, and eslint, all blocking in CI,
mirroring the web app's gates.

Coverage floors are set from the first measured run and recorded with the date and the
measured value in a comment, per the repository's ratchet convention. They are raised as
tests are added and never lowered to make a build pass.

What gets tested: the group gate in both directions, the section registry driving navigation
and routes, the SVG path validator against valid and malformed input, the color and hex
inputs staying in sync, the publish mutation including its rollback, the usage-count
derivation, and the delete-disabled rule.

No Playwright suite yet. The local realm has no admin user and no admin group, and an
end-to-end journey is worth writing once there is a flow stable enough to be worth gating.
This is a deliberate deferral, recorded in `docs/remaining-work.md` rather than left
implicit.

## 10. Documentation

- An admin section in `docs/DEPLOYMENT.md` covering the chart, the values files, the two
  Keycloak clients and the group mapper.
- The admin paths added to `docs/api-docs.yaml`, as the contract the panel is coded against.
- Component documentation for each section: what it does, its states, its props.

## 11. What this design deliberately leaves out

- Bulk operations in the catalogue. Review is a considered act, and a bulk publish button is
  an easy way to share something nobody read.
- An audit log. The owner column and the shared flag carry enough history for now.
- Any admin user management. That is Keycloak's job and duplicating it here would create a
  second, worse source of truth.
- Editing saved drinks. Administrators curate reference data, not people's records.
