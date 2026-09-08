# DrinkSaver

Project instructions for Claude Code. These sit on top of the global instructions in
`~/.claude/CLAUDE.md` and override them where they disagree.

## What this repo is

A monorepo for a drink tracking app, deployed to a self hosted Kubernetes cluster.

| Path | What it is |
|---|---|
| `backend/` | Spring Boot 4, Java 21, Maven. Postgres via JPA, OAuth2 resource server against Keycloak. |
| `backend/drinksaver-backend/` | The backend Helm chart. Note the location: it is a sibling of `src/`, not under a `helm/` directory. |
| `web/` | React 19, TypeScript, Vite, MUI 9, TanStack Query, `keycloak-js`, React Router 7. |
| `web/helm/drinksaver-web/` | The web Helm chart. |
| `deploy/values/` | Per environment Helm values, kept outside the charts so they are not packaged into the tarballs. |
| `deploy/rbac/` | The ServiceAccount and Role that CI uses to reach the cluster. |
| `docs/DEPLOYMENT.md` | The full build, publish and deploy story. Read it before touching anything in `.github/workflows/` or `deploy/`. |
| `VERSION` | Single source of truth for the Maven version, `package.json`, image tags and both chart versions. |

## Workflow

Which path a request takes depends on its size. Pick the path first, say which one you
picked, then follow it.

### Small changes: the fast path

A small change is a change to one file or a few files.

**Just make the change.** Nothing else. Specifically, skip:

- test first / TDD
- review agents (`ecc:orch-review`, `/code-review`)
- `trailofbits:differential-review` and the other security plugins
- verification ceremony and `superpowers:verification-before-completion`
- brainstorming, grilling and planning skills

**Never run any git command on the fast path.** No branch, no commit, no push. The change
stays in the working tree and Alex handles git.

This fast path applies no matter what the change touches. The global carve out for auth,
secrets, CI workflows, API contracts and migrations does **not** apply here. One courtesy:
if a fast path change lands in `.github/workflows/` or `deploy/rbac/`, say so in a sentence
when you report back, because those can break the pipeline or widen cluster access. Say it
and move on. Do not slow down, do not ask permission.

### Features and larger changes: the full pipeline

Anything bigger than a few files gets the global mandatory workflow in full: understand,
design, plan, test first, implement, verify end to end, review with `ecc:orch-review`,
security review with `trailofbits:differential-review`, document, finish.

Repo specific rules on top of that:

- Branch from `main` using `type/short-description`, matching the existing convention
  (`ci/monorepo-pipelines`).
- Commit, push, and open a pull request against `main`. **Never merge.**
- Pushing the branch triggers the test deployment automatically. Do not deploy by hand.
- Propose and apply a semver bump to `VERSION` as part of the feature branch. Say what
  level you chose (patch, minor, major) and why.
- Never edit `deploy/values/backend-prod.yaml` or `deploy/values/web-prod.yaml`, and never
  run the production deploy workflow, unless asked directly.

### Stacked pull requests are the default

Work that spans more than one concern ships as a chain of small pull requests, each based
on the previous one, not as a single large one. This is the preferred shape: prove it works,
then split it so each piece can be read on its own.

```
main <- fix/react-hooks-lint <- test/web-coverage <- test/backend-coverage <- ...
```

How to run it:

- Pick the boundaries so each PR is independently reviewable and independently defensible.
  One concern per PR: a refactor, then the tests for it, then the next area. If a reviewer
  could sensibly reject one while approving its neighbour, that is the right split.
- Set each PR's base to the branch below it, not to `main`. GitHub retargets the base
  automatically as each one merges, so the chain collapses cleanly bottom to top.
- Say in the description which PR it is stacked on, and why the split falls where it does.
- When something changes in a lower branch, rebase the ones above it and force push with
  `--force-with-lease`. Never merge the lower branch into the higher one; that turns a
  readable chain into a tangle.
