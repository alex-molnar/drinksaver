/**
 * Raw material for the theme, with no assigned meaning.
 *
 * Nothing in this file says what a colour is *for*. `--bg` versus `--surface` is a decision
 * about roles, and roles belong in `tokens.ts`, which imports from here and assigns each
 * primitive to a slot. Keeping the split this way means a future light theme, or a future
 * re-skin, changes which primitive backs a role without ever having to touch the numbers
 * themselves.
 *
 * No component imports this module. Reaching past `tokens.ts` for a primitive would let a
 * component depend on a raw value instead of a role, which is exactly the coupling this file
 * exists to prevent.
 */

/**
 * The umber plaster ground, from the deepest recess to the most raised surface. Values are
 * verbatim from the design doc's Colour tokens table (`docs/superpowers/specs/
 * 2026-09-09-ui-redesign-design.md`), keyed here by depth rather than by role name.
 */
export const umber = {
  /** `--deep`. Recesses and screw holes: the darkest point in the ramp. */
  deep: '#1B0F0D',
  /** `--bg`. The plaster ground itself. */
  ground: '#231512',
  /** `--bg2`. Lifted one step off the ground. */
  raised: '#2A1A15',
  /** `--surface`. Sheet and panel surfaces, the lightest of the four. */
  panel: '#2E1C17',
} as const;

/** `--paper`. The history bar tab: the one light surface in an otherwise dark system. */
export const paper = '#EBDCC0';

/**
 * Text colours, all verbatim from the Colour tokens table. The two translucent tones are
 * expressed against the umber ground, so they only read correctly over `umber.ground` or a
 * surface close to it in value; that constraint is `tokens.ts`'s to enforce, not this file's.
 */
export const ink = {
  /** `--ink`. Primary text. */
  primary: '#F2E4CE',
  /** `--ink2`. Secondary text, 70% of primary over the ground. */
  secondary: 'rgba(242,228,206,.70)',
  /** `--ink3`. Tertiary text and captions, 52% of primary over the ground. */
  tertiary: 'rgba(242,228,206,.52)',
  /** `--pink`. Ink for text that sits on `paper`, not on the ground. */
  onPaper: '#2B1A14',
} as const;

/** `--line`. Hairlines, at 14% of `ink.primary`. Too faint to read as text; do not reuse for text. */
export const hairline = 'rgba(242,228,206,.14)';

/**
 * The two accent hues. `signal` is deliberately one colour serving two roles, per the design
 * doc: "Primary action, destructive marks". A single warm red carries both because the
 * direction spends its boldness on the enamel plate and keeps everything else, accents
 * included, to a short list.
 */
export const accent = {
  /** `--must`. Chosen values and active navigation. Named for the Hungarian word for grape must. */
  active: '#C8952B',
  /** `--red`. Primary action *and* destructive marks: one hue, two roles. */
  signal: '#C4462E',
} as const;

/**
 * Enamel field hues, seeded here from the design doc's drink identity table so the module that
 * actually owns them (`feat/drink-identity`, later in the stack) has real values to start from
 * rather than placeholders. Nothing in this theme layer reads this constant: it is inert until
 * the identity module imports it.
 */
export const enamelHues = [
  '#2B7454', // Heineken pint
  '#2B1A13', // Guinness pint
  '#DFD1B0', // Duvel bottle
  '#BA422C', // Chouffe bottle
  '#2C4B6E', // Gin and tonic
  '#6B3350', // Glass of red
] as const;

/**
 * A spacing scale in `rem`, so it follows the user's font-size preference the way the rest of
 * the app's spacing already does (see the `1rem` / `2rem` gaps in `AppErrorBoundary.tsx`).
 */
export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  xxl: '2rem',
  xxxl: '3rem',
} as const;

/**
 * A small border-radius scale. Enamel signage and a paper tab both read as moderately, not
 * fully, rounded; `full` exists for the one or two genuinely circular or pill shaped elements
 * (a badge, a status dot), not for general use.
 */
export const radii = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '16px',
  full: '999px',
} as const;

/**
 * Motion durations and easings. These are neutral, conventional defaults: nothing in this PR
 * animates, so nothing has exercised them yet. The `animate` skill owns tuning them for real
 * once a later PR gives them something to move.
 */
export const motionDurations = {
  fast: '120ms',
  base: '200ms',
  slow: '320ms',
} as const;

export const motionEasings = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;
