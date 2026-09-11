# DrinkSaver Frontend

A mobile-first web application for tracking alcohol consumption. Built with React, TypeScript, and Material-UI.

## Features

- **Quick Save**: one tap on an enamel plate logs a drink, in place, with undo
- **Add sheet**: a bar menu over whatever screen you are on, never a separate page
- **Catalogue entries created inline**: a missing brand or size is added without losing the drink
  you were part way through entering
- **History**: a paper bar tab you cross off, with a seven day strip and deferred deletes
- **Beer Support**: brand, flavour and consumption type appear only when they apply
- **Mobile-First**: optimized for touch devices with 44px+ touch targets, and a day that rolls
  over at 06:00 rather than midnight
- **Docker Ready**: Multi-stage Dockerfile with Nginx serving
- **Kubernetes Ready**: Helm chart included for easy deployment

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 8
- **UI Framework**: Material-UI (MUI) v9
- **Routing**: React Router v7, with routes loaded on demand
- **State Management**: TanStack Query v5
- **Authentication**: Keycloak via `keycloak-js`, bearer token on every request
- **HTTP Client**: Axios
- **Testing**: Vitest 5 with jsdom and React Testing Library; Playwright for the
  end-to-end journeys
- **Containerization**: Docker + Nginx
- **Orchestration**: Helm chart for Kubernetes

## Development Setup

### Prerequisites

- Node.js 24+
- npm 10+

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Configuration

Configuration is read at runtime, not baked in at build time, so one image
serves every environment. See `src/config.ts`.

In a container, `docker-entrypoint.sh` writes `/config.js` from these
environment variables before nginx starts:

| Variable | Description | Default |
|----------|-------------|---------|
| `API_URL` | Backend API base URL the browser calls | `http://localhost:8080` |
| `KEYCLOAK_URL` | Keycloak base URL, including `/auth` | `http://localhost:8081/auth` |
| `KEYCLOAK_REALM` | Keycloak realm | `drinksaver` |
| `KEYCLOAK_CLIENT_ID` | Client ID registered in Keycloak | `drinksaver-frontend` |

For `npm run dev` there is no `/config.js`, so the same settings can be given as
Vite variables in a `.env` file, falling back to the localhost defaults above:

```
VITE_API_URL=http://localhost:8080
VITE_KEYCLOAK_URL=http://localhost:8081/auth
VITE_KEYCLOAK_REALM=drinksaver
VITE_KEYCLOAK_CLIENT_ID=drinksaver-frontend
```

## Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Docker

### Build Image

```bash
docker build -t drinksaver-web .
```

### Run Container

```bash
docker run -p 3000:80 \
  -e API_URL=http://your-backend:8080 \
  -e KEYCLOAK_URL=http://your-keycloak:8081/auth \
  -e KEYCLOAK_REALM=drinksaver \
  -e KEYCLOAK_CLIENT_ID=drinksaver-frontend \
  drinksaver-web
```

The app will be available at `http://localhost:3000`

## Docker Compose (Full Stack)

The compose file lives at the repository root, not here. Run it from there:

```bash
cd ..

# Start all services, building the backend and web images from source
docker-compose up --build

# View logs
docker-compose logs -f

# Stop all services and discard the database
docker-compose down -v
```

Services:
- **Frontend**: http://localhost:3000, log in as `dev` / `dev`
- **Backend API**: http://localhost:8080
- **Keycloak**: http://localhost:8081/auth, admin console `admin` / `admin`
- **PostgreSQL**: localhost:5432

See `docs/DEPLOYMENT.md` for what each service does and the settings that are
easy to get wrong.

## Helm Chart (Kubernetes)

### Installation

Deployments are normally handled by GitHub Actions. See
[docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).

The published chart is an OCI artifact:

```bash
helm install drinksaver-web \
  oci://ghcr.io/alex-molnar/charts/drinksaver-web --version 3.0.0 \
  --namespace drinksaver-test \
  --values ../deploy/values/web-test.yaml
```

Or from this working copy:

```bash
helm install drinksaver-web ./helm/drinksaver-web \
  --set config.apiUrl=http://backend-service:8080
```

### Configuration

Key values in `values.yaml`:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.apiUrl` | Backend API URL the browser calls | `https://api.drinksaver.kak.im` |
| `config.keycloakUrl` | Keycloak base URL, including `/auth` | `https://auth.drinksaver.kak.im/auth` |
| `config.keycloakRealm` | Keycloak realm | `drinksaver` |
| `config.keycloakClientId` | Client ID registered in Keycloak | `drinksaver-frontend` |
| `image.repository` | Registry and owner | `ghcr.io/alex-molnar` |
| `image.name` | Image name | `drinksaver-web` |
| `image.tag` | Image tag. Empty means the chart `appVersion` | `""` |
| `service.type` | Kubernetes service type | `ClusterIP` |
| `ingress.enabled` | Enable ingress | `true` |
| `replicaCount` | Number of replicas | `1` |

