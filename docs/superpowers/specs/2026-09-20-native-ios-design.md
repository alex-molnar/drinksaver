# DrinkSaver native iOS app design

Date: 2026-09-20

Status: approved and frozen in conversation

Frozen web baseline: `28c33fde49566559f21c626dde2f5fcdfaae3d34`

## Objective

Build a completely native iPhone client for DrinkSaver in Swift and SwiftUI. The first release
must reproduce the frozen web application's product behavior and branded interface. It must not
embed the web application, execute its JavaScript, or use React Native or another cross-platform
runtime.

Future web-interface changes do not automatically expand this scope. Each later parity update is
a separate task against an explicitly named baseline.

## Product scope

The first release:

- supports iPhone only, in portrait only;
- targets iOS 18 and later;
- is written primarily in SwiftUI, with UIKit or other Apple frameworks only where a system
  capability requires them;
- is English-only;
- requires a network connection and does not provide offline logging or synchronization;
- supports local, test, and production environments;
- uses the existing DrinkSaver backend and Keycloak identities;
- is free, with no advertising, subscription, or in-app purchase;
- contains no product analytics or third-party crash-reporting SDK;
- uses `im.kak.drinksaver` as its bundle identifier;
- is structured for TestFlight and an eventual public App Store listing; and
- derives its marketing version from the repository's `VERSION`, while using an independent,
  monotonically increasing App Store build number.

The current free Apple developer account is sufficient for Xcode development and testing on the
owner's connected devices. Paid Apple Developer Program membership is a gate for TestFlight,
App Store Connect, and public distribution, not for implementation of the app itself.

## Explicit non-goals

The clone release does not add:

- iPad, Mac, Apple Watch, Apple Vision Pro, or landscape layouts;
- offline-first storage, queued offline writes, or conflict resolution;
- statistics, trends, health integrations, widgets, notifications, or background refresh;
- biometric app locking;
- haptics or new decorative animation;
- localization infrastructure before a second language exists;
- a backend-for-frontend or iOS-specific API;
- an embedded browser for the DrinkSaver application;
- API client generation from OpenAPI;
- a database or durable response cache;
- a general state-management framework; or
- a redesign of the frozen web interface.

## Source of truth and parity definition

Commit `28c33fde49566559f21c626dde2f5fcdfaae3d34` is the complete first-release reference. Source
tokens, measurements, type roles, SVG paths, copy, state transitions, and interaction rules at
that commit take precedence over a later deployment or a later web commit.

"Exact clone" means:

- the same information architecture, visible copy, visual hierarchy, token values, branded
  surfaces, feature states, validation, and domain behavior at default accessibility settings;
- native equivalents for platform-owned UI that the web app already delegates to the platform:
  authentication, keyboard and text editing, and date selection; and
- accessibility adaptations where strict geometry would otherwise clip, hide, or prevent use of
  content.

Browser and Core Text rasterization will not produce identical pixels. Acceptance therefore
combines fixed-runtime image comparison with explicit geometry, color, typography, state, and
interaction assertions. A global image similarity score alone cannot establish parity.

## Technical architecture

The app lives under a new top-level `ios/` directory as a checked-in Xcode project. The minimum
native stack is:

- SwiftUI for screens and branded controls;
- Swift Observation for observable state;
- Swift structured concurrency for asynchronous work;
- `URLSession` for REST calls;
- AppAuth-iOS for OAuth 2.0 and OpenID Connect;
- Keychain Services for restorable authorization state;
- `UserDefaults` for the selected theme;
- XCTest and XCUITest for automated verification; and
- Apple unified logging for privacy-safe diagnostics.

No framework is introduced for routing, dependency injection, persistence, state management,
logging, linting, analytics, or networking. AppAuth-iOS is the only planned runtime package
because OAuth/OIDC token handling is security-sensitive and already solved by a mature native
implementation.

### Project boundaries

The project is organized by product feature rather than by a speculative abstraction hierarchy:

- `App/`: launch, environment configuration, authentication gate, root tab and sheet
  coordination, and scene lifecycle handling;
- `Shared/`: API wire models and transport, Keycloak session handling, Keychain persistence,
  clocks, design tokens, fonts, glass paths, and genuinely shared controls;
- `Features/QuickSave/`;
- `Features/AddDrink/`;
- `Features/History/`;
- `Features/Recommendations/`;
- `Resources/`: theme assets, fonts, texture, glass artwork, and application artwork;
- `DrinkSaverTests/`; and
- `DrinkSaverUITests/`.

