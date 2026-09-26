# iOS visual reference catalogue

Frozen web-baseline screenshots used as the ground truth for native iOS parity work
(IOS-005 onward). These images are evidence, not runtime assets. Later web changes do
**not** replace them; a new parity baseline requires an explicit task that names a new
frozen commit.

## Provenance

| Field | Value |
| --- | --- |
| Frozen commit | `28c33fde49566559f21c626dde2f5fcdfaae3d34` ("Light theme sol (#93)") |
| Source tree | Detached worktree at the frozen SHA; only the capture harness (`web/e2e/tests/ios-reference.spec.ts`) was added — no tracked file was modified. |
| Compose project | `drinksaver-ios-ref` (isolated containers and volumes) |
| Base URL | `http://localhost:3000` |
| Browser | Playwright 1.63.0; Chromium 153.0.8010.12 |
| Device scale factor | 3× (set via Playwright `deviceScaleFactor: 3`) |
| Color space | sRGB (Chromium default) |
| Alpha | Opaque — the app paints the full viewport; no transparent pixels are produced. |
| Locale | `en-GB` (set via Playwright context option) |
| Time zone | `Europe/Amsterdam` (set via Playwright context option) |
| Fixed clock | `2026-09-10T12:00:00.000Z` (14:00 in `Europe/Amsterdam`, after the 06:00 rollover) |
| Data source | All `/v1/**` API responses intercepted with fixed fixtures; no production or seeded data is read or written during capture. |
| Font loading | `document.fonts.ready` awaited before every screenshot. |
| Animations | CSS animations/transitions are disabled after entry settles; Playwright screenshot animation handling is also disabled. |

## Native comparison

The web captures are full viewport. Native simulator captures exclude the status bar and
home indicator, then are resampled to a 3× sRGB content canvas. The comparison uses the web
image from its top edge through the matching native content height. It allows at most 24
channel values for antialiasing; mean error must stay below 24 and fewer than 12% of sampled
pixels may exceed that tolerance.

## Device viewports

| Device | CSS points | Pixel dimensions at 3× |
| --- | --- | --- |
| iPhone SE (3rd generation) | 375 × 667 | 1125 × 2001 |
| iPhone 13 mini (primary reference) | 375 × 812 | 1125 × 2436 |
| iPhone 16 Pro Max | 440 × 956 | 1320 × 2868 |

## Naming convention

```
<state>-<theme>-<width>x<height>.png
```

Example: `quick-ready-dark-375x812.png`

## Rebuild commands

Ordinary Playwright runs check the committed catalogue's completeness and 3× dimensions without
writing to it. Capture tests are skipped unless `IOS_REFERENCE_REGENERATE=1` is set. To
intentionally regenerate the catalogue from the frozen baseline:

```bash
# 1. Create the frozen worktree (never check out the frozen SHA in the implementation worktree)
git worktree add --detach /path/to/worktree 28c33fde49566559f21c626dde2f5fcdfaae3d34

# 2. Copy the capture harness into the worktree
cp web/e2e/tests/ios-reference.spec.ts /path/to/worktree/web/e2e/tests/

# 3. Start the isolated stack (from the worktree root)
cd /path/to/worktree
docker-compose -p drinksaver-ios-ref up -d --build

# 4. Wait for all services to report healthy
docker-compose -p drinksaver-ios-ref ps

# 5. Install the frozen web dependencies and its pinned browser
cd /path/to/worktree/web && npm ci && npx playwright install chromium

# 6. Run the capture (state assertions must pass before each screenshot is written)
cd /path/to/worktree/web && IOS_REFERENCE_REGENERATE=1 npm run e2e -- ios-reference.spec.ts

# 7. Copy the captures back to the implementation worktree
cp -r /path/to/worktree/ios/Reference/web/ /path/to/implementation/ios/Reference/web/

# 8. Teardown
cd /path/to/worktree && docker-compose -p drinksaver-ios-ref down -v
cd /path/to/implementation && git worktree remove /path/to/worktree
```

## Native capture and comparison

With an iOS 27 Simulator runtime available in Xcode, run:

```bash
ios/scripts/compare-reference-images.sh ios/Reference/web ios/Reference/native
```

The script captures all 10 states in dark and light on iPhone SE (3rd generation), iPhone 13
mini, and iPhone 16 Pro Max. It creates and removes the SE 3 and Pro Max simulator profiles
when they are not already present. It exports XCTest attachments, checks the 60 normalized
native PNGs against the frozen web catalogue, then runs `VisualParityTests`. The test-only reference
fixture mirrors the data in `web/e2e/tests/ios-reference.spec.ts`; it is compiled only into
UI-testing builds and is excluded from Release. Captures fix the clock, `en-GB` locale, and
`Europe/Amsterdam` time zone to match the web references.

## Teardown

```bash
cd /path/to/worktree && docker-compose -p drinksaver-ios-ref down -v
cd /path/to/implementation && git worktree remove /path/to/worktree
```

## Port isolation note

The Keycloak realm (`deploy/local/keycloak-realm.json`) pins the web client's redirect URI to
`http://localhost:3000/*`. Running the isolated stack on alternate ports would break the OAuth
redirect without modifying the frozen realm import (which the plan forbids). The stack therefore
uses the standard local ports with an isolated project name (`drinksaver-ios-ref`) and isolated
volumes. Ensure no other compose stack is running on ports 3000/8080/8081/5432 during capture.

## State matrix

See [`state-matrix.md`](state-matrix.md) for the complete list of captured states.