- Re-verify after every rebase. A rebase that leaves the suite red is worse than no rebase,
  and a conflict in a shared file (`CLAUDE.md` and the coverage thresholds are the usual
  suspects) needs resolving deliberately rather than by taking one side.
- Merge order is bottom to top, and merging is Alex's call, never yours.

Do not stack a fast path change. Those stay in the working tree with no branch at all.

## Model and thinking effort

Match the model to the kind of thinking the step needs, not to the size of the repo.

| Kind of work | Model | Thinking effort |
|---|---|---|
| High level planning: brainstorming, grilling, architecture, design docs, writing the implementation plan | Opus 5 | `xhigh`, or `max` for architectural decisions that are expensive to reverse |
| Review: `ecc:orch-review`, `trailofbits:differential-review`, adversarial verification of findings, receiving code review | Opus 5 | `xhigh`, or `max` when the change touches auth, secrets, CI or the cluster |
| Implementing an already approved plan | Sonnet 5 | `high` |

The split is deliberate. Planning and review are where a wrong call is expensive and hard
to notice, so they get the stronger model and the deeper thinking budget. Executing a plan
that has already been argued over is mostly careful transcription, and Sonnet 5 on `high`
does that well and faster.

How to apply it:

- **Subagents.** Pass `model: "opus"` or `model: "sonnet"` on the `Agent` tool, and set the
  effort in the agent's prompt or its definition.
- **The main session.** Use `/model` to switch model and effort at the boundary between
  phases, and say out loud when you are switching and why.
- Fast path changes inherit whatever the session is already set to. Do not switch models
  for a one file edit.

## Long running work

Anything beyond a small change gets `caffeinate` first, before the work starts. A machine
that sleeps mid-run leaves half-built containers, an interrupted test suite and an agent
writing into a directory that has moved on, and none of that is obvious afterwards.

```bash
caffeinate -dimsu -t 28800 &
```

Run it in the background and always with `-t`, so it expires on its own rather than
outliving the task. Stop it when the work finishes rather than leaving it holding the
machine awake.

Worth doing for: a full pipeline feature, a test suite build out, anything driving Docker
or Testcontainers, an end to end run, or any batch of delegated agents. Not worth doing for
a one file edit.

## Verification

Never claim a feature is done from unit tests alone.

`compose.yaml` at the repo root brings up the whole application: Postgres seeded with demo
data, Keycloak with an imported realm, the backend built from source, and the web app.

```bash
docker-compose up --build     # http://localhost:3000, log in as dev / dev
docker-compose down -v        # stop and discard all data
```

Run the end to end check against that, then confirm the test environment rollout with `gh`
and `kubectl`. See `docs/DEPLOYMENT.md` for what each service does and the two settings
that are easy to get wrong.

## Testing

Both applications have a suite, and `superpowers:test-driven-development` applies to every
feature in the normal way.

| Application | Stack | Command |
|---|---|---|
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
(`mvn verify`, currently 78% instructions) and v8 on the web app
(`npm run test:coverage`, currently 91% statements). Raise them as tests are
added, never lower them to make a build pass.

## Environment and infrastructure

Everything is built and deployed by GitHub Actions. Nothing is built or pushed from a
laptop. Images and Helm charts live in GHCR under `ghcr.io/alex-molnar/`.

| Environment | Namespace | Trigger |
|---|---|---|
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

Listed so it does not get rediscovered every session.

- `npm run lint` reports 12 errors and 6 warnings in `web/src/auth/KeycloakProvider.tsx`
  and five `web/src/pages/New*Page.tsx` and `DetailedPage.tsx` files. All predate the test
  setup and none are in files it touched. Lint is not currently a CI gate.
- `web/README.md` is stale: it claims MUI v5 and React 18, the actual versions are MUI 9
  and React 19.
- The web bundle is a single chunk of roughly 660 kB. Code splitting would improve first
  load.
- Four namespaces are left over from before the consolidation and can be removed once
  production is cut over: `drinksaver-backend`, `drinksaver-frontend`,
  `test-drinksaver-backend`, `test-drinksaver-frontend`.
