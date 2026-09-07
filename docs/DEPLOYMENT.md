# Deployment

How DrinkSaver is built, published, and deployed.

## Overview

Both applications live in one namespace per environment and share a single
version. Images and Helm charts are published to GitHub Container Registry by
GitHub Actions. Nothing is built or pushed from a laptop.

| Environment | Namespace | Releases | URLs |
|---|---|---|---|
| Test | `drinksaver-test` | `drinksaver-backend`, `drinksaver-web` | `test.api.drinksaver.kak.im`, `test.app.drinksaver.kak.im` |
| Production | `drinksaver` | `drinksaver-backend`, `drinksaver-web` | `api.drinksaver.kak.im`, `app.drinksaver.kak.im` |

## Versioning

`VERSION` at the repo root is the single source of truth. It currently reads
`3.0.0`.

One computed version string is applied to the Maven project version, the web
`package.json`, the Docker image tag, and both the Helm chart `version` and
`appVersion`. Nothing carries a version of its own.

| Workflow | Version produced |
|---|---|
| Build and publish | exactly `VERSION`, for example `3.0.0` |
| Deploy to test | `VERSION` plus a UTC timestamp, for example `3.0.0-2026-09-07-15-13-52` |

The timestamp format is `<YYYY-MM-DD>-<HH-MM-SS>`. The composite is a valid
SemVer 2 prerelease, which Helm requires of chart versions, and a legal Docker
tag.

One nuance worth knowing: the two test workflows are triggered independently by
path, so if you change only the backend, only the backend gets a new timestamped
version and web stays on whatever it last deployed. The strict "everything on
one version" guarantee is what the build workflow provides, because it publishes
both applications at `VERSION` in a single run. Production deploys from those
artifacts, so production is always internally consistent.

To release a new version, edit `VERSION` and merge to `main`.

## Registry

```
ghcr.io/alex-molnar/drinksaver-backend:<version>
ghcr.io/alex-molnar/drinksaver-web:<version>
ghcr.io/alex-molnar/charts/drinksaver-backend:<version>
ghcr.io/alex-molnar/charts/drinksaver-web:<version>
```

The repository is public, so GHCR storage and data transfer are free and
unlimited, and Actions minutes are unlimited. Packages published from this
repository are publicly pullable, so the cluster needs no image pull secret.

Charts are OCI artifacts, which Helm has supported natively since 3.8. Pull one
by hand with:

```bash
helm pull oci://ghcr.io/alex-molnar/charts/drinksaver-backend --version 3.0.0
```

## Workflows

### Deploy backend to test / Deploy web to test

Trigger: any push on any branch that touches `backend/**` or `web/**`
respectively. Also runnable manually.

Builds the application, builds and pushes the image, packages and pushes the
chart, then deploys the chart it just published into `drinksaver-test`. It
deploys the published artifact rather than the working copy, so a broken chart
push fails the run instead of hiding behind a local file.

A change confined to `.github/workflows/**` does not trigger these, by design.
Use the manual run for that.

### Apply backend test values / Apply web test values

Trigger: a push touching `deploy/values/backend-test.yaml` or
`deploy/values/web-test.yaml` respectively. Also runnable manually.

Reapplies the values file to the chart version already released in
`drinksaver-test`. Nothing is compiled and nothing is published, so this is the
fast path for a configuration-only change: a new hostname, a CORS origin, a
different Keycloak realm.

The chart version comes from `helm list`, so it is whatever the test pipeline
last published. There is no `latest` tag to maintain, and no way to accidentally
pull a version that was never deployed here. If no release exists yet the run
fails with a message telling you to run the full deploy workflow first, because
there is nothing to reapply values to.

These share a `concurrency` group with the corresponding deploy workflow, since
both mutate the same release and must never overlap.

### Build and publish

Trigger: any push to `main`, which includes a merged pull request. Also runnable
manually.

Builds both applications, pushes both images and both charts at `VERSION`, and
deploys nothing. The run summary lists the four published references.

### Deploy to production

Trigger: manual only. This is the production cutover and never fires on a push.

Pulls the already published charts by version and deploys them into
`drinksaver`. Nothing is compiled or rebuilt.

| Input | Type | Default | Meaning |
|---|---|---|---|
| `deploy-backend` | boolean | `true` | Deploy the `drinksaver-backend` chart |
| `deploy-web` | boolean | `true` | Deploy the `drinksaver-web` chart |
| `version` | string | empty | Version to pull. Empty means read `VERSION` |

Each workflow has a `concurrency` group, so two runs can never perform
overlapping `helm upgrade` calls on the same release.

## Per-environment configuration

Values live in `deploy/values/`, outside the chart directories so they are not
packaged into the chart tarballs.

```
deploy/values/backend-test.yaml
deploy/values/backend-prod.yaml
deploy/values/web-test.yaml
deploy/values/web-prod.yaml
```

Values are stated explicitly rather than inherited from chart defaults, so
changing a default cannot silently alter production.

## How web configuration works

The web image contains no environment configuration. `docker-entrypoint.sh`
writes `/config.js` from container environment variables before nginx starts:

```js
window.__DRINKSAVER_CONFIG__ = {
  apiUrl: "https://test.api.drinksaver.kak.im",
  keycloakUrl: "https://auth.drinksaver.kak.im/auth",
  keycloakRealm: "test-drinksaver",
  keycloakClientId: "drinksaver-frontend"
};
```

`index.html` loads that file before the bundle, and `src/config.ts` reads it,
falling back to `import.meta.env` so `npm run dev` still works. nginx serves
`/config.js` with `no-cache` through an exact-match location that outranks the
immutable static-asset rule.