Each feature owns its view and observable state. A type becomes shared only when more than one
feature uses the same product rule. Authentication, theme, API transport, design catalogue,
add-drink draft, and save/delete queues are the cross-feature state already present in the web
application and therefore belong above individual screens.

The app keeps successful query data in memory. Only authorization state, selected theme, and the
minimal pending-delete recovery record survive process termination. Each recovery record is bound
to the build environment and authenticated Keycloak subject; it is never replayed under another
account or against another API origin.

## Environment configuration

Local, Test, and Release build configurations use checked-in `.xcconfig` files for public
values:

- API base URL;
- Keycloak base URL;
- realm name;
- native client ID; and
- OAuth redirect URI.

The app contains no Keycloak client secret. Release validation must fail if a Release archive
points to local or test services.

Environment names and client IDs are:

| Environment | Keycloak client ID |
| --- | --- |
| Local | `drinksaver-ios-local` |
| Test | `drinksaver-ios-test` |
| Production | `drinksaver-ios` |

All three use `im.kak.drinksaver:/oauth2redirect` as the native redirect URI, registered for the
corresponding client.

## Authentication and session lifetime

Authentication uses the system authentication session through AppAuth-iOS. Every native client
is public, enables Authorization Code flow, requires S256 PKCE, and exposes no direct password
form inside the app.

The restorable AppAuth authorization state is stored with a device-only Keychain accessibility
class. On launch, the app restores it and refreshes before an authenticated API request when
necessary. The API client coordinates refresh so concurrent requests do not produce concurrent
refresh operations.

The production native client requests offline access. Keycloak is configured with:

- a 90-day offline-session idle limit; and
- a 365-day absolute offline-session maximum.

The 365-day promise is conditional on verified realm `Offline Session Max Limited`, realm maximum,
client overrides, offline-scope mapping, and refresh-token rotation. A realm-wide setting is not
changed until its impact on existing offline clients is reviewed and explicitly approved. Every
rotated AppAuth state is persisted before refresh is treated as successful.

Opening and successfully refreshing the app within 90 days extends the idle window, but every
user authenticates again at least annually. Leaving the app unopened beyond the idle limit also
requires authentication again.

Logout ends or revokes the authorization session where the provider supports it and always
deletes local authorization state. Authentication cancellation returns to a stable signed-out
screen. Authentication or refresh failure never exposes a half-authenticated application.

Keycloak self-registration is enabled before the public launch. Account and data deletion must
be initiable from the app before public release, but that menu entry is a separately approved
post-clone UI change because it is absent from the frozen web baseline.

## API integration

The native app calls the existing REST API directly. Swift `Codable` wire models mirror the
actual response and request shapes without becoming feature-view state. Endpoint methods remain
small and explicit rather than introducing generated code or a repository/use-case layer.

Every authenticated request attaches the current bearer token. A 401 causes one coordinated
refresh and one replay. If the replay is still unauthorized or refresh fails, the app signs out.
Other 4xx responses are not retried automatically.

The request timeout is ten seconds, matching the frozen web client. Errors are classified as:

- timeout;
- connection/offline;
- client response;
- server response; or
- unknown.

Feature views map these classifications to the same loading, empty, inline-error, persistent
Retry, and authentication outcomes as the frozen web application.

There is no persistent offline write queue. A timed-out save may have reached the server, so an
explicit Retry first refetches the affected drinking day and compares its row count with the
pre-save baseline before sending another POST. This reproduces the frozen client's existing
duplicate-reduction behavior without claiming idempotency that the server does not provide.

## Shared domain rules

### Drinking day

The drinking day rolls over at 06:00 in the device's current calendar and time zone. Between
midnight and 05:59:59, Quick Save is headed "Tonight" and records against the preceding calendar
date. Date arithmetic must remain correct across month, year, leap-day, daylight-saving, and
time-zone changes.

Product copy and date/number presentation are fixed to English (`en-GB`) in this English-only
release, even when the device uses another language. Calendar and time-zone calculations still use
the device's current settings.

### Design metadata

Color palette and glassware identity are independent, backend-driven values. The native app does
not infer either from a display name. Unknown or absent metadata uses the same frozen fallback
rules as the web application.

One authenticated, in-memory design-catalogue store fetches palettes and glassware in parallel,
retains the frozen fallbacks while loading or failed, exposes Retry, and clears account-derived
state on logout. It renders backend-supplied glass SVG path data as native SwiftUI paths. Palette
contrast rules are verified independently for dark and light ink.

### Save and delete queues

Saves are sent immediately. On success, every returned drink ID is held for Undo, including a
batch save. Deletes are hidden immediately but are not sent until their undo window ends.

