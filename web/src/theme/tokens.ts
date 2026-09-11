import { accent, hairline, ink, motionDurations, motionEasings, paper, radii, spacing, umber } from './primitives';

/**
 * The theme contract. Every field here becomes a `--ds-*` custom property via `cssVars.ts`, so
 * the shape of this interface *is* the shape of the runtime CSS surface. Adding a field adds a
 * variable everywhere `toCssVars` is used; there is no second place to update.
 *
 * `darkTokens` is the only implementation. Per the design doc ("Dark only, deliberately"), the
 * commitment is to the *output*, not to the mechanism: a future light theme is a second object
 * of this same shape, not a rewrite of this file.
 */
export interface ThemeTokens {
  surface: SurfaceTokens;
  ink: InkTokens;
  line: LineTokens;
  accent: AccentTokens;
  texture: TextureTokens;
  elevation: ElevationTokens;
  radius: RadiusTokens;
  space: SpaceTokens;
  type: TypeTokens;
  motion: MotionTokens;
}

/** Where things sit in physical depth: the ground, what is raised off it, and what is cut into it. */
export interface SurfaceTokens {
  ground: string;
  raised: string;
  panel: string;
  recess: string;
  paper: string;
}

/** Text colour, from primary copy down to the ink that sits on `surface.paper` rather than the ground. */
export interface InkTokens {
  primary: string;
  secondary: string;
  tertiary: string;
  onPaper: string;
}

export interface LineTokens {
  hairline: string;
}

/** Chosen/active state, and the one hue that carries both a primary action and a destructive mark. */
export interface AccentTokens {
  primary: string;
  danger: string;
  active: string;
}

export interface TextureTokens {
  /** A single tileable noise pattern, applied once at the app root. See `index.css`. */
  noise: string;
}

/** Shadow presets for the plate-and-plaster physicality the direction asks for. */
export interface ElevationTokens {
  flat: string;
  raised: string;
  sunken: string;
  overlay: string;
}

export interface RadiusTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  full: string;
}

export interface SpaceTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
  xxxl: string;
}

/**
 * One named role, with everything needed to render it. `fontWeight` is a number so it can be
 * used directly as a CSS property value without another parse. `fontVariantNumeric` is only
 * ever set on `numeral`, where the design doc calls for tabular figures.
 */
export interface TypeRole {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  fontVariantNumeric?: string;
}

/** The six roles from the design doc's Type roles table, named to match it exactly. */
export interface TypeTokens {
  displayL: TypeRole;
  displayM: TypeRole;
  displayS: TypeRole;
  numeral: TypeRole;
  body: TypeRole;
  caption: TypeRole;
}

export interface MotionTokens {
  duration: {
    fast: string;
    base: string;
    slow: string;
  };
  easing: {
    standard: string;
    decelerate: string;
    accelerate: string;
  };
}

/**
 * Fraunces ships to the browser as four separate static instances, one per display role,
 * rather than as one variable font with a live `opsz` axis. See `fonts.css` for the full
 * reasoning; in short, the continuous axis alone costs more than the entire font budget, and a
 * fully static instance per role is both smaller in total and exact for every role, where
 * pinning `opsz` to only two shared instances would have been smaller than shipping the whole
 * axis but would still have forced one role onto the wrong optical size.
 *
 * Because each instance already bakes in its own `opsz`/`wght`/`SOFT`/`WONK` values, no
 * `font-variation-settings` is needed anywhere in this theme: picking the family *is* picking
 * the variation.
 */
const fraunces = {
  displayL: "'Fraunces Display L', 'Fraunces Fallback', Georgia, serif",
  displayM: "'Fraunces Display M', 'Fraunces Fallback', Georgia, serif",
  displayS: "'Fraunces Display S', 'Fraunces Fallback', Georgia, serif",
  numeral: "'Fraunces Numeral', 'Fraunces Fallback', Georgia, serif",
} as const;

/** Familjen Grotesk stays a genuinely variable font: only `wght` differs across its two roles. */
const familjenGrotesk = "'Familjen Grotesk Variable', 'Familjen Grotesk Fallback', Arial, sans-serif";

/**
 * The only populated `ThemeTokens`. Every colour value is verbatim from the design doc's
 * Colour tokens table; every type value is verbatim from its Type roles table.
 */
export const darkTokens: ThemeTokens = {
  surface: {
    ground: umber.ground,
    raised: umber.raised,
    panel: umber.panel,
    recess: umber.deep,
    paper,
  },
  ink: {
    primary: ink.primary,
    secondary: ink.secondary,
    tertiary: ink.tertiary,
    onPaper: ink.onPaper,
  },
  line: {
    hairline,
  },
  accent: {
    // Same hue as `danger`, on purpose: the design doc assigns `--red` to both roles.
    primary: accent.signal,
    danger: accent.signal,
    active: accent.active,
  },
  texture: {
    // A tileable `feTurbulence` noise swatch, referenced once at the app root (see
    // `index.css`) rather than repeated per surface, so the browser decodes it once instead
    // of once per plate.
    noise:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
  },
  elevation: {
    flat: 'none',
    // A plate lifted slightly off the wall.
    raised: '0 1px 2px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.35)',
    // A recess or screw hole pressed into the plaster.
    sunken: 'inset 0 2px 4px rgba(0,0,0,0.5)',
    // A sheet floating above everything else.
    overlay: '0 8px 24px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4)',
  },
  radius: radii,
  space: spacing,
  type: {
    displayL: { fontFamily: fraunces.displayL, fontSize: '27px', fontWeight: 700 },
    displayM: { fontFamily: fraunces.displayM, fontSize: '20px', fontWeight: 700 },
    displayS: { fontFamily: fraunces.displayS, fontSize: '18px', fontWeight: 600 },
    numeral: {
      fontFamily: fraunces.numeral,
      fontSize: '48px',
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
    },
    body: { fontFamily: familjenGrotesk, fontSize: '15px', fontWeight: 400 },
    caption: { fontFamily: familjenGrotesk, fontSize: '11.5px', fontWeight: 500 },
  },
  motion: {
    duration: motionDurations,
    easing: motionEasings,
  },
};

/**
 * Re-exported so a future `identity/` module can reach the raw enamel hues through the theme
 * barrel rather than importing `primitives.ts` directly. Not part of `ThemeTokens`: it is not a
 * role, and nothing here assigns it one.
 */
export { enamelHues } from './primitives';
