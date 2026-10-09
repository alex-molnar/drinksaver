# Remaining work

Everything still open from the review backlog, written to be picked up cold. Each task says
what to do, where, why it was left, and how you will know it worked.

`docs/fixes-2026-09-08.md` is the other half: what was closed on 2026-09-08 and how it was
verified. **Read its "Already done" section before starting anything here**, because several
findings that look open in older material are not.

## How to use this document

Pick one task. They are independent unless a dependency is stated. Each has:

- **Effort** as a rough size, and **Blocked by** where something has to happen first
- **Why it was left**, so you can tell whether the reason still holds
- **Where**, exact paths
- **Do**, the actual steps
- **Done when**, the check that closes it

Follow the workflow in `CLAUDE.md`. Anything marked medium or larger gets the full pipeline,
not the fast path.

**Reference tasks by their id, never by position.** The ids are stable: `SEC-1` stays `SEC-1`
when something is inserted above it.

`FIX-3`, `HK-1` and `HK-4` were closed by the 2026-09-11 UI redesign and have left this document.
FIX-3's boundary is `web/src/components/AppErrorBoundary.tsx`; HK-1 untracked `web/coverage`; and
HK-4's warning lived in `DetailedPage.tsx`, so it went when that file did. Their ids stay unused,
for the same reason as the one below.

There is no `FIX-6`. It was filed on 2026-09-09 and closed on 2026-09-10 without ever being open
work: what it described as a bug turned out to be a rough approximation of a rule the product
actually wants, and that rule is now specified and implemented. See "The drinking day starts at
06:00" in `docs/superpowers/specs/2026-09-09-ui-redesign-design.md`. The id is left unused rather
than reassigned, so older references cannot silently point at something else.

An earlier version numbered tasks 1 to 15 in reading order, with 27 references keyed to those
numbers inside this file and 5 more in `docs/fixes-2026-09-08.md`, `docs/DEPLOYMENT.md`,
`CLAUDE.md` and `.github/dependabot.yml`. When four tasks arrived, putting them where they
belonged would have shifted numbers under all 32, so they were appended to the end instead,
below "the last lint warning" and regardless of severity. One of them was the only open
authorization gap in the document. Positional numbering is what produced that, so it is gone.

Add a task by appending to its section with the next free id in that prefix.

## Index

Ids are assigned in priority order within each group, so the lower number is the one to do
first. Across groups, the lowest-numbered open security task is the one to pick up first.

| Id | Task | Effort | Blocked by |
|---|---|---|---|
| **SEC-3** | Pin base images to digests | small | none; independent follow-up to SEC-2 |
| **SEC-4** | CI ServiceAccount can read every secret | accepted risk | revisit if collaborators grow |
| **PRIV-1** | Special-category data determination | small, but not yours | a DPO or lawyer |
| **PRIV-2** | Privacy notice | medium | PRIV-1 for wording |
| **PRIV-3** | Profiling transparency | small | PRIV-2 |
| **PRIV-4** | Consent capture and record | large | PRIV-1 |
| **PRIV-5** | Export my data, delete my account | large | PRIV-1 for retention wording |
| **PRIV-6** | Retention period and purge job | medium | PRIV-1 |
| **PRIV-7** | Organizational records (RoPA, DPAs, DPIA) | outside this repo | PRIV-1 |
| **OPS-1** | Make Prometheus scraping actually work | medium | a decision on scraper auth |
| **OPS-2** | Remove the four leftover namespaces | small | production cutover |
| **OPS-3** | Theme the Keycloak login page | medium | it follows the UI redesign |
| **HK-2** | Add a BRANCH coverage gate | small | none |
| **HK-3** | Drop `NewAlcoholSubtype.alcoholTypeId` | trivial | none |

---

# Security

These are the remaining items that change what someone else can do to the system.

## Completed: SEC-1, SEC-2, and FIX-1

- **SEC-1:** Alcohol volumes follow their alcohol type's owner. The POST endpoint derives the
  owner from the JWT, returns 404 for missing and foreign types, and leaves authenticated reads
  available for the shared catalogue. The decision is recorded in
  `docs/superpowers/specs/2026-10-09-sec-1-alcohol-volume-ownership.md`.
- **FIX-1:** Volume names are limited to 255 characters and volumes to 0.01 through 1.99; the
  OpenAPI schema documents those bounds.
- **SEC-2:** All 43 action references across `.github/workflows/` are pinned to verified full
  commit SHAs with release version comments. Dependabot continues to track GitHub Actions.

## SEC-3. Pin base images to digests

