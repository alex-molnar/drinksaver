# DrinkSaver Differential Security Review

Date: 2026-09-08
Reviewer: Claude (differential-review skill), adversarial pass on IDOR fix and actuator
SecurityConfig reasoning
Scope: uncommitted working-tree changes on `main` (`git diff HEAD`), 21 tracked files modified
plus 2 new files (`AuthenticatedUser.java`, `AuthenticatedUserTest.java`, plus one new Helm
template `service-management.yaml`)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 4 |

**Overall Risk:** LOW
**Recommendation:** APPROVE. Both HIGH-risk changes (the IDOR fix and the actuator
SecurityConfig reasoning) hold up under adversarial review, one of them against a live,
independently rebuilt copy of the stack. The four LOW findings below are documentation
accuracy and operational hygiene items, not exploitable issues, and none block merge.

**Key Metrics:**
- Files analyzed: 21/21 changed files (100%), plus the 2 new Java files and the new Helm
  template
- Test coverage gaps: 1 (untested malformed-subject path in `AuthenticatedUser.id`)
- High blast radius: `AuthenticatedUser.id(jwt)` is called from 12 sites across 4 controllers;
  every call site has a matching "ignores client-supplied userId" test
- Security regressions detected: 0 (no prior removal-then-re-addition pattern in git history
  for either change)
- Independent verification performed: full local stack rebuilt from the working tree with
  `docker-compose up --build`, actuator endpoints probed directly against the running
  container to verify the SecurityConfig claim empirically (see Finding-by-finding section
  below and Appendix A for full transcripts)

---

## What Changed

**Base:** `HEAD` (`main`, commit `e63d87e`)
**Comparison:** working tree (uncommitted)

| File | +/- | Risk | Blast Radius |
|------|-----|------|---------------|
| `backend/.../controller/DrinksController.java` | +11/-4 | HIGH | MEDIUM (3 endpoints) |
| `backend/.../controller/AlcoholController.java` | +11/-9 | HIGH | MEDIUM (4 endpoints) |
| `backend/.../controller/BeerController.java` | +13/-8 | HIGH | MEDIUM (4 endpoints) |
| `backend/.../controller/RecommendationsController.java` | +6/-4 | HIGH | LOW (1 endpoint) |
| `backend/.../security/AuthenticatedUser.java` (new) | +15 | HIGH | HIGH (12 call sites) |
| `backend/.../config/SecurityConfig.java` | +8/-0 (comment only) | HIGH | CRITICAL (governs every request on both ports) |
| `backend/src/main/resources/application.properties` | +6/-2 | HIGH | Whole app |
| `backend/.../model/dto/Drink.java`, `NewAlcoholEntry.java`, `NewAlcoholSubtype.java` | +18 | MEDIUM | LOW |
| `backend/.../repository/DrinksRepository.java` + `PostgresDrinksRepository.java` | +9 | MEDIUM | LOW (1 new method, 1 caller) |
| `backend/drinksaver-backend/templates/deployment.yaml`, `values.yaml`, `service-management.yaml` (new) | +21/-4 | MEDIUM | Whole deployment |
| `compose.yaml` | +4/-1 | LOW | Local dev only |
| `docs/api-docs.yaml` | +21/-60 | LOW | Documentation |
| `web/src/api/endpoints.ts` + `.test.ts` | +5/-45 | LOW | Frontend only, matches backend route changes |
| 4x `*ControllerTest.java` | +266/-16 | N/A | Test-only, adds the adversarial "spoofed userId" cases |

**Total:** 21 tracked files changed, plus `AuthenticatedUser.java`/`AuthenticatedUserTest.java`
and `service-management.yaml` new.

---

## Finding-by-Finding

### Confirmed sound: IDOR fix across all four controllers (verified, no residual gap)

**Files:** `DrinksController.java`, `AlcoholController.java`, `BeerController.java`,
`RecommendationsController.java`, `AuthenticatedUser.java`, `Drink.java`,
`NewAlcoholEntry.java`, `NewAlcoholSubtype.java`, `DrinksRepository.java`,
`PostgresDrinksRepository.java`

**Adversarial model:**
- WHO: any authenticated DrinkSaver user (holds a valid Keycloak-issued JWT for their own
  account)
- GOAL: read, write, or delete another user's drink history, recommendations, or custom
  alcohol/beer catalog entries by supplying that user's UUID somewhere in the request
