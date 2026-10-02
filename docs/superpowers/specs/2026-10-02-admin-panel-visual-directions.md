# DrinkSaver admin panel: approved Workspace design

Status: Workspace (Direction 3) approved by Alex on 2026-10-02. This is the visual and
functional specification for the replacement implementation plan. Directions 1 and 2
remain below as the alternatives considered. Approval covers planning; application
implementation is a separate step.

## Confirmed scope

- Recommendations: create, delete, rename and reorder defaults. Composition and design
  assignments cannot be edited after creation; create a new recommendation instead.
- Alcohol types: default entries only, with create/edit/delete and a subtype subpage.
- Alcohol subtypes: default children of the selected default type, with create/edit/delete.
- Beer brands: default entries only, with create/edit/delete and a flavour subpage.
- Beer flavours: default children of the selected default brand, with create/edit/delete.
- User-defined: inspect, filter and publish only; four tabs for types, subtypes, brands
  and flavours. Child tabs select from default parents only. Publishing a parent does
  not publish its children. Do not introduce server enforcement of this UI restriction.
- Design: Palettes, Glassware and Consumption types tabs, each with create/edit/delete.
- Initial child names can be entered while creating an alcohol type or beer brand.
- Existing volumes can be selected when creating recommendations. Volume creation,
  editing, deletion, publication and ownership redesign are excluded.
- Deletion relies on database protections, per Alex's confirmation. Show server conflicts;
  do not introduce browser-derived safety guarantees or a new deletion policy.
- Publication promotes ownership to the configured catalogue admin UUID. The entry moves
  from User-defined to Defaults. No shared flag, unpublish or original-author audit claim.

## Existing work and fixed technology

Baseline observed on `admin-panel`: `d92856e`. The application scaffold, runtime configuration
and auth components exist (original Tasks 1–3). `main.tsx` still renders a placeholder;
the auth components are not yet integrated into a working shell. No product pages, API
adapter, copied theme, admin chart or workflows have been implemented in this checkout.
Existing work is retained and assessed for compatibility, not repeated as new tasks.

Keep the separate `admin/` Vite application, React 19, TypeScript 6, MUI 9, TanStack Query 5,
React Router 7, axios, keycloak-js 26, installed dnd-kit, Vitest/jsdom/Testing Library,
ESLint, nginx, Helm and GitHub Actions. Keep the root `VERSION` contract and independent
runtime configuration, client, image and chart. Do not add a workspace or dependencies.

Retain Familjen Grotesk for controls/body and Fraunces for page headings. Reuse the web
theme primitives/tokens and self-hosted fonts. Actual drink previews use the consumer
light/dark tokens, irrespective of which shell direction is approved.

## Interactive comparison

The local prototype was served at http://127.0.0.1:8766/ to compare the three directions. The floating
picker changes layouts; when focused on the picker, number keys 1–3 and left/right arrows
also switch. Shortcuts are disabled while a dialog is open.
The prototype lives at `/private/tmp/drinksaver-admin-design/index.html`; it is disposable,
does not call APIs and is not application implementation. Its state resets on reload.

Use the same sample content and flows in each direction. Search, child navigation,
create/edit dialogs, initial children, delete/publish confirmation, recommendation order
buttons and loading/empty/error previews make the differences assessable. The prototype
does not establish backend acceptance or validate production form payloads.

## Alternative considered: Catalogue desk

Axis: dense tabular administration with a persistent rail.

- Dark umber shell: ground `#231512`, panels `#2E1C17`, text `#F2E4CE`, muted text
  `#CBB69B`, visible boundaries `#695045`, mustard accent `#C8952B`.
- Rail width 230px; content starts 44px inside it. Header uses a 38px Fraunces title,
  a short task description and a right-aligned primary action. No decorative metrics.
- Tables prioritise name, composition or design assignment, and explicit row actions.
  Compact recommendation order controls sit in the first column.
- Search precedes the table. Design and user-defined kinds use a second-level tab strip.
- Editors appear in a 660px maximum modal with two columns on desktop. Destructive
  actions use a smaller confirmation dialog naming the target.
- Best for frequent catalogue maintenance and scanning many rows. Cost: design previews
  require opening an editor, so visual curation gets less space in the list.

```text
Navigation | Page title                                  Add entry
           | Search                       Count
           | Name           Design        Actions
           | Entry          Assignment    Edit / Delete / Children
```

