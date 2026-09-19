# DrinkSaver

Project instructions for Claude Code. These sit on top of the global instructions in
`~/.claude/CLAUDE.md` and override them where they disagree.

## What this repo is

A monorepo for a drink tracking app, deployed to a self hosted Kubernetes cluster.

| Path | What it is |
| --- | --- |
| `backend/` | Spring Boot 4, Java 21, Maven. Postgres via JPA, OAuth2 resource server against Keycloak. |
| `backend/drinksaver-backend/` | The backend Helm chart. Note the location: it is a sibling of `src/`, not under a `helm/` directory. |
| `web/` | React 19, TypeScript, Vite, MUI 9, TanStack Query, `keycloak-js`, React Router 7. |
| `web/helm/drinksaver-web/` | The web Helm chart. |
| `deploy/values/` | Per environment Helm values, kept outside the charts so they are not packaged into the tarballs. |
| `deploy/rbac/` | The ServiceAccount and Role that CI uses to reach the cluster. |
| `docs/DEPLOYMENT.md` | The full build, publish and deploy story. Read it before touching anything in `.github/workflows/` or `deploy/`. |
| `VERSION` | Single source of truth for the Maven version, `package.json`, image tags and both chart versions. |


## Testing

Both applications have a suite, and `superpowers:test-driven-development` applies to every
feature in the normal way.

| Application | Stack | Command |
| --- | --- | --- |
| Backend | JUnit 5, Mockito, AssertJ, Testcontainers | `cd backend && mvn test` |
| Web | Vitest 5, jsdom, React Testing Library | `cd web && npm run test` |

Backend integration tests carry `@Testcontainers(disabledWithoutDocker = true)` and start a
real Postgres, so they skip rather than fail when Docker is not running. On Colima, export
`DOCKER_HOST` and `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE` first or they skip silently. See
`docs/DEPLOYMENT.md` for the exact values and for the Spring Boot 4 and Testcontainers 2.x
module naming that is easy to get wrong.

`web/src/config.ts` builds its export at import time, so any test of it must call
`vi.resetModules()` and re-import per case. `web/src/config.test.ts` shows the pattern.

End-to-end journeys live in `web/e2e/` and run with `npm run e2e` against the local
compose stack, which must already be up. They drive a real browser through the real
Keycloak login, so they need no mocks. In CI they run on `main` only, after a merge, which
keeps feature pushes fast while still gating a release.

Both suites gate CI, as does `npm run lint` for the web app. A red test or a lint error
stops the test deploy and stops the publish. Lint warnings are not blocking.

Coverage is gated too, as a ratchet rather than a target: JaCoCo on the backend
(`mvn verify`, floor 90% instructions against 90.50% measured) and v8 on the web app
(`npm run test:coverage`, floors 93/86/92/95 against 93.67/86.95/92.81/95.15). Raise them
as tests are added, never lower them to make a build pass. Each threshold carries the date
and the measured value in a comment, so the size of the gap is visible.

The backend gate checks instructions only. Branch coverage is 78.57% and ungated; see HK-2
in `docs/remaining-work.md`.

## Environment and infrastructure

Everything is built and deployed by GitHub Actions. Nothing is built or pushed from a
laptop. Images and Helm charts live in GHCR under `ghcr.io/alex-molnar/`.

| Environment | Namespace | Trigger |
| --- | --- | --- |
| Test | `drinksaver-test` | Push to any branch except `main`, path filtered on `backend/**`, `web/**` or the test values files. |
| Production | `drinksaver` | Manual `workflow_dispatch` only. |

The cluster is self hosted and already provides Postgres and Keycloak. Each namespace needs
a `secret-postgres-basic-auth` secret. `docs/DEPLOYMENT.md` has the full detail, including
versioning, the runtime config mechanism for the web app, the CI RBAC model and its accepted
risk, rollback, and troubleshooting.

### Using kubectl and gh

Both are available and read only by default. Use them freely to investigate: `kubectl get`,
`kubectl describe`, `kubectl logs`, `helm list`, `helm history`, `gh run list`, `gh run view`,
`gh pr view`.

**Ask before any command that changes state:** `helm upgrade`, `helm rollback`,
`kubectl apply`, `kubectl delete`, `kubectl edit`, `gh workflow run`, `gh secret set`.

Never print, log or commit `KUBE_CONFIG`, database credentials, or Keycloak client secrets.

## Documentation duties

- **API changes.** The canonical OpenAPI spec is `docs/api-docs.yaml`. There is exactly one
  copy and it is hand maintained, so update it with any controller change. The backend also
  serves a live spec from springdoc at `/api-docs`, which is the quickest way to cross check
  what the code actually exposes.
- **Frontend changes.** Document the component, its states and its props.
- **Infrastructure and architecture decisions.** Write an ADR into
  `docs/superpowers/specs/`, alongside the existing design document.

## UI and design

The global design rules apply here in full. MUI 9 being the current component layer is not
a reason to settle for a stock MUI look. Push the typography, palette, surfaces and motion
toward something with real character, and present options rather than picking for Alex.

## Known debt

`docs/remaining-work.md` is the list, with a description per task written to be picked up
cold. `docs/fixes-2026-09-08.md` records what was closed and how it was verified; read its
"Already done" section before acting on anything from older material, because several
findings that read as open are not.

Tasks there carry stable ids grouped by kind: `SEC-*`, `PRIV-*`, `FIX-*`, `OPS-*`, `HK-*`.
Refer to them by id, never by position. The short version:

| Group | What is open |
| --- | --- |
| `SEC` | The alcohol volume endpoints take no authenticated principal, so any user can write to any user's type (SEC-1, needs a decision). Actions and base images are on moving tags (SEC-2, SEC-3, a tradeoff left to Alex). The CI ServiceAccount can read every secret in both namespaces (SEC-4, accepted). |
| `PRIV` | Everything from the GDPR review except SQL logging. All seven gate on a special-category determination that is not an engineer's to make. |
| `FIX` | Unbounded volume payload, a lost update on `volumeIds`, no error boundary for a lazy chunk that 404s after a deploy. |
| `OPS` | Prometheus is configured but not wired up. Four namespaces await production cutover. |
| `HK` | `web/coverage` still tracked, no BRANCH coverage gate, one dead DTO field, one lint warning. |

Do not re-add to this section. Add to `docs/remaining-work.md` instead, appending to the
relevant group with the next free id.