**Effort:** small.
**Blocked by:** none. SEC-2 established the pinning policy; base image pins remain a separate
follow-up.

### Why

`eclipse-temurin:21-jre`, `nginx:alpine` and `node:20-alpine` are moving tags, so builds are not
byte-reproducible: the same commit can produce different images. Rated Info in the earlier
review, and it is genuinely lower severity than SEC-2, but it is the same class of problem and
much less work.

Note `node:20-alpine` while `package.json` and the workflows are on Node 24. Worth checking
whether that is deliberate before pinning it in place.

### Where

`backend/Dockerfile`, `web/Dockerfile`, `deploy/local/backend.Dockerfile`.

### Do

Pin each `FROM` to `image@sha256:...` with the tag in a trailing comment, and let Dependabot
raise updates.

### Done when

No `FROM` references a bare tag, and both images build.

## SEC-4. CI ServiceAccount can read every secret in both namespaces

**Effort:** not a task. An accepted risk, recorded so it is not rediscovered as news.

The Role grants `list` on `secrets` in `drinksaver` and `drinksaver-test`. That is required:
Helm's default storage driver keeps release state as Secrets, and Kubernetes RBAC cannot
restrict `list` by `resourceNames`. So letting Helm find its releases means it can read every
Secret in those namespaces, including `secret-postgres-basic-auth` and the cert-manager TLS
private keys.

**Repository write access plus this token equals the production database password.**

`HELM_DRIVER=configmap` would remove the need for any secret permission, and was rejected
because migrating existing secret-stored releases is hazardous: Helm would not find them, and
`upgrade --install` would fall through to `install` and collide with live resources.

Judged acceptable for a single-maintainer repository. **Revisit when more people gain write
access.** `docs/DEPLOYMENT.md` has the full reasoning under "Accepted risk".

Related and also accepted: the test deploy fires on a push to any branch, so anyone with
repository write can both deploy arbitrary code to `drinksaver-test` and alter the workflow to
exfiltrate `KUBE_CONFIG`. Forks cannot trigger `push` on the upstream repository and there is no
`pull_request_target` anywhere, so this is not reachable externally. It was explicitly requested.

---

# Privacy

A chain, not a list. PRIV-1 gates the rest: it decides the lawful basis, and therefore what
the other six have to say. Read it first even if you intend to start elsewhere.

## PRIV-1. Get a written determination on special-category data

**Effort:** small to action, but the decision is not an engineer's to make.
**Blocked by:** a DPO or lawyer. This is the one item that genuinely cannot be worked around.

### Why it matters more than its size

`saved_drinks` records date, alcohol type, subtype, volume, brand and a free-text `comments`
field per user, tied to a Keycloak subject UUID. Combined with the personalized recommendation
engine, that can reveal information about health, specifically patterns consistent with alcohol
dependency. If it is special-category data under GDPR Art. 9, the lawful basis has to be
explicit consent rather than the "contract" basis that covers plain account data, and a DPIA
under Art. 35 becomes mandatory.

**Every other task in the Privacy section depends on the answer.** Assume "yes" until told otherwise, because
that is the assumption that does not have to be undone.

### Where

- `backend/src/main/java/com/drinksaver/model/db/SavedDrink.java`
- `backend/src/main/java/com/drinksaver/service/RecommendationCacheService.java`
- `backend/src/main/java/com/drinksaver/service/recommendations/DynamicPersonalRecommendationSource.java`
- `backend/src/main/java/com/drinksaver/service/recommendations/PersistentPersonalRecommendationSource.java`

### Do

1. Put the determination in writing and record it as an ADR in `docs/superpowers/specs/`.
2. While you are there, decide separately what to do about `comments`. It is free text with
   no minimization: a user can write anything into it, including data far more sensitive than
   the drink itself. It now carries `@Size(max = 255)`, but that was added to stop a 500 on
   a value longer than the column, not as a data-minimization measure, and 255 characters is
   plenty of room for something regrettable. Options are a shorter limit, a warning next to
   the field, or removing it.

### Done when

An ADR exists stating the determination, its date, and who made it, and the `comments`
decision is recorded with it.

## PRIV-2. Write a privacy notice

**Effort:** medium.
**Blocked by:** PRIV-1 for the lawful-basis wording, but not for starting. Art. 13 applies to
all personal data, not just special category, so this is needed either way.

### Why it was left

A repo-wide search of `web/src`, `docs` and the READMEs found no privacy notice, consent banner
or cookie notice anywhere. Writing one is not a code problem, and the parts that are legally
load-bearing depend on PRIV-1.

### Do

Cover, at minimum:

