# Remaining work

Everything still open from the review backlog, written to be picked up cold. Each task
says what to do, where, why it was left, and how you will know it worked.

`docs/fixes-2026-09-08.md` is the other half: what was closed on 2026-09-08 and how it was
verified. **Read the "Already done" section there before starting anything here**, because
several findings that look open in older material are not.

## How to use this document

Pick one task. They are independent unless a dependency is stated. Each has:

- **Effort** as a rough size, and **Blocked by** where something has to happen first
- **Why it was left**, so you can tell whether the reason still holds
- **Where**, exact paths
- **Do**, the actual steps
- **Done when**, the check that closes it

Follow the workflow in `CLAUDE.md`. Anything below marked medium or larger gets the full
pipeline, not the fast path.

## Index

| # | Task | Effort | Blocked by |
|---|---|---|---|
| 1 | Special-category data determination | small, but not yours | a DPO or lawyer |
| 2 | Privacy notice | medium | task 1 for wording |
| 3 | Profiling transparency | small | task 2 |
| 4 | Consent capture and record | large | task 1 |
| 5 | Export my data, delete my account | large | task 1 for retention wording |
| 6 | Retention period and purge job | medium | task 1 |
| 7 | Organizational records (RoPA, DPAs, DPIA) | outside this repo | task 1 |
| 8 | Prometheus scraping | medium | a decision on scraper auth |
| 9 | Pin actions to commit SHAs | medium | a decision |
| 10 | Pin base images to digests | small | a decision |
| 11 | Untrack `web/coverage` | trivial | none |
| 12 | Add a BRANCH coverage gate | small | none |
| 13 | Remove four leftover namespaces | small | production cutover |
| 14 | CI ServiceAccount can read every secret | accepted risk | revisit if collaborators grow |
| 15 | The last remaining lint warning | trivial | none |

---

## 1. Get a written determination on special-category data

**Effort:** small to action, but the decision is not an engineer's to make.
**Blocked by:** a DPO or lawyer. This is the one item that genuinely cannot be worked around.

### Why it matters more than its size

`saved_drinks` records date, alcohol type, subtype, volume, brand and a free-text `comments`
field per user, tied to a Keycloak subject UUID. Combined with the personalized recommendation
engine, that can reveal information about health, specifically patterns consistent with alcohol
dependency. If it is special-category data under GDPR Art. 9, the lawful basis has to be
explicit consent rather than the "contract" basis that covers plain account data, and a DPIA
under Art. 35 becomes mandatory.

**Tasks 2 through 7 all depend on the answer.** Assume "yes" until told otherwise, because
that is the assumption that does not have to be undone.

### Where

- `backend/src/main/java/com/drinksaver/model/db/SavedDrink.java`
- `backend/src/main/java/com/drinksaver/service/RecommendationCacheService.java`
- `backend/src/main/java/com/drinksaver/service/recommendations/DynamicPersonalRecommendationSource.java`
- `backend/src/main/java/com/drinksaver/service/recommendations/PersistentPersonalRecommendationSource.java`

### Do

1. Put the determination in writing and record it as an ADR in `docs/superpowers/specs/`.
2. While you are there, decide separately what to do about `comments`. It is unbounded free
   text with no minimization: a user can write anything into it, including data far more
   sensitive than the drink itself. Options are a character limit, a warning next to the field,
   or removing it. It has no length constraint today.

### Done when

An ADR exists stating the determination, its date, and who made it, and the `comments`
decision is recorded with it.

---

## 2. Write a privacy notice

**Effort:** medium.
**Blocked by:** task 1 for the lawful-basis wording, but not for starting. Art. 13 applies to
all personal data, not just special category, so this is needed either way.

### Why it was left

A repo-wide search of `web/src`, `docs` and the READMEs found no privacy notice, consent banner
or cookie notice anywhere. Writing one is not a code problem, and the parts that are legally
load-bearing depend on task 1.

### Do

Cover, at minimum:

- what is collected: account data via Keycloak (email, password hash), and drink-consumption
  history including the free-text `comments`
- why, and the lawful basis (task 1 decides this)
- retention (task 6 decides this; do not write "indefinitely" and leave it)
- the profiling disclosure from task 3
- data-subject rights and how to exercise them (task 5 builds the mechanism)
- recipients and any processors (task 7 enumerates these)

Add it as a route in the web app and link it from the login screen and from the layout footer,
not only from a settings page nobody opens.

### Done when

The notice is reachable from the app without logging in, and every claim in it is true of the
deployed system rather than aspirational.

---

## 3. Disclose the profiling

**Effort:** small.
**Blocked by:** task 2, since this is a section of that notice.

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

---

## 4. Capture and record consent

**Effort:** large.
**Blocked by:** task 1. If the answer is "not special category", this may not be needed at all,
which is exactly why it should not be built first.

### Why

If task 1 resolves to special category, consent must be explicit and recorded: who consented,
when, and to which version of the notice. Account creation does not imply it. There is no
mechanism for this anywhere in `web/src` or the backend today.

### Do

1. Version the privacy notice, so a consent record can point at a specific version.
2. Add a consent table (user id, notice version, timestamp, and what was consented to). It is
   personal data itself, so it falls under tasks 5 and 6 too.
3. Gate first use on consent, and give the user a way to withdraw it. Withdrawal has to
   actually do something, which usually means it triggers task 5's deletion path.

### Done when