The undo window is 6.5 seconds. It pauses while the feedback control has accessibility focus or
active interaction. A newer operation may supersede the visible feedback, but queue state remains
deterministic and testable.

When the app moves to the background, an undo action can no longer be promised. Undoable saves
are committed visually; undoable deletes begin a best-effort, bounded background DELETE request
after the recovery record is synchronously persisted. Next-launch reconciliation is authoritative;
the app never claims background completion merely because a task started. The minimal operation ID and
drink IDs for a delete are persisted before the request so a termination or failed background
flush can be reconciled at the next launch. This recovery record is not an offline feature and
contains no drink description or other user content.

## Application frame

Authenticated screens share the frozen painted-board frame:

- a header with the contextual title and count/date subtitle;
- a menu containing Recommendations, Add new type, Logout, and the dark/light control;
- a custom bottom navigation with Quick, Add, and History; and
- safe-area-aware, portrait-only content.

The frame is custom SwiftUI rather than a stock `NavigationStack` or `TabView` appearance. Native
navigation primitives may manage presentation internally, but their default chrome must not
replace the frozen visual treatment.

## Quick Save

Quick Save preserves:

- the drinking-day title and live count;
- the two-column enamel-plate layout;
- backend-driven palette and glass identity;
- deterministic plate rotation;
- loading skeletons;
- the degraded error state that leaves "Something else" reachable;
- the always-present "Something else" plate;
- save-in-flight disabling;
- saving and saved stamps; and
- save success, failure, Retry, and Undo feedback.

Recommendation identity uses the frozen composite of recommendation ID, alcohol type, volume,
and brand because recommendation IDs may be absent in ordinary responses. A save refetches
history and marks recommendations stale, but recommendation refresh waits until the save queue is
idle so plates cannot move under a second tap.

## Add Drink sheet

Add opens one branded bottom sheet over the current tab. The sheet owns a stack of panels without
replaying the sheet presentation when moving between them. Dismissal returns to the originating
tab. Opening a fresh sheet resets the draft to the current drinking day.

The root panel contains:

- Drink;
- beer-only Brand, optional Flavour, and required Served fields;
- non-beer Subtype;
- Size;
- When;
- Notes;
- Recommend;
- quantity from 1 through 24; and
- the Save action.

A draft is saveable when it has a drink type and size, plus a serving type for beer. Brand is not
required. Selecting a new drink type clears subtype, size, brand, flavour, and serving type.
Selecting a new brand clears flavour. Creating and adopting a new catalogue entry applies the
same cascade as choosing an existing entry.

Option panels preserve the frozen ordering, selected checkmark, loading state, palette cue, Back
action, and supported create action. The user can create and immediately adopt:

- a drink type;
- a brand;
- a flavour for the selected brand;
- a subtype for the selected drink type; and
- a volume for the selected drink type.

Creation preserves the parent context and supports the same palette and glass inheritance and
override rules. Serving types cannot be created from the app.

When offers Today, Yesterday, and a native arbitrary-past-date picker. Notes uses native text
editing inside the branded panel. Recommend preserves enabled, temporary, custom name, palette
override, and glass override state. Turning Recommend off clears all recommendation-only fields.

The Save action sends one request with the complete draft. Quantity above one requests identical
drinks in one batch. The sheet dismisses after handing the operation to the queue. Until the
server-composed name is fetched, feedback uses the same provisional type plus brand/subtype label
as the web application.

## History

History preserves:

- the selected date and contextual label;
- a horizontally scrolling seven-day strip ending at the current drinking day;
- loading, failure, empty, and count marks for every day;
- an arbitrary-past-date native picker;
- the light paper-tab surface in both application themes;
- backend-driven glass identity for rows;
- selection by tapping a row;
- individual cross-off;
- bulk cross-off;
- strike, fade, and layout-reflow motion;
- deferred delete and Undo; and
- stable behavior when a late response, refetch, date change, or same-session optimistic save
  arrives.

Live server data wins when Undo restores a row. Rows retained only for exit animation never
become new data. Pending deletes remain suppressed during refetch. A later delete also suppresses
the corresponding same-session optimistic insertion so a saved-then-deleted drink cannot return
at the bottom of the list or remain in day counts.

## Recommendations

Recommendations shows only persisted recommendations belonging to the authenticated user. It
preserves:

- loading, error, empty, and ready states;
- inline rename and cancellation;
- drag reordering;
- individual delete with strike/fade and Undo;
- Cancel and Save controls when the draft is dirty;
- save payload ordering;
- response-driven cache replacement; and
- return to Quick after a committed save.

Pending deletes are resolved before a reorder save so the submitted order cannot omit a row that
the user can still restore.