`config.keycloakClientId` is a Keycloak client ID, not a local name, and it
differs per environment. It must match a client that actually exists in the
realm named by `config.keycloakRealm`, or login fails for that environment.

## Project Structure

```
src/
├── api/
│   ├── client.ts        # Axios instance configuration
│   └── endpoints.ts     # API endpoint functions
├── components/
│   ├── AppFrame.tsx     # Painted board header and bottom nav
│   ├── Plate.tsx        # One enamel sign
│   ├── PlateGrid.tsx    # The Quick Save grid
│   ├── PaperTab.tsx     # The history bar tab
│   ├── DayStrip.tsx     # Seven day tabs and the date picker
│   ├── TapeStrip.tsx    # The undo strip
│   ├── AppErrorBoundary.tsx # Catches a lazy chunk that went missing in a deploy
│   ├── LoadingButton.tsx
│   └── AddSheet/        # SheetHost and its menu, option and create panels
├── auth/
│   ├── KeycloakProvider.tsx # Init, token refresh, auth context
│   ├── ProtectedRoute.tsx   # Gate for authenticated content
│   └── useAuth.ts           # Context accessor
├── theme/
│   ├── primitives.ts    # Raw scales. No component imports this
│   ├── tokens.ts        # The ThemeTokens interface and the dark set
│   ├── cssVars.ts       # Emits --ds-* custom properties
│   ├── muiTheme.ts      # MUI's behavioural shells, skinned through those variables
│   └── fonts.css        # Self hosted Fraunces and Familjen Grotesk
├── drink/
│   ├── day.ts           # The 06:00 drinking day
│   ├── identity.ts      # Glass, field, ink and chroma per drink
│   ├── contrast.ts      # WCAG maths, and the gate on the table above
│   ├── glassware.tsx    # The four silhouettes
│   ├── draftReducer.ts  # The add sheet's draft and its cascade rules
│   ├── saveQueueReducer.ts # Pure, clock injected: saving, undoable, committed
│   ├── SaveQueueProvider.tsx # Timers, deferred deletes, the lifecycle listeners
│   ├── useDrinksForDate.ts # The read model both screens build on
│   └── useDayCounts.ts  # Seven days, distinguishing unread from empty
├── hooks/
│   ├── useSheet.ts      # One bit of URL, the panel stack in state
│   └── useUndoTimer.ts  # The window, and its WCAG pause
├── pages/
│   ├── QuickSavePage.tsx # The plate grid
│   └── HistoryPage.tsx   # The day strip and the paper tab
├── test/
│   ├── setup.ts         # Vitest setup
│   └── test-utils.tsx   # renderWithProviders
├── types/
│   └── api.ts           # TypeScript interfaces
├── App.tsx              # Route configuration, lazy loaded
└── main.tsx             # Entry point with providers
```

Every module has a sibling `*.test.ts(x)`. The end-to-end journeys live in `e2e/`, outside
`src/`, so the Vitest and Playwright runners never collide.

There is no `pages/New*.tsx`, no `DetailedPage`, no `SuccessPage` or `ErrorPage` and no `Layout`
any more. Those ten screens are one sheet, and their routes redirect rather than 404 so no
bookmark or tab left open across the change lands on a blank page.

## API Integration

`docs/api-docs.yaml` at the repository root is the canonical contract. The app talks to
it through `src/api/endpoints.ts`, one function per endpoint:

- `GET /v1/recommendations/list` - drink recommendations
- `POST /v1/drinks/new` - save a drink, beer or otherwise
- `GET /v1/drinks/date/{date}` - a day's history
- `DELETE /v1/drinks/byIds` - delete selected history entries
- `GET /v1/alcohol/types` - list alcohol types
- `POST /v1/alcohol/types` - create an alcohol type
- `GET|POST /v1/alcohol/types/{id}/volumes` - volumes for a type
- `GET|POST /v1/alcohol/types/{id}/subtypes` - subtypes for a type
- `GET /v1/beer/consumption-types` - list consumption types
- `GET|POST /v1/beer/brands` - beer brands
- `GET|POST /v1/beer/brands/{id}/flavours` - flavours for a brand

