# Backend test plan

Derived from reading the whole backend, not from reading the tests. The aim is tests that
describe what DrinkSaver is supposed to do, so that a wrong change fails them.

## What the application actually does

A user records drinks. Each drink is an alcohol type, optionally a subtype, a volume, and
for beer a brand, flavour and consumption type. The interesting behaviour is the
recommendation engine.

Three sources each produce a `Map<DrinkKey, Double>` of candidate drinks with a score:

| Source | Score | Meaning |
|---|---|---|
| `DefaultRecommendationSource` | `0.0` | Curated entries owned by an admin user, shown to everyone. Floor score, so they appear only when nothing better exists. |
| `PersistentPersonalRecommendationSource` | `Double.MAX_VALUE` | Drinks the user explicitly pinned. Always sort first. Filtered by `endDate`, so temporary pins expire. |
| `DynamicPersonalRecommendationSource` | `decayFactor ^ daysSince`, summed | Learned from history. Recent and repeated drinks score higher. |

`RecommendationService` merges them with `Math::max`, resolves missing names, drops
anything still unnamed, sorts by score descending and truncates to
`maxPersonalRecommendations`.

`RecommendationCacheService` decides when that cached result is stale: immediately if the
saved drink was pinned, otherwise after five saves counted by quantity.

`InjectorService` picks a repository implementation by config name, which is how the
`hardcoded` and `postgres` back ends are swapped.

## Structure

`backend/src/test/java/com/drinksaver/`, mirroring main. Three tiers.

### Tier 1: pure unit tests, no Spring

`RecommendationServiceTest` and `DynamicPersonalRecommendationSourceTest` exist. Add:

**`DefaultRecommendationSourceTest`**
- Returns empty when the admin list is null or empty (guard exists, pin it).
- Every returned entry scores exactly 0.0.
- Queries with the configured admin ids.

**`PersistentPersonalRecommendationSourceTest`**
- Every entry scores `Double.MAX_VALUE`.
- Passes a "now" to `findValidByUserId` so expired pins are excluded. Note this class calls
  `LocalDateTime.now()` internally; if pinning the clock needs a constructor change, apply
  the same package-private-constructor pattern already used in
  `DynamicPersonalRecommendationSource`.
- Duplicate rows collapse to one key (the merge function keeps the first).

**`RecommendationCacheServiceTest`** (rich, high value)
- A pinned drink (`addToRecommendations: true`) evicts immediately, without touching the counter.
- An ordinary drink increments by `quantity`, or by 1 when quantity is null.
- No eviction below five, eviction at exactly five, counter resets to 0 after evicting.
- A single save with `quantity: 5` evicts in one go.
- Counters are per user: saves by user A never evict user B.
- A null cache (`getCache` returns null) returns quietly rather than throwing.

**`InjectorServiceTest`**
- Selects the implementation whose `is(name)` matches the configured name.
- Throws `IllegalArgumentException` naming the missing repository when nothing matches.
- The three getters read the three separate config keys, so a misconfigured `beer` does not
  affect `alcohol`.

**`AlcoholNameCollectorTest` and `BeerNameCollectorTest`**
- Subtype name wins over type name when a subtype is present.
- Falls back to the type name when the subtype id is unknown.
- Falls back to `"Unknown alcohol"` when the type is unknown or null.
- Volume renders as `(<name> - <n>.<nn>l)`.
- **Known defect F6:** a null `alcoholVolumeId` reaches `findById(null)` and throws. Write
  the test to document what happens today, named so it reads as a defect
  (`nullVolumeIdCurrentlyThrows`), with a comment pointing at the finding. Do not assert
  that this is desirable.

**`PostgresDrinksRepositoryTest`** (mocked tables)
- `quantity: null` saves exactly one row.
- `quantity: 3` saves three rows and returns the first.
- `addToRecommendations: true` also writes a `Recommendation`; false writes none.
- **Known defect F2:** `quantity: 0` throws `NoSuchElementException`. Document, do not bless.

**`PostgresAlcoholRepositoryTest`** (mocked tables)
- `getAlcoholTypes` and `getSubtypesByAlcoholType` query for admins plus the caller.
- `getVolumesByAlcoholType` returns empty for an unknown type.
- `createAlcoholType` with null volumes and null subtypes writes just the type.
- **Known defect F7:** `saveVolumeForAlcoholType` on an unknown type returns an empty
  `AlcoholVolume` rather than signalling failure. Document, do not bless.

**`DrinkKeyTest`** exists. **`PostgresBeerRepositoryTest`** exists; extend with
`saveBrand` writing flavours only when the list is non-empty.

### Tier 2: controller slice tests

These need `spring-security-test` back in the pom (it was removed as unused, and this is
what makes it used). Use `@WebMvcTest` per controller with the service layer mocked, and
`jwt()` from `SecurityMockMvcRequestPostProcessors` for authentication.

Per controller: happy path returns 200 with the expected JSON shape; a request with no
token returns 401; malformed path variables (a non-UUID `userId`) return 400.

`DrinksControllerTest` additionally: `getSavedDrinks` picks the beer collector when the
type equals the configured `beerId` and the alcohol collector otherwise, and `saveDrink`
calls `recommendationCacheService.onDrinkSaved` after saving.

**Do not write a test asserting that one user may read another user's data.** That is
finding F1 and it is unresolved. Note the gap in the PR description instead.

### Tier 3: Testcontainers integration

**First, introduce the shared container.** Create an abstract
`AbstractPostgresIntegrationTest` holding a single `static PostgreSQLContainer` started
once and reused by every subclass, annotated `@Testcontainers(disabledWithoutDocker = true)`
with `@ServiceConnection`. Migrate the existing `BrandsTableIntegrationTest` onto it. A
static field on a base class is started once per JVM, so container cost stops scaling with
the number of test classes.

Then add `@DataJpaTest` classes exercising the derived queries that only a real Postgres can
validate:
- `SavedDrinksTable`: `findByUserId`, `findByUserIdAndDate`, and `deleteAndCountByIds`
  returning the number actually removed.
- `RecommendationsTable`: `findByUserIdIn`, and `findValidByUserId` including and excluding
  by `endDate` around the boundary.
- `AlcoholTypesTable`: the `volume_ids` `integer[]` column round-trips, which is the mapping
  most likely to break silently.
- `AlcoholSubtypesTable` and `BeerFlavoursTable` ordering and user filtering.

Also add a `CIProfileIntegrationTest`-free guard: a Maven profile `ci` that sets a property
removing `disabledWithoutDocker`, so a runner without Docker fails rather than silently
skipping. Wire `-Pci` into the two backend workflow steps.

## Coverage

Raise the JaCoCo floor to just under whatever is measured when this lands, same ratchet
rule as now. Do not chase a number by testing getters; the tiers above are chosen for
behaviour, and the percentage is a by-product.

## Deliberately not covered

- `DrinksaverApplication`, config classes that only declare beans, and Lombok accessors.
- Anything requiring the F1 authorization decision.
