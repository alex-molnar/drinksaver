# Utolsó Kör: the DrinkSaver UI redesign

Date: 2026-09-09
Status: approved

## Problem

The web app works and looks like nothing in particular. It is MUI 9 with an amber hue swapped
into `primary`, Inter as the type family, and stock Card, Paper and BottomNavigation throughout.
That is a reasonable place to start a product and a poor place to leave one.

Underneath the appearance sit two flow defects that matter more than the appearance does.

**Adding anything mid-entry destroys the drink you were entering.** You are on `/detailed`, you
have chosen Beer and a consumption type, and you need a brand that does not exist yet. You tap
the `+`, land on `/new-brand`, save, and `NewBeerBrandPage.tsx:56` sends you to `/success`, whose
only exit is `navigateToHome`. The form is gone. All five `New*` pages do this. Browser-back does
not rescue you either, because `DetailedPage` remounts with fresh state.

**A one tap save costs three taps.** Tapping a Quick Save tile navigates to `/success`, you read
it, you tap "Back to Home". Logging four drinks on the way home is four round trips through a
full page interstitial.

Both are worst in exactly the situation the app is for: a phone, one hand, a dim room, several
drinks to record.

## Goals

1. A visual identity specific to this product, not a theme file over MUI's defaults.
2. Logging never navigates. Saving, undoing and adding catalogue entries all happen in place.
3. The five near-identical `New*` pages stop being dead ends.
4. Every colour pair in the new system provably meets WCAG 2.2 AA, enforced by a test rather
   than by good intentions.
5. No regression in the coverage gate, which every pull request must clear on its own.
6. No feature is lost. See "Behaviours the prototype dropped".

## Non-goals

- **The Keycloak login page.** It keeps its own theme, so the redesign begins one screen late.
  Scoped out deliberately and filed as OPS-3.
- **A light theme.** See the decision below.
- **The recommendation engine.** FIX-4 records a real defect found during this work and
  deliberately not fixed in it.
- **Any new product capability.** No statistics, no totals, no trends. The backend exposes no
  aggregate endpoint and adding one is a different piece of work.
- **An idempotency key on save.** The right long term answer to retry-after-timeout, but it
  carries a storage cost and is a separate concern. Filed as FIX-5.

## How the direction was chosen

Four directions were developed and two were built as working prototypes on the real screens with
real content from `deploy/local/seed.sql`. Alex chose Utolsó Kör from the live prototypes rather
than from prose, per the standing rule in `~/.claude/CLAUDE.md`.

The prototype is a reference, not a specification. Where this document and the prototype
disagree, this document wins: it carries corrections the prototype does not.

## Constraints discovered in the code

Four facts that were not in the brief and that shape the design.

1. **Recommendation ids are null in the common case.** `DrinkKey.toRecommendation` never sets an
   id. `IndexPage` already works around this with a composite key. Nothing client side may key on
   `Recommendation.id`.
2. **`POST /v1/drinks/new` does not return a display name.** It returns the JPA entity
   `SavedDrink`, which has no `name` column. History names are composed server side by
   `AlcoholNameCollector` and `BeerNameCollector`. An optimistic row therefore carries a
   provisional client name that the server later replaces: "Gin and tonic" comes back as
   "Gin (Long drink - 0.25l)".
3. **Recommendations are server cached** and invalidated every five saves
   (`RecommendationCacheService.INVALIDATE_AFTER_SAVES`). Refetching after every save is wasted
   effort four times out of five.
4. **There is no range endpoint.** `GET /v1/drinks/date/{date}` is the only history read, so a
   seven day strip with per-day marks costs seven requests unless the design says otherwise.

## Decisions

### The visual direction: Utolsó Kör

A Budapest kocsma. Umber plaster ground, drinks presented as screwed-up enamel signs, a bar menu
with dotted leader lines, and a light paper bar tab you cross off. The name is an internal
codename for the direction. The product is still called DrinkSaver and all interface copy stays
in English.

The direction is not arbitrary local colour. The catalogue already contains `fröccs`, `rosé
fröccs` and `pálinka`, which is both where the direction came from and why the font subset has to
include `latin-ext`.

Where the boldness is spent: the enamel plate. Everything around it stays quiet.

### Interaction architecture: logging never navigates

One rule, applied everywhere.

- Tapping a Quick Save plate saves in place, stamps the plate, and raises an undo strip.
- `/success` and `/error` stop being routes and their page components are deleted.
- The five `New*` routes collapse into sheets opened over the form. On save the new item is
  selected for you and you continue where you were.
