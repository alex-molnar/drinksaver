import type { MenuRowKey } from '../../drink/draftFields';
import type { CreatableCatalogueField } from '../../drink/useCreateCatalogueEntry';

/**
 * The add sheet's panel stack, as pushed and popped by `useSheet`. Kept separate from
 * `SheetHost.tsx` so `MenuPanel`, `OptionPanel` and `CreatePanel` can import the type without a
 * circular dependency on the component that renders them.
 *
 * `option` covers every `MenuRowKey`, catalogue-backed or not (`date`, `notes`, `recommend`
 * included): `OptionPanel` branches on `field` itself rather than each bespoke field getting its
 * own panel kind, so pushing one is always the same action regardless of what the row turns out
 * to need. `create` is narrower, restricted to `CreatableCatalogueField`, because only five of the
 * nine row kinds have a catalogue entry to create at all - see `useCreateCatalogueEntry.ts`'s
 * module doc for why consumption type is excluded.
 */
export type AddSheetPanel =
  | { kind: 'menu' }
  | { kind: 'option'; field: MenuRowKey }
  | { kind: 'create'; field: CreatableCatalogueField };

export const MENU_PANEL: AddSheetPanel = { kind: 'menu' };
