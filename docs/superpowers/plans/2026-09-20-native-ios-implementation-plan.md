# DrinkSaver Native iOS App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended)
> or `executing-plans` to implement this plan task-by-task when those skills are installed. Steps
> use checkbox (`- [ ]`) syntax for tracking. Do not start implementation from this document
> without a fresh user-authorized delivery boundary.

**Goal:** Build a native SwiftUI iPhone application that reproduces DrinkSaver web commit
`28c33fde49566559f21c626dde2f5fcdfaae3d34` and is ready for local/test use, followed by gated
TestFlight and public App Store delivery.

**Architecture:** A checked-in Xcode project under `ios/` uses SwiftUI feature slices, Swift
Observation, structured concurrency, `URLSession`, explicit `Codable` wire models, AppAuth-iOS,
Keychain Services, and small reducer/store types for the existing web state machines. Network
responses remain in memory; only authorization state, theme selection, and minimal pending-delete
recovery survive process termination.

**Tech Stack:** Swift 6 language mode, SwiftUI, iOS 18+, AppAuth-iOS 2.1.0 through Swift Package
Manager, Foundation/URLSession, Security/Keychain, OSLog, XCTest, XCUITest, GitHub Actions hosted
macOS, Keycloak, and the existing Spring REST API.

**Spec:** `docs/superpowers/specs/2026-09-20-native-ios-design.md`

## Global constraints

- Scope is iPhone only, portrait only, iOS 18 and later.
- The UI baseline is exactly Git commit `28c33fde49566559f21c626dde2f5fcdfaae3d34`.
- Use SwiftUI; UIKit is allowed only for system capabilities SwiftUI cannot provide directly.
- Do not embed the web application, JavaScript, React Native, or another cross-platform runtime.
- Use AppAuth-iOS as the only planned runtime package; do not add a state, networking, logging,
  persistence, snapshot, or dependency-injection framework.
- The app is online-only. Do not add a database, durable response cache, or offline mutation queue.
- Preserve exact English copy and exact 06:00 local drinking-day behavior.
- Format product copy, dates, and numbers with fixed `en-GB` rules even under a non-English device
  language; continue to use the device calendar and time zone for drinking-day boundaries.
- Dark is the clone's first-launch default; manual dark/light choice persists and ignores system
  appearance until `IOS-FU-001` is deliberately implemented later.
- The bundle identifier is `im.kak.drinksaver`.
- Local, Test, and Release configuration must never contain a client secret.
- `VERSION` supplies `MARKETING_VERSION`; Apple build numbers increase independently.
- The app contains no analytics, ads, subscription, in-app purchase, or third-party crash SDK.
- Default-settings parity never overrides Dynamic Type, VoiceOver, 44-point targets, WCAG 2.2 AA,
  or Reduce Motion.
- Every production change is test-first. Every task below is independently reviewable and leaves
  its own runnable verification.
- A task's commit step describes the eventual implementation workflow. It does not authorize a
  commit in the current planning session.
- Do not enable public Keycloak registration until `IOS-REL-002` resolves `SEC-1`.
- Do not run TestFlight or App Store steps until paid Apple Developer Program enrollment.

## File and module map

The first task creates the project containers. Later tasks create only the files assigned here.

```text
ios/
├── Config/
│   ├── Local.xcconfig
│   ├── Test.xcconfig
│   └── Release.xcconfig
├── DrinkSaver.xcodeproj/
├── DrinkSaver/
│   ├── App/
│   │   ├── DrinkSaverApp.swift
│   │   ├── AppConfiguration.swift
│   │   ├── AppCoordinator.swift
│   │   ├── RootView.swift
│   │   └── SceneLifecycleHandler.swift
│   ├── Shared/
│   │   ├── API/
│   │   │   ├── APIClient.swift
│   │   │   ├── APIError.swift
│   │   │   ├── APIModels.swift
│   │   │   └── DrinkSaverAPI.swift
│   │   ├── Auth/
│   │   │   ├── AppAuthClient.swift
│   │   │   ├── AuthorizationProviding.swift
│   │   │   ├── KeychainAuthorizationStore.swift
│   │   │   └── SessionStore.swift
│   │   ├── Design/
│   │   │   ├── Color+Hex.swift
│   │   │   ├── DesignCatalogue.swift
│   │   │   ├── DesignCatalogueStore.swift
│   │   │   ├── DesignResolver.swift
│   │   │   ├── DrinkSaverTheme.swift
│   │   │   ├── GlassShape.swift
│   │   │   └── ThemeStore.swift
│   │   ├── Domain/
│   │   │   ├── Clock.swift
│   │   │   ├── DrinkingDay.swift
│   │   │   ├── HTTPStatusError.swift
│   │   │   └── RetryPolicy.swift
│   │   ├── Queue/
│   │   │   ├── PendingDeleteStore.swift
│   │   │   ├── SaveQueueReducer.swift
│   │   │   └── SaveQueueStore.swift
│   │   └── UI/
│   │       ├── AppFrame.swift
│   │       ├── FeedbackArbiter.swift
│   │       ├── FeedbackStrip.swift
│   │       ├── PlasterBackground.swift
│   │       └── ViewState.swift
│   ├── Features/
│   │   ├── QuickSave/
│   │   ├── AddDrink/
│   │   ├── History/
│   │   └── Recommendations/
│   └── Resources/
│       ├── Assets.xcassets/
│       ├── Fonts/
│       └── OFL.txt
├── DrinkSaverTests/
├── DrinkSaverUITests/
├── UITestSupport/
└── README.md
```

The map is a responsibility boundary, not a mandate for one type per file. A task may keep a
private helper beside its sole caller. It may not add a new layer or package merely to mirror this
tree.

## Dependency and pickup rules

- Full Xcode with the pinned iOS simulator runtime is an approved machine prerequisite, not a
  repository task. The operator must explicitly approve and perform the system-level
  `xcode-select` switch to `/Applications/Xcode_16.4.app/Contents/Developer` before `IOS-001`;
  `IOS-001` begins only after `xcode-select -p`, bare `xcodebuild`, and bare `xcrun` all resolve
  through that path.
- The foundation DAG is explicit: `IOS-001` unlocks `IOS-002`, `IOS-003`, `IOS-004`, and
  `IOS-009`; `IOS-002` unlocks `IOS-005`; `IOS-005` unlocks `IOS-006`; `IOS-006` unlocks
  `IOS-007`; `IOS-003` + `IOS-004` + `IOS-006` + `IOS-007` unlock `IOS-008`; and `IOS-003` +
  `IOS-008` + `IOS-009` unlock `IOS-010`.
- `IOS-003A` supplies the deterministic UI-fixture seam used by later UI tasks. Feature tasks do
  not invent their own launch-argument harness. Any task that creates or modifies an XCUITest has
  `IOS-003A` as an implicit hard dependency even when its local dependency line lists only feature
  contracts. Despite its document position, it is picked up only after `IOS-008` and `IOS-010`
  create the API and session contracts its fakes implement.
- Feature tasks depend only on the explicitly named interfaces, not on another feature screen.
- Integration tasks consume completed feature contracts but must not hide missing unit coverage.
- `IOS-REL-*` items are release gates, not clone prerequisites. A gate marked `BLOCKED` is a
  decision/external-state checklist, not an implementation-ready task.
- `IOS-FU-001` is outside clone acceptance and blocked on a separately approved control design.

---

## IOS-001: Create the native project and verify the toolchain

**Outcome:** A minimal iPhone-only SwiftUI project builds and its empty unit/UI test targets run.

**Dependencies:** None.

**Files:**

- Create: `ios/DrinkSaver.xcodeproj/**`
- Create: `ios/DrinkSaver/App/DrinkSaverApp.swift`
- Create: `ios/DrinkSaver/App/RootView.swift`
- Create: `ios/DrinkSaver/Info.plist`
- Create: `ios/DrinkSaver/Resources/Assets.xcassets/**`
- Create: `ios/DrinkSaverTests/ProjectSmokeTests.swift`
- Create: `ios/DrinkSaverUITests/ProjectSmokeUITests.swift`
- Create: `ios/scripts/validate-project-settings.sh`
- Modify: `.gitignore`

**Interfaces:**

- Produces scheme `DrinkSaver`, application target `DrinkSaver`, unit target `DrinkSaverTests`,
  and UI target `DrinkSaverUITests`.
- Produces bundle identifier `im.kak.drinksaver`, deployment target `18.0`, Swift 6 language mode,
  iPhone device family only, and portrait orientations only.

- [ ] **Step 1: Verify the approved machine prerequisite**

Do not install Xcode or use `sudo` inside this repository task. Confirm the operator has already
installed the pinned full Xcode/iOS 18.5 runtime and explicitly approved the system selection:

```bash
xcode-select -p
xcodebuild -version
xcrun simctl list devices available
```

Expected: `xcodebuild` reports full Xcode, and an available iPhone 13 mini simulator is listed.

- [ ] **Step 2: Create the project with no sample persistence or test framework package**

In Xcode create an iOS App named `DrinkSaver`, interface SwiftUI, language Swift, tests enabled,
storage None, bundle identifier `im.kak.drinksaver`, minimum iOS 18.0. Remove iPad and landscape
support in target settings. Check in `Info.plist`, set `GENERATE_INFOPLIST_FILE = NO`, and create
actual Local, Test, and Release build configurations with scheme mappings.

- [ ] **Step 3: Add a failing project-settings assertion**

`ios/scripts/validate-project-settings.sh` parses `xcodebuild -showBuildSettings` for every app
configuration and the built app's Info.plist. It fails unless deployment target is 18.0, device
family is iPhone only, supported orientations are portrait-only, bundle ID is exact, the physical
Info.plist is used, and Swift 6 mode is enabled. `ProjectSmokeTests` checks only app behavior that
is meaningful inside the test host.

```bash
ios/scripts/validate-project-settings.sh
```

Expected before correction: FAIL naming missing or mismatched settings.

- [ ] **Step 4: Run the unit target and correct project settings until it passes**

```bash
xcodebuild test \
  -project ios/DrinkSaver.xcodeproj \
  -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=18.5' \
  -only-testing:DrinkSaverTests/ProjectSmokeTests
```

Expected: one passing test and no signing requirement.

- [ ] **Step 5: Add and run a launch UI test**

`ProjectSmokeUITests.testAppLaunches()` launches the application and asserts a root element with
accessibility identifier `app.root` exists.

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=18.5' \
  -only-testing:DrinkSaverUITests/ProjectSmokeUITests