## Theme behavior

The clone release defaults to dark on first launch, ignores system appearance, and remembers the
user's manual dark/light selection. This is intentional parity with the frozen web baseline.

A separately scoped post-clone task changes the control to System, Dark, and Light, makes System
the default, migrates the stored two-state preference safely, and adds parity tests for live
system-appearance changes.

## Visual system and assets

The native design system ports the frozen values rather than approximating them:

- dark and light surface, ink, line, accent, texture, and elevation tokens;
- spacing and corner-radius tokens;
- named type roles and motion durations/easings;
- painted ground and board surfaces;
- enamel plates;
- dotted menu leaders;
- paper history tab;
- feedback tape strip;
- palette swatches; and
- glass silhouettes and fills.

Fraunces and Familjen Grotesk remain the type families. The iOS project uses OTF or TTF resources
sourced from the same OFL font versions and axis values as the frozen web assets; WOFF2 web files
are not repackaged as if they were native font resources. The project carries the required OFL
license text and verifies Latin Extended glyphs used by the catalogue.

The existing cream/red/umber glass favicon is the basis of the application icon and launch
artwork. Adaptation may add the background, padding, and scale required by Apple's asset format,
but may not introduce a new brand direction.

## Motion

Motion communicates state and hierarchy rather than decorating the interface. Durations and
easings match the frozen tokens for:

- sheet presentation and panel transitions;
- pressed plates and controls;
- saving/saved stamps;
- feedback-strip exit;
- history strike/fade/reflow; and
- recommendation strike/fade/reorder.

Reduce Motion removes nonessential movement and replaces it with immediate state changes while
preserving status, order, and focus. No haptic behavior is added in the clone release.

## Accessibility

At default accessibility settings, the app matches the frozen layout. Accessibility settings may
change geometry where required for use.

The implementation must provide:

- Dynamic Type without clipped or hidden content;
- VoiceOver names, values, traits, states, action order, and announcements;
- a logical focus path through the frame, sheets, rows, and feedback;
- minimum 44 by 44 point interactive targets;
- WCAG 2.2 AA text and non-text contrast;
- Reduce Motion behavior;
- accessibility-safe error and status announcements;
- keyboard-safe text and date editing; and
- usable reflow on the smallest supported portrait viewport.

The decorative noise, leader dots, swatches, rotation, and glass art do not duplicate semantic
information. Labels, values, selected states, and actions remain authoritative.

## Visual verification

The iPhone 13 mini (375 x 812 points) is the primary parity reference. The acceptance matrix also
includes iPhone SE (3rd generation, 375 x 667 points) and iPhone 16 Pro Max (440 x 956 points), all
in portrait.

Reference coverage includes both themes and the following state families:

- authentication/loading;
- Quick Save loading, ready, saving, saved, and error;
- every Add Drink panel, selection, creation, validation, saving, and failure;
- History loading, empty, populated, selected, crossing off, Undo, bulk action, and error;
- Recommendations loading, empty, ready, editing, reordered, deleting, dirty, saving, and error;
- foreground, background, relaunch, and expired-session recovery; and
- default, large Dynamic Type, increased contrast, and Reduce Motion settings.

Automated image comparison runs only on a pinned simulator/runtime. Web and simulator captures are
normalized to the named device's point canvas at a documented 3x sRGB raster scale, flattened to
opaque pixels after applying the same safe-area crop. It permits a small, documented per-channel
anti-aliasing tolerance but fails on dimensions, missing regions, token-color differences, or
geometry drift. Separate assertions cover token values, frames, spacing, type roles, control
dimensions, visible copy, and state. Human overlay review is required before parity is accepted.

## Test strategy

Every implementation task leaves a runnable check and can be verified with fakes or fixtures even
when a later integration depends on live infrastructure.

### Unit tests

Pure tests cover:

- drinking-day and display-date behavior, including DST and calendar boundaries;
- draft readiness and cascade rules;
- quantity bounds;
- palette and glass inheritance/fallback;
- contrast calculations;
- recommendation filtering, editing, ordering, and dirty state;
- save/delete/recommendation queue transitions;
- undo timing and background reconciliation;
- error classification and timeout retry decisions;
- authentication-state restoration and coordinated refresh; and
- theme persistence.

### API contract tests

Each endpoint has request-encoding and response-decoding fixtures. Tests also cover repeated query
parameters, absent versus null optional fields, ordered recommendation edits, bearer attachment,
one-refresh/one-replay behavior, timeout mapping, and environment isolation.

### UI and journey tests