- what is collected: account data via Keycloak (email, password hash), and drink-consumption
  history including the free-text `comments`
- why, and the lawful basis (PRIV-1 decides this)
- retention (PRIV-6 decides this; do not write "indefinitely" and leave it)
- the profiling disclosure from PRIV-3
- data-subject rights and how to exercise them (PRIV-5 builds the mechanism)
- recipients and any processors (PRIV-7 enumerates these)

Add it as a route in the web app and link it from the login screen and from the layout footer,
not only from a settings page nobody opens.

### Done when

The notice is reachable from the app without logging in, and every claim in it is true of the
deployed system rather than aspirational.

## PRIV-3. Disclose the profiling

**Effort:** small.
**Blocked by:** PRIV-2, since this is a section of that notice.

### Why

`RecommendationsController` and the personal recommendation sources personalize suggestions
from a user's consumption history. That is profiling under Art. 4(4), and Art. 13(2)(f)
requires disclosing its existence and general logic.

It is **not** a "solely automated decision with legal or similarly significant effect", so
Art. 22's stricter regime does not apply. Say so in your own notes if someone raises it, but do
not use that as a reason to skip the disclosure.

### Do

Describe the general logic in plain language. The actual mechanism is: recent and repeated
drinks score higher via a decay factor applied per day since consumption, explicitly pinned
drinks always sort first, and curated defaults fill the rest. See
`docs/superpowers/specs/` and `RecommendationService`.

### Done when

The notice says that suggestions are personalized from history and roughly how, without
requiring the reader to understand the code.

## PRIV-4. Capture and record consent

**Effort:** large.
**Blocked by:** PRIV-1. If the answer is "not special category", this may not be needed at all,
which is exactly why it should not be built first.

### Why

If PRIV-1 resolves to special category, consent must be explicit and recorded: who consented,
when, and to which version of the notice. Account creation does not imply it. There is no
mechanism for this anywhere in `web/src` or the backend today.

### Do

1. Version the privacy notice, so a consent record can point at a specific version.
2. Add a consent table (user id, notice version, timestamp, and what was consented to). It is
   personal data itself, so it falls under PRIV-5 and PRIV-6 too.
3. Gate first use on consent, and give the user a way to withdraw it. Withdrawal has to
   actually do something, which usually means it triggers PRIV-5's deletion path.

### Done when

A new account cannot record a drink without a consent row existing, and withdrawing consent is
reachable and has a defined effect.

## PRIV-5. Build export and account deletion

**Effort:** large. Probably the largest item here.
**Blocked by:** PRIV-1 for the retention wording, not for the mechanism.

### Why

There is no self-service way for a user to export their own data (Art. 15 and 20) or delete
their account and everything attached to it (Art. 17). `DELETE /v1/drinks/byIds` deletes
individual entries, not an account.

**The orphaning problem is the part that is easy to miss.** Deleting a Keycloak user does not
cascade to `saved_drinks`. Rows are keyed by the Keycloak subject UUID with no foreign key, so
today a deleted account leaves its consumption history behind under a UUID that no longer
resolves to anyone. That is worse than either outcome: the data is still there and nobody can
reach it to act on it.

### Where

- `backend/src/main/java/com/drinksaver/controller/DrinksController.java` for the pattern
- `backend/src/main/java/com/drinksaver/repository/postgres/PostgresDrinksRepository.java`
- Every table carrying a `user_id`: `saved_drinks`, `recommendations`, `alcohol_types`,
  `alcohol_subtypes`, `brands`, `beer_flavours`. Check for new ones before you start; a
  `grep -rn "userId" backend/src/main/java/com/drinksaver/model/db/` is the quick way.

### Do

1. **Export.** An endpoint returning everything held for the authenticated user, in a portable
   format (JSON is fine for Art. 20). Derive the user from the JWT, never from a parameter, the
   way every other endpoint now does.
2. **Delete.** A flow that removes both the Keycloak identity and every row for that subject.
   Decide and document the order: deleting Keycloak first leaves orphans if the second step
   fails, deleting rows first leaves an account with no data if it fails. Either is recoverable
   only if you log what happened.
3. Note that user-created catalog entries (a custom alcohol type, a brand) may be referenced by
   other users' drinks. Decide whether those are deleted, anonymized, or reassigned to the admin
   user, and write down why.
4. Web pages for both, with a confirmation step on deletion that is hard to trigger accidentally.

### Done when

A test account can export its data and delete itself, and afterwards a direct database query
finds no rows anywhere carrying that subject UUID. Assert that in a Testcontainers test, not by
hand.

## PRIV-6. Define a retention period and build the purge