- `DetailedPage` becomes a sheet of tappable rows, each opening a nested option panel, rather
  than a wall of MUI selects.
- History gets a seven day strip and undo on delete.

Two alternatives were rejected. A single layered surface with a full height step flow, one
decision per screen, was the best fit for one handed use and the biggest gamble on repeat use.
Repairing the flows while keeping all ten routes was cheapest and left the `+` as a full page
context switch, which is the thing being fixed.

### Dark only, deliberately

No light theme. A kocsma at noon is still dim. This halves the palette work and the contrast
testing, and it avoids a washed out light variant that satisfies nobody.

The commitment is to the output, not to the implementation: every colour is a token, so a light
theme later is a token file rather than a rewrite. The document declares `color-scheme: dark` and
does not consult `prefers-color-scheme`.

### MUI for behaviour, not appearance

MUI 9 stays as a dependency, for the things that are genuinely hard and already accessible:
`Drawer` for sheets, `Snackbar`, focus trapping, portals and ARIA wiring.

Every presentational component is ours, written in emotion against our tokens. No MUI `Card`,
`Paper`, `List` or `Button` appearance survives.

This is the decision that lets the redesign actually land. Theming MUI harder is what produced
the current look, and enamel plates, leader dots and a paper tab all fight `Card` and `Paper`
defaults. Dropping MUI entirely would mean reimplementing focus trapping, dismissal, scroll
locking and ARIA for the sheet, which is precisely where hand rolled UI fails accessibility.

### Fonts are self-hosted, and where they live matters

Fraunces (variable, `SOFT` and `WONK` axes) for display, Familjen Grotesk for interface text.
Both are OFL-1.1 and both ship as `@fontsource-variable` packages at 5.3.0, verified against the
npm registry.

Self-hosted and subsetted to `latin` and `latin-ext`, split by `unicode-range` so a session with
no Hungarian never downloads the ext file. **Not** the Google Fonts CDN: that would send every
user's IP address to Google on every page load, a new third party data flow into a product with
seven open GDPR tasks and no privacy notice (PRIV-2). The `latin-ext` subset is not optional,
because the catalogue contains `fröccs` and `pálinka`.

**The woff2 files go in `web/src/assets/fonts/` and are referenced from CSS, so Vite fingerprints
them. They must not go in `public/`.** `web/nginx.conf:28` sets `expires 1y` and
`Cache-Control: immutable` on every `.woff2`, so an unfingerprinted path would be cache poisoned
for a year on the next font change.

Declare a metric matched fallback with `size-adjust` and `ascent-override` so the swap does not
reflow the plate grid. Budget about 120 KB for both faces; if Fraunces exceeds it, pin `opsz` to
two instances rather than shipping the full axis.

### Sheets are routes

The sheet gets a history entry, as one bit: `?sheet=add`. The panel stack inside it is component
state, not URL.

If the sheet were plain state with no history entry, Android's back button would exit the app
instead of closing it. That is worse than the full page navigation being replaced.

An earlier draft encoded the whole panel stack in the URL as a dot joined grammar
(`?sheet=add.field:type.new:type`). That is dropped, for three reasons found while reviewing it.
A deep URL is meaningless on a cold load, because the draft it refers to is empty, so every deep
link collapses to the same single panel anyway. Tracking how many entries to pop with a counter
is unsound: it survives neither a reload, nor `history.go(-n)` firing one `popstate` rather than
n, nor a tab switch that drops the parameter without resetting the count. And Keycloak's
`login-required` cold load makes a cross origin round trip, so the same origin history the counter
depends on is gone by the time the app renders.

Instead, the dismiss depth is stamped on the entry itself, via `navigate(to, { state })`, which
React Router serialises into `history.state` and which therefore survives reload and bfcache.
Dismiss is `navigate(-(depth ?? 0))`, falling back to `replace` at zero. Back, Escape and the
scrim all route through one `dismiss()`.

**The draft provider mounts above `Routes`, not as a route element.** The sheet host is a sibling
of `Routes` so it can render over any route, and React context does not flow sideways: a provider
inside a route element would leave the sheet reading a null context and throwing on first open.

The sheet host needs its own `Suspense` boundary. As a sibling of `Routes` it sits inside the app
level one, so a lazily loaded panel would otherwise blank the whole screen while its chunk loads.

### Saving is immediate, deleting is deferred

