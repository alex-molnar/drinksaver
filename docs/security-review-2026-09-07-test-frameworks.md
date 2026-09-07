# Differential security review: test framework bootstrap

Date: 2026-09-07
Branch: `test/bootstrap-test-frameworks` against `main`
Reviewer: automated differential review

## Scope and strategy

Small change, 14 files. Strategy: DEEP. Every changed file was read and the two
non-obvious risks were verified by inspecting build output rather than by reading
code alone.

| Area | Files | Risk |
|---|---|---|
| CI workflows | `build.yml`, `deploy-test-web.yml` | HIGH by category |
| Backend test config | `src/test/resources/application.yaml` | HIGH by category |
| Build dependencies | `backend/pom.xml`, `web/package.json`, `package-lock.json` | MEDIUM, supply chain |
| Test sources | 4 new test files, `setup.ts` | LOW |
| Component change | `QuantitySelector.tsx` | LOW |
| Documentation | `CLAUDE.md`, `docs/DEPLOYMENT.md` | LOW |

No authentication, authorization, cryptography or value transfer logic was modified.

## F1. Test JWT issuer override cannot reach production. VERIFIED SAFE

`backend/src/test/resources/application.yaml` sets `issuer-uri` and `jwk-set-uri` to
`http://localhost:0/...` so tests never contact the live Keycloak.

If that file were packaged into the shipped jar it would override production token
validation, which would be critical. It is not. Verified against the built artifact:

```
unzip -l target/drinksaver-backend-2.1.2.jar | grep application
  BOOT-INF/classes/application.properties
  BOOT-INF/classes/application.yaml

unzip -p ... BOOT-INF/classes/application.yaml | grep issuer-uri
  issuer-uri: "${JWT_ISSUER_URI:https://auth.drinksaver.kak.im/auth/realms/drinksaver}"

occurrences of the test value "localhost:0" in the jar: 0
```

Maven keeps `src/test/resources` on the test classpath only. No action needed.

## F2. Third-party install scripts now run in a job holding a write-scoped token. MITIGATED

The change adds `npm ci` to the `web` job of `build.yml` and to `deploy-test-web.yml`.
That introduces 88 new transitive packages, whose install scripts execute on the runner.
Both jobs declare `permissions: packages: write`.

`actions/checkout` persists the `GITHUB_TOKEN` into `.git/config` by default. A single
compromised dev dependency could therefore read that token and publish to GHCR under this
repository's identity.

Mitigation applied: `persist-credentials: false` on the checkout step of both affected
jobs. Verified that neither job uses git after checkout, so nothing else breaks. The GHCR
login step passes `secrets.GITHUB_TOKEN` explicitly and is unaffected.

The backend job's checkout was deliberately left alone. It runs no third-party install
scripts beyond Maven's own dependency resolution and is outside this change.

Residual risk accepted: a compromised dev dependency can still read the workspace and
consume runner CPU. Eliminating that would need `--ignore-scripts`, which breaks native
postinstall steps in this dependency set.

## F3. KUBE_CONFIG is not reachable from the new step. VERIFIED SAFE

`deploy-test-web.yml` handles the cluster credential at the `Configure kubectl` step,
which binds `secrets.KUBE_CONFIG` to that step's own environment and writes
`$HOME/.kube/config`.

The new `Run web tests` step is inserted well before it. GitHub Actions injects a secret
only into the step that references it, so `npm ci` runs both before the kubeconfig exists
on disk and without the secret in its environment. No action needed.

## F4. No expression interpolation was introduced. VERIFIED SAFE

The repository deliberately passes workflow context through `env` rather than
interpolating `${{ }}` into shell bodies. The added lines contain no GitHub expressions at
all, so that property is preserved.

## F5. Action versions use mutable major tags. PRE-EXISTING, NOT A REGRESSION

`actions/setup-node@v5` follows the convention already used throughout this repository
(`actions/checkout@v5`, `docker/login-action@v3`, `docker/build-push-action@v6`). Pinning
to full commit SHAs would be an improvement, but doing it for one new action and not the
other eight would be inconsistent. Worth a separate pass if wanted.

## Test coverage of the change

The change is itself test infrastructure. Coverage was confirmed by mutation rather than
assumed: removing the placeholder guard in `web/src/config.ts` failed exactly the three
tests that cover it, and restoring it returned the suite to green. The backend suite runs
14 tests with the Testcontainers integration test genuinely executing against Postgres 16,
not skipping.

## Coverage limits

Workflow changes were validated by YAML parsing and by reading, not by executing a CI run.
The `persist-credentials: false` change is proven safe by inspection of both jobs, but its
first real exercise will be the initial push of this branch.

## Conclusion

No exploitable vulnerability introduced. One real hardening opportunity was found and
fixed within the change that created it.