## Alternative considered: Collection studio

Axis: list and inspection side by side, with light consumer-derived surfaces.

- Light paper shell: ground `#F6EEDF`, panels `#FFF9EF`, text `#2B1A14`, muted text
  `#705A49`, boundaries `#B3A08A`, mustard accent `#926813`. Exact implementation values
  must come from the existing light token roles rather than a new parallel token system.
- Rail width 205px; main inset 36px; heading 44px. Lists get more vertical breathing room.
- A 290px inspector sits beside the list at wide sizes. Selecting a row updates its
  name, drink/design preview and contextual action; it does not start editing.
- The inspector is particularly useful for palette/glassware work. It shows the draft
  while an editor is open and renders both consumer themes for colour assessment.
- Below 1100px the inspector folds into the selected entry/editor, with no lost actions.
- Best for checking visual assignments while curating. Cost: fewer table columns fit;
  selection and inspection introduce an extra interaction for some tasks.

```text
Navigation | Page title                                  Add entry
           | Search
           | Entry list                     Selected entry
           | Name / assignment / actions    Drink preview
           |                                Edit
```

## Selected direction: Workspace

Axis: top navigation and spacious item presentation.

- Same dark consumer-derived material and fonts as Catalogue desk; change composition,
  not just colour. Top navigation replaces the left rail.
- Content is centred with a maximum width of 1260px and 40px insets. Page titles are
  46px. Two-column item cards use 18px gaps and clear name/design/action groupings.
- Recommendations become an ordered collection of drink summaries with explicit move
  controls. Types/brands make child navigation a prominent action on each item.
- The Design page gives shapes and palette samples space; user-defined items show enough
  context to decide whether to publish without opening an edit flow.
- Best for smaller catalogues and occasional curation. Cost: substantially more scrolling
  and weaker side-by-side scanning of a large collection.

```text
DrinkSaver     Recommendations  Alcohol types  Beer brands  User-defined  Design
Page title                                               Add entry
Search
Entry / preview / actions          Entry / preview / actions
Entry / preview / actions          Entry / preview / actions
```

## Page and form design shared by all directions

### Recommendations

Show order, name, readable composition summary, palette/glassware and edit/delete actions.
Default ordering is the persisted recommendation order, never alphabetical order. Drag
reordering uses the installed dnd-kit with keyboard support; explicit move controls provide
an accessible alternative. Search does not redefine the reorder payload or hide omitted
entries from a save. Disable reordering while filtered; clear the filter to reorder.

Create dialog: name, default alcohol type, optional default subtype, optional existing
volume, optional default brand/flavour/consumption type, required palette and glassware.
Changing type clears subtype/volume; changing brand clears flavour. Optional fields have
an explicit None choice. Existing volume values display in litres. Lists load only when
their parent is selected. No selectable user-defined catalogue entries.

Edit changes the name only; ordering is managed in the list. Composition is readable,
with the instruction to create a new recommendation to change its fields. Delete names
the recommendation and requires confirmation. Creation and edits do not close on failure.

### Alcohol types and beer brands

List default entries only. Each has name, supported design assignments, Edit, Delete and
View subtypes/flavours. Parent navigation changes the route, so refresh/back/deep links work.

Create type: name, palette, glassware and optional initial subtype names. Create brand:
name, palette and optional initial flavour names. Present repeatable name fields rather
than an opaque JSON payload. Each initial name can be removed before saving. No volume
creation controls. Initial children use the existing bundled creation contract; separate
design assignments can be edited on the child page afterwards.

Edit type: name, palette, glassware. Edit brand: name and palette. Do not expose volume
management or changing ownership. Existing nullable assignments remain readable; do not
offer reset-to-inheritance since PATCH null currently means leave unchanged.

### Child subpages

Breadcrumb/back navigation identifies the default parent by name. Show only its default
children. Creating a child fixes the parent from the route and asks for name plus required
design assignments (subtype: palette/glassware; flavour: palette). Editing cannot reparent.
An empty list names the parent and offers Add subtype/flavour. A missing parent is handled
as a missing-parent screen rather than being confused with a successful empty collection.

### User-defined

Tabs: Alcohol types, Subtypes, Beer brands, Flavours. Search filters the current list by
name. Types/brands load their user-defined collections directly. Child tabs fetch the
default-parent collection and require selecting a parent before fetching its user-defined
children. Cache and reuse that parent fetch; do not enumerate user parents or invent a
global-child endpoint. There is no additional backend enforcement request.