**No request carries a `userId`.** The backend derives the caller from the JWT that
`src/api/client.ts` attaches, and ignores any userId in a payload. Do not add one back:
sending one suggests the client's claim about who it is counts for something, and it
does not.

## Validation Rules

Client side:

- **Volume (liters)**: positive and less than 2 (range 0.01 to 1.99)
- **Required fields**: the save control stays disabled until every mandatory field is
  filled, which differs by drink type (beer also requires a consumption type)

Server side, worth knowing because the client should never send these:

- **Quantity**: 1 to 100 inclusive. Outside that is a 400, not a clamp.

## Testing

```bash
npm run test              # Vitest, watch mode off with -- --run
npm run test:coverage     # with v8 coverage and the ratchet thresholds
npm run lint              # blocking in CI for errors, warnings are not
npm run e2e               # Playwright, needs the compose stack already up
```

The coverage thresholds in `vite.config.ts` are a ratchet: raise them as tests are
added, never lower them to make a build pass.

`src/config.ts` builds its export at import time, so any test of it must call
`vi.resetModules()` and re-import per case. `src/config.test.ts` shows the pattern.

## The interface

The UI is the **Utolsó Kör** direction: a Budapest kocsma. An umber plaster ground, drinks as
screwed-up enamel signs, a bar menu with dotted leader lines, and a light paper bar tab you cross
off. Dark only, deliberately. The full reasoning is in
`docs/superpowers/specs/2026-09-09-ui-redesign-design.md`, which is the contract this code is
built against.

Two rules hold the whole thing together, and both are enforced rather than remembered.

**No colour literals in a component.** Everything reads `var(--ds-*)`. `src/theme/` defines the
tokens and `src/drink/identity.ts` owns each drink's own field and ink, which belong to the drink
rather than to the theme. An eslint rule fails the build on a hex anywhere else. The one
exception is `AppErrorBoundary`, whose fallback has to render when the stylesheet itself is what
failed to load, so its custom properties each carry a literal behind them.

**Every field and ink pair is contrast gated.** `src/drink/contrast.ts` computes WCAG 2.2 ratios
and a test fails below 4.5:1 for every entry in the identity table. That test is what caught two
colours during design; both moved rather than the threshold.

### Components

| Component | What it is | States | Key props |
| --- | --- | --- | --- |
| `AppFrame` | The painted board header and bottom nav that frame every screen. Owns navigation and sign-out directly. | Header reads **Tonight** between midnight and the 06:00 rollover, **Today** otherwise, unless a screen names itself. The Add tab opens the sheet in place rather than navigating. | `title?`, `subtitle?`, `children` |
| `Plate` | One enamel sign. Field colour and ink come from the drink's identity, never from a literal. | `idle`, `saving` (pressed, `aria-busy`), `saved` (stamped for the undo window). A variant renders the dashed "Something else" plate. | `name`, `alcoholTypeId?`, `caption?`, `state`, `onClick` |
| `PlateGrid` | Two-column grid of plates with deterministic per-index rotation, plus the trailing add plate. | Scrolls; nothing is hidden past the fold. | `items`, `onSelect`, `onAdd` |
| `Glass` | The four glassware silhouettes. | `tone="ink"` draws a flat silhouette in the surface's own ink, which is what makes a plate read as a sign. `tone="chroma"` fills the liquid with the drink's colour. | `kind`, `chroma`, `foam?`, `tone?` |
| `TapeStrip` | The undo strip. History reserves an in-flow slot; other pages and open sheets use a floating portal. | `status` (undoable) announces with `role="status"`; the failed variant is `role="alert"` and never auto-dismisses. Its timer pauses while focus or hover is inside it, per WCAG 2.2 SC 2.2.1. | `entry`, `onUndo`, `onRetry`, `stripHandlers`, `container?`, `inline?` |
| `AddSheet/SheetHost` | One Drawer for the whole panel stack, swapping content by the top panel. Owns per-panel focus and the strip's portal slot. | Open or closed; `?sheet=add` is the only part of the stack in the URL. | `sheet`, `children` |
| `AddSheet/MenuPanel` | The bar menu: one leader-dot row per field, the quantity stepper and the save control. | Save is disabled until the drink and its size are chosen. | `rows`, `quantity`, `onPushPanel`, `onSave` |
| `AddSheet/OptionPanel` | The options for one field, plus a "New ..." row where the catalogue allows it. | Branches on the field: dates, notes and the recommendation options render their own controls. | `field`, `onSelect`, `onCreate` |
| `AddSheet/CreatePanel` | The inline form that replaced all five `New*` pages. On save the new entry is adopted into the draft and you return to the menu. | Idle, submitting, failed. | `field`, `onCreated`, `onBack` |
| `PaperTab` | The history bar tab: the one light surface in the app. Rows are name, dotted leader, detail and a cross-off. | `loading`, `error`, `ready`. Explicitly deleted rows stay keyed in place for a pen stroke and fade; the remaining rows then move to close the gap. The count includes live rows only. | `label`, `status`, `rows`, `onToggleSelect`, `onDeleteOne`, `onExitComplete?` |
| `DayStrip` | Seven day tabs with marks, the current one connecting into the paper tab, plus a pick-a-date control. | A day still loading is drawn and announced differently from a day confirmed to have no drinks. There is no range endpoint, so a strip that says "nothing" about an unread day would be lying. | `dates`, `counts`, `selectedDate`, `todayDate`, `onSelect` |
| `HistoryPage` | A fixed day strip, a keyboard-focusable vertical list, then feedback and bulk actions above navigation. | Loading, error, empty and populated paper all share the scroll area. Long names wrap; long feedback can scroll within its reserved slot. | None |
| `AppErrorBoundary` | Catches a lazy route whose chunk has gone after a deploy. | Chunk failure offers a reload; anything else gets a generic fallback. A timestamped guard stops a reload loop without ever disabling the useful message. | `children` |

