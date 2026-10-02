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
