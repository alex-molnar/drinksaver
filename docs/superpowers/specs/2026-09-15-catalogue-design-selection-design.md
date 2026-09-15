# Catalogue design selection

Date: 2026-09-15
Status: approved

## Goal

Let a person choose the documented visual metadata while creating catalogue entries or saving a
recommendation, without breaking the inheritance already used to render drinks.

## Scope

The work is frontend-only. The branch already contains the backend and OpenAPI changes that accept
`colorPaletteId` and `glasswareId`; this change makes the add-sheet client send them.

The resource contracts decide which controls appear:

- alcohol type and alcohol subtype: palette and glassware;
- beer brand and beer flavour: palette only;
- recommendation: palette and glassware.

Beer glassware remains controlled by its consumption type. The documented beer brand and flavour
contracts do not contain a glassware field.

## Interaction

`CreatePanel` ends with a design section after its name (and litres, for a volume). The section is
made of accessible native selection controls accompanied by the existing palette swatch and a
glass silhouette preview. It uses the app's existing sheet typography, spacing, focus rings, and
44px minimum target sizes.

An alcohol type has no parent, so its palette and glassware must be real values returned by the
design endpoints before it can be submitted. A subtype, beer brand, or beer flavour begins at
"Use parent default" for each applicable property. That choice retains no child override:

- subtype palette and glassware inherit from its selected alcohol type;
- beer brand palette inherits from the selected beer alcohol type when one is in the draft;
- beer flavour palette inherits from its selected brand, then its selected beer alcohol type.

If a brand has no selected beer parent, it requires a real palette selection. The creation panel
uses the add sheet's existing Beer classification, so it follows a deployment whose backend
configures Beer to an ID other than the local default of `4`. The current API does not expose that
configured ID; exposing it as explicit catalogue metadata is a separate contract improvement. The
client never posts the display-only fallback design ID `0`.

The existing “Recommend this?” panel adds the same two controls after the optional name. Each
starts as “Use drink default”, previews the current resolved drink design, and stores an override
only after the person changes it. The final drink request still sends concrete resolved IDs, so
the recommendation snapshots the chosen visual identity.

## Data flow

`DesignProvider` exposes the successfully fetched palette and glassware lists in addition to its
ID lookup helpers. A reusable `DesignSelector` owns labels, inherited previews, and selection
semantics. `CreatePanel` passes its nullable selections into `useCreateCatalogueEntry`, which
forwards them through typed endpoint helpers. The draft reducer owns recommendation-only nullable
overrides; `useSaveDraft` layers them over `resolveDraftDesign` at submission.

Palette and glassware remain independent. No palette selection changes a glassware selection, and
vice versa.

## Verification

Focused Vitest tests cover typed request payloads, inheritance/default state, selector accessible
labels, and concrete recommendation payloads. A Playwright journey intercepts all five creation
POSTs and the recommendation save to assert the documented IDs. Browser validation checks the
interactive controls at narrow and standard mobile widths, including keyboard focus.
