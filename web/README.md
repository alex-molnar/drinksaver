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

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Material-UI (MUI) v5
- **Routing**: React Router v6
- **State Management**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Containerization**: Docker + Nginx
- **Orchestration**: Helm chart for Kubernetes

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm 9+

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

Run the complete stack including frontend, backend, and PostgreSQL:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Services:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **PostgreSQL**: localhost:5432

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
├── hooks/
│   └── useNavigation.ts # Navigation helper hook
├── pages/
│   ├── IndexPage.tsx    # Quick save grid
│   ├── DetailedPage.tsx # Manual entry form
│   ├── SuccessPage.tsx  # Success message
│   ├── ErrorPage.tsx    # Error with retry
│   ├── NewAlcoholPage.tsx
│   ├── NewVolumePage.tsx
│   └── NewBeerBrandPage.tsx
├── types/
│   └── api.ts           # TypeScript interfaces
├── App.tsx              # Route configuration
└── main.tsx             # Entry point with providers
```

## API Integration

The app integrates with the DrinkSaver backend API. Key endpoints:

- `GET /v1/recommendations/{userId}/list` - Get drink recommendations
- `POST /v1/drinks/new` - Save a non-beer drink
- `POST /v1/drinks/beer/new` - Save a beer
- `GET /v1/alcohol/types` - List alcohol types
- `POST /v1/alcohol/types` - Create alcohol type
- `GET /v1/alcohol/types/{id}/volumes` - Get volumes for type
- `POST /v1/alcohol/types/{id}/volumes` - Create volume
- `GET /v1/beer/consumption-types` - List consumption types
- `GET /v1/beer/brands` - List beer brands
- `POST /v1/beer/brands/{brand}` - Create beer brand

Note: `userId` is hardcoded to `1` for the initial implementation.

## Validation Rules

- **Volume (liters)**: Must be positive and less than 2 (range: 0.01-1.99)
- **Required fields**: Form validation ensures all mandatory fields are filled before save

## License

See [LICENSE](LICENSE) file.