Saves fire immediately and are undone by deleting the returned ids. Deletes do not fire at all
until the undo window closes.

There is no undelete endpoint, so undoing a delete by re-POSTing would produce a new id and lose
the original row. So the DELETE waits, the row is hidden meanwhile, and the call fires on window
expiry or on `visibilitychange` to hidden.

The asymmetry is deliberate and is the rule to remember: **deferring a destructive operation
fails safe, because the worst case is that the row reappears and you delete it again. Deferring a
constructive one fails lossy, because the worst case is that the drink you logged is not logged.**

The undo window is 6.5 seconds, not the prototype's 4.8. An auto expiring action is a time limit
under WCAG 2.2 SC 2.2.1, so the timer pauses while focus or hover is inside the strip, the strip
announces with `role="status"`, and History's delete remains the non timed equivalent.

**The strip renders inside the sheet's portal, not on `document.body`.** MUI's `ModalManager` sets
`aria-hidden` on every body child that is not the modal, so a strip portalled to the body would be
hidden from assistive technology and buried under the backdrop the moment a sheet opened. A time
limit whose extend control cannot be reached does not satisfy SC 2.2.1.

**A deferred delete must survive the tab dying.** Flushing only on `visibilitychange` to hidden
fails twice over: it never fires if the tab is killed, so the row silently returns with no
explanation; and it fires on every ordinary app switch, flushing early and leaving an Undo button
on screen that cannot be honoured, because `getSavedDrinksByDate` returns only id, name and type,
which is not enough to write the row back. So: flush on `pagehide` as well, flush with
`fetch(..., { keepalive: true })` rather than the XHR based axios client, which is aborted by
unload, flush before `keycloak.logout` navigates away, treat hidden as commit and retract so no
unhonourable Undo is ever shown, and persist pending delete ids to `sessionStorage` and reconcile
on `pageshow`.

### One drink-identity module

A single module owns everything that identifies a drink: its glassware silhouette, its liquid
chroma, its enamel field colour, and the ink that sits on that field.

It replaces the hardcoded alcohol-type-ID icon maps currently duplicated in
`RecommendationButton.tsx` and `HistoryPage.tsx`, where identifiers like `4`, `21` and `24` are
written out twice and drift independently.

Identity is data, not theme, so the record carries `inkDark` and `inkLight` from day one with
only the dark column populated. A field colour is the drink's identity and should stay
recognisable in any theme; the lettering is what flips.

It carries a unit test that computes WCAG contrast for every field and ink pair and fails below
the threshold. That test is the reason the table below is correct rather than merely intended.

### A real type scale

The prototype uses thirteen distinct `font-variation-settings` combinations across eighteen
declarations. That is acceptable in a prototype and wrong in a codebase.

The implementation defines a small set of named roles, each with one fixed variation setting, and
nothing sets `font-variation-settings` inline. A lint rule forbids hex literals outside `theme/`
and `identity/`, because without enforcement the second theme is a rewrite again within two
months.

## The design system

### Colour tokens

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#231512` | Umber plaster ground |
| `--bg2` | `#2A1A15` | Raised ground |
| `--surface` | `#2E1C17` | Sheet and panel |
| `--deep` | `#1B0F0D` | Recesses, screw holes |
| `--ink` | `#F2E4CE` | Primary text |
| `--ink2` | `rgba(242,228,206,.70)` | Secondary text |
| `--ink3` | `rgba(242,228,206,.52)` | Tertiary text and captions |
| `--line` | `rgba(242,228,206,.14)` | Hairlines |
| `--must` | `#C8952B` | Chosen values, active navigation |
| `--red` | `#C4462E` | Primary action, destructive marks |
| `--paper` | `#EBDCC0` | The history bar tab |
| `--pink` | `#2B1A14` | Ink on paper |

Measured contrast on the ground: `--ink` 14.12:1, `--ink2` 7.44:1, `--ink3` 4.68:1, `--must` on
the sheet 6.25:1, paper ink on paper 12.32:1, paper caption 4.74:1. All clear AA.

The leader dots between a label and its value measure 1.85:1. They are decorative connective
tissue carrying no information, so the text threshold does not apply. Do not reuse that value for
anything that means something.

### The drink identity table

Every pair below clears 4.5:1, the caption threshold, so the plate name (20px at weight 700, and
therefore WCAG large text at 3:1) has a wide margin.