**Effort:** medium.
**Blocked by:** PRIV-1, which informs how long is defensible.

### Why

`spring.jpa.hibernate.ddl-auto=update` with no TTL and no purge job means drink history is kept
indefinitely by default. Indefinite retention of consumption data is not a defensible default,
and the privacy notice in PRIV-2 cannot be honest without a period.

### Do

1. Pick a period and record the reasoning in the ADR from PRIV-1.
2. Build the purge. A scheduled job in the backend is the obvious shape; make it idempotent and
   log how many rows it removed, because a purge that silently does nothing is the failure mode
   you will not notice.
3. Reflect the period in the notice from PRIV-2.

If a job is too much for now, document a manual process instead and say so in the notice. Do not
leave the period undefined.

### Done when

Either a job runs on a schedule and its effect is asserted in a test, or a written manual
process exists and the notice states the period.

## PRIV-7. Produce the organizational records

**Effort:** outside this repository.
**Blocked by:** PRIV-1.

Listed here so the compliance work has a checklist:

- **Record of Processing Activities** (Art. 30): what is collected, purpose, legal basis,
  retention, recipients.
- **Data Processing Agreements** with infrastructure vendors: the cluster and hosting provider,
  cert-manager's ACME provider, DNS. Confirm EU/EEA location or an adequacy decision for any
  that are not.
- **The DPIA** (Art. 35), if PRIV-1 resolves to special category. The current architecture is
  special-category data plus systematic profiling, which is the combination that makes a DPIA
  mandatory rather than advisable.

---

# Correctness

The defined FIX items are implemented:

- **FIX-1:** Validate volume bounds and sweep DTO string limits against database columns.
- **FIX-2:** Optimistically lock `AlcoholType.volumeIds`; stale writers receive 409.
- **FIX-4:** Invalidate recommendation results after deletion and reconcile the per-user save counter.
- **FIX-5:** Idempotency keys protect drink saves for one hour; retries return the original response.
- **FIX-7:** Allow browser pinch zoom while retaining the input font-size safeguard for iOS.

FIX-3 remains unused. There is no FIX-6; its explanation and historical reference are above.

---

# Operations

Things that are wired up incompletely, or waiting on the cluster.

## OPS-1. Make Prometheus scraping actually work

**Effort:** medium.
**Blocked by:** a decision about how the scraper authenticates. That is the whole task; the
dependency is trivial.

### Why it was left

`management.endpoints.web.exposure.include=health,prometheus` looks complete and is not.
There is no `micrometer-registry-prometheus` on the classpath, so `prometheus` in that list is
a no-op: the startup log says `Exposing 1 endpoint beneath base path '/actuator'`, health only.

Worse, adding the dependency alone does not finish it. The app defines its own
`SecurityFilterChain`, which Spring Boot reuses for the management port, so `/actuator/prometheus`
would require a bearer token. A Prometheus scraper does not have one. So the config reads as
wired up, and there are two independent reasons it is not.

**The decision is a security one, which is why it was not made unilaterally.** The management
port has no Ingress and its Service is ClusterIP-only, so it is unreachable from outside the
cluster network either way.

### Where

- `backend/pom.xml`
- `backend/src/main/resources/application.properties`, the exposure list
- `backend/src/main/java/com/drinksaver/config/SecurityConfig.java`, and read its comment first
- `backend/drinksaver-backend/templates/service-management.yaml`

### Do

Pick one:

- **A.** Add `micrometer-registry-prometheus`, and permit `/actuator/prometheus` unauthenticated
  **scoped to that exact path**, relying on the ClusterIP-only Service plus a NetworkPolicy for
  containment. Simplest, and the containment is real, but it does mean an unauthenticated metrics
  endpoint inside the cluster.
- **B.** Add the dependency and give the scraper a service-account JWT. Correct, and more moving
  parts: a Keycloak client, credentials in the Prometheus config, and rotation.
- **C.** Not needed yet. Then **drop `prometheus` from the exposure list**, so nobody else has to
  rediscover that it was never wired up.

C is a legitimate answer and takes five minutes. Do not leave the list as it is.

### Done when

Either a scrape against `/actuator/prometheus` returns metrics from inside the cluster and the
security decision is recorded in `SecurityConfig`'s comment, or `prometheus` is gone from the
exposure list.

## OPS-2. Remove the four leftover namespaces

**Effort:** small.
**Blocked by:** production cutover. Not startable before that.

### Why

Left from before the consolidation into one namespace per environment:
`drinksaver-backend`, `drinksaver-frontend`, `test-drinksaver-backend`,
`test-drinksaver-frontend`. The two test ones no longer hold releases.

