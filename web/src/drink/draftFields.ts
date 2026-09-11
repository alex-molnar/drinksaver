/**
 * The add-sheet menu's row list and readiness check, ported from the approved prototype's
 * `fields()` and `formReady()` (variant 2, "Utolsó Kör", in the prototype referenced by the
 * design doc). Pure: everything it needs - the draft, the catalogue names to display, whether
 * the chosen type is beer, and today's drinking day - is passed in, so it is testable without a
 * network or a clock.
 *
 * `isReady` is not a verbatim port of the prototype's `formReady()`. The prototype's version
 * requires a brand for beer (`f.brand && f.served`); the shipped app never has, because
 * `Drink.brandId` is optional server side and `DetailedPage.test.tsx`'s
 * "requires a consumption type only for beer" already asserted the looser rule. Copying the
 * prototype's stricter check here would be a regression the prototype's own author never
 * intended - see the design doc: "the prototype is a design study, not a feature inventory."
 */
import type { AlcoholType, AlcoholVolume, AlcoholSubtype, ConsumptionType, Brand, BeerFlavour } from '../types/api';
import type { DraftState } from './draftReducer';

export type MenuRowKey =
  | 'alcoholType'
  | 'brand'
  | 'beerFlavour'
  | 'consumptionType'
  | 'subtype'
  | 'volume'
  | 'date'
  | 'notes'
  | 'recommend';

export interface MenuRow {
  readonly key: MenuRowKey;
  readonly label: string;
  /** The row's current value, formatted for display, or `null` while nothing is chosen yet -
   *  `MenuPanel` renders its own placeholder ("Choose", "Add a note") for that case, so no UI
   *  copy lives in this pure module. */
  readonly value: string | null;
}

/** What `menuFields` needs from the six catalogue queries, by the names `useCatalogue.ts`
 *  already fetches them under. Every field is optional: a query still loading or not yet
 *  enabled simply renders every row's value as "not chosen" rather than throwing. */
export interface DraftFieldsCatalogue {
  alcoholTypes?: AlcoholType[];
  volumes?: AlcoholVolume[];
  subtypes?: AlcoholSubtype[];
  consumptionTypes?: ConsumptionType[];
  brands?: Brand[];
  beerFlavours?: BeerFlavour[];
}

const nameOf = (list: { id: number; name: string }[] | undefined, id: number | null): string | null => {
  if (id === null) {
    return null;
  }
  return list?.find((item) => item.id === id)?.name ?? null;
};

export const volumeLabel = (list: AlcoholVolume[] | undefined, id: number | null): string | null => {
  if (id === null) {
    return null;
  }
  const volume = list?.find((item) => item.id === id);
  return volume ? `${volume.name} (${volume.volume}L)` : null;
};

const MONTH_ABBREVIATIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** `3 Sep`, from a `YYYY-MM-DD` string. Hand rolled rather than `toLocaleDateString`, which
 *  depends on the runtime's ICU data and would make this module's output vary between a
 *  developer's machine and CI for no reason. */
const formatDisplayDate = (iso: string): string => {
  const [, month, day] = iso.split('-');
  return `${Number(day)} ${MONTH_ABBREVIATIONS[Number(month) - 1]}`;
};

/** One day before `iso` (`YYYY-MM-DD`), in local calendar terms. Plain calendar arithmetic, not
 *  wall-clock arithmetic: unlike `drinkingDay`, there is no instant to reason about here, only a
 *  date already on the calendar, so `setDate` needs no daylight-saving caveat.
 *
 *  Exported for `OptionPanel`'s When panel, which needs the same "Yesterday" date to dispatch
 *  when the row is picked, not merely to display. */
export const previousIsoDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join(
    '-'
  );
};

const whenLabel = (date: string, today: string): string => {
  if (date === today) {
    return 'Today';
  }
  if (date === previousIsoDate(today)) {
    return 'Yesterday';
  }
  return formatDisplayDate(date);
};

/**
 * The menu's row list, in display order. Volume, subtype/brand/flavour/served only appear once a
 * drink type is chosen, matching `DetailedPage`'s old conditional sections; beer branches to
 * brand, flavour and consumption type, everything else branches to subtype. When, Notes and
 * Recommend are unconditional: see "Behaviours the prototype dropped, and that are being
 * restored" in the design doc.
 */
export const menuFields = (draft: DraftState, catalogue: DraftFieldsCatalogue, isBeer: boolean, today: string): MenuRow[] => {
  const rows: MenuRow[] = [
    { key: 'alcoholType', label: 'Drink', value: nameOf(catalogue.alcoholTypes, draft.alcoholTypeId) },
  ];

  if (draft.alcoholTypeId !== null) {
    if (isBeer) {
      rows.push({ key: 'brand', label: 'Brand', value: nameOf(catalogue.brands, draft.brandId) });
      if (draft.brandId !== null) {
        rows.push({ key: 'beerFlavour', label: 'Flavour', value: nameOf(catalogue.beerFlavours, draft.beerFlavourId) });
      }
      rows.push({
        key: 'consumptionType',
        label: 'Served',
        value: nameOf(catalogue.consumptionTypes, draft.consumptionTypeId),
      });
    } else {
      rows.push({ key: 'subtype', label: 'Subtype', value: nameOf(catalogue.subtypes, draft.subtypeId) });
    }
    rows.push({ key: 'volume', label: 'Size', value: volumeLabel(catalogue.volumes, draft.volumeId) });
  }

  rows.push({ key: 'date', label: 'When', value: whenLabel(draft.date, today) });
  rows.push({ key: 'notes', label: 'Notes', value: draft.comments.trim() ? draft.comments : null });
  rows.push({ key: 'recommend', label: 'Recommend', value: draft.addToRecommendations ? 'Yes' : 'No' });

  return rows;
};

/**
 * Whether the draft can be saved. Not a verbatim port of the prototype's `formReady()` - see the
 * module doc - but otherwise the same shape: a type and a size, with a consumption type required
 * only for beer.
 */
export const isDraftReady = (draft: DraftState, isBeer: boolean): boolean =>
  draft.alcoholTypeId !== null && draft.volumeId !== null && (!isBeer || draft.consumptionTypeId !== null);
