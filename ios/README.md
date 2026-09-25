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
the single Add sheet host; feature interiors remain owned by their feature tasks. Quick header
counts come from the injected `CurrentDrinkingDayStore` (`Nothing yet` or `N so far` after its
first successful load). `AppCoordinator` retains the selected tab while Add routes are presented.
The menu appearance control toggles the persisted `ThemeStore` choice, which defaults to dark and
overrides system appearance. Stable `frame.*` accessibility identifiers support simulator UI tests.

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
