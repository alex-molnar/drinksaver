# Native iOS app

## Theme and typography

`DrinkSaverTheme.dark` and `.light` contain the frozen web token values. `ThemeStore` keeps the
manual dark/light choice in `UserDefaults` under `drinksaver-theme`; an absent or unknown value
starts dark. `PlasterBackground(theme:)` paints the ground and its one subtle noise layer behind
the root view. Feature surfaces should use the theme's flat colors instead of drawing another
noise layer. `TypeRole.font` uses Dynamic Type relative to each role's matching SwiftUI text style;
the numeral role also uses tabular digits.

## Authenticated app frame

`RootView` shows the signed-in frame only after session restoration succeeds. `AppFrame` owns the
Today/Tonight header, Recommendations/Add new type/Logout menu, Quick/Add/History navigation, and
the single Add sheet host; feature interiors remain owned by their feature tasks. One
`FeedbackStrip` is hosted by the frame or the Add sheet as a compact floating toast at the bottom of
the content area, like the web app. Page content and the Add sheet reserve its height with a bottom safe-area inset, so it never covers the Save button, a bulk action, or the end of a list (web floats it above the sheet CTA; here it sits below it). Failures use the theme danger colour with on-accent text, and Reduce Motion drops the slide, and `FeedbackArbiter` chooses the most
recent drink or recommendation queue message while routing Undo and Retry back to that queue.
Its Undo and Retry buttons keep their exact labels, failures remain visible until retried, and
accessibility focus pauses queue expiry. Quick header
counts come from the injected `CurrentDrinkingDayStore` (`Nothing yet` or `N so far` after its
first successful load); its Today/Tonight label refreshes at local midnight, and the current
drinking day refreshes on foreground and at the next local 06:00 boundary. `AppCoordinator`
retains the selected tab while Add routes are presented and resets it to Quick on sign-out.
The menu appearance control toggles the persisted `ThemeStore` choice, which defaults to dark and
overrides system appearance. Stable `frame.*` accessibility identifiers support simulator UI tests.
The frame has the web's two soft edges (`AppFrameEdges`): a 12% ink wash fading down from the
header and an 18% ink fade rising above the bottom navigation (the web's `0 -6px 18px` shadow).
Both are drawn outside the bars, over page content (the header wash lies over the top of the page
content, and the nav fade over its bottom), so header and tab text keep a flat backing:
the Apple contrast audit fails small text on a gradient. They are hit-test and accessibility
hidden, so they never block taps. The header background also extends up under the status bar
(`ignoresSafeArea(edges: .top)`), so the status bar area takes the raised surface colour like the
header instead of the ground colour.

## Quick Save

`QuickSaveView` shows backend recommendations as a two-column plate grid. It has loading skeleton,
retryable error, and ready states; the ready state keeps Add plate last in the grid and routes it to
the shared Add sheet. Each plate resolves the recommendation's palette and glass design, and shows
queue-backed saving and saved feedback with an accessible status. `QuickSaveStore` sends saves
through `SaveQueueStore`, uses the current drinking-day date and selected design, and delays a
recommendation refresh until queued saves or undo operations finish.

## History

`HistoryView` shows an oldest-first seven-day strip and a paper-style selected-day view. Each date
loads and caches independently; selecting an earlier date opens the native calendar picker, while
future dates are unavailable. Loading, retryable error, empty, and populated states are local to
the selected date. The current drinking date reads from the same `CurrentDrinkingDayStore` as Quick,
and pending queue inserts and deletions are reflected in the visible rows and counts. Rows support
individual or selected bulk cross-off through `SaveQueueStore`; the row remains during the exit
motion, and the screen exposes Undo or Retry feedback. Reduce Motion removes the row immediately
while keeping the same queue and Undo behavior.
Each row shows a small flat-ink glass silhouette before the name, chosen like web's `drinkIdentity` (known drink name, then alcohol type, then highball) by `DesignResolver.historyGlassware`.
Row checkbox and cross-off icons use the paper ink (`HistoryRowInk`), so they stay visible on the light paper in dark mode.
A 2pt rule at 35% paper ink (`HistoryRowInk.headerRule`, as on web) separates the date header from the drink rows in both themes.
Tapping anywhere on a row toggles its selection, like web; the checkbox and cross-off buttons keep their own behaviour.

## Recommendation editing state

`RecommendationsStore` edits only rows with a persisted ID owned by the signed-in user. Its draft
tracks names and order separately from the committed snapshot; hidden pending deletions retain
their order slots. `RecommendationQueue` defers deletes and arrangement updates for 6.5 seconds,
serializes network operations, restores a saved snapshot on Undo, and keeps failures retryable.
`RecommendationTabView` presents loading, retryable error, empty, editing, reorder, cross-off, and
dirty-draft states. Names edit inline; drag-and-drop and labeled Move Up/Move Down controls provide
equivalent reorder paths. Cancel restores the latest committed arrangement, while a committed
Save returns to Quick.
The scroll view uses an eager `VStack` to retain the inline text field while keyboard avoidance
shrinks the viewport. Focus belongs to the screen and is restored when returning to an active
rename. All recommendation rows are constructed together; the keyboard regressions cover both
the six-row list and editing the final row of a scrolled twenty-row list.
Each row reads, left to right, like web: a six dot grip, the name, the pencil, the Move up/Move down
arrows and the trash can. The grip is decorative and hidden from VoiceOver (the row's
Move up and Move down actions are the accessible reorder path) and about 20pt wide; the icons keep
a 44pt minimum hit area that grows with Dynamic Type. Icons use the paper ink at 60%
(`RecommendationRowStyle`), not the default blue tint, so they stay visible on the light paper in
dark mode, and dim to 40% while a save is in flight, like web. The trash can is labelled
"Delete NAME", as on web.
While a name is being edited, the grip stays (dimmed to 40%, like web) so the field does not jump left,
and the field sits on the paper, so in dark mode it uses a faint tint of the paper ink
(`DrinkSaverFieldTone`, about 9%) instead of the near black recess, with on-paper text, an on-paper
placeholder and on-paper disabled ink (80%, so the placeholder clears 4.5:1 on the light field);
light mode keeps the recess tone. Done and Cancel are a checkmark and an xmark in the paper ink
(`recommendations.rename-done.<id>`, `recommendations.rename-cancel.<id>`), each a 44pt target that
keeps its VoiceOver labels "Save name" and "Cancel name".

`SceneLifecycleHandler` commits Undo windows when the scene backgrounds, persists queued drink
deletes before starting their background request, then sweeps expired entries and reconciles saved
deletes when the scene becomes active. A save that completes while backgrounded is committed without
showing an Undo action. Session expiry follows the existing session gate and clears both queues.

## Add a drink

The Add sheet has no close button; tap outside or swipe down to dismiss it. On the drink type, size,
subtype, brand, and flavour panels a "+" sits in the header (accessibility label "Add size" and so on,
identifier `frame.add.new`), a duplicate of the "Add new ..." row that opens the same create panel,
as on web.
Menu rows follow web's order: Drink, then for beer Brand, Flavour (once a brand is set), Served, Size, or for other
drinks Subtype, and Size once a drink is chosen, then When, Notes, Quantity, Recommendations (`AddDrinkStore.menuRows`).
Drink type, subtype, brand, and flavour rows show a small palette swatch resolved like web
(own palette, then parent brand or type) through `DesignResolver` and the design catalogue.

The Notes row stacks its label above the input, so the field spans the row at any text size instead of colliding with the label; text inputs carry 6 to 10 pt of vertical padding from their neighbours.

The Add sheet retains one draft across its nested drink, size, subtype, serving, brand, and flavour
panels. Its "When" row defaults to the current drinking day and reads Today, Yesterday, or the chosen date; it opens a "When was it?" panel with Today, Yesterday, and Another day (native calendar plus Set date, no future dates), mirroring the web app. Creating a catalogue entry selects it and
returns to the prior panel; pending creation cannot be submitted twice, and a response is adopted
only while the selection context still matches. Recommendation name and design overrides are
separate from catalogue-creation fields; new catalogue design overrides remain unset until chosen,
so entries inherit their parent design by default. Recommendation palette and glass overrides apply
independently over the selected subtype or beer flavour/brand/serving design. Changing the drink or
brand clears dependent selections. Quantity is limited to 1–24, notes are trimmed, and unset
optional request fields are omitted. Saving hands the request to `SaveQueueStore`, closing the
sheet while the shared Undo/Retry feedback remains available.

The bundled Fraunces roles are static native instances at the frozen optical-size, weight,
softness, and wonk values. Familjen Grotesk stays variable over weights 400–700. The source WOFF2
files in `web/src/assets/fonts/` are never converted or shipped by iOS.

Regenerate the checked-in TrueType files with:

```sh
ios/scripts/generate-font-assets.sh
```

The script downloads sources from Google Fonts revision
`23e54b51ddffbc7713c583748e3bd86f62b1fa4a`, verifies their SHA-256 checksums, and pins
FontTools `4.58.0`. Fraunces instances use `(opsz, wght, SOFT, WONK)` values `(60, 700, 85, 1)` for
display L, `(30, 700, 85, 1)` for display M, `(28, 600, 70, 1)` for display S, and
`(90, 700, 90, 1)` for numerals. Generated fonts have a fixed OpenType timestamp and verified
output checksums in the script. The separate copyright notices and SIL Open Font License 1.1
terms are in `DrinkSaver/Resources/OFL.txt`.

## App artwork and privacy

`DrinkSaver/Resources/Assets.xcassets/AppIcon.appiconset` and the launch screen mark are derived
from the existing `web/public/favicon.svg`; no other logo source is used. Regenerate the two PNG
assets with `ios/scripts/generate-app-artwork.sh`. The app icon adds a full-bleed umber background
and scales the original mark to Apple's visual safe area. `LaunchScreen.storyboard` uses the same
ground and mark. Both app Info.plists select that storyboard and register the bundled fonts.

`DrinkSaver/Resources/PrivacyInfo.xcprivacy` declares only the app's direct UserDefaults use, with
reason `CA92.1`. No other required-reason API use was found in the app source.

## Backend drink design metadata

`Palette` and `Glassware` decode the backend catalogue values. `DesignCatalogue` resolves IDs
independently and falls back to cream and highball for missing or unknown IDs. `DesignResolver`
keeps beer flavour → brand → alcohol type and subtype → alcohol type palette inheritance separate
from glass selection; beer glassware comes from its selected serving type.
`GlassShape(pathData:fallbackPathData:)` converts the backend `g`, `l`, or optional `f` SVG path
into a SwiftUI `Shape`, applying the shared web `0 0 34 50` viewBox transform to every layer so
the liquid and foam stay aligned with the glass. It accepts the backend path commands
`M/L/H/V/C/S/A/Z`; malformed paths, paths over 16 KiB, paths over 2,048 rendered segments, and
non-finite or extreme coordinates use the highball outline.

## REST wire models

`Shared/API/APIModels.swift` mirrors the backend request and response payloads. Request models omit
unset optional values and never send `userId`; the server derives ownership from the bearer token.
`SavedDrink` and `Recommendation` model backend responses, including nullable design IDs and the
nullable recommendation ID. `DrinkSaverTests/APIModelTests.swift` checks these shapes against the
JSON fixtures in `DrinkSaverTests/Fixtures/API/`. `APIClient` implements the `DrinkSaverAPI`
endpoints over an ephemeral `URLSession`, adds bearer tokens from `AccessTokenProviding`, and
refreshes and retries a request once after a 401. It uses a 10-second request timeout and reports
status, authentication, decoding, timeout, and connection failures without retaining response
bodies or credentials. `DrinkSaverTests/APIClientTests.swift` verifies endpoint requests and retry
behavior with a stub URL protocol.

## Authorization state persistence

`KeychainAuthorizationStore` stores serialized authorization state as a generic-password item.
The item is accessible only while unlocked and does not migrate to another device or synchronize
through iCloud Keychain. Reads return `nil` when no state exists; writes replace the existing item,
and clearing is safe to repeat. The store keeps authorization bytes out of preferences and error
messages.

## Sign-in and session gate

The app uses AppAuth-iOS 2.1.0 for system-browser authorization with the public Keycloak client,
Authorization Code flow, and S256 PKCE. On launch, `SessionStore` restores the secure AppAuth state;
the root view keeps the signed-in screen hidden until restoration succeeds. Sign-in requests
`openid`, `profile`, and `offline_access`. Callback URLs use the registered
`im.kak.drinksaver:/oauth2redirect` scheme. Fresh API tokens are obtained through AppAuth and the
resulting rotated authorization state is saved before the token is returned. Logout clears local
Keychain state before attempting the provider end-session flow. If secure local clearing fails, the
session gate stays closed and offers a retry action.

## Button styles

The action buttons use `DrinkSaverButtonStyle` (`Shared/UI/DrinkSaverButtonStyle.swift`, applied as `.buttonStyle(.drinkSaver(kind, size:, fillsWidth:, onPaper:))`): Save drink, Add and use it, Set date, Save, Show day, Retry, the sign-in gate and the rename Done and Cancel. Tabs, menu rows, option rows, the header back and plus buttons and the quantity stepper are deliberately `.plain` and draw their own look. The style reads `ThemeStore` for dark and light and mirrors the web buttons: display type roles, 44 pt minimum height and press scale 0.98 on filled buttons. Corners are `radius.sm` (4 pt), which is the web Add sheet CTA. The web MUI `Button` is `radius.md` with a 48 pt minimum, which is not replicated here.

- `.primary`: `accent.primary` fill with `ink.onAccent` text (Save drink, Add and use it, Set date, Save, Show day, sign-in gate).
- `.secondary`: outlined, `ink.primary` text (Add new, recommendations Cancel).
- `.text`: no fill, underlined `ink.primary` text (`ink.onPaper` with `onPaper: true` for rows on the paper surface). It is not accent coloured because 18 pt semibold text is not "large" under WCAG and `accent.primary` is only about 3.3:1 on the dark panel. Used by Retry and rename Done and Cancel.
- Disabled: flat 8% ink fill with `ink.tertiary` text and no shadow, as on web. The visual comes from the style reading `isEnabled`; VoiceOver reports the button as dimmed because the call sites apply `.disabled(...)`, which also stops it being pressed.

Enablement mirrors web: `AddDrinkDraft.isReady` (web `isDraftReady`: type and size, plus serving for beer) gates `add.save`; `AddDrinkDraft.canCreate(_:)` (web `canSubmit`: non-empty name; for a size a parent drink type and positive litres; for a subtype a parent drink type; for a drink type, subtype and brand a colour palette, and for a drink type and subtype a glass, each either chosen or inherited) gates `add.create.submit`. The feedback strip Undo and Retry are plain semibold text like the web strip. Accessibility identifiers and labels are unchanged.

## Input fields

Text inputs use `.drinkSaverField()` (`Shared/UI/DrinkSaverFieldStyle.swift`), which follows the web Add sheet `TextInput` (not the MUI `TextField`, which is `radius-md` and 52 pt): recess surface, 1.4 pt ink border, `radius.sm`, body type, 52 pt minimum height and an accent border while focused. It is applied to the Add sheet name, litres, notes and recommendation name fields and to the recommendation rename field. A field has exactly one focus binding: pass the owner's `FocusState` as `.drinkSaverField(focus: $focused)` (the rename field does, so starting a rename raises the keyboard), otherwise the modifier keeps its own. The recess surface stays as the fill, not the web 5% ink tint, because ink is light in dark theme and would vanish on the paper rename row.

The quantity stepper uses `DrinkSaverStepperButton` (ink glyph in a 52 pt box, 1.4 pt border, 5% ink fill, dimmed to 28% when disabled). Minus disables at 1 and plus at 24 like the web. The count is its own accessibility element labelled "Quantity" with the count as its value, so VoiceOver focuses it and swiping up or down adjusts it (not verified on a device with VoiceOver running). The "Decrease quantity" and "Increase quantity" buttons are separate named elements, so Voice Control and Full Keyboard Access reach them by name. The recommendation and create panel design rows retry a failed catalogue load once each time the Add sheet opens, and a retry keeps any endpoint that already loaded.

The colour and glass selectors in the create panel and the recommendation options use `DesignPickerRow`, like the web `DesignSelector`: a caption, a bordered menu trigger showing the chosen name, and the resolved swatch or glass on the right. The preview is the selection, else the inherited value (`AddDrinkDraft.inheritedPaletteID(for:)`, `inheritedGlasswareID(for:)` for new entries and `AddDrinkStore.inheritedDesignIDs` for recommendations, which `makeRequest` also uses), and the glass is tinted with the resolved palette. The empty choice reads "Use inherited default", or "Choose a color palette" or "Choose glassware" when there is no parent value (it is then not selectable). When the design catalogue is empty the trigger is disabled and the row shows "Color palette choices are unavailable. Try again shortly." (or the Glassware equivalent), like web, and opening the Add sheet retries a failed catalogue load once. The glass is drawn by `GlassArtwork`, shared with the Quick plates. Captions and accessibility labels follow web ("Color palette", "Glassware"; in the recommendation options "Recommendation color palette", "Recommendation glassware"), and the chosen name is exposed as the accessibility value.