| Drink | Glass | Enamel field | Ink | Contrast | Liquid chroma |
| --- | --- | --- | --- | --- | --- |
| Heineken pint | pint | `#2B7454` | `#F4E9CE` | 4.66:1 | `#E0A828` |
| Guinness pint | pint | `#2B1A13` | `#EBD9B4` | 12.00:1 | `#7A2E12` |
| Duvel bottle | tulip | `#DFD1B0` | `#2B1A14` | 11.01:1 | `#E8C04A` |
| Chouffe bottle | tulip | `#BA422C` | `#F9EDD4` | 4.63:1 | `#D9903A` |
| Gin and tonic | highball | `#2C4B6E` | `#EFE2C8` | 7.01:1 | `#BFD8D0` |
| Glass of red | wine | `#6B3350` | `#F2E4CE` | 7.57:1 | `#7A1F32` |

Two rules govern extension:

1. **Caption text on a plate renders at full ink opacity.** The prototype used 0.72, which drops
   Heineken to 2.93:1 and Chouffe to 2.91:1. No opacity rescues those fields, so the fields moved
   instead and the opacity goes away.
2. **A new pair is added only with its contrast test passing.** Liquid chroma is decorative in
   this direction and is not gated. It exists because the identity module also serves any future
   direction that needs it.

### Type roles

| Role | Face | Size | Weight | Variation |
| --- | --- | --- | --- | --- |
| `display-l` | Fraunces | 27px | 700 | `SOFT 85, WONK 1, opsz 60` |
| `display-m` | Fraunces | 20px | 700 | `SOFT 85, WONK 1, opsz 30` |
| `display-s` | Fraunces | 18px | 600 | `SOFT 70, WONK 1, opsz 28` |
| `numeral` | Fraunces | 48px | 700 | `SOFT 90, WONK 1, opsz 90`, tabular |
| `body` | Familjen Grotesk | 15px | 400 | not applicable |
| `caption` | Familjen Grotesk | 11.5px | 500 | not applicable |

## Behaviours the prototype dropped, and that are being restored

The prototype is a design study, not a feature inventory. Three things it quietly lost. All three
come back, because nobody asked for them to be removed.

1. **Bulk delete.** `HistoryPage` has checkbox multi-select and a delete FAB; the prototype has
   only a per-row cross. `deleteDrinksByIds` already takes a list, so the cost is a selection mode
   on the paper tab, not an API change.
2. **Arbitrary date browsing.** Both `DetailedPage` and `HistoryPage` today expose an
   `<input type="date">` reaching any past date. The strip shows seven days. A "pick a date"
   affordance at the end of the strip, and an "Another day" option at the foot of the When panel,
   both opening a native date input, restore the reach.
3. **Notes and the recommendation options.** `DetailedPage` carries a comments field and the
   "add as a recommendation" checkboxes. They become rows in the menu sheet like any other field.

## Defects found while designing

### The batch save returns one id for N rows

`PostgresDrinksRepository.saveDrink` inserts `quantity` rows and returns `.getFirst()`.
`DrinksController.saveDrink` passes that single `SavedDrink` through, so a client that saved three
drinks holds one id. Undo would delete one row and silently leave two.

**Resolution: the endpoint returns `List<SavedDrink>`, always, including a one element list for
quantity 1.** Not an array only when N is greater than one: two shapes means two client paths and
a bug that appears only at N greater than one, in production, on the path that has no undo.

There is exactly one implementation of `DrinksRepository` and one consumer in the repo. It also
removes a latent 500: `.getFirst()` on `saveAll`'s result is safe only because someone added
`@Min(1)` to `quantity` in a different file.

Rejected alternatives: N single POSTs is actively wrong when `addToRecommendations` is set,
because each POST runs `recommendationsTable.save` and produces N recommendation rows instead of
one. Refetching the day and diffing is racy and spends a GET on the connection you were trying to
spare. No undo for batches makes the most consequential save the only irreversible one, in the
same release that raises the cap from 9 to 24.

### The rolling deploy will skew the contract

The web pod and the backend pod do not cut over atomically, so for a minute an old bundle talks
to a new backend and vice versa. `saveDrink` in `web/src/api/endpoints.ts` ships
`Array.isArray(data) ? data : [data]` for one release, with a comment naming the version it may
be removed in, and treats an empty list as "saved, ids unknown, no undo offered" rather than
throwing.

### A timeout may have succeeded

