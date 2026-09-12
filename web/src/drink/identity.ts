/**
 * Shared palettes and drink identities define the glass a drink is served in, the liquid's
 * decorative colour, the enamel plate's field colour, and the ink that sits on that field.
 *
 * This replaces the alcohol-type-ID icon maps that used to be duplicated in
 * `RecommendationButton.tsx` and `HistoryPage.tsx`. Those maps were keyed on `alcoholTypeId`,
 * which is too coarse for this table: Heineken pint and Guinness pint are both alcoholTypeId 4
 * (Beer), but need different identities. So the drink identity table is keyed on the display name
 * instead, which is exactly what the backend already composes and what the recommendation and
 * history endpoints already return (see the `recommendations` rows in
 * `deploy/local/seed.sql`, whose `name` column is verbatim what appears below).
 *
 * Identity is data, not theme: a field colour is the drink's identity and should stay
 * recognisable in any theme, and only the lettering is meant to flip. So the record carries
 * `inkDark` and `inkLight` from day one, with only the dark column populated, because there is
 * currently only a dark theme. `inkLight` is `null` rather than simply omitted, to say plainly
 * that it is undecided rather than forgotten.
 *
 * Every field/inkDark pair here is gated by `contrast.test.ts`, which is why the values are not
 * free to change without also passing that test: two of them moved 2.4% darker during design
 * because of it.
 */

/** The glass silhouettes `glassware.tsx` can draw. */
export type GlassKind = 'pint' | 'tulip' | 'wine' | 'highball' | 'rocks' | 'shot' | 'coupe' | 'flute';

export type PaletteKey = 'green' | 'brown' | 'cream' | 'red' | 'blue' | 'plum' | 'amber' | 'rose';

export interface DrinkPalette {
  /** The enamel plate's field colour. Decorative in principle, but gated all the same. */
  readonly field: string;
  /** The ink that sits on `field` in the current, dark-only theme. Gated at 4.5:1 against `field`. */
  readonly inkDark: string;
  /** The ink `field` will need once a light theme exists. Not yet decided. */
  readonly inkLight: string | null;
}

export interface DrinkIdentity extends DrinkPalette {
  /** Which silhouette `glassware.tsx`'s `<Glass>` draws for this drink. */
  readonly glass: GlassKind;
  /** The liquid's decorative colour. Not contrast gated: it never sits under text. */
  readonly chroma: string;
}

/**
 * Reusable palettes, independent of glass shape and drink name. The first six pairs come from
 * `docs/superpowers/specs/2026-09-09-ui-redesign-design.md`. Amber adds a golden enamel and rose
 * a pale dusty pink, both with dark ink.
 */
export const PALETTES: Readonly<Record<PaletteKey, DrinkPalette>> = {
  green: {
    field: '#2B7454',
    inkDark: '#F4E9CE',
    inkLight: null,
  },
  brown: {
    field: '#2B1A13',
    inkDark: '#EBD9B4',
    inkLight: null,
  },
  cream: {
    field: '#DFD1B0',
    inkDark: '#2B1A14',
    inkLight: null,
  },
  red: {
    field: '#BA422C',
    inkDark: '#F9EDD4',
    inkLight: null,
  },
  blue: {
    field: '#2C4B6E',
    inkDark: '#EFE2C8',
    inkLight: null,
  },
  plum: {
    field: '#6B3350',
    inkDark: '#F2E4CE',
    inkLight: null,
  },
  amber: {
    field: '#C9973B',
    inkDark: '#2B1A14',
    inkLight: null,
  },
  rose: {
    field: '#D4A0A7',
    inkDark: '#2B1A14',
    inkLight: null,
  },
};

