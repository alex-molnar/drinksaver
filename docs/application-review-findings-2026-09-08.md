# Findings from the application review (2026-09-08)

Discovered while mapping the backend to build a test plan. None are fixed.

## F1. No authorization anywhere. Any user can read or destroy any other user's data.

The API authenticates but never authorizes. `SecurityConfig` ends with
`.anyRequest().authenticated()` plus a JWT resource server, and that is all of it. A grep
across the backend for `@AuthenticationPrincipal`, `SecurityContextHolder`,
`JwtAuthenticationToken`, `Principal` and `@PreAuthorize` returns nothing. The token subject
is never compared with the `userId` the caller supplies.

The user id comes from the URL or the request body, so any authenticated caller can
substitute someone else's:

| Endpoint | Consequence |
|---|---|
| `GET /v1/drinks/{userId}/date/{date}` | Read anyone's history |
| `GET /v1/recommendations/{userId}/list` | Read anyone's recommendations |
| `GET /v1/alcohol/types?userId=` | Read anyone's custom types |
| `POST /v1/drinks/new` | Write a drink attributed to another user (`userId` is in the body) |
| `DELETE /v1/drinks/byIds?drinkIds=1,2,3` | Remove any rows by primary key, with no user filter at all |

That last one is the worst. `PostgresDrinksRepository.deleteSavedDrink` calls
`deleteAndCountByIds`, whose JPQL is `delete from SavedDrink s where s.id in :ids`. No user
predicate. Iterating integer ids clears the table for every user.

Any account in the realm suffices. Self-registration is off in production, which limits who
can reach it, but this is still full horizontal privilege escalation between users.

**Needs a decision, not a guess.** The fix is to take the user id from the JWT subject
instead of trusting the client, which changes every controller signature and the frontend
calls that pass `userId`. That is a design change and belongs to the repository owner.

## F2. Saving a drink with `quantity: 0` returns a 500

`PostgresDrinksRepository.saveDrink`:

```java
return drink.quantity() == null
    ? savedDrinksTable.save(SavedDrink.of(drink))
    : savedDrinksTable.saveAll(
        IntStream.range(0, drink.quantity()).mapToObj(i -> SavedDrink.of(drink)).toList()
      ).getFirst();
```

`quantity: 0` gives an empty stream, so `saveAll` receives an empty list and `getFirst()`
throws `NoSuchElementException`. A negative quantity behaves the same. Nothing validates the
field and it comes straight from the request body.

Worth a test once the intended behaviour is decided: reject with 400, or treat 0 as 1.

## F3. `@RequestParam(defaultValue = "10") UUID userId`

In `AlcoholController.getAlcoholTypes`, `BeerController.getBrandsList` and
`getConsumptionTypesList`. A UUID cannot parse from `"10"`, so omitting the parameter yields
a 400 rather than any usable default. Confirmed live against the local stack earlier. The
default is meaningless: either drop it so the parameter is explicitly required, or better,
let it disappear once F1 is fixed and the id comes from the token.

## F4. `RecommendationCacheService` counter is not atomic across requests

`onDrinkSaved` reads the `AtomicInteger` out of the cache, then uses `counter.set(count + n)`
rather than `addAndGet`. Two concurrent saves for one user can interleave between `get()` and
`set()` and lose an increment. Mild consequence: the recommendation cache is invalidated a
little later than intended. Low priority, but the `AtomicInteger` gives a false impression of
safety.

## F5. The token refresh interval is never cleared

`KeycloakProvider` starts `setInterval(..., 60000)` in its init effect and returns no cleanup.
The provider lives for the app's lifetime so it does not leak in normal use, but it does leak
across hot reloads and in tests.

## F6. A drink with no volume crashes the history endpoint

`AlcoholNameCollector.getAlcoholVolumeName` calls `alcoholVolumeTable.findById(alcoholVolumeId)`
with no null check. Spring Data throws `IllegalArgumentException` on a null id.

`alcohol_volume_id` is nullable, and the `Drink` DTO accepts null, so a drink can be saved
without one. `DrinksController.getSavedDrinks` then calls the collector with no try/catch:

```java
final String name = savedDrink.getAlcoholTypeId().equals(repositoryConfiguration.beerId())
        ? beerNameCollector.collectBeerName(DrinkKey.of(savedDrink)).name().orElse("Unknown drink")
        : alcoholNameCollector.collectAlcoholName(DrinkKey.of(savedDrink)).name().orElse("Unknown drink");
```

So one such row turns the whole day's history into a 500. `RecommendationService.withName`
wraps the same call in a try/catch and degrades gracefully, which shows the hazard was known
in one place and missed in the other.

The same line dereferences `savedDrink.getAlcoholTypeId()` with `.equals(...)`, so a null
alcohol type is a `NullPointerException` on the same path.

## F7. `saveVolumeForAlcoholType` returns an empty object instead of a 404

```java
.orElse(new AlcoholVolume()); // TODO ResponseEntity 404
```

An unknown alcohol type id yields a 200 carrying an all-null volume. The caller cannot tell
success from failure. The author flagged it; it is still there.

## F8. `createAlcoholType` is not transactional

Marked `// TODO in transaction`. It saves volumes, then the type, then the subtypes as
separate operations. A failure part way leaves orphaned volume rows and a type with no
subtypes. Worth a Testcontainers test once the intended behaviour is settled.

## F9. Volume names are formatted with the default locale

`String.format("(%s - %.2fl)", ...)` with no `Locale`. Under a comma-decimal default locale
this renders `0,50l`. The container currently runs with a dot locale so it is invisible
today, and it silently changes with the JVM's locale. `Locale.ROOT` would pin it.

## F10. The save button on the detailed form has no accessible name

`DetailedPage`'s save control is a MUI `Fab` containing only a `SaveIcon`, with no
`aria-label`. A screen reader announces it as "button" with no indication of what it does,
and it is the primary action of that screen.

Found while writing the end-to-end tests, which cannot select it by role and name and fall
back to the `MuiFab-root` class. MUI's icon `data-testid` is stripped from production
bundles, so that is not an alternative either.

Same class of defect as the `QuantitySelector` icon buttons fixed earlier, and the same
one-line fix. Left alone here because it is a source change and this branch is tests only.
