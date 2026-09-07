# Monorepo CI/CD, single namespace, unified versioning

Date: 2026-09-07
Status: Approved

## Objective

Deploy the whole `drinksaver` monorepo into one namespace per environment,
carry a single version across every application, and drive builds and
deployments from GitHub Actions using GitHub Container Registry (GHCR) for
both Docker images and Helm charts.

## Starting state

| Thing | Value before this change |
|---|---|
| Namespaces | `drinksaver-backend`, `drinksaver-frontend`, `test-drinksaver-backend`, `test-drinksaver-frontend` |
| Image registry | Docker Hub, `kingbrady/*` |
| Chart distribution | none, installed from the working copy |
| Backend version | pom `2.1.2`, chart `1.1.0`, image tag `2.1.2-multi-architechture` |
| Web version | `package.json` `0.0.0`, chart `1.0.0`, image tag `2.8.1-multi-architechture` |
| CI | none, `.github/` held only Java-modernize hooks |
| Cluster | k3s, 2 amd64 nodes, `local-path` storage, Traefik, cert-manager `letsencrypt-prod` |
| API server | `https://89.98.53.177:6443`, publicly reachable |

## Decisions

### Registry: GHCR

Chosen over Docker Hub and over self-hosting. The repo is public, so GHCR
storage and transfer are free and unlimited, and Actions minutes are
unlimited. It costs no cluster RAM, adds no dataset to back up, and avoids
the cold-start loop where a cluster cannot pull the images it needs because
the registry serving them is inside that cluster. Docker Hub was also rate
limiting all cluster pulls against a single shared public IP.

A Maven registry was considered and rejected: the JAR is only ever copied
into the Docker image and nothing consumes it as a dependency.

Layout:

```
ghcr.io/alex-molnar/drinksaver-backend:<version>
ghcr.io/alex-molnar/drinksaver-web:<version>
ghcr.io/alex-molnar/charts/drinksaver-backend:<version>
ghcr.io/alex-molnar/charts/drinksaver-web:<version>
```

### Version scheme

`VERSION` at the repo root is the single source of truth, set to `3.0.0`.
It was `0.1.0`, which would have renumbered production downward from
`2.1.2`. `3.0.0` starts the unified scheme above every existing artifact.

| Workflow | Version |
|---|---|
| `build.yml` (main) | `<VERSION>` |
| `deploy-test-*.yml` | `<VERSION>-<YYYY-MM-DD>-<HH-MM-SS>` in UTC |

The composite parses as a valid SemVer 2 prerelease, which Helm requires of
chart versions, and is a legal Docker tag. One computed string sets the
Maven project version (so the JAR filename the Dockerfile expects stays in
sync), `package.json`, the image tag, and both chart `version` and
`appVersion`.

### Single namespace per environment

| Environment | Namespace | Releases |
|---|---|---|
| Test | `drinksaver-test` | `drinksaver-backend`, `drinksaver-web` |
| Production | `drinksaver` | `drinksaver-backend`, `drinksaver-web` |

The two old test releases are uninstalled, because two Ingresses claiming
the same host make Traefik routing last-writer-wins. The two production
releases are left running and are cut over manually later via `deploy.yml`.

### Web runtime configuration

Previously `VITE_API_URL`, `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM` and
`VITE_KEYCLOAK_CLIENT_ID` were build ARGs baked into the bundle by
`npm run build`, so one image could not serve two environments. That
conflicts with a pipeline whose production deploy only pulls a prebuilt
artifact.

`docker-entrypoint.sh` now writes `/usr/share/nginx/html/config.js` from
container env vars at startup, `index.html` loads it before the bundle, and
`src/config.ts` reads it with an `import.meta.env` fallback so `npm run dev`
still works. One image serves any environment and the chart supplies values.

### Frontend to web rename

`drinksaver-frontend` becomes `drinksaver-web` for the chart, its directory,
templates, package name, and docs.

`VITE_KEYCLOAK_CLIENT_ID` and the `keycloak.ts` fallback deliberately keep
the value `drinksaver-frontend`. That string is the client ID registered in
Keycloak, not a local name, and renaming it without renaming the Keycloak
client breaks authentication.

### CI cluster authentication

A `github-actions-deployer` ServiceAccount with a Role granting only what
Helm needs, RoleBound in `drinksaver` and `drinksaver-test` only. Chosen over
uploading an admin kubeconfig, because the API server is publicly reachable
and a leaked CI secret would otherwise expose Rancher, Postgres, and the rest
of the cluster. Manifests are committed under `deploy/rbac/` so the grant is
reviewable.

### Per-environment values

Committed at `deploy/values/{backend,web}-{test,prod}.yaml`, outside the
chart directories so they are not packaged into the chart tarballs. Contents
are hostnames, database names, the in-cluster Postgres service URL, and
Keycloak admin user UUIDs. None are credentials. The repo is public and this
was accepted in exchange for reviewable, version-controlled deployment config.

### Backend base image

`backend/Dockerfile` ran on `openjdk:25-ea-jdk-slim`, an early-access preview
build, while `pom.xml` targets Java 21. Pinned to `eclipse-temurin:21-jre`,
which matches the pom, is a supported release, and is substantially smaller.

## Workflows

| File | Trigger | Behavior |
|---|---|---|
| `deploy-test-backend.yml` | push, any branch, paths `backend/**` | build JAR, build and push image, package and push chart, deploy to `drinksaver-test` |
| `deploy-test-web.yml` | push, any branch, paths `web/**` | same, for web |
| `build.yml` | push to `main`, plus manual | build both apps, images and charts at `VERSION`, push all, deploy nothing |
| `deploy.yml` | manual only | pull charts by version from GHCR, deploy to `drinksaver` |

`deploy.yml` inputs: `deploy-backend` (boolean, default true), `deploy-web`
(boolean, default true), `version` (string, empty means read `VERSION`).

Every workflow carries a `concurrency` group so two rapid pushes cannot run
overlapping `helm upgrade` calls against one release.

## Known gaps

- GHCR creates packages private regardless of repository visibility. The four
  packages need a one-time flip to public, or the namespaces need an
  `imagePullSecret`.
- `web` has no test framework. Adding `vitest` was considered and deferred:
  `vite` is on a very new major and the dependency compatibility could not be
  verified offline. Verification here is `npm run build` for typecheck,
  `helm lint` and `helm template` for the charts, and a real deploy.
- The backend has no tests at all, so CI has nothing to run and needs no
  database.
- Whether the API server firewall accepts GitHub runner source IPs is unproven
  until the first workflow run.
