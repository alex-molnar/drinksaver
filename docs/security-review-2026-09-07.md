# Differential security review

Date: 2026-09-07
Scope: branch `ci/monorepo-pipelines` against `main` (`1c582ec..`)
Reviewer: automated differential review, findings verified by hand

## Scope and strategy

39 files changed. Codebase is SMALL by the classification, so DEEP strategy:
every changed file read, and every finding below was reproduced rather than
inferred from reading alone.

| Risk | Files |
|---|---|
| HIGH | `.github/workflows/*.yml` (hold cluster credentials and registry write), `deploy/rbac/github-actions-deployer.yaml` (access control) |
| MEDIUM | `web/docker-entrypoint.sh`, `web/src/config.ts` (authentication configuration path), `web/nginx.conf`, `backend/Dockerfile` |
| LOW | chart rename, `deploy/values/*`, documentation |

## Findings

### F1. Shell injection through a workflow_dispatch input

**Severity: High. Status: fixed in `8dcc6a8`.**

`deploy.yml` expanded a caller-supplied value directly into a shell body:

```yaml
run: |
  INPUT="${{ inputs.version }}"
```

Impact: anyone able to dispatch the production deploy workflow could inject
shell commands into a job holding `KUBE_CONFIG` and `packages: write`, which
means cluster access and registry write, not just a broken build.

Fix: every context value in all four workflows now arrives through `env:`, so
no event or input data is parsed as shell. Verified: zero `${{ }}` expressions
remain inside any `run:` body.

### F2. CI ServiceAccount can read production database credentials and TLS keys

**Severity: Medium. Status: accepted, documented.**

The Role grants `list` on `secrets` in `drinksaver` and `drinksaver-test`. That
is required, because Helm's default storage driver keeps release state as
Secrets, and Kubernetes RBAC cannot restrict `list` by `resourceNames`. Granting
Helm the ability to find its releases therefore grants reading every Secret in
those namespaces.

Impact: the `KUBE_CONFIG` repository secret transitively grants read access to
`secret-postgres-basic-auth`, which holds the production database password, and
to the cert-manager TLS private keys for `api.drinksaver.kak.im` and
`app.drinksaver.kak.im`. The ServiceAccount is correctly confined to those two
namespaces, so this is not cluster-wide, but it is broader than "can deploy".

Mitigation not taken: running Helm with `HELM_DRIVER=configmap` would remove the
need for any secret permission. It was not adopted because migrating the
existing secret-stored releases is hazardous: Helm would not find them, and
`upgrade --install` would fall through to `install` and collide with the live
resources.

Recommendation: acceptable for a single-maintainer repository. Revisit if more
people gain write access, since repository write plus this token equals the
production database password.

### F3. Actions pinned to mutable major tags rather than commit SHAs

**Severity: Medium. Status: not fixed, decision required.**

`actions/checkout@v5`, `actions/setup-java@v5`, `docker/login-action@v3`,
`docker/setup-buildx-action@v3`, and `docker/build-push-action@v6` all resolve
through a moving tag, and they run in jobs that hold `KUBE_CONFIG`.

Impact: if any of those upstream tags were repointed at malicious code, it would
execute with cluster credentials and registry write in scope.

Fix available: pin each to a full commit SHA with the version in a trailing
comment, and let Dependabot raise updates. This is a maintenance tradeoff, so it
is left to the repository owner rather than applied unilaterally.

### F4. Test deploy triggers on a push to any branch

**Severity: Low. Status: as designed, noted.**

`deploy-test-backend.yml` and `deploy-test-web.yml` fire on any branch. Because
a workflow runs as defined on the branch that triggered it, anyone with
repository write access can both deploy arbitrary code to `drinksaver-test` and
alter the workflow itself to exfiltrate `KUBE_CONFIG`.

Forks cannot trigger `push` on the upstream repository, and there is no
`pull_request_target` trigger anywhere, so this is not reachable by external
contributors. This behavior was explicitly requested. Noted only so the
tradeoff is on record as the collaborator set grows.

### F5. A newline in a config value silently disabled the web runtime config

**Severity: Low. Status: fixed.**

Reproduced against `web/docker-entrypoint.sh`. Quote injection was already
handled correctly:

```
API_URL='https://x",apiUrl:"evil'
  ->  apiUrl: "https://x\",apiUrl:\"evil"      # escaped, single key, no injection
```

A newline was not, and produced an unterminated string literal:

```
API_URL=$'https://x\nalert(1)//'
  ->  SyntaxError, whole file fails to parse
```

Impact: not code execution, because quotes are escaped and the string cannot be
closed. The consequence is a silent fallback: `/config.js` fails to parse,
`window.__DRINKSAVER_CONFIG__` stays undefined, and `src/config.ts` reverts to
its `http://localhost:8080` defaults. A production pod would come up healthy,
pass its probes, and serve an app pointing at localhost.

Fix: strip carriage returns and newlines before escaping. They cannot
legitimately appear in a URL, realm, or client ID. Verified that hostile input
now parses to a sanitized value and that normal values are unaffected.

### F6. kubeconfig briefly created at the default umask

**Severity: Low. Status: fixed.**

`printf ... > "$HOME/.kube/config"` created the file before `chmod 600` ran, so
it existed momentarily as world-readable. Added `umask 077` ahead of the write
in all four locations. Low impact on an ephemeral single-tenant runner, but free
to fix.

### F7. Base images pinned to mutable tags

**Severity: Info.**

`eclipse-temurin:21-jre`, `nginx:alpine`, and `node:20-alpine` are moving tags,
so builds are not byte-reproducible. Digest pinning would fix it. Noted for
completeness; this change already improved matters by moving the backend off
`openjdk:25-ea-jdk-slim`, an early-access preview that had no business under a
production deploy.

## Test coverage

Elevated risk, stated plainly. Neither application has any tests: the backend
has zero test files, and `web` has no test framework at all. Every finding above
was verified manually, and the runtime config path was exercised end to end
against the live test environment, but nothing guards against regression.

`web/src/config.ts` is the piece most worth covering, because it now sits on the
authentication path and its fallback behavior is what turns F5 from an outage
into a silent misconfiguration.

## What the change got right

- `permissions:` is declared explicitly and minimally per workflow, rather than
  inheriting the default write-all token.
- The RBAC grant was verified empirically, not assumed: denied on `kube-system`
  and `postgres` secrets, `cattle-system`, listing nodes, and deleting
  namespaces.
- Deploy steps install the chart that was just published rather than the working
  copy, so a broken chart push fails the run instead of passing silently.
- No `pull_request_target` and no fork-reachable trigger anywhere.
- Moving web configuration from build arguments to runtime removed the need for
  environment-specific images, which in turn removed a class of "wrong build
  promoted to production" mistake.
