# Native iOS visual parity and accessibility review

**Reviewed:** 2026-09-26  
**Scope:** IOS-022A, IOS-022B, and IOS-022C on the stacked branches `ios-022a-visual-parity`, `ios-022b-accessibility`, and `ios-022c-readiness-review`.  
**Decision:** The app is **not ready to call visually/accessibly at parity**. The capture and audit gates work and expose issues that need remediation before integration readiness.

## IOS-022A: visual capture and comparison

The UI-test fixture captures ten states in dark and light appearance at 375×667, 375×812, and 440×956 points. The committed native catalogue has 60 files, matching the 60 frozen web references. Captures use the same fixed instant, `en-GB` locale, `Europe/Amsterdam` time zone, and 3× sRGB output. The capture test passed on iPhone SE (3rd generation), iPhone 13 mini, and iPhone 16 Pro Max simulators running iOS 27. The richer catalogue fixture is selected only for reference captures; ordinary UI tests retain their original catalogue, verified by three Add UI tests passing after isolation.

`VisualParityTests` compared all 60 pairs on iPhone 13 mini. Its thresholds require mean channel error below 24 and fewer than 12% of sampled pixels above a 24-channel delta. **11 pairs met both thresholds; 49 failed.** Quick averaged 10.8% outlier pixels; History averaged 40.3%, Recommendations 42.8%, and Add root 34.4%. The largest mean error was 110.52; the largest outlier fraction was 63.18%. The test fails on these differences by design and attaches a metric for every pair. The local result bundle was `/private/tmp/ios022a-parity-report.xcresult`.

One visual spot check at the full 375×812 reference size compared `history-empty-dark-375x812.png`. The native screen shows an almost blank paper panel and its empty-state sentence has very low contrast. The web reference has a divider, a prominent empty-state heading, and supporting text. The native date strip also starts one day earlier in the visible region. This spot check is evidence of the measured drift, not completion of the planned 100% review of all 20 iPhone 13 mini images.

The capture matrix has been frozen in `ios/Reference/native/`. Regenerate it only when deliberately updating the native comparison baseline; ordinary comparison runs must not overwrite it.

## IOS-022B: automated accessibility checks

The Xcode UI-test run on iPhone 13 mini completed **1 of 4 tests successfully**. The accessibility-focused Dynamic Type layout and keyboard reachability test passed at the `accessibility5` size. Three checks exposed current failures:

- Apple’s `performAccessibilityAudit()` reports **“Dynamic Type font sizes are unsupported.”** The same finding appeared when the simulator ran with Increased Contrast enabled. The simulator setting was restored to disabled afterward.
- `quick.queue.undo` exposes a 65.3×34.3 pt accessibility frame, below the 44 pt target.
- `recommendations.delete.9` exposes a 13.3×13.3 pt accessibility frame, below the 44 pt target.

The tests also verify labels and values for the primary tabs, menu, date selection, and recommendation actions. The test run and its exact failures are in `/private/tmp/ios022b-accessibility-final.xcresult`.

## Independent accessibility review

An independent source review of this branch identified these additional issues:

| Severity | Finding | Evidence and reproduction |
| --- | --- | --- |
| P2 | Error text falls below WCAG AA normal-text contrast. | History error red on paper measured about 3.24:1; Quick error text measured 3.59:1 in dark mode and 4.40:1 in light mode. Open the corresponding error fixtures in each appearance. Existing theme tests do not cover these pairings. |
| P2 | More controls are below 44 pt. | History row selection is 40 pt wide; Add quantity decrement/increment buttons have no explicit per-button 44 pt frame. Inspect a loaded History row and the Add Quantity controls. |
| P2 | Async errors and save feedback have no explicit announcement behavior. | Quick, History, and Recommendations render error messages as plain text; `FeedbackStrip` also changes ordinary text. Trigger an error or save/undo while VoiceOver is focused elsewhere. |
| Verification gap | Reduce Motion is not driven by the UI fixture flag. | The fixture writes a custom `uiFixtureReduceMotion` environment value, while animated views read SwiftUI's `accessibilityReduceMotion`. A simulator Reduce Motion setting/device run is still required. |

These findings are reported as review evidence; the IOS-022A/B branches contain test infrastructure and checks, not runtime app changes.

## Manual checks still required

- Review all 20 iPhone 13 mini state/theme screenshots at 100%, then spot-check every state on iPhone SE 3rd generation and iPhone 16 Pro Max.
- On a physical device, use VoiceOver to check spoken labels and values, focus order, rotor grouping, custom movement actions, and announcements while async state changes.
- Verify Reduce Motion through the real iOS Accessibility setting. The existing `-ui-reduce-motion` fixture argument alone does not prove that system setting is active.
- Inspect Increased Contrast on a physical device in both themes; the simulator run only established that the setting can be enabled while XCUITest runs.
- Resolve the visual and accessibility failures, rerun the full iOS test suite, and confirm the Release archive excludes all UI fixture and capture code before marking parity complete.

## Xcode evidence

| Check | Result |
| --- | --- |
| Native capture test, iPhone 13 mini, iOS 27 | Passed; 20 attachments |
| Native capture test, iPhone SE 3rd generation, iOS 27 | Passed; 20 attachments |
| Native capture test, iPhone 16 Pro Max, iOS 27 | Passed; 20 attachments |
| Frozen visual comparison, iPhone 13 mini, iOS 27 | Ran; 49 of 60 image pairs exceeded one or both thresholds |
| Accessibility UI tests, iPhone 13 mini, iOS 27 | Ran; 1 passed, 3 failed on listed findings |
| Accessibility audit with Increased Contrast enabled | Ran; reports unsupported Dynamic Type font sizes; setting restored |
| Full Xcode suite, iPhone 13 mini, iOS 27 | 166 passed, 5 failed: visual gate, three accessibility checks, and one appearance-toggle UI test |
| Add UI regression tests after fixture isolation | 3 passed |
| Generic iOS Release build | Passed; app executable has no UI-fixture/reference launch strings |
| Physical-device VoiceOver and 100% overlay review | Not run |
| Release archive | Not run |
