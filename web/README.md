# DrinkSaver Frontend

A mobile-first web application for tracking alcohol consumption. Built with React, TypeScript, and Material-UI.

## Features

- **Quick Save**: One-tap saving of recommended drinks
- **Detailed Entry**: Full form for custom drink entries
- **Beer Support**: Special fields for beer (brand, consumption type)
- **CRUD Operations**: Create new alcohol types, volumes, and beer brands
- **Mobile-First**: Optimized for touch devices with 44px+ touch targets
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
│   ├── Layout.tsx       # Shared layout wrapper
│   ├── LoadingButton.tsx # Button with loading state
│   └── RecommendationButton.tsx # Quick-save button
├── auth/
│   ├── KeycloakProvider.tsx # Init, token refresh, auth context
│   ├── ProtectedRoute.tsx   # Gate for authenticated content
│   └── useAuth.ts           # Context accessor
├── hooks/
│   ├── useNavigation.ts       # Navigation helper hook
│   └── useResponsiveTileCount.ts
├── pages/
│   ├── IndexPage.tsx    # Quick save grid
│   ├── DetailedPage.tsx # Manual entry form
│   ├── HistoryPage.tsx  # A day's drinks, with delete
│   ├── SuccessPage.tsx  # Success message
│   ├── ErrorPage.tsx    # Error with retry
│   ├── NewAlcoholPage.tsx
│   ├── NewVolumePage.tsx
│   ├── NewSubtypePage.tsx
│   ├── NewBeerBrandPage.tsx
│   └── NewBeerFlavourPage.tsx
├── test/
│   ├── setup.ts         # Vitest setup
│   └── test-utils.tsx   # renderWithProviders
├── types/
│   └── api.ts           # TypeScript interfaces
├── App.tsx              # Route configuration, lazy loaded
└── main.tsx             # Entry point with providers
```

Each page has a sibling `*.test.tsx`. The end-to-end journeys live in `e2e/`, outside
`src/`, so the Vitest and Playwright runners never collide.

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

## License

See [LICENSE](LICENSE) file.