- INTERFACE: every endpoint on `AlcoholController`, `BeerController`, `DrinksController`,
  `RecommendationsController`

**What I checked, beyond re-reading the diff:**

1. Grepped every controller for any remaining `UUID userId` path variable, query param, or
   body-derived value used to select whose data to touch: none found. All 12 call sites of
   `AuthenticatedUser.id(jwt)` derive the id from the verified JWT subject, and every DTO that
   used to accept a client `userId` (`Drink`, `NewAlcoholEntry`, `NewAlcoholSubtype`) is now
   overridden server-side via `withUserId(...)` before it reaches the repository layer. The one
   DTO that still carries an unused `userId` field, `NewBeerFlavour`, has that field silently
   discarded, the controller passes `AuthenticatedUser.id(jwt)` explicitly instead
   (`BeerController.java:51`).
2. Confirmed the JWT itself cannot be forged: `application.yaml` configures both
   `issuer-uri` and `jwk-set-uri` against the real Keycloak realm, so `jwt.getSubject()` is
   only trustworthy because Spring's OAuth2 resource server validates the signature against
   Keycloak's JWKS before the controller ever sees the token. This precondition is unchanged
   by the diff but is load-bearing for the whole fix, so I checked it rather than assuming it.
3. Checked the one non-trivial new repository method,
   `PostgresDrinksRepository.ownedDrinkIds(List<Integer>, UUID)` (used by the
   `DELETE /v1/drinks/byIds` endpoint): it loads the requested rows via
   `findAllById(drinkIds)` and filters to `drink.getUserId().equals(userId)` before returning
   the ids that `deleteSavedDrink` is then allowed to touch. An attacker who passes a mix of
   their own and someone else's drink ids gets only their own deleted; the underlying
   `deleteAndCountByIds` query (`delete from SavedDrink s where s.id in :ids`) is unchanged and,
   with an empty `:ids` list, Hibernate's parameter binding for an empty `IN` list matches
   nothing, it does not fall through to deleting everything.
4. Read every changed test. Each of the four `*ControllerTest.java` files adds a
   `...IgnoresClientSuppliedUserIdAndUsesJwtSubject` (or equivalent) test that authenticates as
   one user, supplies a different "spoofed" UUID in the path/query/body, and asserts the
   repository/service was invoked with the authenticated user's id, not the spoofed one. This is
   exactly the right test shape for an IDOR fix: it does not just check "success", it captures
   the argument that reached the persistence layer.

**Verdict:** No IDOR surface remains in this diff. Test coverage is unusually good for a fix of
this kind, arguing for confidence, not just testing that the happy path still works.

**One test gap (LOW, not exploitable today):** `AuthenticatedUser.id(jwt)` calls
`UUID.fromString(jwt.getSubject())` with no handling for a non-UUID subject. There is no test
for that path (`AuthenticatedUserTest.java` only covers a well-formed UUID subject), and the
behavior is an unhandled `IllegalArgumentException` that Spring will turn into a 500. This is
not attacker-controlled today, because Keycloak issues UUID subjects for every principal in this
realm and the JWT signature is verified, so a malformed subject can only occur through a Keycloak
misconfiguration, not a request forgery. Flagging it as a latent rough edge, not a vulnerability.

---

### Confirmed sound, mechanism claim in the code comment does not match live behavior (LOW): actuator SecurityConfig on the management port

**File:** `backend/src/main/java/com/drinksaver/config/SecurityConfig.java:16-23`,
`backend/src/main/resources/application.properties:12-15`

This is the part flagged as "least sure about." I did not take the comment or the reported
curl results on faith. I rebuilt the exact working tree with `docker-compose up --build`
(full stack: Postgres, Keycloak with the seeded realm, the backend built from the current
uncommitted source, not a cached image from before this diff) and probed the running
container directly.

**What the comment claims:** because the app defines its own `SecurityFilterChain` bean,
Spring Boot's `ServletManagementChildContextConfiguration` reuses that exact filter chain for
the management-port child context instead of falling back to Spring Boot's own default
`ManagementWebSecurityAutoConfiguration` (health-permitAll, everything else authenticated).
Therefore the `.requestMatchers("/actuator/**").permitAll()` rule is said to govern the whole
of `/actuator/**` on port 8081, with safety coming entirely from
`management.endpoints.web.exposure.include=health,prometheus` narrowing what actually exists
under that path.