```

Expected: PASS.

- [ ] **Step 6: Ignore only developer-local Xcode output**

Add `ios/DerivedData/`, `*.xcuserstate`, and `xcuserdata/` to `.gitignore`. Do not ignore shared
schemes, Swift package resolution, test plans, reference images, or `.xcconfig` files.

- [ ] **Step 7: Commit the independently buildable project**

```bash
git add .gitignore ios
git commit -m "build: add native iOS project"
```

## IOS-002: Freeze the visual and behavioral reference catalogue

**Outcome:** Reviewers have deterministic evidence for every web state the native app must match.

**Dependencies:** `IOS-001` only for the destination directory; this task changes no app code.

**Files:**

- Create: `ios/Reference/README.md`
- Create: `ios/Reference/state-matrix.md`
- Create: `ios/Reference/web/**.png`
- Create: `web/e2e/tests/ios-reference.spec.ts`

**Interfaces:**

- Produces named reference IDs such as `quick-ready-dark-375x812` consumed by visual tests.
- Produces no runtime asset and must not alter the frozen web UI.

- [ ] **Step 1: Write the failing reference-manifest test**

Add a Playwright test that checks the required state table contains both themes and the three
reference widths before attempting screenshots:

```ts
expect(referenceCases.some((entry) => entry.id === 'quick-ready-dark-375x812')).toBe(true);
expect(new Set(referenceCases.map((entry) => entry.theme))).toEqual(new Set(['dark', 'light']));
```

- [ ] **Step 2: Run it against the frozen commit and confirm the missing catalogue fails**

Reject a dirty source checkout. Create a detached temporary worktree at full SHA
`28c33fde49566559f21c626dde2f5fcdfaae3d34`, copy only the new capture harness into that worktree,
and run Compose there under an isolated project name/ports. Never check out the frozen SHA in the
implementation worktree. Record the exact rebuild and teardown commands in the reference README.

```bash
cd web && npm run e2e -- ios-reference.spec.ts
```

Expected: FAIL because the reference cases and output directory do not exist yet.

- [ ] **Step 3: Capture the complete approved state matrix**

Build the Compose frontend from the full frozen SHA. Capture iPhone SE 3rd generation (375×667
points), iPhone 13 mini (375×812 points), and iPhone 16 Pro Max (440×956 points), portrait only.
Render each at 3x into an sRGB, opaque PNG after applying the documented safe-area/status-bar
crop. Cover both themes and every state family enumerated in the spec. Use request interception
and fixed dates for deterministic data; do not write production data.

- [ ] **Step 4: Document provenance and naming**

`ios/Reference/README.md` records the full commit SHA, browser version, viewport, device scale
factor (3x), sRGB conversion, alpha flattening, crop rectangle, locale `en-GB`, fixed time,
fixture source, capture command, and the rule that later web
changes do not replace these images.

- [ ] **Step 5: Re-run and review images at rendered size**

```bash
cd web && npm run e2e -- ios-reference.spec.ts
```

Expected: every expected image is written and the test passes. Inspect each 375×812 image at 100%
scale; reject clipped content, stale containers, or missing fonts before accepting the catalogue.

- [ ] **Step 6: Commit reference evidence separately from native implementation**

```bash
git add ios/Reference web/e2e/tests/ios-reference.spec.ts
git commit -m "test: freeze native iOS parity references"
```

## IOS-003: Add deterministic environment and version configuration

**Outcome:** Local, Test, and Release builds resolve validated public endpoints and the shared
marketing version without runtime URL editing.

**Dependencies:** `IOS-001`.

**Files:**

- Create: `ios/Config/Local.xcconfig`
- Create: `ios/Config/Test.xcconfig`
- Create: `ios/Config/Release.xcconfig`
- Create: `ios/scripts/xcodebuild.sh`
- Create: `ios/DrinkSaver/App/AppConfiguration.swift`
- Create: `ios/DrinkSaverTests/AppConfigurationTests.swift`
- Create: `ios/DrinkSaverTests/Fixtures/Configuration/Local.plist`
- Create: `ios/DrinkSaverTests/Fixtures/Configuration/Test.plist`
- Create: `ios/DrinkSaverTests/Fixtures/Configuration/Release.plist`
- Modify: `ios/DrinkSaver.xcodeproj/project.pbxproj`
- Modify: `ios/DrinkSaver/Info.plist`
- Modify: `docs/DEPLOYMENT.md`

**Interfaces:**

```swift
struct AppConfiguration: Equatable, Sendable {
    enum Environment: String, Sendable { case local, test, production }
    let environment: Environment
    let apiBaseURL: URL
    let issuerURL: URL // complete OIDC issuer including `/realms/<realm>`
    let clientID: String
    let redirectURL: URL
    static func load(bundle: Bundle = .main) throws -> AppConfiguration
}
```

- [ ] **Step 1: Write failing configuration tests**

Test that each fixture plist resolves its expected environment/client, that Release accepts only
the exact approved HTTPS API and OIDC issuer origins (scheme, host, port, and issuer path), that
the redirect is exactly `im.kak.drinksaver:/oauth2redirect`, and that a missing value throws
`ConfigurationError.missing(key:)` rather than force-unwrapping. Build Local and Release fixtures
and assert any narrowly scoped localhost ATS exception exists only in Local and is absent from the
built Test/Release Info.plists.

- [ ] **Step 2: Run the focused test and verify failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/AppConfigurationTests
```

Expected: FAIL because `AppConfiguration` does not exist.

- [ ] **Step 3: Implement configuration loading and checked-in values**

Use Info.plist substitutions backed by `.xcconfig`. Configure client IDs exactly as follows:

```text
Local   drinksaver-ios-local
Test    drinksaver-ios-test
Release drinksaver-ios
```

Use the repository's existing local/test/production API and issuer hosts; derive them from
`deploy/local/`, `deploy/values/`, and `web` runtime configuration instead of copying a remembered
URL. `.xcconfig` contains no password, signing identity, API key, or client secret.

- [ ] **Step 4: Wire `VERSION` into `MARKETING_VERSION`**

Set `MARKETING_VERSION = $(DRINKSAVER_VERSION)` and
`CURRENT_PROJECT_VERSION = $(DRINKSAVER_BUILD_NUMBER)` in the project, with development fallbacks
`0.0.0` and `1` in the checked-in configuration. A separate debug-only display suffix may say
`local`. `ios/scripts/xcodebuild.sh` reads and
validates repository-root `VERSION`, then passes `DRINKSAVER_VERSION=<value>` and
`DRINKSAVER_BUILD_NUMBER=${DRINKSAVER_BUILD_NUMBER:-1}` as explicit `xcodebuild` settings. CI and
archive commands must use this wrapper; no generated or duplicated version file is committed.

- [ ] **Step 5: Run focused tests and inspect built settings**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/AppConfigurationTests
ios/scripts/xcodebuild.sh -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver -showBuildSettings \
  | rg 'MARKETING_VERSION|CURRENT_PROJECT_VERSION|PRODUCT_BUNDLE_IDENTIFIER'
```

Expected: tests pass; marketing version equals the current contents of repository `VERSION`;
bundle identifier is `im.kak.drinksaver`. A Local build can reach the documented HTTP development
origin, while built Test and Release plists contain no broad or local cleartext exception.

- [ ] **Step 6: Document the iOS version/config contract**

Update `docs/DEPLOYMENT.md` without weakening its existing single-version rule. Explain that Apple
build numbers may change without modifying `VERSION`.

- [ ] **Step 7: Commit**

```bash
git add ios/Config ios/DrinkSaver/App/AppConfiguration.swift \
  ios/DrinkSaverTests/AppConfigurationTests.swift ios/scripts/xcodebuild.sh \
  ios/DrinkSaver.xcodeproj docs/DEPLOYMENT.md
git commit -m "build: configure native app environments"
```

## IOS-003A: Add the deterministic UI-test fixture harness

**Outcome:** Every later XCUITest can launch an authenticated, clock-controlled, API-controlled
state without production code exposing a fake-authentication route.

**Dependencies:** `IOS-001`, `IOS-003`, `IOS-008`, `IOS-010`.

**Files:**

- Create: `ios/UITestSupport/UITestFixture.swift`
- Create: `ios/UITestSupport/UITestFixtureBootstrap.swift`
- Create: `ios/DrinkSaverUITests/FixtureHarnessUITests.swift`
- Create: `ios/scripts/assert-release-has-no-fixtures.sh`
- Modify: `ios/DrinkSaver/App/DrinkSaverApp.swift`
- Modify: `ios/DrinkSaver.xcodeproj/project.pbxproj`

**Interface:** Debug UI-test launches accept `-ui-fixture <state-id>` plus fixed clock, locale,
content-size, and Reduce Motion arguments. Fixture sources compile only under a dedicated
`UI_TESTING` condition and have no Release target membership.

- [ ] Write a failing UI test that requests a signed-in fixture and asserts its state identifier.
- [ ] Add the smallest bootstrap that injects fake session/API/clock dependencies before root
  creation; unknown fixture IDs fail the test launch loudly.
- [ ] Add a Release archive inspection that fails if `ui-fixture`, fixture IDs, fake tokens,
  `UITestFixture`, or `UI_TESTING` symbols/resources are present.
- [ ] Run the harness UI test on iPhone 13 mini/iOS 18.5 and the archive inspection.
- [ ] Commit only the harness and compile-time boundary.

```bash
git add ios/UITestSupport ios/DrinkSaverUITests/FixtureHarnessUITests.swift \
  ios/scripts/assert-release-has-no-fixtures.sh ios/DrinkSaver/App/DrinkSaverApp.swift \
  ios/DrinkSaver.xcodeproj
git commit -m "test: add isolated iOS UI fixture harness"
```

## IOS-004: Port drinking-day and retry rules as pure Swift

**Outcome:** Calendar and error decisions match the frozen web logic without UI or network
dependencies.

**Dependencies:** `IOS-001`.

**Files:**

- Create: `ios/DrinkSaver/Shared/Domain/Clock.swift`
- Create: `ios/DrinkSaver/Shared/Domain/DrinkingDay.swift`
- Create: `ios/DrinkSaver/Shared/Domain/HTTPStatusError.swift`
- Create: `ios/DrinkSaver/Shared/Domain/RetryPolicy.swift`
- Create: `ios/DrinkSaverTests/DrinkingDayTests.swift`
- Create: `ios/DrinkSaverTests/RetryPolicyTests.swift`

**Interfaces:**

```swift
protocol Clock: Sendable { var now: Date { get } }
struct SystemClock: Clock { var now: Date { Date() } }

enum DrinkingDay {
    static func date(for instant: Date, calendar: Calendar) -> Date
    static func isoString(for instant: Date, calendar: Calendar) -> String
    static func strip(endingAt date: Date, count: Int, calendar: Calendar) -> [Date]
    static func label(for date: Date, today: Date, locale: Locale, calendar: Calendar) -> String
}

enum RetryKind: Equatable { case timeout, connection, client(Int), server(Int), unknown }
struct HTTPStatusError: Error, Equatable { let statusCode: Int }
enum RetryPolicy { static func classify(_ error: Error) -> RetryKind }
```

- [ ] **Step 1: Port the frozen edge cases as failing XCTest cases**

Cover 05:59 versus 06:00, month/year/leap-day rollover, Europe/Amsterdam spring and autumn DST,
seven dates oldest-first, fixed `en-GB` Today/Yesterday/full-date labels even under a non-English
process locale, `URLError.timedOut`, connection errors, transport-neutral `HTTPStatusError` 4xx/
5xx values, and an unrelated error. `IOS-008` maps its API error to this domain contract.

- [ ] **Step 2: Run and confirm compile failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/DrinkingDayTests \
  -only-testing:DrinkSaverTests/RetryPolicyTests
```

Expected: FAIL because the types are undefined.

- [ ] **Step 3: Implement with `Calendar`, not 86,400-second subtraction**

Set hour/minute/second to 06:00 local and subtract one calendar day when the instant precedes the
boundary. Use `Calendar.date(byAdding:.day,value:)` for strip/yesterday behavior.

- [ ] **Step 4: Re-run focused tests**

Expected: all calendar and classification cases pass in any developer time zone.

- [ ] **Step 5: Commit**

```bash
git add ios/DrinkSaver/Shared/Domain ios/DrinkSaverTests/DrinkingDayTests.swift \
  ios/DrinkSaverTests/RetryPolicyTests.swift
git commit -m "feat: port native drinking day rules"
```

## IOS-005A/B/C: Port themes, fonts, and application artwork

**Outcome:** Native tokens and typography reproduce the frozen dark/light system, including the
plaster background, without feature code.

**Dependencies:** `IOS-001`, `IOS-002` for comparison evidence.

**Pickup rule:** This heading groups three independently testable tasks: `IOS-005A` theme/tokens,
`IOS-005B` font pipeline, and `IOS-005C` icon/launch/privacy resources. Implement and commit each
subtask separately; downstream `IOS-006` depends on all three.

| Task | Owned files and focused verification |
| --- | --- |
| `IOS-005A` | `Color+Hex.swift`, `DrinkSaverTheme.swift`, `ThemeStore.swift`, `PlasterBackground.swift`, `ThemeTests.swift`; run only `ThemeTests` and base-surface comparison. |
| `IOS-005B` | `Resources/Fonts/**`, `OFL.txt`, `generate-font-assets.sh`, font section of `ios/README.md`, `FontRegistrationTests.swift`; regenerate from pinned inputs and run only font tests. |
| `IOS-005C` | AppIcon assets, `LaunchScreen.storyboard`, `PrivacyInfo.xcprivacy`, their project resource membership; run asset-catalog validation, privacy-manifest validation, and visual icon/launch review. |

**Files:**

- Create: `ios/DrinkSaver/Shared/Design/Color+Hex.swift`
- Create: `ios/DrinkSaver/Shared/Design/DrinkSaverTheme.swift`
- Create: `ios/DrinkSaver/Shared/Design/ThemeStore.swift`
- Create: `ios/DrinkSaver/Shared/UI/PlasterBackground.swift`
- Create: `ios/DrinkSaver/Resources/Fonts/**`
- Create: `ios/DrinkSaver/Resources/OFL.txt`
- Create: `ios/DrinkSaver/Resources/PrivacyInfo.xcprivacy`
- Create: `ios/DrinkSaver/Resources/LaunchScreen.storyboard`
- Create: `ios/scripts/generate-font-assets.sh`
- Create: `ios/README.md`
- Modify: `ios/DrinkSaver/Resources/Assets.xcassets/**`
- Modify: `ios/DrinkSaver.xcodeproj/project.pbxproj`
- Create: `ios/DrinkSaverTests/ThemeTests.swift`
- Create: `ios/DrinkSaverTests/FontRegistrationTests.swift`

**Interfaces:**

```swift
enum ThemeMode: String, Codable, CaseIterable { case dark, light }

struct DrinkSaverTheme: Equatable {
    let mode: ThemeMode
    let surface: SurfaceTokens
    let ink: InkTokens
    let line: LineTokens
    let accent: AccentTokens
    let elevation: ElevationTokens
    static let dark: DrinkSaverTheme
    static let light: DrinkSaverTheme
}

@MainActor @Observable final class ThemeStore {
    private(set) var mode: ThemeMode
    var theme: DrinkSaverTheme { get }
    func toggle()
}
```

- [ ] **IOS-005A Step 1: Write failing token, persistence, and contrast tests**

Assert every literal from `web/src/theme/tokens.ts` and `primitives.ts`; dark is the missing-key
default; toggling persists under `drinksaver-theme`; and contrast passes in both themes.

- [ ] **Step 2: Run focused tests and record expected failures**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/ThemeTests \
  -only-testing:DrinkSaverTests/FontRegistrationTests
```

- [ ] **IOS-005B Step 1: Add failing font registration/glyph tests**

Assert all named Fraunces/Familjen roles resolve and Latin Extended strings `fröccs`, `rosé
fröccs`, and `pálinka` render nonempty glyph paths.

- [ ] **IOS-005B Step 2: Source native font files from the same OFL releases**

Use Fraunces instances with the frozen role axis values and Familjen Grotesk 400–700. Keep the
OFL text. Do not convert or ship the repository's WOFF2 files. The reproducible asset script
downloads pinned upstream variable TTF sources, verifies committed SHA-256 checksums, and uses a
pinned `fonttools` version to instantiate Fraunces's exact `opsz`, `wght`, `SOFT`, and `WONK`
values. Commit the resulting TTF/OTF assets; runtime and ordinary CI builds do not install Python
font tooling. Record source revision, generator version, axis values, and output checksums in
`ios/README.md`.

- [ ] **IOS-005A Step 2: Implement tokens and the one root texture layer**

Port exact values. Apply the texture once in `PlasterBackground`; feature surfaces receive flat
theme colors and do not each decode their own noise asset.

- [ ] **IOS-005C Step 1: Adapt the existing mark for application and launch assets**

Use `web/public/favicon.svg` as the only brand source. Add an umber full-bleed background and size
the cream/red glass mark for Apple's safe visual area without changing its paths or palette.
Generate the complete AppIcon asset set and a static launch screen using the same ground and mark.
Verify icon edges at actual home-screen size and confirm no required rendition is missing.

- [ ] **IOS-005C Step 2: Add and validate the app privacy manifest**

Declare the app's direct `UserDefaults` access under
`NSPrivacyAccessedAPICategoryUserDefaults` with approved app-only reason `CA92.1`. Inventory direct
required-reason API use and add no declaration unsupported by actual code. Verify the resource is
in the app target and later archived privacy report; package manifests do not cover app code.

- [ ] **Step 6: Re-run tests and compare the base surface references**

Expected: token/font tests pass in both themes and default mode remains dark regardless of the
simulator's appearance setting.

- [ ] **Step 7: Commit each independently green subtask**

```bash
git add ios/DrinkSaver/Shared/Design/Color+Hex.swift \
  ios/DrinkSaver/Shared/Design/DrinkSaverTheme.swift \
  ios/DrinkSaver/Shared/Design/ThemeStore.swift \
  ios/DrinkSaver/Shared/UI/PlasterBackground.swift ios/DrinkSaverTests/ThemeTests.swift
git commit -m "feat: add native DrinkSaver theme"
git add ios/DrinkSaver/Resources/Fonts ios/DrinkSaver/Resources/OFL.txt \
  ios/scripts/generate-font-assets.sh ios/DrinkSaverTests/FontRegistrationTests.swift ios/README.md
git commit -m "build: add reproducible native fonts"
git add ios/DrinkSaver/Resources/Assets.xcassets ios/DrinkSaver/Resources/LaunchScreen.storyboard \
  ios/DrinkSaver/Resources/PrivacyInfo.xcprivacy ios/DrinkSaver.xcodeproj
git commit -m "feat: add native app artwork and privacy manifest"
```

## IOS-006: Port palette and glass design metadata

**Outcome:** Backend palette/glass IDs resolve independently and server SVG path data renders as
native shapes with exact fallbacks.

**Dependencies:** `IOS-001`, `IOS-005A`, `IOS-005B`, `IOS-005C`.

**Files:**

- Create: `ios/DrinkSaver/Shared/Design/DesignCatalogue.swift`
- Create: `ios/DrinkSaver/Shared/Design/DesignResolver.swift`
- Create: `ios/DrinkSaver/Shared/Design/GlassShape.swift`
- Create: `ios/DrinkSaverTests/DesignResolverTests.swift`
- Create: `ios/DrinkSaverTests/GlassShapeTests.swift`

**Interfaces:**

```swift
struct Palette: Codable, Equatable, Identifiable, Sendable {
    let id: Int; let name: String; let field: String
    let inkLight: String?; let inkDark: String
}
struct Glassware: Codable, Equatable, Identifiable, Sendable {
    let id: Int; let name: String; let g: String; let l: String; let f: String?
}
struct ResolvedDrinkDesign: Equatable, Sendable {
    let palette: Palette; let glassware: Glassware
}

struct DesignCatalogue: Equatable, Sendable {
    let palettes: [Palette]; let glassware: [Glassware]
    func palette(id: Int?) -> Palette
    func glass(id: Int?) -> Glassware
}
```

- [ ] **Step 1: Write failing fallback and independence tests**

Port IDs 1–8 and all frozen glass examples. Assert unknown/null palette becomes cream, unknown/null
glass becomes highball, changing only one ID never changes the other, and inherited subtype/brand
rules match `web/src/drink/designSelection.ts`.

- [ ] **Step 2: Add failing path-render tests**

Decode representative `g`, `l`, and optional `f` path strings, fit them into a 24×40 point box,
and assert the resulting bounds are nonempty and remain inside the box. Include every backend
glass kind represented in current fixtures.

- [ ] **Step 3: Run focused tests**

Expected: compile failure before the design types exist.

- [ ] **Step 4: Implement the minimum resolver and SVG-path parser**

Implement the backend's actual relative/absolute SVG subset `M/L/H/V/C/S/A/Z`, including
elliptical arcs, using `CGPath`/SwiftUI `Path`. Reject non-finite numbers, overlong path strings,
excessive segment counts, unsupported commands, and pathological bounds; return the highball
fallback rather than crashing. Do not infer palette or glass from display names when structural
IDs exist.

- [ ] **Step 5: Run tests and render every glass at actual plate/history size**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/DesignResolverTests \
  -only-testing:DrinkSaverTests/GlassShapeTests
```

Expected: PASS; human inspection confirms each small silhouette remains recognizable.

- [ ] **Step 6: Commit**

```bash
git add ios/DrinkSaver/Shared/Design ios/DrinkSaverTests/DesignResolverTests.swift \
  ios/DrinkSaverTests/GlassShapeTests.swift
git commit -m "feat: render native drink identity metadata"
```

## IOS-007: Define wire models and endpoint contract fixtures

**Outcome:** Every REST payload used by the clone has a precise Swift model and a fixture-backed
encoding/decoding test before networking exists.

**Dependencies:** `IOS-001`, `IOS-006`.

**Files:**

- Create: `ios/DrinkSaver/Shared/API/APIModels.swift`
- Create: `ios/DrinkSaverTests/APIModelTests.swift`
- Create: `ios/DrinkSaverTests/Fixtures/API/**.json`

**Interfaces:**

Define `Codable`, `Equatable`, `Sendable` wire types for `DrinkSaveRequest`, `SavedDrink`,
`Recommendation`, `RecommendationEdit`, `AlcoholType`, `AlcoholVolume`, `AlcoholSubtype`,
`ConsumptionType`, `Brand`, `BeerFlavour`, `NewAlcoholEntry`, `NewVolumeEntry`,
`NewAlcoholSubtype`, `NewBeerBrand`, `NewBeerFlavour`, and `EditableDrink`. Reuse the `Palette`
and `Glassware` wire types produced by `IOS-006`; do not declare duplicates in the API module.
`Recommendation.id` is `Int?` despite the current OpenAPI omission because ordinary
server recommendations may serialize it as null.

- [ ] **Step 1: Write one failing round-trip/decoding test per endpoint shape**

Use captured, redacted JSON fixtures derived from `docs/api-docs.yaml`, backend DTOs, and current
web E2E fixtures. Assert absent optional keys remain absent when encoding requests; ordered
recommendation edits retain order; a one-element and multi-element save response both decode as
arrays; nullable design IDs decode correctly.

- [ ] **Step 2: Run and verify model tests fail to compile**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/APIModelTests
```

- [ ] **Step 3: Implement exact `CodingKeys` and request initializers**

Do not put display formatting, identity fallbacks, query-cache state, or view flags in wire types.
Do not send `userId`; the backend derives identity from the bearer token.

- [ ] **Step 4: Cross-check every fixture against the backend and OpenAPI**

For each property, identify the Java DTO/entity accessor that produces it. Record any mismatch as
an evidence-backed contract defect; do not silently make the Swift decoder accept an invented
shape.

- [ ] **Step 5: Re-run model tests**

Expected: all fixtures decode/encode exactly and malformed required values throw.

- [ ] **Step 6: Commit**

```bash
git add ios/DrinkSaver/Shared/API/APIModels.swift ios/DrinkSaverTests/APIModelTests.swift \
  ios/DrinkSaverTests/Fixtures/API
git commit -m "test: define native API wire contracts"
```

## IOS-008: Implement the authenticated REST transport

**Outcome:** A small async API client implements every endpoint with exact methods, timeout,
serialization, refresh/replay, and error mapping.

**Dependencies:** `IOS-003`, `IOS-004`, `IOS-006`, `IOS-007`. Use an authorization fake until
`IOS-010`.

**Files:**

- Create: `ios/DrinkSaver/Shared/API/DrinkSaverAPI.swift`
- Create: `ios/DrinkSaver/Shared/API/APIError.swift`
- Create: `ios/DrinkSaver/Shared/API/APIClient.swift`
- Create: `ios/DrinkSaverTests/APIClientTests.swift`
- Create: `ios/DrinkSaverTests/URLProtocolStub.swift`

**Interfaces:**

```swift
@MainActor protocol AccessTokenProviding: Sendable {
    func accessToken(forceRefresh: Bool) async throws -> String
}

protocol DrinkSaverAPI: Sendable {
    func saveDrink(_ request: DrinkSaveRequest) async throws -> [SavedDrink]
    func recommendations() async throws -> [Recommendation]
    func editRecommendations(_ edits: [RecommendationEdit]) async throws -> [Recommendation]
    func deleteRecommendation(id: Int) async throws
    func alcoholTypes() async throws -> [AlcoholType]
    func createAlcoholType(_ entry: NewAlcoholEntry) async throws -> AlcoholType
    func volumes(alcoholTypeID: Int) async throws -> [AlcoholVolume]
    func createVolume(alcoholTypeID: Int, entry: NewVolumeEntry) async throws -> AlcoholVolume
    func subtypes(alcoholTypeID: Int) async throws -> [AlcoholSubtype]
    func createSubtype(alcoholTypeID: Int, entry: NewAlcoholSubtype) async throws -> AlcoholSubtype
    func consumptionTypes(amount: Int) async throws -> [ConsumptionType]
    func brands() async throws -> [Brand]
    func createBrand(_ entry: NewBeerBrand) async throws -> Brand
    func flavours(brandID: Int) async throws -> [BeerFlavour]
    func createFlavour(brandID: Int, entry: NewBeerFlavour) async throws -> BeerFlavour
    func palettes() async throws -> [Palette]
    func glassware() async throws -> [Glassware]
    func drinks(date: String) async throws -> [EditableDrink]
    func deleteDrinks(ids: [Int]) async throws -> Int
}
```

- [ ] **Step 1: Write failing request-contract tests**

For every method assert HTTP method, exact path, content type, body, repeated
`drinkIds=1&drinkIds=2` query encoding, `amount=100`, ten-second timeout, and bearer header.

- [ ] **Step 2: Write failing authentication/error tests**

Assert one 401 calls `accessToken(forceRefresh:true)` once and replays once; a second 401 is
returned without looping; 400 maps to `.client(400)`; 503 to `.server(503)`; timeout and no-network
remain distinct; decoding errors carry no response body or token into logs.

- [ ] **Step 3: Run focused tests and verify failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/APIClientTests
```

- [ ] **Step 4: Implement `APIClient` as an actor**

Use a configured ephemeral `URLSession` and injected `AccessTokenProviding`. Keep one private
generic `send<Response: Decodable>` method. Do not build a repository layer or cache.

- [ ] **Step 5: Re-run focused tests**

Expected: all endpoint, retry, timeout, and privacy assertions pass.

- [ ] **Step 6: Commit**

```bash
git add ios/DrinkSaver/Shared/API ios/DrinkSaverTests/APIClientTests.swift \
  ios/DrinkSaverTests/URLProtocolStub.swift
git commit -m "feat: add native DrinkSaver API client"
```

## IOS-009: Add Keychain authorization-state persistence

**Outcome:** Serialized AppAuth state can be saved, restored, replaced, and cleared without
leaving tokens in preferences, logs, backups, or other devices.

**Dependencies:** `IOS-001`.

**Files:**

- Create: `ios/DrinkSaver/Shared/Auth/KeychainAuthorizationStore.swift`
- Create: `ios/DrinkSaverTests/KeychainAuthorizationStoreTests.swift`
- Create: `ios/DrinkSaverTests/InMemoryAuthorizationDataStore.swift`

**Interfaces:**

```swift
protocol AuthorizationDataStoring: Sendable {
    func read() throws -> Data?
    func write(_ data: Data) throws
    func clear() throws
}

struct KeychainAuthorizationStore: AuthorizationDataStoring {
    init(service: String = "im.kak.drinksaver.auth", account: String = "oid-auth-state",
         backend: any KeychainBackend = SecurityKeychainBackend())
}

protocol KeychainBackend: Sendable {
    func read(service: String, account: String) throws -> Data?
    func write(_ data: Data, service: String, account: String) throws
    func clear(service: String, account: String) throws
}
```

- [ ] **Step 1: Write failing store-contract tests against an in-memory Security adapter**

Assert missing reads return nil, write/read preserves bytes, second write replaces rather than
duplicates, clear is idempotent, an unexpected OSStatus becomes a typed error, and no error
description contains stored bytes. Use a capturing `KeychainBackend` test double to assert the
exact add/update/read dictionaries include `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`, omit
`kSecAttrSynchronizable`, and never request migratable backup behavior.

- [ ] **Step 2: Run and verify failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/KeychainAuthorizationStoreTests
```

- [ ] **Step 3: Implement one generic-password item**

Set `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`; use update-then-add semantics; never use
`UserDefaults`, iCloud Keychain synchronizable items, or token logging.

- [ ] **Step 4: Run focused tests and a simulator persistence smoke check**

Expected: tests pass; state survives normal relaunch, does not appear in preferences, and clear
removes it.

- [ ] **Step 5: Commit**

```bash
git add ios/DrinkSaver/Shared/Auth/KeychainAuthorizationStore.swift \
  ios/DrinkSaverTests/KeychainAuthorizationStoreTests.swift \
  ios/DrinkSaverTests/InMemoryAuthorizationDataStore.swift
git commit -m "feat: persist native authorization securely"
```

## IOS-010: Integrate AppAuth and the authenticated session gate

**Outcome:** Users can sign in, restore a 90-day-capable session, refresh once for API use, cancel
safely, and log out.

**Dependencies:** `IOS-003`, `IOS-008`, `IOS-009`.

**Files:**

- Create: `ios/DrinkSaver/Shared/Auth/AuthorizationProviding.swift`
- Create: `ios/DrinkSaver/Shared/Auth/AppAuthClient.swift`
- Create: `ios/DrinkSaver/Shared/Auth/SessionStore.swift`
- Create: `ios/DrinkSaverTests/AppAuthClientTests.swift`
- Create: `ios/DrinkSaverTests/SessionStoreTests.swift`
- Modify: `ios/DrinkSaver.xcodeproj/project.pbxproj`
- Modify: `ios/DrinkSaver/Info.plist`

**Interfaces:**

```swift
enum SessionState: Equatable { case restoring, signedOut, authorizing, signedIn, failed(String) }

@MainActor protocol AuthorizationProviding: AccessTokenProviding {
    var subject: String? { get }
    func restore() async throws -> Bool
    func signIn() async throws
    func signOut() async
    func resume(url: URL) -> Bool
}

@MainActor @Observable final class SessionStore {
    private(set) var state: SessionState
    var userID: String? { get }
    func restore() async
    func signIn() async
    func signOut() async
    func handleOpenURL(_ url: URL) -> Bool
}
```

- [ ] **Step 1: Add AppAuth-iOS 2.1.0 with Swift Package Manager**

Pin exact version `2.1.0` from `https://github.com/openid/AppAuth-iOS.git`, link product
`AppAuth`, and commit `Package.resolved`. Do not accept an unbounded branch or moving revision.

- [ ] **Step 2: Write failing session tests using `FakeAuthorizationProvider`**

Cover restore success/failure, sign-in success/cancel/error, one state transition at a time,
subject extraction, logout local clearing even when end-session fails, and cancellation returning
to `.signedOut` rather than `.failed`.

- [ ] **Step 3: Write failing AppAuth adapter tests**

Inject discovery/authorization factories around AppAuth. Assert scopes are exactly `openid`,
`profile`, and `offline_access`; client secret is nil; PKCE is used; redirect URI is exact;
serialized `OIDAuthState` is saved after authorization and refresh; concurrent token requests
share one fresh-token action.

Archive `OIDAuthState` with `NSKeyedArchiver(requiringSecureCoding: true)` and unarchive only the
expected AppAuth classes. Add corrupt/legacy archive tests that clear the invalid value and return
to signed-out without crashing.

- [ ] **Step 4: Run focused tests and verify failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/AppAuthClientTests \
  -only-testing:DrinkSaverTests/SessionStoreTests
```

- [ ] **Step 5: Implement system authentication and redirect resumption**

Build `OIDAuthorizationRequest` from issuer discovery, public client ID, nil secret, and the three
scopes. Retain the external-user-agent flow until callback. Register only the
`im.kak.drinksaver` URL scheme. Forward `.onOpenURL` to `SessionStore.handleOpenURL`.

- [ ] **Step 6: Implement refresh and logout**

Use `OIDAuthState.performActionWithFreshTokens` to obtain access tokens; for an explicit forced
refresh, call `setNeedsTokenRefresh()` first. Bridge the callback with a checked continuation on
the main actor; rely on AppAuth's coalescing rather than adding a second refresh lock. Persist
every state change, including rotated refresh tokens, before reporting refresh success. Attempt
provider end-session/revocation when advertised; always clear Keychain and in-memory state. Never
log access, ID, refresh, or offline tokens.

- [ ] **Step 7: Run focused tests; defer live Keycloak proof**

Expected: focused tests pass against the AppAuth/session doubles. Real login, authenticated
request, relaunch restore, and logout are acceptance for `IOS-023C` after `IOS-023A` creates the
local client; they do not block this adapter task.

- [ ] **Step 8: Commit**

```bash
git add ios/DrinkSaver/Shared/Auth ios/DrinkSaverTests/AppAuthClientTests.swift \
  ios/DrinkSaverTests/SessionStoreTests.swift ios/DrinkSaver.xcodeproj ios/DrinkSaver/Info.plist
git commit -m "feat: authenticate native users with Keycloak"
```

## IOS-010A: Load and own the authenticated design catalogue

**Outcome:** One in-memory store supplies backend palettes/glassware to every feature, with frozen
fallbacks during loading/failure and no account state leaking across logout.

**Dependencies:** `IOS-003A`, `IOS-006`, `IOS-008`, `IOS-010`.

**Files:**

- Create: `ios/DrinkSaver/Shared/Design/DesignCatalogueStore.swift`
- Create: `ios/DrinkSaverTests/DesignCatalogueStoreTests.swift`
- Modify: `ios/DrinkSaver/App/RootView.swift`

**Interface:**

```swift
@MainActor @Observable final class DesignCatalogueStore {
    enum State: Equatable { case idle, loading, ready, failed }
    private(set) var state: State
    private(set) var catalogue: DesignCatalogue
    func load() async
    func retry() async
    func sessionDidSignOut()
}
```

- [ ] Write failing tests for parallel `palettes()`/`glassware()` fetches, partial/total failure,
  Retry, unknown-ID fallback while loading/failed, late-response rejection after logout, and fresh
  reload for another authenticated subject.
- [ ] Implement only in-memory state; do not hard-code current server IDs as a runtime catalogue or
  persist responses to disk.
- [ ] Inject the store once at the authenticated root and pass it to Quick/Add/History.
- [ ] Run `DesignCatalogueStoreTests` and a signed-in fixture smoke test, then commit.

```bash
git add ios/DrinkSaver/Shared/Design/DesignCatalogueStore.swift \
  ios/DrinkSaverTests/DesignCatalogueStoreTests.swift ios/DrinkSaver/App/RootView.swift
git commit -m "feat: load native design catalogues"
```

## IOS-011: Implement the shared save/delete queue

**Outcome:** Immediate saves, deferred deletes, Undo, Retry, timeout verification, and background
recovery are available to every feature independently of UI.

**Dependencies:** `IOS-003`, `IOS-004`, `IOS-007`, `IOS-008`, `IOS-010`.

**Files:**

- Create: `ios/DrinkSaver/Shared/Queue/SaveQueueReducer.swift`
- Create: `ios/DrinkSaver/Shared/Queue/SaveQueueStore.swift`
- Create: `ios/DrinkSaver/Shared/Queue/PendingDeleteStore.swift`
- Create: `ios/DrinkSaverTests/SaveQueueReducerTests.swift`
- Create: `ios/DrinkSaverTests/SaveQueueStoreTests.swift`
- Create: `ios/DrinkSaverTests/PendingDeleteStoreTests.swift`

**Interfaces:**

```swift
enum QueueStatus: Equatable { case saving, undoable(until: Date), undoing, failed(QueueFailure), committed }
enum QueueKind: Equatable { case save(SaveOperation), delete(DeleteOperation) }
struct QueueEntry: Identifiable, Equatable { let id: UUID; let sequence: Int; var kind: QueueKind; var status: QueueStatus }
struct SaveQueueState: Equatable { var entries: [QueueEntry] = [] }
struct PendingDeleteRecord: Codable, Equatable {
    let operationID: UUID
    let drinkIDs: [Int]
    let environment: AppConfiguration.Environment
    let issuer: URL
    let subject: String
}

@MainActor @Observable final class SaveQueueStore {
    private(set) var state: SaveQueueState
    var currentFeedback: QueueEntry? { get }
    func save(_ operation: SaveOperation) -> UUID
    func delete(_ operation: DeleteOperation) -> UUID?
    func undoCurrent()
    func retryCurrent()
    func applicationWillEnterBackground() -> [UUID]
    func flushBackgroundDeletes(_ operationIDs: [UUID]) async
    func reconcilePersistedDeletes() async
}
```

- [ ] **Step 1: Port the reducer rules as failing tests**

Cover immediate save, save success with all returned IDs, deferred delete, 6.5-second expiry,
newer-operation supersession, save Undo issuing delete, delete Undo issuing no request, failure
stability, Retry, committed cleanup, pending insertion merge, and suppressed IDs winning over a
same-session insertion.

- [ ] **Step 2: Add failing time/background tests with a controllable clock**

Assert expiry uses injected time; background commits visible feedback; a pending delete record is
written synchronously before a best-effort network flush; relaunch retries and clears only a
successful record whose environment, issuer, and subject exactly match the current session.
Account switch, logout, and environment switch retain but never replay another scope's record.

- [ ] **Step 3: Add the timeout duplicate-reduction test**

Given a timed-out save with baseline 2, Retry GET returning 3 commits without POST; GET returning
2 sends one POST; GET failure falls back to one POST, matching the frozen client.

- [ ] **Step 4: Run focused tests and verify failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/SaveQueueReducerTests \
  -only-testing:DrinkSaverTests/SaveQueueStoreTests \
  -only-testing:DrinkSaverTests/PendingDeleteStoreTests
```

- [ ] **Step 5: Implement the pure reducer, then the store side effects**

Keep time and API effects out of `SaveQueueReducer`. Persist only UUID, drink IDs, environment,
issuer, and OIDC subject in a protected application-support JSON file; use atomic replacement and
exclude it from backup. The subject is an authorization boundary, not display content. A bounded
background flush uses `UIApplication.beginBackgroundTask`, ends/cancels on expiration, and treats
next-launch reconciliation as authoritative; never promise that background DELETE completed.

- [ ] **Step 6: Re-run focused tests**

Expected: all queue interleavings and recovery cases pass without sleeping a real 6.5 seconds.

- [ ] **Step 7: Commit**

```bash
git add ios/DrinkSaver/Shared/Queue ios/DrinkSaverTests/SaveQueueReducerTests.swift \
  ios/DrinkSaverTests/SaveQueueStoreTests.swift ios/DrinkSaverTests/PendingDeleteStoreTests.swift
git commit -m "feat: add native save and delete queue"
```

## IOS-011A: Add the shared current-drinking-day read model

**Outcome:** Quick and the application header show a live count without requiring the user to open
History, and all queue transitions update that count deterministically.

**Dependencies:** `IOS-003A`, `IOS-004`, `IOS-008`, `IOS-011`.

**Files:**

- Create: `ios/DrinkSaver/Shared/Domain/CurrentDrinkingDayStore.swift`
- Create: `ios/DrinkSaverTests/CurrentDrinkingDayStoreTests.swift`

**Interface:**

```swift
@MainActor @Observable final class CurrentDrinkingDayStore {
    private(set) var date: String
    private(set) var serverDrinks: [EditableDrink]
    var visibleCount: Int { get }
    func load() async
    func clockDidCrossDrinkingDayBoundary() async
}
```

- [ ] Write failing tests for initial `drinks(date:)`, loading/failure display, save insertion,
  delete suppression, Undo, committed/refetched values, timeout Retry, and 06:00/date/time-zone
  rollover. The derived count applies queue insertions and suppression; it never depends on a
  History screen visit.
- [ ] Implement and unit-test the one shared read model. Do not modify future feature files or add
  another cache layer; `IOS-012`, `IOS-013`, and `IOS-017` each own their consumption wiring.
- [ ] Run the focused tests and a fixture UI assertion for `Tonight` plus count, then commit.

```bash
git add ios/DrinkSaver/Shared/Domain/CurrentDrinkingDayStore.swift \
  ios/DrinkSaverTests/CurrentDrinkingDayStoreTests.swift
git commit -m "feat: track the current drinking-day count"
```

## IOS-012: Build the authenticated application frame and theme control

**Outcome:** The authentication gate, header, menu, custom bottom navigation, sheet host, and
binary theme control match the frozen frame without implementing feature interiors.

**Dependencies:** `IOS-003A`, `IOS-005A`, `IOS-005B`, `IOS-005C`, `IOS-010`, `IOS-010A`,
`IOS-011A`. Use placeholder feature views with stable
accessibility identifiers.

**Files:**

- Create: `ios/DrinkSaver/App/AppCoordinator.swift`
- Modify: `ios/DrinkSaver/App/RootView.swift`
- Create: `ios/DrinkSaver/Shared/UI/AppFrame.swift`
- Create: `ios/DrinkSaver/Shared/UI/ViewState.swift`
- Modify: `ios/DrinkSaver/App/DrinkSaverApp.swift`
- Create: `ios/DrinkSaverTests/AppCoordinatorTests.swift`
- Create: `ios/DrinkSaverTests/AppFrameTests.swift`
- Create: `ios/DrinkSaverUITests/AppFrameUITests.swift`

**Interfaces:**

```swift
enum AppScreen: Equatable { case quick, history, recommendations }
enum AddRoute: Equatable { case menu, option(AddRouteField), create(AddCreatableField) }
enum AddRouteField: Equatable { case alcoholType, volume, subtype, consumptionType, brand, flavour, date, notes, recommend }
enum AddCreatableField: Equatable { case alcoholType, volume, subtype, brand, flavour }

@MainActor @Observable final class AppCoordinator {
    var currentScreen: AppScreen = .quick
    var addPanels: [AddRoute] = []
    var isAddPresented: Bool { !addPanels.isEmpty }
    func presentAdd(startingAt panel: AddRoute = .menu)
    func push(_ panel: AddRoute)
    func popAddPanel()
    func dismissAdd()
}
```

- [ ] **Step 1: Write failing coordinator and frame tests**

Assert initial Quick tab, Add presentation over either tab, nested push/pop, dismissal to the
originating tab, Recommendations menu destination, Add new type starting at create type, logout,
dark default, toggle persistence, and title/subtitle selection including Tonight. AppFrame reads
the injected `CurrentDrinkingDayStore`; it does not issue its own drinks request.

- [ ] **Step 2: Add failing UI assertions**

Launch with fake signed-in state. Assert `Quick`, `Add`, `History`, menu button, 44-point hit areas,
selected tab value, exact menu copy, centered moon/switch/sun group, safe-area placement, and no
system tab-bar/navigation-bar appearance.

- [ ] **Step 3: Run focused tests and verify failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/AppCoordinatorTests \
  -only-testing:DrinkSaverTests/AppFrameTests \
  -only-testing:DrinkSaverUITests/AppFrameUITests
```

- [ ] **Step 4: Implement the minimum custom frame**

Use the token layer and explicit SwiftUI buttons. Present the menu as a branded popover/menu whose
content and alignment match the reference. Use one `.sheet` host for the Add panel stack.

- [ ] **Step 5: Test signed-out/restoring/failure states**

Restoring displays exact loading copy, signed-out offers login, cancellation remains signed-out,
and refresh failure returns to the gate without exposing feature content.

- [ ] **Step 6: Run focused unit/UI tests and compare both-theme frame references**

Expected: PASS on iPhone 13 mini; frame geometry and colors match both frozen theme references.

- [ ] **Step 7: Commit**

```bash
git add ios/DrinkSaver/App ios/DrinkSaver/Shared/UI ios/DrinkSaverTests/App* \
  ios/DrinkSaverUITests/AppFrameUITests.swift
git commit -m "feat: build native DrinkSaver app frame"
```

## IOS-013: Implement Quick Save as an independent feature slice

**Outcome:** Quick Save loads recommendations, renders exact plates, saves in place, and exposes
queue feedback without depending on Add Drink or History UI.

**Dependencies:** `IOS-003A`, `IOS-005A`, `IOS-005B`, `IOS-006`, `IOS-008`, `IOS-010A`,
`IOS-011`, `IOS-011A`, `IOS-012`.

**Files:**

- Create: `ios/DrinkSaver/Features/QuickSave/QuickSaveStore.swift`
- Create: `ios/DrinkSaver/Features/QuickSave/QuickSaveView.swift`
- Create: `ios/DrinkSaver/Features/QuickSave/PlateView.swift`
- Create: `ios/DrinkSaver/Features/QuickSave/PlateGridView.swift`
- Create: `ios/DrinkSaver/Features/QuickSave/PlateGridSkeleton.swift`
- Create: `ios/DrinkSaverTests/QuickSaveStoreTests.swift`
- Create: `ios/DrinkSaverTests/QuickSaveLayoutTests.swift`
- Create: `ios/DrinkSaverUITests/QuickSaveUITests.swift`

**Interfaces:**

```swift
@MainActor @Observable final class QuickSaveStore {
    enum State: Equatable { case loading, ready([Recommendation]), failed }
    private(set) var state: State
    private(set) var activeRecommendationKey: String?
    var currentDayCount: Int { get }
    func load() async
    func save(_ recommendation: Recommendation)
    static func key(for recommendation: Recommendation) -> String
}
```

- [ ] **Step 1: Write failing store tests**

Assert composite key is `id-or-null-alcoholType-volume-brand-or-null`; initial load; failure;
recommendation design resolution; payload mapping; drinking-day date; one save at a time; saving
and done states derived from the queue; deferred recommendation refresh until queue idle; and
that Quick/header read the shared current-day count across save/delete/Undo/date rollover without
visiting History.

- [ ] **Step 2: Write failing layout/accessibility tests**

Assert two columns, deterministic rotations, add plate last, exact copy, skeleton contents,
recognizable glass frame, disabled siblings during save, accessible plate labels/status, and the
error message with Add still reachable.

- [ ] **Step 3: Run focused tests and verify failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/QuickSaveStoreTests \
  -only-testing:DrinkSaverTests/QuickSaveLayoutTests \
  -only-testing:DrinkSaverUITests/QuickSaveUITests
```

- [ ] **Step 4: Implement store and presentational views**

Keep plate status a function of store/queue inputs. Do not store duplicated per-plate save state.
Use backend IDs for visual identity and the coordinator to open Add.

- [ ] **Step 5: Run focused tests and visual comparison**

Capture loading, ready, long-name, saving, saved, error, dark, and light on all three reference
sizes. Expected: tests pass and no plate is clipped or assigned another plate's stamp.

- [ ] **Step 6: Commit**

```bash
git add ios/DrinkSaver/Features/QuickSave ios/DrinkSaverTests/QuickSave* \
  ios/DrinkSaverUITests/QuickSaveUITests.swift
git commit -m "feat: add native Quick Save"
```

## IOS-014: Implement the Add Drink draft and catalogue state

**Outcome:** The complete Add draft, conditional rows, cascades, readiness, catalogue loading, and
creation adoption are testable without any sheet UI.

**Dependencies:** `IOS-004`, `IOS-006`, `IOS-008`, `IOS-012`.

**Files:**

- Create: `ios/DrinkSaver/Features/AddDrink/AddDrinkModels.swift`
- Create: `ios/DrinkSaver/Features/AddDrink/AddDrinkDraft.swift`
- Create: `ios/DrinkSaver/Features/AddDrink/AddDrinkStore.swift`
- Create: `ios/DrinkSaverTests/AddDrinkDraftTests.swift`
- Create: `ios/DrinkSaverTests/AddDrinkStoreTests.swift`

**Interfaces:**

```swift
typealias AddField = AddRouteField
typealias CreatableField = AddCreatableField

struct AddDrinkDraft: Equatable {
    var alcoholTypeID: Int?; var volumeID: Int?; var subtypeID: Int?
    var consumptionTypeID: Int?; var brandID: Int?; var flavourID: Int?
    var date: String; var quantity = 1; var comments = ""
    var addToRecommendations = false; var onlyTemporarily = false
    var recommendationName = ""; var recommendationPaletteID: Int?
    var recommendationGlassID: Int?
}

@MainActor @Observable final class AddDrinkStore {
    private(set) var draft: AddDrinkDraft
    private(set) var catalogue: AddDrinkCatalogue
    var rows: [AddMenuRow] { get }
    var isReady: Bool { get }
    func open(on drinkingDay: String)
    func select(field: AddField, id: Int)
    func adoptCreated(field: CreatableField, id: Int)
}
```

- [ ] **Step 1: Port every reducer/cascade case as failing tests**

Assert fresh draft, quantity clamp 1–24, alcohol-type cascade, brand cascade, creation using the
same cascade, recommendation-off clearing, beer/non-beer conditional rows, beer requiring Served
but not Brand, and exact value/date formatting.

- [ ] **Step 2: Add failing catalogue-state tests**

Assert dependent requests enable only when parent IDs exist; beer branches correctly; loading and
failure remain field-local; created entries update the correct collection and become selected;
opening a new sheet resets once while nested panels preserve the draft.

- [ ] **Step 3: Run focused tests and verify failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/AddDrinkDraftTests \
  -only-testing:DrinkSaverTests/AddDrinkStoreTests
```

- [ ] **Step 4: Implement pure mutation methods and async catalogue loads**

Keep formatting/readiness pure. Ignore responses whose parent selection no longer matches the
request that produced them. Do not persist drafts across a terminated app.

- [ ] **Step 5: Re-run focused tests**

Expected: all draft, race, and catalogue cases pass with fake API responses.

- [ ] **Step 6: Commit**

```bash
git add ios/DrinkSaver/Features/AddDrink/AddDrinkModels.swift \
  ios/DrinkSaver/Features/AddDrink/AddDrinkDraft.swift \
  ios/DrinkSaver/Features/AddDrink/AddDrinkStore.swift ios/DrinkSaverTests/AddDrink*
git commit -m "feat: add native drink draft state"
```

## IOS-015: Build Add Drink menu, option, and creation panels

**Outcome:** The sheet stack reproduces all selection and catalogue-creation interactions, but
does not yet submit a drink.

**Dependencies:** `IOS-006`, `IOS-012`, `IOS-014`.

**Files:**

- Create: `ios/DrinkSaver/Features/AddDrink/AddSheetView.swift`
- Create: `ios/DrinkSaver/Features/AddDrink/AddMenuView.swift`
- Create: `ios/DrinkSaver/Features/AddDrink/AddOptionView.swift`
- Create: `ios/DrinkSaver/Features/AddDrink/AddCreateView.swift`
- Create: `ios/DrinkSaver/Features/AddDrink/DesignSelectorView.swift`
- Create: `ios/DrinkSaver/Features/AddDrink/QuantityControl.swift`
- Create: `ios/DrinkSaverUITests/AddDrinkPanelsUITests.swift`

**Interfaces:** Consumes `AppCoordinator.addPanels`, `AddDrinkStore`, `DesignCatalogue`, and
`CreatableField`. Produces no new shared interface.

- [ ] **Step 1: Add failing menu UI tests**

Assert exact heading/hint, conditional field order, dotted leaders, `Choose` placeholders, palette
swatches as decorative, selected value semantics, quantity bounds/copy, disabled Save placeholder,
drag-indicator appearance, 88%-height cap, and dismissal to the originating tab.

- [ ] **Step 2: Add failing option UI tests**

Cover loading, selected checkmark, palette cue, Back, Add availability by field, Today/Yesterday/
arbitrary date with no future date, notes editing, scrolling, and focus restoration.

- [ ] **Step 3: Add failing creation UI tests**

Cover exact New headings and context, required trimmed name, positive finite litres, palette/glass
inheritance, explicit overrides, Add and use it pending/disabled/error states, and successful
adoption returning to the option panel.

- [ ] **Step 4: Run the focused UI suite and verify failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverUITests/AddDrinkPanelsUITests
```

- [ ] **Step 5: Implement one sheet with an internal panel stack**

Use native date/text controls inside branded containers. Do not present a fresh sheet for nested
panels. Ensure keyboard and date controls remain usable without dismissing the sheet unexpectedly.

- [ ] **Step 6: Run tests and compare every panel in both themes**

Expected: PASS at iPhone SE 3rd generation, iPhone 13 mini, and iPhone 16 Pro Max portrait sizes;
no intrinsic-width overflow,
clipped keyboard target, or inaccessible swatch-only selection.

- [ ] **Step 7: Commit**

```bash
git add ios/DrinkSaver/Features/AddDrink ios/DrinkSaverUITests/AddDrinkPanelsUITests.swift
git commit -m "feat: build native add drink panels"
```

## IOS-016: Complete Add Drink recommendation and save behavior

**Outcome:** The sheet produces the exact save payload, supports recommendation customization,
hands work to the shared queue, and dismisses at the correct moment.

**Dependencies:** `IOS-011`, `IOS-014`, `IOS-015`.

**Files:**

- Modify: `ios/DrinkSaver/Features/AddDrink/AddDrinkStore.swift`
- Modify: `ios/DrinkSaver/Features/AddDrink/AddOptionView.swift`
- Modify: `ios/DrinkSaver/Features/AddDrink/AddMenuView.swift`
- Create: `ios/DrinkSaverTests/AddDrinkSaveTests.swift`
- Create: `ios/DrinkSaverUITests/AddDrinkSaveUITests.swift`

**Interfaces:**

```swift
extension AddDrinkStore {
    func save(using queue: SaveQueueStore, dismiss: () -> Void)
    func saveRequest() throws -> DrinkSaveRequest
    var provisionalLabel: String { get }
}
```

- [ ] **Step 1: Write failing payload tests**

Cover beer/non-beer IDs, optional omission, trimmed notes, quantity omission at 1, batch quantity,
recommendation flags/name, temporary only when Recommend is on, independent design overrides,
inherited design, selected date, and provisional type plus brand/subtype label.

- [ ] **Step 2: Write failing recommendation-panel UI tests**

Assert enabled/temporary/name fields, palette/glass selectors, normal-design placeholder, turning
off clears subfields, shared quantity controls, same Save eligibility, and exact copy.

- [ ] **Step 3: Write the save lifecycle UI test**

Tap Save, assert one queue entry receives the exact payload, sheet dismisses immediately after
handoff, feedback appears above the current page, save failure stays actionable with Retry, and
Undo deletes every returned ID for a batch.

- [ ] **Step 4: Run focused tests and verify failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/AddDrinkSaveTests \
  -only-testing:DrinkSaverUITests/AddDrinkSaveUITests
```

- [ ] **Step 5: Implement minimal payload mapping and UI**

Use the shared resolver and queue; do not add a second save path for the recommendation panel.

- [ ] **Step 6: Re-run focused tests and full Add journey**

Expected: PASS for existing selection, every creatable catalogue branch, single/batch save,
recommendation override, failure/Retry, and Undo.

- [ ] **Step 7: Commit**

```bash
git add ios/DrinkSaver/Features/AddDrink ios/DrinkSaverTests/AddDrinkSaveTests.swift \
  ios/DrinkSaverUITests/AddDrinkSaveUITests.swift
git commit -m "feat: save drinks from the native sheet"
```

## IOS-017: Implement the History read model and seven-day strip

**Outcome:** History loads independently per day, merges queue state correctly, and renders the
strip and paper tab across loading, empty, ready, and error states.

**Dependencies:** `IOS-004`, `IOS-006`, `IOS-008`, `IOS-010A`, `IOS-011`, `IOS-011A`, `IOS-012`.

**Files:**

- Create: `ios/DrinkSaver/Features/History/HistoryModels.swift`
- Create: `ios/DrinkSaver/Features/History/HistoryStore.swift`
- Create: `ios/DrinkSaver/Features/History/HistoryView.swift`
- Create: `ios/DrinkSaver/Features/History/DayStripView.swift`
- Create: `ios/DrinkSaver/Features/History/PaperTabView.swift`
- Create: `ios/DrinkSaverTests/HistoryStoreTests.swift`
- Create: `ios/DrinkSaverTests/HistoryReadModelTests.swift`
- Create: `ios/DrinkSaverUITests/HistoryReadUITests.swift`

**Interfaces:**

```swift
enum DayLoadState: Equatable { case loading, ready([EditableDrink]), failed }
struct DayCount: Equatable { enum Status { case loading, ready, failed }; let status: Status; let swatches: [String] }
struct HistoryRow: Identifiable, Equatable { let drink: EditableDrink; let selected: Bool; let exitingToken: Int? }

@MainActor @Observable final class HistoryStore {
    private(set) var selectedDate: String
    private(set) var days: [String: DayLoadState]
    var visibleRows: [HistoryRow] { get }
    var stripDates: [String] { get }
    func loadStrip() async
    func select(date: String) async
}
```

- [ ] **Step 1: Write failing read-model tests**

Cover seven dates oldest-first; current day initially selected; parallel per-day load; unknown,
error, zero, and 1–4+ pip states; selected arbitrary date outside strip; cached revisit; late old-day
response not replacing the selected day; pending inserts; pending suppression; suppressed IDs
winning over same-session inserts; deterministic display labels.

- [ ] **Step 2: Write failing UI tests**

Assert strip initially scrolls current day into view without moving the outer frame, calendar tile,
paper-tab header/count, loading/error/empty copy, long-name wrapping, native arbitrary date capped at
today, and glass identity based on stable structural data/fallback rules.

- [ ] **Step 3: Run focused tests and verify failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/HistoryStoreTests \
  -only-testing:DrinkSaverTests/HistoryReadModelTests \
  -only-testing:DrinkSaverUITests/HistoryReadUITests
```

- [ ] **Step 4: Implement request-scoped day state and pure selectors**

Keep server rows unchanged. Derive visible rows and counts by applying queue insertions and
suppression. Keep exit-retained rows out of live counts. For the current date, consume the same
`CurrentDrinkingDayStore` instance used by AppFrame and Quick rather than starting a duplicate
count source.

- [ ] **Step 5: Implement the exact strip and paper surface**

Use horizontal `ScrollView` scoped to the strip and a vertically scrolling content region that
always leaves one control height visible when feedback/bulk controls appear.

- [ ] **Step 6: Re-run tests and visual comparisons**

Expected: PASS for 375×667, 375×812, and 440×956-point portrait canvases, long lists, arbitrary dates, both
themes, late responses, and same-session save/delete combinations.

- [ ] **Step 7: Commit**

```bash
git add ios/DrinkSaver/Features/History ios/DrinkSaverTests/History* \
  ios/DrinkSaverUITests/HistoryReadUITests.swift
git commit -m "feat: add native History read views"
```

## IOS-018: Add History selection, cross-off motion, bulk delete, and Undo

**Outcome:** Individual and bulk deletion match the frozen lifecycle without row resurrection,
misordered exits, or inaccessible timed actions.

**Dependencies:** `IOS-017` and `SaveQueueStore` from `IOS-011`.

**Files:**

- Modify: `ios/DrinkSaver/Features/History/HistoryModels.swift`
- Modify: `ios/DrinkSaver/Features/History/HistoryStore.swift`
- Modify: `ios/DrinkSaver/Features/History/PaperTabView.swift`
- Create: `ios/DrinkSaver/Features/History/HistoryMotion.swift`
- Create: `ios/DrinkSaverTests/HistoryPresenceTests.swift`
- Create: `ios/DrinkSaverUITests/HistoryDeleteUITests.swift`

**Interfaces:**

```swift
extension HistoryStore {
    func toggleSelection(id: Int)
    func crossOff(ids: [Int])
    func finishExit(id: Int, token: Int)
}
```

- [ ] **Step 1: Port failing presence/lifecycle tests**

Cover single/bulk removal retaining original slots, stable exit token, unrelated refetch not
starting an exit, Undo restoring once, stale animation completion ignored, date changes isolating
selection/exits, live data winning interrupted exit, and exact selected-count cleanup.

- [ ] **Step 2: Add failing interaction/accessibility tests**

Assert whole-row selection, checkbox state, Cross off accessible name, cross button not toggling
selection, bulk button exact count/copy, strike/fade/gap order, feedback status/Undo, failed delete
alert/Retry, and Reduce Motion immediate but semantically equivalent removal.

- [ ] **Step 3: Run focused tests and verify failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/HistoryPresenceTests \
  -only-testing:DrinkSaverUITests/HistoryDeleteUITests
```

- [ ] **Step 4: Implement keyed exit presence and queue handoff**

Capture row data/order before suppression, retain only explicit cross-off rows, and call
`SaveQueueStore.delete` with selected IDs and the chosen date. Never re-POST a deleted row for Undo.

- [ ] **Step 5: Implement motion with Reduce Motion branch**

Use the frozen strike/fade/reflow sequence and keyed completion token. Keep controls inert after
exit begins and prevent a fading row from intercepting another tap.

- [ ] **Step 6: Re-run tests and lifecycle journey**

Expected: PASS for individual/bulk delete, Undo during every animation phase, failure/Retry,
background flush, relaunch reconciliation, and same-session saved rows.

- [ ] **Step 7: Commit**

```bash
git add ios/DrinkSaver/Features/History ios/DrinkSaverTests/HistoryPresenceTests.swift \
  ios/DrinkSaverUITests/HistoryDeleteUITests.swift
git commit -m "feat: cross off native History rows"
```

## IOS-019: Implement the Recommendations draft and operation queue

**Outcome:** Persisted-user rows can be renamed, reordered, hidden for delete, cancelled, saved,
undone, and committed without a view.

**Dependencies:** `IOS-007`, `IOS-008`, `IOS-010` for authenticated subject identity.

**Files:**

- Create: `ios/DrinkSaver/Features/Recommendations/RecommendationDraft.swift`
- Create: `ios/DrinkSaver/Features/Recommendations/RecommendationQueue.swift`
- Create: `ios/DrinkSaver/Features/Recommendations/RecommendationsStore.swift`
- Create: `ios/DrinkSaverTests/RecommendationDraftTests.swift`
- Create: `ios/DrinkSaverTests/RecommendationQueueTests.swift`
- Create: `ios/DrinkSaverTests/RecommendationsStoreTests.swift`

**Interfaces:**

```swift
struct SavedRecommendation: Identifiable, Equatable { let id: Int; var name: String; let source: Recommendation }
struct RecommendationSnapshot: Equatable { var order: [Int]; var names: [Int: String] }
struct RecommendationDraft: Equatable { var order: [Int]; var names: [Int: String]; var committed: RecommendationSnapshot; var editingID: Int? }

@MainActor @Observable final class RecommendationsStore {
    enum State: Equatable { case loading, ready, failed }
    private(set) var state: State
    private(set) var draft: RecommendationDraft
    var visibleRows: [SavedRecommendation] { get }
    var isDirty: Bool { get }
    func load() async
    func rename(id: Int, to name: String)
    func reorder(visibleIDs: [Int])
    func delete(id: Int)
    func cancel()
    func save()
    func undoCurrent()
}
```

- [ ] **Step 1: Write failing draft tests**

Filter only non-null IDs owned by current subject; sync without overwriting active edits; preserve
hidden-row positions while reordering visible rows; trim/commit names exactly as web; dirty state;
cancel restore; ordered `RecommendationEdit` payload; empty/persistent/default-source cases.

- [ ] **Step 2: Write failing queue tests**

Cover deferred delete with 6.5-second Undo; save waiting for pending deletes to resolve; thunked
payload reading latest names/order; one visible operation; Retry; delete commit causing one refetch;
save response replacing cache; save Undo restoring snapshot; committed save signaling navigation.

- [ ] **Step 3: Run focused tests and verify failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/RecommendationDraftTests \
  -only-testing:DrinkSaverTests/RecommendationQueueTests \
  -only-testing:DrinkSaverTests/RecommendationsStoreTests
```

- [ ] **Step 4: Implement pure draft transformations and side-effect queue**

Do not compare recommendations by names. IDs are mandatory for editable saved rows; rows without
an ID remain Quick Save data and are excluded here.

- [ ] **Step 5: Re-run focused tests**

Expected: all draft/queue interleavings pass with fake API, subject, and clock.

- [ ] **Step 6: Commit**

```bash
git add ios/DrinkSaver/Features/Recommendations ios/DrinkSaverTests/Recommendation*
git commit -m "feat: add native recommendation editing state"
```

## IOS-020: Build the Recommendations screen and reorder interaction

**Outcome:** The complete saved-recommendations screen matches the frozen paper-tab design and
interaction, including accessible reorder alternatives.

**Dependencies:** `IOS-005`, `IOS-012`, `IOS-019`.

**Files:**

- Create: `ios/DrinkSaver/Features/Recommendations/RecommendationsView.swift`
- Create: `ios/DrinkSaver/Features/Recommendations/RecommendationTabView.swift`
- Create: `ios/DrinkSaver/Features/Recommendations/RecommendationRowView.swift`
- Create: `ios/DrinkSaver/Features/Recommendations/RecommendationFeedbackView.swift`
- Create: `ios/DrinkSaverUITests/RecommendationsUITests.swift`

**Interfaces:** Consumes `RecommendationsStore`; committed save sets
`AppCoordinator.currentScreen = .quick`. Produces no shared runtime interface.

- [ ] **Step 1: Add failing state and edit UI tests**

Assert exact title/subtitle; loading/error/empty/ready states; inline rename focus, commit, Escape/
Cancel equivalent; long names; dirty Cancel/Save bar; exact save navigation behavior.

- [ ] **Step 2: Add failing reorder accessibility tests**

Assert drag reorder updates visible order and VoiceOver exposes Move Up/Move Down custom actions
with equivalent results. Reorder must not place hidden pending-delete rows incorrectly.

- [ ] **Step 3: Add failing delete/motion tests**

Assert cross-off action, keyed strike/fade, Undo, Retry, Reduce Motion, row restoration, and
feedback placement above the bottom navigation.

- [ ] **Step 4: Run focused UI tests and verify failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverUITests/RecommendationsUITests
```

- [ ] **Step 5: Implement the paper-tab screen and native drag interaction**

Use SwiftUI drag/drop or move APIs without adding a package. Keep explicit accessibility custom
actions so drag is never the only way to reorder.

- [ ] **Step 6: Re-run tests and both-theme visual comparison**

Expected: PASS across loading, empty, edit, reorder, delete, dirty, save, failure, and Reduce
Motion states on all reference sizes.

- [ ] **Step 7: Commit**

```bash
git add ios/DrinkSaver/Features/Recommendations ios/DrinkSaverUITests/RecommendationsUITests.swift
git commit -m "feat: build native Recommendations screen"
```

## IOS-021: Integrate lifecycle, feedback, and global failure recovery

**Outcome:** Drink operations and recommendation operations retain their distinct domain queues
but feed one feedback arbiter; app backgrounding cannot promise an impossible Undo, and
recoverable failures never strand the root UI.

**Dependencies:** `IOS-011` through `IOS-020`.

**Files:**

- Create: `ios/DrinkSaver/App/SceneLifecycleHandler.swift`
- Create: `ios/DrinkSaver/Shared/UI/FeedbackStrip.swift`
- Create: `ios/DrinkSaver/Shared/UI/FeedbackArbiter.swift`
- Modify: `ios/DrinkSaver/App/RootView.swift`
- Modify: `ios/DrinkSaver/App/AppCoordinator.swift`
- Create: `ios/DrinkSaverTests/SceneLifecycleHandlerTests.swift`
- Create: `ios/DrinkSaverUITests/LifecycleRecoveryUITests.swift`

**Interfaces:**

```swift
@MainActor final class SceneLifecycleHandler {
    func didBecomeActive() async
    func didEnterBackground() async
}

@MainActor @Observable final class FeedbackArbiter {
    var current: FeedbackItem? { get }
    func submit(_ item: FeedbackItem, from source: FeedbackSource)
    func setInteractionActive(_ active: Bool)
}
```

- [ ] **Step 1: Write failing lifecycle tests**

Assert the drink queue and recommendation queue remain separate while one arbiter selects the
visible item by sequence; newer cross-queue feedback supersedes display without cancelling the
older operation; Retry/Undo routes to its owning queue; feedback survives tab changes and moves
inside the open Add sheet; background
starts delete flush and retracts Undo; foreground sweeps expired entries and reconciles persisted
deletes; session expiry returns to auth; relaunch after queued delete neither loses nor duplicates
the operation.

- [ ] **Step 2: Write failing feedback accessibility tests**

Use native accessibility announcements for status changes and screen-change/focus placement for
errors; failure never auto-dismisses. Undo/Retry copy is exact; arbiter interaction/focus state
pauses or extends time; exit lasts 150 ms unless Reduce Motion; exiting feedback cannot intercept
taps. Automate labels, values, frames, actions, and hittability; reserve actual VoiceOver
announcement delivery/focus order for the manual device review.

- [ ] **Step 3: Run focused tests and verify failure**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=latest' \
  -only-testing:DrinkSaverTests/SceneLifecycleHandlerTests \
  -only-testing:DrinkSaverUITests/LifecycleRecoveryUITests
```

- [ ] **Step 4: Implement scene-phase delegation and one feedback host**

Root owns stores and injects them. The feedback strip chooses sheet-local or page placement from
presentation state; features do not create their own global overlays.

- [ ] **Step 5: Run the integrated deterministic journey suite**

Expected: PASS for save/tab change/Undo, delete/background/relaunch, open-sheet feedback, expired
auth, and failed-operation Retry.

- [ ] **Step 6: Commit**

```bash
git add ios/DrinkSaver/App ios/DrinkSaver/Shared/UI/FeedbackStrip.swift \
  ios/DrinkSaverTests/SceneLifecycleHandlerTests.swift \
  ios/DrinkSaverUITests/LifecycleRecoveryUITests.swift
git commit -m "feat: integrate native app lifecycle recovery"
```

## IOS-022A/B/C: Establish visual-parity and accessibility gates

**Outcome:** The full app is objectively compared to the frozen web catalogue and independently
reviewed for WCAG 2.2 AA/native accessibility before integration is called complete.

**Dependencies:** `IOS-002`, `IOS-003A`, `IOS-012` through `IOS-021`.

**Pickup rule:** `IOS-022A` builds capture/comparison, `IOS-022B` performs automated and manual
accessibility verification, and `IOS-022C` records the independent readiness review. Each is an
independent commit; none introduces runtime behavior.

| Task | Owned files |
| --- | --- |
| `IOS-022A` | `VisualParityTests.swift`, `ReferenceImages/**`, `compare-reference-images.sh`, `Reference/native/**` |
| `IOS-022B` | `AccessibilityUITests.swift` and manual device-audit evidence appended to the review |
| `IOS-022C` | `docs/superpowers/reviews/2026-09-20-native-ios-parity-review.md` only |

**Files:**

- Create: `ios/DrinkSaverTests/VisualParityTests.swift`
- Create: `ios/DrinkSaverTests/ReferenceImages/**.png`
- Create: `ios/DrinkSaverUITests/AccessibilityUITests.swift`
- Create: `ios/scripts/compare-reference-images.sh`
- Create: `ios/Reference/native/**.png`
- Create: `docs/superpowers/reviews/2026-09-20-native-ios-parity-review.md`

**Interfaces:** Produces a deterministic comparison report and no runtime API.

- [ ] **Step 1: Write a failing reference-completeness test**

Enumerate each state ID from `ios/Reference/state-matrix.md`; fail if either web or native image
is missing, uses another viewport/runtime, or lacks dark/light coverage.

- [ ] **Step 2: Consume and re-verify the `IOS-003A` fixture boundary**

Map every state ID to its fake session/API/clock fixture. Run the Release archive inspection again;
this task must not widen the fixture seam or add fixture sources to Release membership.

- [ ] **Step 3: Capture and compare**

Use Core Graphics in the test target for PNG decoding and pixel/region comparison; the shell
script only invokes capture/tests and collates reports. Normalize web/native captures to the exact
named device point canvas at 3x, convert to sRGB, flatten alpha over the approved background, and
apply the same documented status-bar/safe-area crop. Use a fixed per-channel anti-aliasing
tolerance and text masks/structural assertions where browser/native font rasterization differs;
fail hard on normalized dimensions, missing regions, token-color differences, or geometry drift.
Do not add a snapshot package or depend on ImageMagick.

```bash
ios/scripts/compare-reference-images.sh ios/Reference/web ios/Reference/native
```

Expected: zero missing states and every approved comparison passes.

- [ ] **Step 4: Run automated accessibility coverage**

Test accessibility labels, values, traits, custom actions, 44-point hit frames,
Dynamic Type through accessibility sizes, Increased Contrast, and Reduce Motion. Verify no
horizontal clipping at 375×667 points and no content hidden behind safe areas/keyboard. Use
`performAccessibilityAudit` where supported. Real VoiceOver announcement delivery, rotor/grouping,
and focus order remain explicit manual checks on a device.

- [ ] **Step 5: Dispatch an independent WCAG 2.2 AA reviewer**

The reviewer checks semantics, accessible names, VoiceOver order/actions, contrast, text scaling,
reflow, forms, status announcements, target sizes, and reduced motion against the spec. Record
severity, evidence, and exact reproduction. Fix every Critical/High finding and rerun affected
checks; label untested real-device VoiceOver behavior explicitly.

- [ ] **Step 6: Perform human overlay review at real rendered size**

Review every iPhone 13 mini state at 100%, then spot-check iPhone SE 3rd generation and iPhone 16
Pro Max. Record confirmed
differences and their resolution in the parity review; do not accept a similarity score alone.

- [ ] **Step 7: Run full iOS verification**

```bash
xcodebuild test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -destination 'platform=iOS Simulator,name=iPhone 13 mini,OS=18.5'
```

Expected: unit, contract, visual, UI, and accessibility tests pass.

- [ ] **Step 8: Commit**

```bash
git commit -m "test: gate native visual parity"
git commit -m "test: audit native accessibility"
git commit -m "docs: record native iOS parity review"
```

## IOS-023A/B/C: Configure native Keycloak clients and live integration journeys

**Outcome:** Local and test environments authenticate the real native client and representative
read/write/delete journeys pass with disposable data.

**Dependencies:** `IOS-023A` depends on `IOS-003`. `IOS-023B` depends on `IOS-003`, `IOS-010`,
administrative access, and explicit mutation approval. `IOS-023C` depends on `IOS-010`, `IOS-013`,
`IOS-016`, `IOS-018`, `IOS-020`, `IOS-021`, plus `IOS-023A` for Local and `IOS-023B` for Test.
None requires paid Apple membership.

**Pickup rule:** `IOS-023A` is the repository-only local-realm task and is READY. `IOS-023B` is an
external Test-realm mutation and remains BLOCKED until separately authorized administrative access
exists. `IOS-023C` owns disposable live journeys and runs Local after `IOS-023A`; its Test run is
blocked until `IOS-023B` completes. Never make an external mutation merely to finish `IOS-023A`.

| Task | Owned state/files |
| --- | --- |
| `IOS-023A` | `deploy/local/keycloak-realm.json`, its parser assertion, and local setup documentation |
| `IOS-023B` | Approved Test-realm external state plus redacted evidence; no unrelated repository mutation |
| `IOS-023C` | `LiveEnvironmentUITests.swift`, `run-live-tests.sh`, and live-journey documentation |

**Files:**

- Modify: `deploy/local/keycloak-realm.json`
- Create: `ios/DrinkSaverUITests/LiveEnvironmentUITests.swift`
- Create: `ios/scripts/run-live-tests.sh`
- Modify: `docs/DEPLOYMENT.md`

**Interfaces:** Produces Keycloak clients `drinksaver-ios-local` and `drinksaver-ios-test` with
Authorization Code + S256 PKCE and the exact redirect URI. No secret is produced.

- [ ] **Step 1: Write the failing local realm-configuration assertion**

Add a test/script that parses `deploy/local/keycloak-realm.json` and asserts public client,
standard flow enabled, direct grants disabled for the native client, S256 PKCE, redirect URI,
allowed post-logout URI, and offline access availability.

- [ ] **Step 2: Run it and confirm the native client is missing**

Expected: FAIL naming `drinksaver-ios-local`.

- [ ] **Step 3: Add the local client (`IOS-023A`)**

Set Authorization Code + S256 PKCE, exact redirect/post-logout URIs, and offline access in the
repository realm JSON. Add a parser test and commit this independently.

- [ ] **Step 4: Configure the Test realm only after approval (`IOS-023B`, BLOCKED)**

Local JSON is a repository change. Test-realm mutation is external state: obtain explicit approval
before applying it, export/redact evidence afterward, and never print realm-admin credentials.
Before promising 365 days, verify realm `Offline Session Max Limited`, realm maximum, client idle/
max overrides, `offline_access` mapping, and refresh-token rotation. Record the impact on other
offline clients and obtain the owner's decision before changing a realm-wide switch. Target a
90-day idle and 365-day absolute maximum without silently changing the web clients.

- [ ] **Step 5: Add disposable live journeys (`IOS-023C`)**

Cover login, recommendations read, single save/Undo, detailed save with created catalogue entry,
History read/delete/Undo, and Recommendations edit/delete. Each test creates uniquely named data,
records IDs, and verifies cleanup; source failures are reported, not hidden as user blockers.

- [ ] **Step 6: Run the live suite against local, then authorized Test**

```bash
ios/scripts/run-live-tests.sh local
ios/scripts/run-live-tests.sh test
```

Expected: all journeys and cleanup assertions pass; production hosts are rejected by the script.

- [ ] **Step 7: Commit repository-only changes; record Test evidence separately**

```bash
git add deploy/local/keycloak-realm.json ios/DrinkSaverUITests/LiveEnvironmentUITests.swift \
  ios/scripts/run-live-tests.sh docs/DEPLOYMENT.md
git commit -m "test: verify native app against Keycloak"
```

## IOS-024A/B: Add GitHub-hosted macOS CI

**Outcome:** Every relevant branch/PR builds and tests the native app on a pinned Xcode without
requiring signing or a paid Apple account.

**Dependencies:** `IOS-024A` depends on `IOS-001` and builds/tests the smoke suite only.
`IOS-024B` depends on `IOS-022A`, `IOS-022B`, and `IOS-022C` and replaces the smoke selection with
the final test plan. No feature task repeatedly edits the workflow.

**Pickup rule:** `IOS-024A` owns the initial workflow, validation/simulator scripts, and smoke
test plan. `IOS-024B` modifies only the test plan/workflow suite selection and the final CI
documentation after all acceptance suites exist.

**Files:**

- Create: `.github/workflows/ios.yml`
- Create: `ios/DrinkSaver.xctestplan`
- Create: `ios/scripts/validate-ios-workflow.sh`
- Create: `ios/scripts/create-pinned-simulator.sh`
- Modify: `docs/DEPLOYMENT.md`

**Interfaces:** Workflow triggers on `ios/**`, `docs/api-docs.yaml`, `VERSION`, and its own file.

- [ ] **Step 1: Create a failing workflow-validation test locally**

Validate YAML and assert the workflow contains the required path filters, read-only default
permissions, concurrency cancellation, simulator build, test plan, Release configuration check,
and artifact-on-failure step.

- [ ] **Step 2: Implement the least-privilege workflow**

Use `macos-15`, set
`DEVELOPER_DIR=/Applications/Xcode_16.4.app/Contents/Developer`, and build/test without signing.
Invoke `ios/scripts/xcodebuild.sh` so the tested bundle receives the repository `VERSION`.
Pin actions to current full SHAs:

```yaml
- uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5
- uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
```

Grant `contents: read` only. Do not persist checkout credentials. Do not expose Keycloak or Apple
secrets to pull-request jobs.

- [ ] **Step 3: Create and pin the simulator destination**

Preflight the `com.apple.CoreSimulator.SimDeviceType.iPhone-13-mini` device type and the iOS 18.5
runtime, create and boot a named simulator with `simctl`, and pass its UDID to `xcodebuild`. Fail
clearly if either identifier is unavailable; never use `OS=latest` in parity CI. In `IOS-024A`,
run only smoke tests. In `IOS-024B`, the test plan includes unit, API contract, visual,
deterministic UI, and accessibility suites and excludes live-environment tests. Record Xcode,
Swift, simulator runtime, and device type in job output.

- [ ] **Step 4: Validate locally and on the branch**

```bash
ios/scripts/xcodebuild.sh test -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -testPlan DrinkSaver -destination 'platform=iOS Simulator,id=<created-udid>'
```

Expected: local run passes. After an authorized push, the hosted job passes and uploads `.xcresult`
plus screenshots only on failure.

- [ ] **Step 5: Update deployment documentation**

Document runner/Xcode pin, upgrade process, why simulator CI needs no paid membership, and the
separation between verification and signing.

- [ ] **Step 6: Commit the scaffold and final gate separately**

```bash
git commit -m "ci: build and smoke-test the native iOS app"
git commit -m "ci: run the native iOS acceptance plan"
```

## IOS-025: Complete native developer and parity documentation

**Outcome:** A new engineer can configure, run, test, and update the app without reverse
engineering Xcode settings or the web source.

**Dependencies:** `IOS-003`, `IOS-010`, `IOS-021`, `IOS-024`.

**Files:**

- Modify: `ios/README.md`
- Create: `ios/ARCHITECTURE.md`
- Create: `ios/PARITY.md`
- Create: `ios/scripts/validate-documentation.sh`
- Modify: `docs/DEPLOYMENT.md`

**Interfaces:** Documentation only.

- [ ] **Step 1: Write a documentation assertions script**

Check that every command names a real scheme/script/file, every environment key matches
`AppConfiguration`, every component file appears in the component/state table, and all `IOS-*`
follow-ups/gates are linked.

- [ ] **Step 2: Document local setup and commands from source**

Include Xcode selection, package resolution, build/test commands, local Keycloak redirect setup,
environment selection, connected-device limitations under a free account, and troubleshooting.

- [ ] **Step 3: Document architecture and every component contract**

For each component record purpose, inputs, states, actions, accessibility, frozen web counterpart,
and tests. Document queue/lifecycle, token handling boundaries, and why no offline cache exists.

- [ ] **Step 4: Document future parity updates**

Require a new named web SHA, refreshed state matrix, explicit delta, both-theme visual evidence,
accessibility review, and a separate task. Never silently move the baseline.

- [ ] **Step 5: Run docs validation and command dry-runs**

```bash
ios/scripts/validate-documentation.sh
```

Expected: no stale path, unknown config key, missing component state, or non-executable example.

- [ ] **Step 6: Commit**

```bash
git add ios/README.md ios/ARCHITECTURE.md ios/PARITY.md \
  ios/scripts/validate-documentation.sh docs/DEPLOYMENT.md
git commit -m "docs: document native iOS development"
```

---

## Public-release tasks

These are release-gate checklists, not all implementation-ready tasks. Each blocked item states
its exit condition. They are not required to call the clone locally complete.

## IOS-REL-001A/B: Enroll/register, then establish signing

**Outcome:** The owner has paid program membership, registered bundle identity, protected signing
credentials, and a locally reproducible Release archive.

**Dependencies:** Paid Apple Developer Program enrollment; `IOS-003` and `IOS-024`.

**Files:**

- Modify: `ios/DrinkSaver.xcodeproj/project.pbxproj`
- Create: `docs/release/ios-signing.md`

**External state:** Apple Developer portal and App Store Connect. Every mutation requires explicit
authorization at execution time.

**Status:** BLOCKED on paid membership and mutation approval. `IOS-REL-001A` covers enrollment,
App ID, and App Store Connect record. After it is evidenced, `IOS-REL-001B` is a separately
pickable signing/archive task.

- [ ] Verify enrollment/account-holder identity and record the Team ID outside source control.
- [ ] Register `im.kak.drinksaver`; enable only capabilities the app actually uses.
- [ ] Create the App Store Connect application named DrinkSaver.
- [ ] Configure automatic or managed signing for local Archive without committing profiles,
  certificates, private keys, issuer IDs, or API private keys.
- [ ] Archive with Release configuration and run `codesign`/`security cms` inspection to verify
  identifier, team, entitlements, version, and absence of development services.
- [ ] Document credential ownership, rotation, and recovery; commit only project/documentation.

Verification:

```bash
DRINKSAVER_BUILD_NUMBER=1 ios/scripts/xcodebuild.sh archive \
  -project ios/DrinkSaver.xcodeproj -scheme DrinkSaver \
  -configuration Release -archivePath /private/tmp/DrinkSaver.xcarchive
```

Expected: a valid archive owned by the intended team; no secret appears in Git or logs.

## IOS-REL-002: Resolve the public-registration authorization blocker

**Outcome:** A self-registered user cannot mutate another user's or the shared administrator's
volume catalogue through the endpoints tracked by `SEC-1`.

**Dependencies:** The product owner chooses the global-admin-write or owner-scoped model already
documented under `SEC-1`.

**Status:** BLOCKED. Exit condition: the owner records that model choice; only then create/pick up
the implementation task with the selected controller/service file list.

**Files:** Modify only the selected controller/repository/service tests and implementation,
`docs/api-docs.yaml` when the contract changes, and the existing `SEC-1` entry in
`docs/remaining-work.md` when evidence closes it.

- [ ] Reproduce the cross-user write with a failing authenticated integration test.
- [ ] Record the chosen catalogue ownership model in code and the OpenAPI description.
- [ ] Implement the minimum authorization rule; return 404 rather than disclosing another user's
  private type when the owner-scoped model is selected.
- [ ] Run focused tests, full backend tests, and `mvn verify` with Colima variables; use the
  repository assertion script to prove Testcontainers integration classes ran.
- [ ] Run differential/security review and independently verify any High/Critical finding.
- [ ] Close/reference `SEC-1` with exact verification evidence; do not create a duplicate debt ID.

Expected: the original cross-user test is green, unrelated users are denied, intended shared reads
still work, and all backend verification passes against real Postgres.

## IOS-REL-003: Configure production Keycloak registration and native sessions

**Outcome:** New users can register and authenticate through the production native public client,
whose offline sessions use the approved 90-day idle and 365-day absolute maximum.

**Dependencies:** `IOS-REL-002`; production Keycloak administrative access; `IOS-010`.

**Files:** Modify `docs/DEPLOYMENT.md` with redacted, reproducible realm/client instructions. No
realm export containing secrets or user credentials is committed.

**External state:** Production Keycloak realm. Every mutation requires explicit approval.

- [ ] Create public client `drinksaver-ios`, standard flow only, S256 PKCE, exact redirect and
  post-logout URIs, no secret, and `offline_access` scope.
- [ ] Set client offline idle to 90 days and absolute maximum to 365 days without silently
  broadening the web client's policy.
- [ ] Enable self-registration, email verification, password recovery, brute-force protection,
  and approved rate limits.
- [ ] Test register, verify, login, refresh, configured idle/max policy, revoke, logout, password
  recovery, and disabled/deleted-user behavior using disposable accounts.
- [ ] Export redacted configuration evidence and document rollback: disable registration/client,
  revoke offline sessions, and preserve existing web access.

Expected: production authentication works through `ASWebAuthenticationSession`, no secret is in
the app, and Keycloak displays/verifies the exact approved session settings.

## IOS-REL-004: Implement the approved data export and account-deletion contract

**Outcome:** Authenticated users can export their data and request deletion under the policy
approved after `PRIV-1`, with an explicit backend contract and integration tests.

**Dependencies:** `PRIV-1` legal determination plus approved retention, audit, and deletion
semantics. Legal conclusions come from the responsible professional, not the implementer.

**Status:** BLOCKED. Exit condition: approved written retention/deletion/export semantics and
OpenAPI behavior exist; implementation work is created only from that approved contract.

**Files:** Create/modify the minimum backend controller/service/repository/migration tests and
implementation; modify `docs/api-docs.yaml`; update the existing `PRIV-5`/`PRIV-6` entries only
when their acceptance evidence is complete.

- [ ] Turn the approved policy into request/response schemas, authorization rules, retained-data
  behavior, idempotency semantics, audit events, and failure states in OpenAPI before code.
- [ ] Write failing cross-user, happy-path, repeat-request, partial-failure, retention, and real-
  Postgres integration tests.
- [ ] Implement export and deletion using the minimum endpoints required by the contract.
- [ ] Validate every changed response field against OpenAPI and the live `/api-docs` document.
- [ ] Run focused/full backend verification and prove integration tests ran.
- [ ] Perform privacy and differential security review; resolve verified High/Critical findings.

Expected: contract and implementation agree, users cannot export/delete another account, repeat
deletion is safe, and retained data matches the approved policy.

## IOS-REL-005: Add the native account-deletion initiation flow

**Outcome:** A user can initiate the approved account/data deletion inside the app, then local
authorization is cleared only after the backend confirms the terminal outcome.

**Dependencies:** `IOS-REL-004`; separately approved post-clone UI change.

**Status:** BLOCKED. Exit condition: `IOS-REL-004` is deployed and the deletion UI/copy is
approved. Then this becomes a pickup-ready native task depending on `IOS-008`, `IOS-010`,
`IOS-012`, and `IOS-021` as well as the backend contract.

**Files:**

- Create: `ios/DrinkSaver/Features/Account/AccountDeletionView.swift`
- Create: `ios/DrinkSaver/Features/Account/AccountStore.swift`
- Create: `ios/DrinkSaverTests/AccountDeletionTests.swift`
- Create: `ios/DrinkSaverUITests/AccountDeletionUITests.swift`
- Modify: `ios/DrinkSaver/Shared/API/DrinkSaverAPI.swift`
- Modify: `ios/DrinkSaver/Shared/API/APIModels.swift`
- Modify: `ios/DrinkSaver/Shared/UI/AppFrame.swift`
- Modify: `ios/PARITY.md`

- [ ] Write failing request/response mapping tests against the approved OpenAPI contract.
- [ ] Write failing UI/store tests for disclosure text, explicit destructive confirmation,
  cancellation, success, already-deleted, expired auth, server failure, and Retry.
- [ ] Implement an Account menu action and branded confirmation flow; do not require a support
  email or external manual request.
- [ ] Clear AppAuth/Keychain state and return to the signed-out gate after confirmed deletion.
- [ ] Run visual, Dynamic Type, VoiceOver, Reduce Motion, API contract, and live disposable-account
  deletion tests; verify the account can no longer refresh or call the API.
- [ ] Record the deliberate frozen-baseline divergence in `ios/PARITY.md`.

Expected: deletion can be initiated and verified end to end from the app, with no premature local
logout that conceals a failed server deletion.

## IOS-REL-006: Complete privacy and App Store disclosure evidence

**Outcome:** App Store privacy/support material reflects observed production data flows and the
approved legal/retention position.

**Dependencies:** `PRIV-1`, `IOS-REL-003` through `IOS-REL-005`.

**Status:** BLOCKED until the responsible privacy/legal owner provides the determinations. This
checklist may document open items, but public-release readiness requires approved closure or
written not-applicable evidence for every applicable `PRIV-1` through `PRIV-7` item.

**Files:** Modify the privacy/support documents selected by the policy owner and create
`docs/release/ios-privacy-checklist.md`.

- [ ] Inventory actual data collected, linked to identity, retained, logged, exported, deleted,
  and sent to Keycloak, Apple/TestFlight, or another processor.
- [ ] Publish privacy and support URLs; document retention, account deletion, contact, lawful
  basis/consent conclusions, and user rights using approved wording.
- [ ] Complete App Privacy answers from the inventory, not from intent; have the responsible
  privacy/legal reviewer approve them.
- [ ] Verify unified logs and retained CI artifacts contain no tokens, credentials, drink payloads,
  or unnecessary personal data.
- [ ] Inspect the signed archive's privacy report and confirm the app privacy manifest declares
  every directly used required-reason API, including the app's UserDefaults use.
- [ ] Record remaining organizational `PRIV-*` gates without claiming code can close them.

Expected: disclosure answers trace to evidence and every unresolved legal/organizational item is
an explicit release blocker.

## IOS-REL-007A/B/C: Add TestFlight delivery, beta verification, and release runbook

**Outcome:** An authorized maintainer can upload a signed build to TestFlight, verify it, and make
a separate manual App Store release decision.

**Dependencies:** `IOS-REL-001` through `IOS-REL-006`, completed clone verification, paid program
membership.

**Files:**

- Create: `.github/workflows/ios-release.yml`
- Create: `ios/ExportOptions.plist`
- Create: `docs/release/ios-app-store.md`

**Pickup rule:** `IOS-REL-007A` owns protected archive/upload automation; `IOS-REL-007B` owns
metadata and real-device TestFlight verification; `IOS-REL-007C` owns the public-release/rollback
runbook. Each requires explicit external mutation authorization and is committed/reviewed
separately.

- [ ] Confirm Apple's current first-party upload mechanism and GitHub-hosted runner Xcode before
  writing the workflow; use `xcodebuild` and Apple tooling directly rather than adding Fastlane.
- [ ] Add `workflow_dispatch` only, environment protection, least-privilege permissions, immutable
  action SHAs, concurrency lock, `VERSION` marketing version, and increasing build number.
- [ ] Store certificates/profiles/App Store Connect credentials only in protected environment
  secrets; mask and prevent fork/PR access; never echo private-key material.
- [ ] Build/test first, then archive/export/upload the exact tested commit. Retain `.xcresult`,
  archive metadata, checksums, and upload evidence without retaining secrets.
- [ ] Complete App Store metadata, adapted icon, screenshots for required iPhone sizes, age rating,
  privacy/support URLs, category, review notes, and a disposable review account.
- [ ] Verify TestFlight install, login, session restore, Quick/Add/History/Recommendations, deletion,
  both themes, network failure, and upgrade from the previous build on a real iPhone.
- [ ] Keep production submission/release manual. Document phased release, rollback by removing the
  version from sale, incident contacts, and Keycloak client/token revocation.

Expected: TestFlight upload succeeds only from the protected manual environment; the public App
Store action remains a separately authorized human decision.

---

## Post-clone task

## IOS-FU-001: Replace the binary theme with System/Dark/Light

**Outcome:** System appearance is the default, explicit overrides persist, and existing clone users
retain their chosen theme during migration.

**Dependencies:** Clone acceptance; separately approved UI update.

**Status:** BLOCKED pending a future design decision for the three-way control's placement,
appearance, copy, and interaction. The behavior contract below is approved; implementation must
not invent the visual control.

**Files:**

- Modify: `ios/DrinkSaver/Shared/Design/ThemeStore.swift`
- Modify: `ios/DrinkSaver/Shared/UI/AppFrame.swift`
- Modify: `ios/DrinkSaverTests/ThemeTests.swift`
- Modify: `ios/DrinkSaverUITests/AppFrameUITests.swift`
- Modify: `ios/PARITY.md`

**Interfaces:**

```swift
enum ThemePreference: String, Codable, CaseIterable { case system, dark, light }
```

- [ ] Write failing migration tests: missing old key becomes `.system`; stored `dark`/`light`
  migrates to the equivalent explicit preference; migration runs once without losing intent.
- [ ] Write failing behavior tests: `.system` tracks live color-scheme changes; overrides ignore
  them; relaunch restores preference; all three options have selected semantics and exact copy.
- [ ] Replace the menu control with a three-way accessible picker matching the approved follow-up
  design; do not alter unrelated frame geometry.
- [ ] Run token, frame, visual, Dynamic Type, VoiceOver, and persistence tests in all modes.
- [ ] Update `ios/PARITY.md` to record this deliberate divergence from web baseline `28c33fd`.
- [ ] Commit as an independent change:

```bash
git add ios/DrinkSaver/Shared/Design/ThemeStore.swift ios/DrinkSaver/Shared/UI/AppFrame.swift \
  ios/DrinkSaverTests/ThemeTests.swift ios/DrinkSaverUITests/AppFrameUITests.swift ios/PARITY.md
git commit -m "feat: follow the system appearance on iOS"
```

## Final clone acceptance

The native clone is ready for user review when `IOS-001` through `IOS-025` are complete and all of
the following are true:

- Full deterministic iOS test plan passes on the pinned GitHub-hosted macOS environment.
- Local and test live journeys pass with verified cleanup.
- Both-theme visual matrix matches the frozen baseline within documented rasterization tolerance.
- Independent accessibility review has no unresolved Critical or High finding.
- iPhone SE, iPhone 13 mini, and large-iPhone portrait layouts pass at default and accessibility
  text sizes.
- Authentication restores, refreshes, cancels, expires, and logs out without token disclosure.
- Single/batch save, timeout Retry, save Undo, deferred delete, delete Undo, background flush, and
  relaunch recovery pass.
- Documentation commands and configuration values have been validated against source.
- No `IOS-REL-*` gate is misreported as complete merely because the clone builds locally.

Public App Store readiness additionally requires all `IOS-REL-*` tasks plus approved closure or
written not-applicable evidence for every applicable `PRIV-1` through `PRIV-7` gate.
`IOS-FU-001` remains
outside both clone and public-release acceptance unless separately scheduled.