The axios client has a 10 second timeout. An `ECONNABORTED` may have aborted a request the server
completed, so a naive retry double logs the drink, on bar wifi, which is exactly where it will
happen. The retry policy therefore verifies before retrying: refetch the day and re-POST only if
the row count did not rise.

### Deleting a drink leaves the recommendation cache stale

Recorded as FIX-4 and **deliberately not fixed here**. `deleteSavedDrink` never touches
`recommendationCacheService`, so a delete neither invalidates the cached recommendations nor
decrements the counter. The History page invalidates `['recommendations']` client side, which
looks like a fix and is not: the refetch returns the same server cached list.

It is pre-existing. Undo makes it easier to hit, which is why it surfaced now. Fixing it changes
recommendation behaviour for every user and touches a `compareAndSet` design whose comment
records a measured rationale, and that is beyond a UI redesign.

### Two plate colours failed WCAG AA

Caught by building the contrast gate before the code rather than after. Heineken's green measured
4.14:1 and Chouffe's red 4.24:1 against their inks, both below the 4.5:1 the caption needs. Both
moved 2.4% darker on the same hue, to `#2B7454` and `#BA422C`, which is visually imperceptible and
clears the threshold. The table above is the corrected one.

## Architecture

### Modules

`theme/` tokens and font faces. `identity/` the drink identity table, glassware paths and contrast
maths. `surfaces/` the presentational vocabulary (Plate, MenuRow, OptionRow, PaperTab, TapeStrip,
Board). `sheets/` the sheet stack, its URL encoding and the single Drawer host. `drink/` the draft
reducer, cascade rules and catalogue creation. `save/` the save queue, undo, deferred deletes and
retry policy. `history/` merging server rows with pending inserts and suppressed deletes.
`errors/` the route error boundary and error classification. `app/` the frame, providers and
routes.

Provider order, outermost first: `KeycloakProvider`, `ProtectedRoute`, `ThemeProvider`,
`SaveQueueProvider`, `RouteErrorBoundary`, `Suspense`, `Routes`. The sheet host and the undo strip
are siblings of `Routes`, not children: the undo strip must survive a route change and the sheet
host must be able to render over any route.

### Optimism without optimistic cache writes

`setQueryData` is used nowhere. The TanStack Query cache holds server truth only. Optimism lives
in a view layer selector that merges server rows, minus ids suppressed pending deletion, plus the
queue's pending inserts.

No rollback code means no rollback bug. Concurrent saves cannot clobber a shared cache entry. A
refetch landing mid window cannot resurrect a row that is pending deletion. And the Quick Save
header count and the History list read the same hook, so they cannot disagree.

Every time dependent function is pure and takes `now` as an argument, so the window, the sweep and
the expiry are unit testable without a real clock. `undoUntil` is a wall clock timestamp and the
provider sweeps on `visibilitychange` and `pageshow`, because mobile throttles `setTimeout` and a
phone in a pocket is the normal case.

### Errors

Three tiers, no error route. The lazy chunk boundary (FIX-3) offers a reload and guards against a
reload loop with a one shot `sessionStorage` flag. Its fallback renders without MUI and without any
lazy chunk, because the failure being handled may be a missing vendor chunk. Data fetch errors
render in place with a retry, and a failed recommendations query must still leave the "Something
else" plate reachable, since the manual path is the fallback for the automatic one. Action errors
take the strip, with `role="alert"` and no auto dismiss.

`/success`, `/error`, `/detailed` and the five `/new-*` routes become redirects, plus a catch all,
so no bookmark or stale tab lands on a blank page.

## The pull request stack

Bottom to top. Each is independently reviewable and must land green on its own.

| # | Branch | Concern |
| --- | --- | --- |
| 0 | `docs/ui-redesign-spec` | This document, the plan, and the FIX-4, FIX-5, OPS-3 backlog entries |
| 1 | `feat/drinks-post-returns-list` | The API contract change and `docs/api-docs.yaml` |
| 2 | `chore/untrack-web-coverage` | HK-1. Zero code, cleans every later diff |
| 3 | `fix/lazy-route-error-boundary` | FIX-3. Ships value with or without the redesign |
| 4 | `feat/design-tokens` | Token layers, CSS variable emission, font pipeline. Nothing flips yet |
| 5 | `feat/drink-identity` | Identity module, glassware, contrast test. Deletes the duplicated icon maps |
| 6 | `feat/sheet-primitive` | Sheet path, stack hook, host, registry. No screen changes |
| 7 | `feat/save-queue` | Queue, undo, deferred delete, retry policy, wired into the existing visual design so the review is about semantics. Routes become redirects. The four e2e specs are rewritten |
| 8 | `feat/quick-save-plates` | Plates, board header and nav, dark tokens on. Deletes `IndexPage` and `useResponsiveTileCount`. Keeps `Layout` and `RecommendationButton` |
| 9 | `feat/add-sheet` | Draft provider, sheet host, menu, field and create panels. Deletes `DetailedPage`, the five `New*` pages, `SuccessPage`, `ErrorPage`, `useNavigation` and `RecommendationButton` together |
| 10 | `feat/history-tab` | Seven day strip, paper tab, strike-off delete, bulk selection, date picker. Deletes `Layout` |
| 11 | `chore/redesign-docs` | Component documentation, the eslint hex rule, and one coverage ratchet raise |

