# State matrix — iOS visual reference catalogue

Frozen commit: `28c33fde49566559f21c626dde2f5fcdfaae3d34`

Each state is captured in **both themes** (dark, light) at **three viewports**
(375×667, 375×812, 440×956), producing 6 images per state.

## Captured states

| # | State ID | Screen | Description |
| --- | --- | --- | --- |
| 1 | `quick-ready` | Quick Save `/` | Recommendations loaded; enamel plates visible with palette colours and glass silhouettes. |
| 2 | `quick-loading` | Quick Save `/` | Recommendations request held pending; `PlateGridSkeleton` visible. |
| 3 | `quick-error` | Quick Save `/` | Recommendations endpoint returns 500; alert text and degraded grid with "Something else" reachable. |
| 4 | `history-populated` | History `/history` | Four drinks on the selected day; paper-tab rows with names and day-strip counts. |
| 5 | `history-empty` | History `/history` | No drinks on the selected day; empty paper tab. |
| 6 | `history-error` | History `/history` | Drinks endpoint returns 500; error state in the paper tab. |
| 7 | `recs-ready` | Recommendations `/recommendations` | Six persisted recommendation rows listed. |
| 8 | `recs-empty` | Recommendations `/recommendations` | Empty list; "0 saved" subtitle. |
| 9 | `recs-error` | Recommendations `/recommendations` | Recommendations endpoint returns 500; error state. |
| 10 | `add-root` | Add Drink sheet `/?sheet=add` | Root menu panel open: "What are you having?" heading with field rows and save controls. |

**Total images:** 10 states × 2 themes × 3 widths = **60 PNGs**

## State-family coverage mapping

| Design-spec family | Covered by | Notes |
| --- | --- | --- |
| Authentication / loading | `quick-loading` | The app-level loading skeleton; the Keycloak login form is platform auth (ASWebAuthenticationSession equivalent on iOS) and is not part of the branded UI. |
| Quick Save loading / ready / saving / saved / error | `quick-loading`, `quick-ready`, `quick-error` | `saving` and `saved` are transient in-flight states; their visual treatment (stamp, feedback strip) is exercised by the save-queue unit tests and XCUITest harness rather than static web capture. |
| Add Drink panels | `add-root` | Root panel captured. Option/creation sub-panels require multi-step interaction; they are covered by the XCUITest fixture harness (IOS-003A) for the native implementation. |
| History loading / empty / populated / error | `history-populated`, `history-empty`, `history-error` | `loading` is transient; `selected`, `crossing off`, `undo`, `bulk action` are interaction states covered by XCUITest. |
| Recommendations loading / empty / ready / error | `recs-ready`, `recs-empty`, `recs-error` | `editing`, `reordered`, `deleting`, `dirty`, `saving` are interaction states covered by XCUITest. |
| Foreground / background / relaunch / expired session | — | Native lifecycle states; not web-capturable. Covered by XCUITest fixture harness. |
| Dynamic Type / increased contrast / Reduce Motion | — | Native accessibility settings; not web-capturable. Covered by native accessibility tests. |

## Deferred states (documented, not captured)

These states are part of the full acceptance matrix in the design spec but are either
transient interaction states better verified by XCUITest, or native-only lifecycle /
accessibility states that have no web equivalent:

- Quick Save: `saving` (in-flight stamp), `saved` (feedback strip)
- Add Drink: option panels, creation panels, validation states
- History: `loading`, `selected`, `crossing off`, `undo`, `bulk action`
- Recommendations: `loading`, `editing`, `reordered`, `deleting`, `dirty`, `saving`
- Lifecycle: foreground, background, relaunch, expired-session recovery
- Accessibility: large Dynamic Type, increased contrast, Reduce Motion

These are tracked for coverage in the native XCUITest suite (IOS-003A harness +
feature-level UI tests), not in this web reference catalogue.