A new account cannot record a drink without a consent row existing, and withdrawing consent is
reachable and has a defined effect.

---

## 5. Build export and account deletion

**Effort:** large. Probably the largest item here.
**Blocked by:** task 1 for the retention wording, not for the mechanism.

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

---

## 6. Define a retention period and build the purge

**Effort:** medium.
**Blocked by:** task 1, which informs how long is defensible.

### Why

`spring.jpa.hibernate.ddl-auto=update` with no TTL and no purge job means drink history is kept
indefinitely by default. Indefinite retention of consumption data is not a defensible default,
and the privacy notice in task 2 cannot be honest without a period.

### Do

1. Pick a period and record the reasoning in the ADR from task 1.
2. Build the purge. A scheduled job in the backend is the obvious shape; make it idempotent and
   log how many rows it removed, because a purge that silently does nothing is the failure mode
   you will not notice.
3. Reflect the period in the notice from task 2.

If a job is too much for now, document a manual process instead and say so in the notice. Do not
leave the period undefined.

### Done when

Either a job runs on a schedule and its effect is asserted in a test, or a written manual
process exists and the notice states the period.

---

## 7. Produce the organizational records

**Effort:** outside this repository.
**Blocked by:** task 1.

Listed here so the compliance work has a checklist:

- **Record of Processing Activities** (Art. 30): what is collected, purpose, legal basis,
  retention, recipients.
- **Data Processing Agreements** with infrastructure vendors: the cluster and hosting provider,
  cert-manager's ACME provider, DNS. Confirm EU/EEA location or an adequacy decision for any
  that are not.
- **The DPIA** (Art. 35), if task 1 resolves to special category. The current architecture is
  special-category data plus systematic profiling, which is the combination that makes a DPIA
  mandatory rather than advisable.

---

## 8. Make Prometheus scraping actually work

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

---

## 9. Pin GitHub Actions to commit SHAs

**Effort:** medium, mechanical.
**Blocked by:** a decision. The 2026-09-07 review explicitly left this to the repository owner
rather than applying it, and that call still stands until someone makes it.

### Why it matters here specifically

`actions/checkout@v5`, `actions/setup-java@v6`, `actions/setup-node@v7`,
`docker/login-action@v3`, `docker/setup-buildx-action@v4` and `docker/build-push-action@v7` all
resolve through a moving tag. Those tags run in jobs that hold `KUBE_CONFIG` and
`packages: write`. If any were repointed at malicious code, it would execute with cluster
credentials and registry write in scope.

### The tradeoff

SHA pins mean Dependabot raises a PR per action per update instead of the tag silently moving.
That is more PRs and more review, in exchange for a supply-chain compromise no longer being
automatic. Dependabot does understand SHA pins and will keep the trailing version comment
current.

### Where

All seven files in `.github/workflows/`. There are 21 `uses:` lines.

### Do

1. For each, resolve the tag to a full 40-character commit SHA and pin it with the version in a
   trailing comment: `uses: actions/checkout@<sha> # v5.0.1`.
2. Do all of them or none. Pinning some and not others is worse than either, because a reader
   cannot tell which state is intended.
3. Confirm `.github/dependabot.yml` covers `github-actions`.

### Done when

No `uses:` line in `.github/workflows/` references a tag, and a full pipeline run is green.

---

## 10. Pin base images to digests

**Effort:** small.
**Blocked by:** the same decision as task 9. Do them together or not at all.

### Why

`eclipse-temurin:21-jre`, `nginx:alpine` and `node:20-alpine` are moving tags, so builds are not
byte-reproducible: the same commit can produce different images. Rated Info in the earlier
review, and it is genuinely lower severity than task 9, but it is the same class of problem and
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

---

## 11. Untrack `web/coverage`

**Effort:** trivial. Two minutes.
**Blocked by:** nothing.

### Why it is still here

`web/.gitignore` has listed `coverage/` since `2c66bd2`, whose own comment reads "Committed by
mistake in 2c66bd2 and untracked again there". The untracking did not take: **42 generated files
are still in the index**, because `.gitignore` has no effect on paths git already tracks.

The consequence is that every branch which runs the coverage reporter picks up a diff in 42 HTML
files plus `lcov.info`. That is how it was noticed, on a branch where they were nearly swept into
an unrelated commit.

### Do

```sh
git rm -r --cached web/coverage
git commit -m "Untrack web/coverage, which .gitignore already excludes"
```

The files stay on disk. The existing ignore rule then does what it was written to do.

### Done when

`git ls-files web/coverage | wc -l` is 0, and a coverage run leaves `git status` clean.

---

## 12. Add a BRANCH coverage gate to the backend

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

---

## 13. Remove the four leftover namespaces

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

---

## 14. CI ServiceAccount can read every secret in both namespaces

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

## 15. The last lint warning

**Effort:** trivial.
**Blocked by:** nothing.

`npm run lint` reports 0 errors and 1 warning:

```
web/src/pages/DetailedPage.tsx
  166:6  warning  React Hook useCallback has an unnecessary dependency: 'isBeer'
```

Lint errors are a CI gate; warnings are not. This is the only one left, down from 6. Removing
`isBeer` from that dependency array should be safe because it is derived from
`alcoholTypeId`, which is already a dependency, but read the callback before believing that.

### Done when

`npx eslint .` is completely silent, at which point consider whether `--max-warnings=0` should
become the gate.
