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

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8080` |

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
docker build -t drinksaver-frontend .
```

### Run Container

```bash
docker run -p 3000:80 -e VITE_API_URL=http://your-backend:8080 drinksaver-frontend
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

```bash
# Install with default values
helm install drinksaver ./helm/drinksaver-frontend

# Install with custom backend URL
helm install drinksaver ./helm/drinksaver-frontend \
  --set backend.apiUrl=http://backend-service:8080

# Install with ingress enabled
helm install drinksaver ./helm/drinksaver-frontend \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=drinksaver.example.com \
  --set ingress.hosts[0].paths[0].path=/ \
  --set ingress.hosts[0].paths[0].pathType=Prefix
```

### Configuration

Key values in `values.yaml`:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `backend.apiUrl` | Backend API URL (browser-accessible) | `http://localhost:8080` |
| `image.repository` | Docker image repository | `drinksaver-frontend` |
| `image.tag` | Docker image tag | `latest` |
| `service.type` | Kubernetes service type | `ClusterIP` |
| `ingress.enabled` | Enable ingress | `false` |
| `replicaCount` | Number of replicas | `1` |

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