PR 7 carries the risk and PR 9 carries the bulk. Keeping 7 visually boring is what makes its review
tractable.

**The deletion boundaries are set by measurement, not by tidiness.** The coverage gate's binding
constraint is lines, with about one line of slack, and every uncovered line added costs nineteen
covered ones to offset. Two consequences that reshaped the stack:

- **Deleting a well covered file breaks the build.** `useNavigation.ts` is at 100%, and removing it
  alone drops lines to 94.95 against a floor of 95. So `/success`, `/error` and `useNavigation`
  cannot retire in the save queue PR, where an earlier draft put them.
- **`RecommendationButton.tsx` holds a quarter of the project's branches** (99 of 396) at 95.96%.
  Deleting it alone drops branches to 84.51. It has to go in the same PR as `DetailedPage`, which
  sits below every floor and pays for it.

The rule, stated so the next person does not rediscover it: **delete the below-floor files early
and together, and hold the above-floor files until the code replacing them is covered.** "Delete
each page with its test so the ratio never swings" is false; the ratio always swings, and the sign
depends on which side of the floor the deleted file sat.

Front loading the pure modules helps, but it is worth roughly twenty uncovered lines across the
whole redesign, not the free pass it looks like. `src/main.tsx` is excluded from coverage, so
moving the theme out of it moves that code into the counted pool: a net liability, not a win.

**Version: 3.0.0 to 4.0.0.** A breaking response shape on `POST /v1/drinks/new` and a complete
replacement of the interaction model, including seven removed routes.

## Verification

Unit tests are not sufficient evidence for this work, per `CLAUDE.md`.

1. `cd web && npm run test`, `npm run lint`, and `npm run test:coverage` against the gate.
2. `cd backend && mvn verify` for the API change, including the JaCoCo floor.
3. `docker-compose up --build`, then the real journeys at `http://localhost:3000` as `dev / dev`:
   save from a plate and undo it; save three and undo all three; add a brand mid-entry and confirm
   the rest of the form survives; delete from history and undo; bulk delete and undo.
4. `npm run e2e` against that stack, with the four specs rewritten, plus two new ones: a save that
   survives backgrounding past the undo window, and an undo tapped at the expiry boundary that
   resolves cleanly and does not fall through to the nav bar.
5. The test environment rollout confirmed with `gh run list` and `kubectl`.
6. A tap must produce its first visual response in under 100ms on a throttled device profile. The
   direction is paint heavy and the prototype hides that.

## Known gaps

- The login page is stock Keycloak until OPS-3 is done.
- Recommendations stay stale after a delete until FIX-4 is done.
- Retry after a timeout is verified client side rather than made idempotent. FIX-5.
- A saved row's provisional name is replaced by the server's composed name on the next refetch
  ("Gin and tonic" becomes "Gin (Long drink - 0.25l)"). Pending rows are marked so the change reads
  as settling rather than as a glitch. Adding name composition to the write path would couple the
  writer to two name collectors for cosmetic gain.
- Day marks on the strip are drawn only for days already fetched, with a distinct mark for "not
  loaded yet", so the strip never claims a day is empty when it is merely unread.
- Dates are computed in UTC, so a drink logged between midnight and 02:00 in Budapest is filed
  under yesterday. Pre-existing, in three places, and the redesign makes it visible rather than
  causing it. FIX-6.
- `web/index.html` blocks pinch zoom, which fails WCAG 2.2 SC 1.4.4. Pre-existing. FIX-7.
- No light theme. Tokens make one additive rather than structural.
- Backend branch coverage stays ungated (HK-2), unchanged by this work.