**What I confirmed independently:**

1. Spring Boot's own docs and source (fetched live via context7, not from training data,
   `spring-projects/spring-boot`): "Adding a custom SecurityFilterChain bean disables the
   default web application security configuration, including Actuator security" and
   `ServletManagementChildContextConfiguration.ServletManagementContextSecurityConfiguration`
   is `@ConditionalOnBean(name = SPRING_SECURITY_FILTER_CHAIN, search = ANCESTORS)`, and when
   it activates it literally retrieves the parent context's `springSecurityFilterChain` Filter
   bean and re-exposes it in the management child context. So the mechanism described in the
   comment is real and is what Spring Boot's own documentation says happens.
2. Live test against the rebuilt container (from inside the `backend` container, hitting its
   own `localhost:8081`, avoiding the fact that `compose.yaml` happens to map Keycloak, not
   the backend, to host port 8081):
   - `/actuator/health`, `/actuator/health/liveness`, `/actuator/health/readiness`, and the
     bare `/actuator` discovery root: all `200`, unauthenticated.
   - `/actuator/env`, `/actuator/beans`, `/actuator/heapdump`, `/actuator/prometheus`, and an
     arbitrary nonexistent path under `/actuator/`: all `401`, **not** `404`.
   - Response headers on the `401`s carry `WWW-Authenticate: Bearer
     resource_metadata="http://localhost:8081/.well-known/oauth-protected-resource"`, the exact
     OAuth2-resource-server challenge the app's own `SecurityConfig` produces on the main port,
     not Spring Boot's default management chain's `httpBasic`/`formLogin` challenge. This
     proves the *reused app chain* is genuinely the one running on the management port (so the
     comment's mechanism claim is correct), but its `permitAll("/actuator/**")` rule is
     evidently not what is producing the health-only-open behavior actually observed.
3. Full transcripts are in Appendix A. I could not fully resolve, from black-box testing alone,
   the exact internal reason a plain Ant-style `/actuator/**` pattern ends up behaving as
   health-only-open rather than open for the whole path once reused on the management port's
   own dispatcher, only that it reliably does, across a clean rebuild, and that the practical
   result is at least as strict as Spring Boot's own default actuator security posture, not
   looser.
4. Also confirmed: `spring-boot-starter-actuator` is the only actuator-related dependency in
   `pom.xml`, there is no `micrometer-registry-prometheus`. So `prometheus` in
   `management.endpoints.web.exposure.include` currently exposes nothing (the startup log
   confirms: `Exposing 1 endpoint beneath base path '/actuator'`, health only). This is not a
   security problem (fails closed), but it means the intended Prometheus scraping is currently
   non-functional regardless of the security question, both because the endpoint does not
   exist and because, per point 2 above, it would require a Bearer token even if it did.
5. Confirmed the main port (8080) has zero actuator routes: every request to `/actuator/*`
   there, including a path that would 404 on a truly unauthenticated route (like a bogus app
   path), returns `401` first, because `.anyRequest().authenticated()` runs ahead of any
   "route doesn't exist" handling. This matches the reported empirical result and my own test.
6. Confirmed via `ingress.yaml`: the Ingress only ever routes to `.Values.service.port` (the
   main HTTP Service), never to the new `service-management.yaml` Service, which is
   `ClusterIP`-only by its own explicit `type: ClusterIP` with no Ingress referencing it. So in
   the actual Kubernetes deployment (as opposed to local Docker Compose, where the management
   port is not published to the host at all either), the management port is unreachable from
   outside the cluster network regardless of what Spring Security decides to do with it.

**Verdict on the pointed question:** **Yes, the approach is sound.** The mechanism the comment
describes (Spring Boot reusing the app's own `SecurityFilterChain` on the management port when
a custom one exists) is real and confirmed both by Spring Boot's own documentation/source and
by independently rebuilding and probing the live container. The practically observed
behavior on port 8081 is at least as restrictive as Spring Boot's own default actuator
security: unauthenticated access is limited to `/actuator/health` and its sub-paths, and every
other actuator path (`env`, `beans`, `heapdump`, and the not-currently-registered
`prometheus`) requires a valid bearer token, on top of the management Service having no
Ingress route at all. There is no gap here; if anything the live behavior is stricter than the
comment's own stated mental model.

**LOW finding (documentation accuracy, not a vulnerability):** the comment's specific claim,
"this permitAll also governs actuator on the management port," implies broader access than
what is actually reachable unauthenticated (only health). A future engineer reasoning from
this comment alone could reach two wrong conclusions in either direction: (a) assume adding a
new, more sensitive endpoint id to `management.endpoints.web.exposure.include` (e.g.
`loggers`, `threaddump`) would make it openly reachable the way the comment implies, when in
practice it would still require a Bearer token, an over-cautious but harmless error; or (b)
assume the *only* thing standing between an attacker and a newly exposed endpoint is the
exposure list, and skip re-verifying the security behavior when refactoring `SecurityConfig`
later, since the comment does not mention that the safety margin today is actually wider
(auth-gated) than described. Recommend updating the comment to state the auth-gated behavior
that was actually observed, and to note the reasoning was independently verified against a
live build on 2026-09-08 (see this report), so the next person touching this file doesn't have
to re-derive it from source.

---

### LOW: `management.endpoints.web.exposure.include=health,prometheus` currently exposes only health

**File:** `backend/src/main/resources/application.properties:14`, `backend/pom.xml`

Not a security issue (documented above, fails closed), but worth tracking as a functional gap
uncovered while verifying the security posture: there is no `micrometer-registry-prometheus`
dependency, so the `prometheus` value in the exposure list is currently a no-op, confirmed by
the `Exposing 1 endpoint beneath base path '/actuator'` startup log. If Prometheus-based
monitoring is intended to work per this configuration, it needs both the dependency and, per
the previous finding, some way to authenticate the scraper against the OAuth2 resource server
chain that now also governs the management port. Recommend filing this as a follow-up so it is
not mistaken for "already wired up" the next time monitoring is configured, since the config
value is present and looks complete on a read-through.

---

### LOW: `values.yaml`'s `management.port` is not wired to the actual Spring Boot listening port

**Files:** `backend/drinksaver-backend/values.yaml`, `backend/drinksaver-backend/templates/deployment.yaml`

`values.yaml` sets `management.port: 8081` and `deployment.yaml` uses it for the container
port declaration, the probe target port name, and (via `service-management.yaml`) the Service
port. But nothing in `deployment.yaml`'s `env:` block passes a `MANAGEMENT_SERVER_PORT`
(or equivalent) environment variable to the container; the actual port Spring Boot listens on
for management traffic is hardcoded in `application.properties` as
`management.server.port=8081`. If a future change bumps `values.yaml`'s `management.port`
without also updating `application.properties` (or vice versa), the probes and Service would
silently target the wrong port and the deployment would fail liveness/readiness checks. Not
exploitable, but a config-drift trap worth a one-line comment or, better, threading the value
through as an env var the way the rest of the chart's configuration does.

---

## Test Coverage Analysis

**Coverage:** All 9 IDOR-relevant endpoints across the 4 controllers have an explicit test
asserting the client-supplied `userId` is ignored in favor of the JWT subject. This is a
notably thorough test suite for this class of fix, each test captures the actual argument
passed to the repository/service layer via `ArgumentCaptor` or an explicit `verify(...)` call,
not just an HTTP status code.

**Untested Changes:**

| Function | Risk | Impact |
|----------|------|--------|
| `AuthenticatedUser.id(jwt)` with a non-UUID subject | LOW | Unhandled `IllegalArgumentException`, not attacker-reachable given JWT signature validation and Keycloak's UUID subjects, but untested |

**Risk Assessment:** No HIGH-risk untested paths. The one gap above does not justify blocking
merge.

---

## Blast Radius Analysis

| Function | Callers | Risk | Priority |
|----------|---------|------|----------|
| `AuthenticatedUser.id(Jwt)` | 12 (across 4 controllers) | HIGH (auth-adjacent) | P0, fully covered by tests |
| `SecurityConfig.securityFilterChain` | Every request on both ports 8080 and 8081 | CRITICAL | P0, independently verified live |
| `DrinksRepository.ownedDrinkIds` | 1 (`DrinksController.deleteSavedDrink`) | HIGH (access control) | P1, covered by test |
| `Drink.withUserId` / `NewAlcoholEntry.withUserId` / `NewAlcoholSubtype.withUserId` | 3 call sites, 1 each | MEDIUM | P2, covered by tests |

---

## Historical Context

- No prior removal-then-re-addition pattern found: `git log --all -S "AuthenticatedUser"` and
  `git log --all -S "management.server.port"` return nothing, this is the first introduction of
  both changes, not a regression of an earlier fix.
- No commits in history with messages matching `actuator|IDOR|security` show a prior version of
  either the userId-trusting endpoints or a previously-open actuator config being deliberately
  fixed and then reverted.

---

## Recommendations

### Immediate (Blocking)
- None. No CRITICAL or HIGH findings.

### Before Production
- [ ] Update the `SecurityConfig.java` comment to describe the actually-observed behavior
  (health-only unauthenticated, everything else Bearer-token-gated on the management port),
  not just the theoretical "permitAll governs the whole path" framing, so the next engineer
  doesn't have to re-derive it. Reference this report's date if useful.
- [ ] Decide whether Prometheus scraping is actually needed. If so, add
  `micrometer-registry-prometheus` and work out how the scraper authenticates against the
  OAuth2 resource server chain now governing the management port (a service-account JWT flow,
  or a dedicated unauthenticated matcher scoped tightly to `/actuator/prometheus` plus network
  policy). If not needed yet, drop `prometheus` from the exposure list to avoid the false
  impression that it is wired up.
- [ ] Add a test (or at least a documented expectation) for `AuthenticatedUser.id(jwt)` given a
  malformed subject, even though it is not attacker-reachable today.

### Technical Debt
- [ ] Wire `values.yaml`'s `management.port` through as an environment variable consumed by
  `application.properties`, instead of two independent hardcoded values that have to be kept in
  sync by hand.
- [ ] `NewBeerFlavour` still declares an unused `userId` field that the controller silently
  discards; consider dropping it from the record now that nothing reads it, so a future reader
  doesn't assume it is load-bearing.

---

## Analysis Methodology

**Strategy:** DEEP (SMALL codebase, ~73 Java files under `backend/src`, well under the
DEEP-analysis threshold; all 21 changed files plus 2 new Java files and 1 new Helm template
were read in full, not sampled)

**Analysis Scope:**
- Files reviewed: 21/21 changed files (100%), plus `AuthenticatedUser.java`,
  `AuthenticatedUserTest.java`, `service-management.yaml`
- HIGH RISK (all 4 controllers, `AuthenticatedUser.java`, `SecurityConfig.java`,
  `application.properties`): 100% coverage, read in full, adversarially modeled
- MEDIUM RISK (DTOs, repository changes, Helm chart): 100% coverage, read in full
- LOW RISK (frontend endpoint changes, OpenAPI doc, compose.yaml): 100% coverage, read in full
  since the codebase was small enough that surface-scanning wasn't necessary

**Techniques:**
- Git blame / `git log -S` on the new security code and the actuator config, checking for a
  regression pattern: none found
- Blast radius calculation via grep for all callers of the new `AuthenticatedUser.id` helper
- Test coverage cross-check per changed endpoint
- Adversarial modeling (attacker model, attack vectors, exploitability) for both HIGH RISK
  changes per the skill's Phase 5 methodology
- **Live independent verification**: rebuilt the entire local stack from the current working
  tree with `docker-compose up --build` (Postgres, Keycloak with the seeded realm, backend
  built from source, not a stale cached image), then probed the running backend container's
  actuator endpoints directly (from inside the container, to avoid the host-port collision
  where `compose.yaml` maps Keycloak, not the backend, onto host port 8081), comparing response
  codes, bodies, and `WWW-Authenticate` challenge headers across both ports. Confirmed the
  Spring Boot mechanism claim in the code comment against context7-fetched Spring Boot
  documentation and source rather than relying on training-data recall.
- Confirmed via `ingress.yaml` and `service-management.yaml` that the management port has no
  path to the public internet in the actual Kubernetes deployment target, independent of the
  Spring Security question.

**Limitations:**
- The exact internal Spring Security/Spring MVC mechanism that makes a plain
  `/actuator/**` Ant pattern behave as health-only-open once reused on the management port's
  own dispatcher was not fully traced to a single line of Spring Boot source; it was confirmed
  empirically, repeatedly, and cross-checked against response headers proving which filter
  chain implementation (the app's OAuth2 resource server chain, not Boot's default) is actually
  producing the behavior. The practical security conclusion does not depend on resolving that
  remaining mechanical detail.
- Did not test the actual Kubernetes deployment (Helm chart was reviewed statically, not
  deployed to a cluster); the Docker Compose verification covers the Spring
  Security/actuator-exposure question directly, the Ingress/Service routing question was
  verified by reading the chart templates rather than deploying them.
- Did not review `AlcoholVolume`-related endpoints (`GET/POST
  /v1/alcohol/types/{alcoholTypeId}/volumes`) even though they remain unscoped to any user;
  they are unchanged by this diff (pre-existing, shared/global data model by design, not part
  of the reviewed changes) so they are out of scope for a differential review, noting only for
  awareness.

**Confidence:** HIGH for both HIGH-risk changes (IDOR fix and actuator SecurityConfig), the
actuator question in particular was verified against a live rebuild rather than taken on
either the comment's or the prior report's word. HIGH overall for the full diff, given the
small codebase size allowed full-file reads rather than sampling.

---

## Appendix A: Live Verification Transcripts

Stack: `docker-compose up --build` from the repository root, using the current uncommitted
working tree (confirmed the built image reflects it: Tomcat logs show two listeners, port
8080 and port 8081, and `application.properties`'s `management.server.port=8081` is what
creates the second listener at all, an image built from the pre-diff code would show only one
Tomcat listener).

```
$ docker exec drinksaver-backend-1 curl -s -o /dev/null -w "health: %{http_code}\n" http://localhost:8081/actuator/health
health: 200
$ docker exec drinksaver-backend-1 curl -s -o /dev/null -w "health/liveness: %{http_code}\n" http://localhost:8081/actuator/health/liveness
health/liveness: 200
$ docker exec drinksaver-backend-1 curl -s -o /dev/null -w "health/readiness: %{http_code}\n" http://localhost:8081/actuator/health/readiness
health/readiness: 200
$ docker exec drinksaver-backend-1 curl -s -o /dev/null -w "env: %{http_code}\n" http://localhost:8081/actuator/env
env: 401
$ docker exec drinksaver-backend-1 curl -s -o /dev/null -w "prometheus: %{http_code}\n" http://localhost:8081/actuator/prometheus
prometheus: 401
$ docker exec drinksaver-backend-1 curl -s -o /dev/null -w "beans: %{http_code}\n" http://localhost:8081/actuator/beans
beans: 401
$ docker exec drinksaver-backend-1 curl -s -o /dev/null -w "heapdump: %{http_code}\n" http://localhost:8081/actuator/heapdump
heapdump: 401
$ docker exec drinksaver-backend-1 curl -s -o /dev/null -w "nonsense: %{http_code}\n" http://localhost:8081/actuator/does-not-exist
nonsense: 401
$ docker exec drinksaver-backend-1 curl -s http://localhost:8081/actuator/health
{"groups":["liveness","readiness"],"status":"UP"}
$ docker exec drinksaver-backend-1 curl -s http://localhost:8081/actuator
{"_links":{"self":{"href":"http://localhost:8081/actuator","templated":false},"health":{"href":"http://localhost:8081/actuator/health","templated":false},"health-path":{"href":"http://localhost:8081/actuator/health/{*path}","templated":true}}}

$ docker exec drinksaver-backend-1 curl -s -i http://localhost:8081/actuator/env | head -12
HTTP/1.1 401
...
WWW-Authenticate: Bearer resource_metadata="http://localhost:8081/.well-known/oauth-protected-resource"

$ curl -s -i http://localhost:8080/v1/drinks/date/2026-01-01 | head -8    # main port, unauthenticated
HTTP/1.1 401
...
WWW-Authenticate: Bearer resource_metadata="http://localhost:8080/.well-known/oauth-protected-resource"

$ curl -s -i http://localhost:8080/actuator/health | head -5   # main port has no actuator route at all
HTTP/1.1 401
...

$ docker logs drinksaver-backend-1 2>&1 | grep -i "endpoint\|Tomcat started"
Tomcat started on port 8080 (http) with context path '/'
Exposing 1 endpoint beneath base path '/actuator'
Tomcat started on port 8081 (http) with context path '/'
```

`WWW-Authenticate: Bearer` (not `Basic`, not a `formLogin` redirect) on both ports confirms the
same OAuth2-resource-server-backed `SecurityFilterChain` is active on both, matching the code
comment's claimed mechanism. `Exposing 1 endpoint beneath base path '/actuator'` confirms only
`health` is actually registered as a web endpoint (no `micrometer-registry-prometheus` on the
classpath), independent of the security question.