### Do

Once production runs from the `drinksaver` namespace, confirm each is empty
(`helm list -n <ns>` and `kubectl get all -n <ns>`) and delete them. **Ask before running any
command that changes cluster state**, per `CLAUDE.md`.

### Done when

`kubectl get ns | grep drinksaver` shows only `drinksaver` and `drinksaver-test`.

## OPS-3. Theme the Keycloak login page

**Effort:** medium.
**Blocked by:** nothing technically, but it only makes sense once the UI redesign has landed and
its tokens are stable.

### Why it was left

The 2026-09-09 UI redesign restyles every screen the app owns. It does not own the first one.
`ProtectedRoute` sends an unauthenticated user to Keycloak, which serves its login page from its
own theme, so the first thing anyone sees is stock Keycloak and the redesign starts one screen
late.

Left out deliberately rather than missed. A Keycloak theme is a different artifact in a different
technology: FreeMarker templates and a resources directory, deployed into the Keycloak instance
rather than into this app. It touches a shared cluster service, and it can merge on its own
schedule.

**A note on where this is filed.** None of the five groups is a clean home for unbuilt design
work. It sits under Operations because delivering it is cluster work, not because it is an
operational gap. Move it if a better group appears.

### Where

- A new theme directory, plus the delivery question: a mounted volume, a custom Keycloak image,
  or a provider JAR. The cluster's Keycloak is shared, so decide whether the theme is scoped to
  the `drinksaver` realm rather than applied globally.
- `deploy/local/keycloak-realm.json`, so the compose stack shows the same login page as the
  cluster.
- The redesign's design tokens, which are the source of truth for ground, ink, plate colours and
  type. Do not re-pick them here.

### Do

1. Decide how a theme reaches the cluster's Keycloak, and scope it to the realm.
2. Build the login theme against the redesign's tokens. `login.ftl`, `error.ftl` and
   `login-reset-password.ftl` cover almost everything an ordinary user hits.
3. Self-host the fonts in the theme too. Do not reach for the Google Fonts CDN, for the same
   reason the app does not: it is a third-party data flow into a product whose privacy notice
   (PRIV-2) is still unwritten.
4. Set the theme in the realm config so the local compose stack matches the cluster.

### Done when

`docker-compose up` shows a login page that belongs to the same app as the screen behind it, and
the same is true in `drinksaver-test`.

---

# Housekeeping

Small, independent, and safe to pick up in any order.


## HK-2. Add a BRANCH coverage gate to the backend

**Effort:** small.
**Blocked by:** nothing.

### Why

The JaCoCo check in `backend/pom.xml` limits only `INSTRUCTION`, now at 0.90. **Branch coverage
is 78.57%** and nothing gates it, so the conditionals, which is where the bugs in
`docs/fixes-2026-09-08.md` mostly lived, are the least protected part of the suite.

This was left out of the 2026-09-08 ratchet raise deliberately: adding a counter is a new failure
mode rather than a tightening of an existing one, so it deserves its own change and its own
argument.

### Where

`backend/pom.xml`, the `jacoco-maven-plugin` `check` execution.

### Do

1. Run `mvn verify` and read the current figure from `target/site/jacoco/jacoco.xml` rather than
   trusting the number above.
2. Add a `BRANCH` limit just below it, in the same `BUNDLE` rule.
3. Expect it to bite sooner than the instruction gate, because a single new `if` moves branch
   coverage much further than it moves instruction coverage. That is the point, but say so in the
   comment so the next person does not read a failure as a broken gate.

### Done when

`mvn verify` is green with both counters, and the comment records the date and the measured
value the way the instruction limit now does.

## HK-3. Drop `NewAlcoholSubtype.alcoholTypeId`

**Effort:** trivial.
**Blocked by:** nothing.

Same dead-field smell that `NewBeerFlavour.userId` was removed for on 2026-09-08. The
controller passes the `@PathVariable`, and `PostgresAlcoholRepository.saveSubtypeForAlcoholType`
uses that, so the body's copy is bound by Jackson and silently dropped.

Not a vulnerability, because the path variable wins. It is the same inconsistency the
`NewBeerFlavour` removal argued against, left behind by it.

Remove the component, drop it from the client payload in `web/src/api/endpoints.ts`
(`createSubtypeForAlcoholType`), update its assertion in `endpoints.test.ts`, and update
`docs/api-docs.yaml`.

### Done when

`grep -rn alcoholTypeId web/src/api/endpoints.ts` finds only path-variable uses, and both
suites are green.

