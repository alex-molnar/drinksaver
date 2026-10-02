# DrinkSaver admin panel design and architecture decision

Updated 2026-10-02. The original proposal is superseded by the approved
[Workspace specification](2026-10-02-admin-panel-visual-directions.md) and the
[replacement implementation plan](../plans/2026-09-21-admin-panel.md).

## Decision retained

Keep `admin/` as an independent Vite application beside `web/` and `backend/`.
Keep React 19, TypeScript 6, MUI 9, TanStack Query 5, React Router 7, axios,
keycloak-js 26, the installed dnd-kit packages, Vitest 5, jsdom, Testing Library,
ESLint, nginx, Helm and GitHub Actions. Keep the separate runtime configuration,
Keycloak public client, image, chart and ingress. Root `VERSION` remains the
version source. Do not introduce an npm workspace or new dependencies.

Copy the small existing consumer patterns into the independent app: token primitives,
self-hosted Familjen Grotesk/Fraunces fonts, axios auth handling and SVG glass rendering.
No shared-package extraction is required to deliver these pages.

Retain public ingress with the group-protected API and the original anti-framing,
no-sniff, no-referrer and no-index response headers. Test client/realm remain
`test-drinksaver-admin` / `test-drinksaver`; production remain `drinksaver-admin` /
`drinksaver`. No new ingress authorization layer is introduced.

## Approved product scope

Workspace uses top navigation, a centred content area and two-column item cards.
The approved visual specification defines dimensions, forms, previews, responsive
behaviour, interaction states and accessibility acceptance.

| Area | Allowed operations |
| --- | --- |
| Recommendations | Create/delete defaults; rename and reorder only |
| Alcohol types | Default CRUD; navigate to default subtypes |
| Alcohol subtypes | Default CRUD under the route's default parent |
| Beer brands | Default CRUD; navigate to default flavours |
| Beer flavours | Default CRUD under the route's default parent |
| User-defined | Inspect, filter and publish types/subtypes/brands/flavours |
| Design | Palette, glassware and consumption-type CRUD |

Parent creation accepts initial child names. User-defined child tabs select only
default parents, using the existing default-parent GET and a cached query. This is
a UI restriction; no new backend enforcement is requested. Publishing a parent does
not publish children. Publication changes ownership to the configured catalogue-admin
UUID and has no unpublish action. The caller's JWT does not supply that default owner.

Existing volumes can be read for recommendation creation. All volume management and
ownership redesign are excluded. Database deletion protections are accepted as existing;
the UI handles conflicts returned by the server.

## Consequences

The API contract now exists. Use its existing default/user-defined reads, shared ID-based
PATCH/DELETE routes and publish routes; do not invent separate default/user PATCH endpoints.
The replacement plan credits the completed scaffold/config/auth components and records
the remaining integration and backend correctness work. Mocked component tests alone
cannot establish acceptance: real authentication, PostgreSQL and browser journeys remain
release gates. No application implementation or deployment is authorized by this document.