XCUITest runs deterministic journeys against injected transport and authentication doubles. The
suite covers the authentication gate, Quick Save, Add Drink including catalogue creation,
History, Recommendations, theme persistence, failure recovery, backgrounding, and relaunch.

A smaller live suite uses the test deployment, real Keycloak login, disposable records, and
verified cleanup. Live tests never target production and never leave test records intentionally.

### Accessibility tests

Automated checks cover identifiers, names, traits, values, focusable elements, target sizes,
contrast calculations, Dynamic Type layouts, and Reduce Motion state. Accessibility Inspector and
real VoiceOver interaction supplement automation. Any untested assistive-technology behavior is
reported rather than inferred.

## Continuous integration

GitHub Actions uses GitHub-hosted macOS runners and a pinned Xcode/runtime version. Pull-request
and branch verification:

- resolves Swift packages;
- builds the iPhone app for a simulator with signing disabled;
- runs unit, API contract, visual, and deterministic UI tests;
- validates Release environment configuration;
- uploads failing screenshots and test results; and
- triggers when `ios/**`, `docs/api-docs.yaml`, `VERSION`, or relevant workflow files change.

Simulator CI does not require paid Apple membership.

After paid enrollment, a manually triggered release job archives a Release build, reads the
marketing version from `VERSION`, assigns an increasing App Store build number, signs without
printing credentials, uploads to TestFlight, and retains build evidence. App Store publication
remains a separate manual decision.

## Public-release gates

Local development, simulator tests, and connected-device tests do not wait for public-release
work. TestFlight and public release remain blocked until their applicable gates pass.

### Apple account and delivery

- Enroll in the paid Apple Developer Program.
- Confirm `im.kak.drinksaver` availability and register it to the correct team.
- Configure signing assets and App Store Connect API credentials without committing secrets.
- Create the App Store Connect record, age rating, category, support URL, privacy URL, screenshots,
  copy, review notes, and review credentials.

### Authentication and account lifecycle

- Create and verify the production native Keycloak client.
- Enable and test self-registration.
- Provide password recovery and email-verification behavior appropriate to the realm.
- Add an in-app account/data-deletion initiation path as a separately reviewed UI change.
- Verify logout and offline-token revocation.

### Security

- Resolve `SEC-1` before open registration. The current alcohol-volume endpoints permit a
  cross-user catalogue write; public registration materially broadens who can exploit it.
- Re-run authentication, authorization, transport-security, secret-handling, and dependency
  review against the release candidate.
- Confirm production services use valid TLS and no cleartext exception exists in Release.

### Privacy and legal

The app bundle includes and archive validation checks an Apple privacy manifest for every directly
used required-reason API, including the app's UserDefaults-based theme preference. Dependency
manifests do not substitute for the app's own declaration.

- Complete the special-category determination tracked by `PRIV-1`.
- Publish the privacy notice and retention terms.
- Implement verified export/deletion and applicable retention behavior.
- Complete App Privacy answers and required organizational records.
- Confirm that unified logs contain no tokens, credentials, drink payloads, or other unnecessary
  personal data.

## Documentation obligations

The native project documentation must describe:

- supported environments and safe configuration;
- local build and test commands;
- authentication redirect and Keycloak setup;
- every component's inputs, states, accessibility behavior, and frozen web counterpart;
- queue and lifecycle semantics;
- visual-reference generation and comparison;
- CI and signing boundaries;
- TestFlight and App Store release procedures; and
- how to declare and execute a future parity-baseline update.

No backend controller change is part of the clone. If implementation discovers an API mismatch,
work stops at an evidence-backed contract task; any controller change must update
`docs/api-docs.yaml` and follow the repository's API-change workflow.

## Feasibility and prerequisites

The design is feasible with the existing backend endpoints and native iOS capabilities. The
known local prerequisite is that full Xcode is not installed or selected on the development Mac;
only Command Line Tools are currently active. Xcode installation and simulator/runtime setup must
precede the first implementation task that builds the application.

Other prerequisites are deliberately staged:

- AppAuth-iOS and the native fonts can be resolved during project foundation work.
- Local and test Keycloak clients are required before live authentication integration, but their
  absence does not block feature development against authentication doubles.
- Paid Apple membership blocks only TestFlight/App Store tasks.
- Privacy, legal, account deletion, open registration, and `SEC-1` block public release, not local
  feature implementation.

## Follow-up outside clone acceptance

### System-aware three-way theme

Replace the binary theme control with System, Dark, and Light. System becomes the default, tracks
live iOS appearance changes, and safely migrates existing dark/light preferences. This is an
independently testable post-clone task and does not alter the first clone's acceptance criteria.