### Behaviour worth knowing

**History scroll containment (UI-R1/UI-R2).** Selecting a recent day scrolls only `DayStrip`;
an older selection reveals its native date picker. Positioned day tiles keep hidden labels
inside the strip. `HistoryPage` gives `PaperTab` a bounded flex scroll area while feedback,
bulk actions and navigation keep their own space. `PageFeedbackContext` registers the page's
feedback slot with the queue provider; an open add sheet takes priority, and leaving History
returns feedback to the body portal without resetting the undo window. `AppFrame` fills the
root's available height, which already accounts for device safe areas.

With the local Compose stack running, use `npm run e2e -- history-layout.spec.ts` for narrow
day navigation, long lists/names, pointer and keyboard scrolling, bulk/single cross-off and
undo geometry. These use deterministic History response fixtures; the existing save/delete
journeys separately exercise real persistence. For the Safari engine, install it with
`npx playwright install webkit`, then run
`E2E_WEBKIT=1 npm run e2e -- history-layout.spec.ts --project=webkit-history`.
WebKit automation does not replace checking the reported physical iPhone in Safari.

**History row lifecycle (UI-R6/UI-R7).** `HistoryDay` is keyed by the selected date, so navigation
clears selection and cancels visual exits while the shared save queue keeps its undo window.
Only an explicit single or bulk cross-off retains rows; ordinary query changes never do.
`historyPresence` captures their original order and gives each removal a token. Undo restores
the same keyed row immediately; a stale completion cannot remove a newer exit of that row.

`PaperTabRow` supplies `drink`, `selected`, `gone`, optional serving `detail`, and an exit `token`.
`onExitComplete(id, token)` releases a retained row after its 200ms left-origin pen stroke and
120ms opacity fade finish. Cleanup cancels both phases on Undo or unmount. Surviving rows close
the gap with 200ms translations; a separate paper background scales without scaling the text.
Overlapping removals or Undo retarget active movement from its current position. No arbitrary
row height cap, animated height/padding, or cleanup timeout is used. Reduced motion skips the
sequence, and changing that preference cancels active motion. Retained rows are inert.

Run `E2E_WEBKIT=1 npm run e2e -- history-lifecycle.spec.ts` against local Compose to record
Chromium and WebKit video plus frame geometry for the stroke, fade, gap, Undo and date switches.
Most cases use isolated response fixtures; the batch case creates disposable records through
the real API, checks Undo across reload, and removes only its own records in cleanup.

**Logging never navigates.** A tile tap saves in place and raises the undo strip. `/success` and
`/error` no longer exist as screens.

**Saving is immediate; deleting is deferred.** Undo on a save deletes the ids the server returned.
Undo on a delete means the DELETE was never sent, because there is no undelete endpoint. Deferring
a destructive operation fails safe; deferring a constructive one loses the drink you logged. A
pending delete is flushed on `pagehide` with `keepalive`, since unload aborts an XHR.

**The day rolls over at 06:00, not midnight.** A drink at 23:30 and the next at 00:30 are the same
evening. `src/drink/day.ts` owns that rule and takes `now` as an argument, so nothing computes a
date at import time.

## License

See [LICENSE](LICENSE) file.
