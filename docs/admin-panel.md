# DrinkSaver admin panel

The admin app is a separate Vite application under `admin/`. Keycloak initializes before
the protected shell renders. `AdminGate` accepts only the `/admin` group claim and the API
remains the authority for every admin operation.

## Workspace shell

`Workspace` wraps routed pages with the five primary links: Recommendations, Alcohol types,
Beer brands, User-defined and Design. The active link exposes `aria-current="page"`. Content
is centred at 1260px with 40px desktop insets; below 900px the navigation becomes a compact
horizontal control and content insets shrink to 20px. Direct links and browser history work
for parent and child routes. Unknown paths show a named not-found page.

The shell uses the consumer's copied umber tokens, Fraunces and Familjen Grotesk fonts,
visible keyboard focus and reduced-motion settings. The current route placeholders are being
replaced by the catalogue pages in the implementation plan.

## Design maintenance

`DesignPage` has Palettes, Glassware and Consumption types tabs. The selected tab is stored
in `?tab=` so the glassware link from an empty consumption-type collection is directly
navigable. The page has no public props; each section reads its collection through the
shared query client and exposes loading, error, empty, edit, delete and conflict states.

Palette editing pairs labelled hex text fields with native colour controls. Light and dark
consumer-token previews update from the draft. Unsupported existing colour strings remain
visible until corrected. On update, untouched optional inks are omitted and an explicit
clear is sent as an empty string.

Glassware editing previews draft SVG paths as SVG attributes. The selected preview palette
is local to the editor and is not submitted. Clearing optional foam sends an empty string
on update. Consumption types show their glassware preview and cannot be created until
glassware is available; empty and failed glassware states offer a route or retry.
Conflicting deletes keep confirmation open with the API error.

## Recommendations

`RecommendationsPage` has no props. It loads the ordered defaults and resolves type, subtype,
brand, flavour, palette, glassware and consumption labels from default collections. Missing
references stay visible as IDs. Search filters names; ordering is disabled while filtered or
while a write/refetch is pending. Drag sorting supports keyboard input and the Move up/Move
down buttons provide a direct alternative. A rename sends every `{id, name}` in the visible
collection order; the returned full collection replaces cached state. Create offers optional
subtype, volume, brand, flavour and consumption type fields. Changing type clears subtype and
volume; changing brand clears flavour. Volumes are displayed in litres and are never edited.
Delete requires confirmation. The server uses last-write-wins because the API has no revision
token.

## User-defined catalogue

`UserDefinedPage` has no props. Its Types, Subtypes, Brands and Flavours tabs read only the
user-defined collections. Child tabs require selecting a default parent before requesting
the corresponding children collection; the page has no global child query. Search filters
names. Inspect opens a read-only record view, and Publish requires confirmation that the
entry moves into defaults without undo while existing children stay user-defined. Successful
publication invalidates both the source and default queries. The DOM exposes no edit, delete
or unpublish actions.

## Shared components

### `PageState`

Props: `loading`, `error`, `empty`, `filteredEmpty`, `onRetry`, `emptyAction`, and `children`.
Loading is announced as a status; errors use an alert and optional Retry button; an empty
collection can show an action; filtered-empty results explain that the search found no match.
Children render only for a successful non-empty state.

### `ConfirmDialog`

Props: `open`, `title`, `description`, `pending`, optional `error`, `onConfirm`, and
`onClose`. The title and description label the dialog. Pending work disables both actions
and prevents dismissal; an error stays visible in the open dialog. Cancel closes without
calling `onConfirm`; Material UI restores focus to the opener.

### `DrinkPreview`

Props: readable `label`, optional `glassware`, and optional `palette`. Missing glassware uses
a readable fallback. Server SVG paths are placed only in React's SVG `d` attributes; no raw
HTML is inserted. The adjacent text remains the accessible name for the decorative drawing.

## Route map

| Path | Page |
| --- | --- |
| `/` | Redirects to Recommendations |
| `/recommendations` | Recommendations |
| `/alcohol-types` | Alcohol types |
| `/alcohol-types/:typeId/subtypes` | Alcohol subtypes |
| `/beer-brands` | Beer brands |
| `/beer-brands/:brandId/flavours` | Beer flavours |
| `/user-defined` | User-defined catalogue |
| `/design` | Design |

The approved page scope and endpoint contract are in the [implementation plan](superpowers/plans/2026-09-21-admin-panel.md)
and [Workspace specification](superpowers/specs/2026-10-02-admin-panel-visual-directions.md).

## Default types, brands and children

Alcohol types and beer brands query only their default collections. Search filters the
loaded rows and shows a separate filtered-empty message. Parent cards show palette and
glassware names when available, a preview, and Edit/Delete/Children actions. Type and brand
creation accepts repeatable initial subtype/flavour names; blank child names are removed
before submission. Type requests omit volumes and client-supplied owner IDs.

Child routes validate a positive integer parent ID against the default parent collection
before requesting children. A missing or non-default parent shows a back link and offers no
child actions. Child forms keep the parent from the route. Cards resolve null design
overrides from the parent and label them as inherited. Edit payloads omit unchanged
nullable design IDs; an omitted ID preserves the existing assignment. Names and design
options are labelled; parent/child and flavour limits follow the actual DTO/OpenAPI
contract.

Editor props: `open`, `title`, `submitLabel`, `pending`, optional `error`, `onSubmit`,
`onClose`, and `children`. A pending submission disables Save and Cancel. A failed save
keeps the form open with its draft and an alert. Delete uses `ConfirmDialog`; HTTP 409 keeps
the confirmation open with the conflict message, while HTTP 404 refreshes the affected
collection. A 403 appears as an authorization error rather than an empty result.
