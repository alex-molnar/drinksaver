# GDPR and data protection follow-ups

Date: 2026-09-08
Scope: drinksaver application, user data handling (account data via Keycloak, drink-consumption
history in the `drinksaver` Postgres database)
Status: written for pickup by a future session or agent. Not legal advice, treat the
special-category-data question below as unresolved until a DPO or lawyer signs off.

## Already fixed, do not re-flag

- **IDOR across `DrinksController`, `AlcoholController`, `BeerController`, `RecommendationsController`**:
  all four previously trusted a client-supplied `userId` (path/query/body) instead of the
  authenticated JWT subject. Fixed by deriving `userId` from the JWT via
  `com.drinksaver.security.AuthenticatedUser` everywhere; the vulnerable client-controlled `userId`
  parameters were removed from the endpoints entirely rather than just validated. Covered by tests
  in each `*ControllerTest`.
- **Actuator fully exposed on the public port**: `management.server.port` now separates actuator
  onto its own port (8081), which has no Ingress and only a ClusterIP `Service`
  (`backend/drinksaver-backend/templates/service-management.yaml`), so it is unreachable from the
  public internet regardless of what it exposes. `management.endpoints.web.exposure.include` is
  trimmed from `*` to `health,prometheus`.

Everything below is unrelated to those two fixes and still needs attention.

## 1. Special-category data determination (blocking for the rest of this list)

`saved_drinks` (`backend/src/main/java/com/drinksaver/model/db/SavedDrink.java`) records date,
alcohol type/subtype/volume, brand, and a free-text `comments` field per user, tied to their
Keycloak subject UUID. Combined with the personalized recommendation engine
(`RecommendationCacheService`, `DynamicPersonalRecommendationSource`), this can reveal information
about health (patterns consistent with alcohol dependency), which would make it special-category
data under GDPR Art. 9, requiring explicit consent rather than the "contract" basis that covers
plain account data.

**Action**: get a written determination from a DPO or lawyer. Assume "yes" until told otherwise,
since it changes the lawful basis and whether a DPIA (Art. 35) is mandatory for items 2 to 5
below. The free-text `comments` field makes this worse (no minimization, a user can write
anything into it), consider whether it needs a character limit, a content warning, or removal.

## 2. No privacy notice anywhere in the app

Repo-wide search (`web/src`, `docs`, READMEs) found no privacy notice, consent banner, or cookie
notice. Needed regardless of the Art. 9 determination (Art. 13 applies to all personal data, not
just special category): what is collected, why, retention, legal basis, and the profiling
disclosure in item 3.

## 3. Profiling transparency

`RecommendationsController` / `PersistentPersonalRecommendationSource` personalize suggestions
from a user's consumption history. This is profiling under Art. 4(4). Art. 13(2)(f) requires
disclosing the existence and general logic of this in the privacy notice (item 2), even though it
is not a "solely automated decision with legal or similarly significant effect" that would trigger
Art. 22's stricter regime.

## 4. No consent capture or record mechanism

If item 1 resolves to "special category," consent must be explicit and recorded (who consented,
when, to what version of the notice), not implied by account creation. There is currently no
mechanism for this anywhere in `web/src` or the backend.

## 5. No data-subject-rights tooling

No self-service way for a user to export their own data (Art. 15/20) or delete their account and
all associated data (Art. 17). `DrinksController`'s `DELETE /v1/drinks/byIds` only deletes
individual drink entries, not a full account. Deleting a Keycloak user does not cascade to
`saved_drinks`, rows would be orphaned under a UUID that no longer resolves to a Keycloak account.

**Action**: build an "export my data" endpoint/page and a "delete my account" flow that removes
both the Keycloak identity and every row in `saved_drinks` (and any future personal-data tables)
for that user.

## 6. No retention period defined

`spring.jpa.hibernate.ddl-auto=update` with no TTL or purge job means drink history is kept
indefinitely by default. Pick a retention period (informed by item 1's determination) and build
the purge job, or at minimum document a manual process, and reflect the period in the privacy
notice (item 2).

## 7. SQL logging

`spring.jpa.show-sql=true` (`backend/src/main/resources/application.properties`) logs SQL
statements. It does not currently log bound parameter values by default, so this is lower
severity than it looks, but confirm:
- the log aggregator/appender in whatever environment this runs in doesn't also capture bound
  parameters (some profilers do),
- log retention and access control on wherever these logs land, since they'd contain UUIDs tied
  to consumption patterns even without parameter values.

## 8. Organizational, not code

These need to exist outside this repository, listed here so the DPIA/compliance work has a
checklist:
- Record of Processing Activities (Art. 30): what's collected, purpose, legal basis, retention,
  recipients.
- Data Processing Agreements with infrastructure vendors (cluster/hosting provider, cert-manager,
  DNS), confirm EU/EEA location or an adequacy decision for any that are not.
- The DPIA itself (Art. 35), if item 1 resolves to "special category" plus systematic profiling,
  which is the current architecture.
