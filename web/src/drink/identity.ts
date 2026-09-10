/**
 * One table owning what identifies a drink: which glass it is served in, the liquid's
 * decorative colour, the enamel plate's field colour, and the ink that sits on that field.
 *
 * This replaces the alcohol-type-ID icon maps that used to be duplicated in
 * `RecommendationButton.tsx` and `HistoryPage.tsx`. Those maps were keyed on `alcoholTypeId`,
 * which is too coarse for this table: Heineken pint and Guinness pint are both alcoholTypeId 4
 * (Beer), but need different identities. So this table is keyed on the drink's display name
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

/** The four glass silhouettes `glassware.tsx` can draw. Matches the approved prototype's keys. */
export type GlassKind = 'pint' | 'tulip' | 'wine' | 'highball';

export interface DrinkIdentity {
  /** Which silhouette `glassware.tsx`'s `<Glass>` draws for this drink. */
  readonly glass: GlassKind;
  /** The enamel plate's field colour. Decorative in principle, but gated all the same. */
  readonly field: string;
  /** The ink that sits on `field` in the current, dark-only theme. Gated at 4.5:1 against `field`. */
  readonly inkDark: string;
  /** The ink `field` will need once a light theme exists. Not yet decided. */
  readonly inkLight: string | null;
  /** The liquid's decorative colour. Not contrast gated: it never sits under text. */
  readonly chroma: string;
}

/**
 * The table itself. Values are not arbitrary: they come from the design doc's drink identity
 * table (`docs/superpowers/specs/2026-09-09-ui-redesign-design.md`), already corrected for the
 * two pairs that failed WCAG AA during design (Heineken's green, Chouffe's red).
 */
export const DRINK_IDENTITIES: Readonly<Record<string, DrinkIdentity>> = {
  'Heineken pint': {
    glass: 'pint',
    field: '#2B7454',
    inkDark: '#F4E9CE',
    inkLight: null,
    chroma: '#E0A828',
  },
  'Guinness pint': {
    glass: 'pint',
    field: '#2B1A13',
    inkDark: '#EBD9B4',
    inkLight: null,
    chroma: '#7A2E12',
  },
  'Duvel bottle': {
    glass: 'tulip',
    field: '#DFD1B0',
    inkDark: '#2B1A14',
    inkLight: null,
    chroma: '#E8C04A',
  },
  'Chouffe bottle': {
    glass: 'tulip',
    field: '#BA422C',
    inkDark: '#F9EDD4',
    inkLight: null,
    chroma: '#D9903A',
  },
  'Gin and tonic': {
    glass: 'highball',
    field: '#2C4B6E',
    inkDark: '#EFE2C8',
    inkLight: null,
    chroma: '#BFD8D0',
  },
  'Glass of red': {
    glass: 'wine',
    field: '#6B3350',
    inkDark: '#F2E4CE',
    inkLight: null,
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
 * Resolves a drink's display name to its identity, falling back to a neutral default for
 * anything not in `DRINK_IDENTITIES`. Takes the name, not an id, because the table itself is
 * keyed by name; see the module doc comment for why.
 */
export const drinkIdentity = (name: string): DrinkIdentity => DRINK_IDENTITIES[name] ?? DEFAULT_IDENTITY;