Rows show name, supported design fields and current owner UUID where useful, with Inspect
and Publish. No rename, delete or design-edit controls. Inspection presents details in a
read-only panel/dialog. Publication confirmation names the entry, explains the move to
Defaults, notes that children are unaffected, and does not promise an undo. On success,
refresh source/default collections and selectors. If publishing was already completed by
another session, refetch handles the idempotent result. The list can then become empty.

### Design

Three tabs: Palettes, Glassware and Consumption types. Palette rows show name and swatches;
the editor pairs colour/hex inputs and provides genuine light/dark drink previews. Nullable
light and dark ink each have a clear optional control. Glassware uses name plus outline/liquid/optional
foam SVG paths, a palette selector for preview only, and a rendered shape preview. Preview
selection does not alter the saved glassware. Consumption types use name and glassware.

Avoid invented complete usage counts. Attempt confirmed deletion and display database 409
conflicts with a readable explanation. No cascade, browser-inferred permission or automated
removal of referencing records.

## States, accessibility and responsive behaviour

- Each list has loading, loaded, empty, filtered-empty, forbidden and retryable-error states.
  Never turn failed queries into empty success. Forms preserve drafts on mutation failure.
- Save/publish/delete controls show pending state and prevent duplicate submissions. Status
  messages are announced. Confirmation Cancel remains clear and returns focus to its opener.
- Keyboard users can reach all navigation, fields and actions. Dialogs have accessible
  titles, labelled fields, focus containment, Escape behaviour and focus restoration.
- Destructive actions are identified by text, not colour alone. Swatches supplement names.
- Desktop is the primary target; below 900px navigation becomes a compact mobile control.
  Tables reflow to labelled entries; form columns become one. Inspectors remain available
  through details rather than simply disappearing. Validate 200% zoom and narrow reflow.
- Production targets minimum 44px primary touch actions, visible focus and WCAG 2.2 AA.
  Include an independent accessibility review and interaction checks; do not equate a
  prototype static review with compliance or screen-reader validation.
- No decorative entrance motion. Brief dialog/selection feedback respects reduced motion.

## Contract reconciliation for the replacement implementation plan

Most required routes now exist: default catalogue GET/POST; shared PATCH/DELETE; user-defined
GET/publish; recommendation CRUD/name-order editing; design CRUD; consumption-type CRUD.
The new plan must list actual verbs/paths/payloads/responses against source and canonical
OpenAPI, retaining existing components and introducing only required missing integration.

Known source facts to account for, without expanding this visual approval into backend work:

- Actual subtype publish path is `/v1/admin/user-defined/alcohol/subtypes/{id}/publish`;
  the OpenAPI path was corrected during replanning.
- Auth gate currently accepts broader groups than the server's exact `/admin`; align it.
- Recommendation edit/delete cache handling exists now. Create still lacks that controller
  invalidation. Check freshness after successful mutations and after commit.
- Admin consumption-type GET currently limits results to ten. Record the completeness gap.
- Subtype entity uses Long IDs while repository/controller lookups use Integer. Verify and
  align the actual database contract before relying on subtype mutation.
- Recommendation reference/source/relationship validation requires integration evidence.
  UI cascading does not establish server integrity.
- Backend origins must include the admin origins and local PATCH must be allowed.
- Database delete protection is an accepted existing responsibility, not new UI policy.
  Validate response behaviour against the target test database when implementing.

## Visual verification performed

All three desktop directions were opened and visually inspected in Chrome. Interaction
checks exercised parent creation with two initial children, child navigation, read-only
user-defined inspection, confirmed publication and its resulting empty collection, Design
tabs, and error/retry. A prototype form submission bug found during checking was fixed and
the parent/child creation flow rerun successfully. Control boundaries, dialog names, focus
after re-rendering, and picker shortcuts were adjusted following an independent static
accessibility review. Narrow layout was inspected at 390px.

These are prototype checks only. Production payload validation, backend/database checks,
screen-reader testing and actual browser zoom remain implementation acceptance work.

## Approval and delivery boundary

Alex selected Workspace after reviewing the picker. Finalize this design, replace
`2026-09-21-admin-panel.md` with a detailed, source-based implementation plan, and commit
the approved planning files on `admin-panel`.
Do not implement the application, push, open a PR, merge or deploy as part of this request.