The chart supplies the values through `config.*`:

| Value | Purpose |
|---|---|
| `config.apiUrl` | Backend base URL the browser calls |
| `config.keycloakUrl` | Keycloak base URL, including `/auth` |
| `config.keycloakRealm` | Realm name |
| `config.keycloakClientId` | Client ID registered in Keycloak |

This is why one image can be promoted from test to production unchanged. Before
this change these were Docker build arguments, which is why test needed its own
separately built image tag.

**`config.keycloakClientId` is `drinksaver-frontend` and must stay that way.**
It is the client ID registered in Keycloak, not a local name. Renaming it
without renaming the Keycloak client in both realms breaks login.

## CI access to the cluster

The Kubernetes API server is publicly reachable, so CI deliberately does not
hold an admin kubeconfig. `deploy/rbac/github-actions-deployer.yaml` defines a
ServiceAccount that can manage only the resources these charts create, and only
in `drinksaver` and `drinksaver-test`.

Verified denied: secrets in `kube-system` and `postgres`, anything in
`cattle-system`, listing nodes, and deleting namespaces.

The `KUBE_CONFIG` repository secret holds a base64-encoded kubeconfig for that
ServiceAccount.

### Accepted risk

The Role grants `list` on secrets in those two namespaces. Helm's default
storage driver keeps release state as Secrets, and Kubernetes RBAC cannot
restrict `list` by resource name, so Helm cannot find its own releases without
being able to read every Secret in the namespace.

The consequence is that repository write access plus this token can read
`secret-postgres-basic-auth`, which is the production database password, and the
cert-manager TLS private keys for the production hostnames. It is confined to
`drinksaver` and `drinksaver-test` and reaches nothing else on the cluster.

Running Helm with `HELM_DRIVER=configmap` would remove the need for any secret
permission. It was not adopted because the existing releases are stored as
Secrets: Helm would not find them, and `upgrade --install` would fall through to
`install` and collide with the live resources. Worth revisiting if more people
gain write access to the repository. See
[the security review](security-review-2026-09-07.md) finding F2.

To rotate it:

```bash
kubectl delete secret github-actions-deployer-token -n drinksaver
kubectl apply -f deploy/rbac/github-actions-deployer.yaml
# then rebuild the kubeconfig and update the secret (see the block below)
```

To rebuild the kubeconfig from scratch:

```bash
NS=drinksaver
SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
TOKEN=$(kubectl get secret github-actions-deployer-token -n $NS -o jsonpath='{.data.token}' | base64 -d)
CACRT=$(kubectl get secret github-actions-deployer-token -n $NS -o jsonpath='{.data.ca\.crt}')
cat > /tmp/ci-kubeconfig.yaml <<CFG
apiVersion: v1
kind: Config
clusters:
  - name: drinksaver
    cluster:
      server: ${SERVER}
      certificate-authority-data: ${CACRT}
contexts:
  - name: drinksaver
    context:
      cluster: drinksaver
      user: github-actions-deployer
      namespace: drinksaver-test
current-context: drinksaver
users:
  - name: github-actions-deployer
    user:
      token: ${TOKEN}
CFG
base64 < /tmp/ci-kubeconfig.yaml | tr -d '\n' | gh secret set KUBE_CONFIG --repo alex-molnar/drinksaver
```

## Required cluster state

Each namespace needs a Postgres credentials secret. The charts read
`datasource.passwordSecretName`, which defaults to
`secret-postgres-basic-auth`.

| Namespace | Secret | Type | Keys |
|---|---|---|---|
| `drinksaver` | `secret-postgres-basic-auth` | `kubernetes.io/basic-auth` | `username`, `password` |
| `drinksaver-test` | `secret-postgres-basic-auth` | `kubernetes.io/basic-auth` | `username`, `password` |

Test and production use different database users, so these are not copies of
each other. The databases (`drinksaver` and `test-drinksaver`) and the Keycloak
realms (`drinksaver` and `test-drinksaver`) already exist.

## Rollback

```bash
# See what has been deployed
helm history drinksaver-backend -n drinksaver

# Roll back one revision
helm rollback drinksaver-backend -n drinksaver

# Or redeploy a known-good version
gh workflow run "Deploy to production" -f version=3.0.0 -f deploy-web=false
```

## Troubleshooting

**`Cache export is not supported for the docker driver`**
The build step is missing `docker/setup-buildx-action`. The runner's default
builder cannot export a GitHub Actions cache.

**A push did not trigger a test deploy**
The path filters only match `backend/**` and `web/**`. Run the workflow
manually.

**`ImagePullBackOff` in either namespace**
Check the package is still public at
`https://github.com/users/alex-molnar/packages/container/<name>/settings`. If
you ever make one private, the namespace needs an image pull secret, and the CI
ServiceAccount already has permission to create one.

**Web shows the wrong API URL**
Fetch `https://<host>/config.js` and check the values. If they are stale, the
browser cached it, which should not happen given the `no-cache` header, or the
chart's `config.*` values are wrong for that environment.

## Follow-ups not done here

- `web` has no test framework. Adding `vitest` was deferred because `vite` is on
  a very new major and dependency compatibility could not be verified offline.
  `src/config.ts` is the piece most worth covering.
- The backend has no tests at all, so CI has nothing to run.
- The web bundle is a single 660 kB chunk. Code splitting would help first load.
- Four old resources remain from before the consolidation and can be removed
  once production is cut over: namespaces `drinksaver-backend`,
  `drinksaver-frontend`, `test-drinksaver-backend`, `test-drinksaver-frontend`.
  The two test ones no longer hold releases.
