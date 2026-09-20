# DrinkSaver native iOS planning readiness review

Date: 2026-09-20

Reviewed baseline: `28c33fde49566559f21c626dde2f5fcdfaae3d34`

Documents reviewed:

- `docs/superpowers/specs/2026-09-20-native-ios-design.md`
- `docs/superpowers/plans/2026-09-20-native-ios-implementation-plan.md`

## Verdict

The native clone architecture is feasible and the clone backlog is ready for cold pickup once the
documented machine prerequisite is met: install Xcode 16.4 with the iOS 18.5 simulator runtime and,
with operator approval, select that full Xcode installation. This review does not claim that the
current Mac can build iOS code; live inspection found only Command Line Tools selected.

The public-release checklists are deliberately not all ready for implementation. Paid Apple
membership, Apple/Keycloak administrative authorization, the `SEC-1` product decision, and
privacy/legal decisions remain explicit gates. They do not block implementation or local review of
the native clone.

## Review method

Three independent development perspectives challenged the product-owner plan:

1. product/readiness coverage against the approved behavior and release goals;
2. Swift/iOS feasibility, platform API correctness, security, signing, CI, and AppAuth behavior;
3. adversarial task atomicity, dependency ordering, file ownership, and runnable verification.

The first pass found no fundamental architecture problem, but it did find concrete pickup
blockers. The plan was corrected and an atomicity re-review identified four remaining dependency/
toolchain issues; those four were corrected before this verdict. Two requested second-pass agents
could not run because their execution quota was exhausted, so the final Swift/product confirmation
is a direct evidence-based self-audit of their original findings, not a claimed second independent
pass.

## Confirmed findings and resolutions

| Finding | Resolution in the final documents |
| --- | --- |
| No runtime owner loaded backend palette/glass catalogues. | Added `IOS-010A`, an authenticated in-memory `DesignCatalogueStore` with parallel load, fallback, Retry, late-response rejection, and logout/account reset. |
| Quick/header live count had no owner. | Added `IOS-011A`, a shared current-drinking-day read model; AppFrame, Quick, and History own consumption wiring in their respective tasks. |
| Wire models silently depended on design types. | `IOS-007` now explicitly depends on `IOS-006`; the foundation DAG records the real order. |
| App frame used Add types created by a later feature. | `IOS-012` owns the route contract; `IOS-014` explicitly depends on it and aliases its feature names. |
| UI tests relied on fixture injection introduced only at the final gate. | Added `IOS-003A` after API/session contracts. Fixture code has a test-only compilation condition, no Release target membership, and archive inspection. |
| Pending deletes could replay under another account/environment. | Recovery records are bound to environment, issuer, and OIDC subject; mismatch/account-switch tests are required. |
| Background DELETE completion was over-promised. | Persistence is synchronous first; a bounded UIKit background task is best effort; next-launch reconciliation is authoritative. |
| SE and large-device geometry was inconsistent. | Matrix is fixed to SE 3rd generation 375x667, 13 mini 375x812, and 16 Pro Max 440x956 points. |
| Cross-renderer image comparison lacked a normalization contract. | Web/native images normalize to a 3x sRGB opaque point canvas with shared crop/alpha rules, structural checks, and documented tolerance. |
| Visual/accessibility, Keycloak, and CI tasks were monolithic. | Each now has explicit A/B/C pickup boundaries and file/state ownership. External Test-realm mutation remains separately approval-gated. |
| CI promised a pinned runtime but used `OS=latest`. | CI creates an iPhone 13 mini against iOS 18.5 with `simctl`, uses its UDID, and fails clearly if the pinned identifiers are absent. |
| AppAuth refresh API name and persistence rules were wrong/incomplete. | Plan uses `performActionWithFreshTokens`, `setNeedsTokenRefresh()` for forced refresh, checked continuation, secure coding, and persists rotated state before success. |
| Release endpoint checks used a weak denylist. | Release uses exact allowlisted HTTPS API/OIDC origins and validates the built plist; local cleartext behavior is isolated and tested. |
| App privacy manifest was absent. | `IOS-005C` adds `PrivacyInfo.xcprivacy`, declares direct UserDefaults use, inventories other required-reason APIs, and validates the archive report. |
| Keycloak's 365-day maximum omitted realm-level conditions. | Realm/client maximum, offline scope, rotation, and impact on other clients must be verified and approved before changing realm-wide policy. |
| Product locale behavior was ambiguous. | Product copy/date/number presentation is fixed to `en-GB`; drinking-day calendar/time zone remains device-local and is tested under a non-English locale. |
| Project plist ownership and version fallback were invalid. | `IOS-001` creates a physical plist/config mappings; fallback is numeric `0.0.0`; tests derive the expected marketing version from `VERSION`. |
| SVG path work was understated. | Parser scope names `M/L/H/V/C/S/A/Z`, elliptical arcs, finite/length/segment/bounds limits, and safe fallback. |
| Release tasks were presented as ready despite open decisions. | Decision/legal/external-state items are marked `BLOCKED` with exit criteria; public readiness requires closure or written non-applicability for all applicable privacy gates. |

## Clone dependency path

The critical path is intentionally plain:

```text
machine prerequisite
  -> IOS-001
  -> foundation contracts and frozen references
  -> IOS-008 API + IOS-010 session
  -> IOS-003A test harness
  -> shared catalogue, queue, and current-day state
  -> app frame and independent feature slices
  -> lifecycle integration
  -> visual/accessibility gates
  -> local/test live journeys
  -> final CI and documentation
```

Tasks that create XCUITests inherit `IOS-003A` as a hard dependency. Repository-only local
Keycloak configuration, approval-gated Test-realm mutation, and disposable live journeys are
separate pickup units. CI likewise has a smoke scaffold and a final acceptance-plan expansion so
feature workers do not repeatedly own the same workflow.

## Ready versus gated

Ready after the machine prerequisite:

- the complete native clone implementation path;
- deterministic unit/UI/visual/accessibility verification;
- repository-only Local Keycloak configuration;
- unsigned GitHub-hosted simulator CI; and
- developer, architecture, and parity documentation.

Gated and not to be picked up as ordinary implementation work:

- Apple enrollment/App ID/App Store Connect mutations;
- signing, protected upload credentials, TestFlight, and public release;
- Test and production Keycloak mutations without explicit authorization;
- public registration until `SEC-1` is resolved;
- export/deletion implementation until the privacy and retention contract is approved;
- account-deletion UI until that contract and UI are separately approved; and
- the System/Dark/Light follow-up until its visual control is designed and approved.

## Residual risks to verify during implementation

- GitHub runner images and Apple/AppAuth/Keycloak behavior can drift. Re-check first-party/current
  documentation at pickup time rather than treating today's versions as permanent.
- Simulator image comparison cannot prove physical-device color, system authentication, or actual
  VoiceOver announcement/focus behavior. The plan therefore retains real-device and manual checks.
- The backend has no idempotency key for saves. The retry flow reduces duplicate risk by refetching
  the affected day; it cannot claim exactly-once delivery.
- The frozen visual clone may intentionally diverge for Dynamic Type, VoiceOver, minimum targets,
  contrast, Reduce Motion, native authentication, keyboard behavior, and date input.

## Planning acceptance

No open material product question remains for the local/test clone. The plan provides named files,
interfaces, explicit dependencies, test-first steps, focused verification, expected results, and
future commit boundaries. Release-only decisions are visible blockers rather than hidden defaults.

This is a documentation/readiness conclusion only. No Swift application, Keycloak mutation,
Apple-portal mutation, commit, or push was performed during planning.