/** The existing prototype identities compose a palette with their glass and liquid colour. */
export const DRINK_IDENTITIES: Readonly<Record<string, DrinkIdentity>> = {
  'Heineken pint': {
    ...PALETTES.green,
    glass: 'pint',
    chroma: '#E0A828',
  },
  'Guinness pint': {
    ...PALETTES.brown,
    glass: 'pint',
    chroma: '#7A2E12',
  },
  'Duvel bottle': {
    ...PALETTES.cream,
    glass: 'tulip',
    chroma: '#E8C04A',
  },
  'Chouffe bottle': {
    ...PALETTES.red,
    glass: 'tulip',
    chroma: '#D9903A',
  },
  'Gin and tonic': {
    ...PALETTES.blue,
    glass: 'highball',
    chroma: '#BFD8D0',
  },
  'Glass of red': {
    ...PALETTES.plum,
    glass: 'wine',
    chroma: '#7A1F32',
  },
};

/**
 * The identity for anything not in the table: a new alcohol type in the catalogue, a hand typed
 * custom drink, or a name the backend has not composed the way the table expects. Neutral on
 * purpose rather than category based. The old icon maps distinguished beer from wine from
 * spirits by matching keywords in the name; this module does not, because a name outside the
 * table is by definition a drink it does not know enough about to draw specifically, and
 * guessing a category from keywords is exactly the fragile logic this module replaces.
 *
 * `highball` because a plain glass implies the least about what is actually being served.
 * Field and ink reuse this app's general dark surface and primary text colours (`--surface` and
 * `--ink` in the design doc's colour tokens), so an unrecognised drink reads as "themed and
 * generic" rather than as a visual gap.
 */
const DEFAULT_IDENTITY: DrinkIdentity = {
  glass: 'highball',
  field: '#2E1C17',
  inkDark: '#F2E4CE',
  inkLight: null,
  chroma: '#A69A88',
};

/**
 * Glass silhouette by alcohol type id, the second rung of the lookup below.
 *
 * These ids are the ones the two deleted `ALCOHOL_TYPE_ICONS` maps carried, kept because this
 * module now owns that knowledge in one place instead of two. Only id 4 is load bearing across
 * deployments: the backend's `BEER_ID` property defaults to it and decides which type gets brand
 * and flavour handling. The rest are catalogue rows that a deployment can define differently, so
 * an unknown id falls through rather than guessing.
 */
const GLASS_BY_ALCOHOL_TYPE: Readonly<Record<number, GlassKind>> = {
  4: 'pint', 21: 'pint', 24: 'pint',
  13: 'wine', 14: 'wine', 19: 'wine', 20: 'wine', 22: 'wine',
  26: 'wine', 27: 'wine', 30: 'wine', 31: 'wine', 32: 'wine',
  6: 'highball', 7: 'highball', 8: 'highball', 9: 'highball', 10: 'highball',
  11: 'highball', 12: 'highball', 15: 'highball', 16: 'highball', 17: 'highball',
  18: 'highball', 25: 'highball', 28: 'highball',
  23: 'highball', 29: 'highball',
};

/**
 * Resolves a drink to its identity, in three rungs.
 *
 * 1. The exact display name, which gives the full identity including field and ink. This hits for
 *    recommendations, whose names come straight out of the `recommendations.name` column.
 * 2. The alcohol type id, which gives the right silhouette on neutral colours.
 * 3. A neutral default.
 *
 * The second rung is not belt and braces, it is the common path on the History screen. Names
 * there are composed server side by AlcoholNameCollector and BeerNameCollector, which produce
 * "Gin (Long drink - 0.25l)" and "Heineken Original (Draft/Tap - 0.50l)". Those never match the
 * table, so a name-only lookup would draw a highball for every row ever saved. `EditableDrink`
 * carries `alcoholTypeId` for exactly this reason.
 */
export const drinkIdentity = (name: string, alcoholTypeId?: number): DrinkIdentity => {
  const byName = DRINK_IDENTITIES[name];
  if (byName) {
    return byName;
  }
  const glass = alcoholTypeId === undefined ? undefined : GLASS_BY_ALCOHOL_TYPE[alcoholTypeId];
  return glass ? { ...DEFAULT_IDENTITY, glass } : DEFAULT_IDENTITY;
};
