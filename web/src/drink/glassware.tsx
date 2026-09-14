import React from 'react';
import type { GlassKind } from './identity';

/**
 * Glass silhouettes sharing a 34x50 viewBox. The original pint, tulip, wine and highball paths
 * come from the approved prototype. `g` is the glass outline, `l` the liquid, and `f` the foam
 * (null for glasses without foam). Short glasses keep their proportions and align at the base.
 */
const GLASS_PATHS: Record<GlassKind, { g: string; l: string; f: string | null }> = {
  pint: {
    g: 'M8 5h18l-2.2 40a3 3 0 0 1-3 2.6h-7.6a3 3 0 0 1-3-2.6Z',
    l: 'M9.5 15h15l-1.85 29.4a1.5 1.5 0 0 1-1.5 1.3h-8.3a1.5 1.5 0 0 1-1.5-1.3Z',
    f: 'M8.7 8.4h16.6l-.42 6.6H9.12Z',
  },
  tulip: {
    g: 'M8.5 5h17c0 14-3 20.5-8.5 22.5C11.5 25.5 8.5 19 8.5 5Z M16.1 27.4h1.8v13.9h-1.8Z M10.4 44h13.2v3h-13.2Z',
    l: 'M10.3 12.4h13.4c-.9 9.2-3.3 13.3-6.7 14.9-3.4-1.6-5.8-5.7-6.7-14.9Z',
    f: 'M9.1 7.6h15.8l.5 4.8H8.6Z',
  },
  wine: {
    g: 'M8 5c0 12 2 17.2 9 19.6 7-2.4 9-7.6 9-19.6Z M16.1 24.6h1.8v16.6h-1.8Z M9.8 43.9h14.4v3h-14.4Z',
    l: 'M9.7 12.6c.75 6.5 2.7 9.9 7.3 11.7 4.6-1.8 6.55-5.2 7.3-11.7Z',
    f: null,
  },
  highball: {
    g: 'M10 4h14v39a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3Z',
    l: 'M11.4 13.6h11.2v28.9a1.5 1.5 0 0 1-1.5 1.4h-8.2a1.5 1.5 0 0 1-1.5-1.4Z',
    f: null,
  },
  rocks: {
    g: 'M6 22h22l-1.4 21.5a3 3 0 0 1-3 2.5H10.4a3 3 0 0 1-3-2.5Z',
    l: 'M8 29h18l-.95 14.2a1.4 1.4 0 0 1-1.4 1.2h-13.3a1.4 1.4 0 0 1-1.4-1.2Z',
    f: null,
  },
  shot: {
    g: 'M10 29h14l-1.6 17H11.6Z',
    l: 'M11.9 33h10.2l-1.05 11.4h-8.1Z',
    f: null,
  },
  coupe: {
    g: 'M 4 13 h 18 L 26 9 L 22 5 C 26 3 33 10 31 14 L 27 10 L 24 13 L 27 13 c -1 8 -6 12 -13 12 S 2 21 1 13 Z M 13.1 25 H 14.9 v 17 h -1.8 Z M 7.8 44 h 12.4 v 3 H 7.8 Z',
    l: 'M 3.5 17 h 18 c -0.5 4 -5.5 7 -9.5 7 S 4 21 3.5 17 Z', //'M6.5 17h21c-2 4.5-5.5 7-10.5 7S8.5 21.5 6.5 17Z',
    f: null,
  },
  flute: {
    g: 'M11 4h12v19c0 6-2 9-6 11-4-2-6-5-6-11Z M16.1 34h1.8v8.3h-1.8Z M10.4 44h13.2v3H10.4Z',
    l: 'M12.6 12h8.8v11c0 5-1.4 7.8-4.4 9.4-3-1.6-4.4-4.4-4.4-9.4Z',
    f: null,
  },
  palinka: {
    g: 'M11 4h12C22 9 21.5 13 24 17.5c3 5.3-1 7.8-7 10-6-2.2-10-4.7-7-10C12.5 13 12 9 11 4Z M16.1 27.5h1.8v15.9h-1.8Z M9 46c0-1.2 3.6-2 8-2s8 .8 8 2-3.6 1.5-8 1.5S9 47.2 9 46Z',
    l: 'M10.5 19h13c1.6 3.3-1.5 5.2-6.5 7.1-5-1.9-8.1-3.8-6.5-7.1Z',
    f: null,
  },
  beercan: {
    g: 'M10 5h14l2 3v34l-2 3H10l-2-3V8Z M8.8 10h16.4 M8.8 40h16.4 M11 16h12 M11 34h12 M13 6.8h8 M15 8.4h4',
    l: 'M9.8 12h14.4v26H9.8Z',
    f: null,
  },
  beerbottle: {
    g: 'M14 3h6v4l-1 1v9c0 2 1 3.5 3 5.5 2 2.5 3 5.5 3 9.5v12a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V32c0-4 1-7 3-9.5 2-2 3-3.5 3-5.5V8l-1-1Z M14 5h6 M12 29h10 M12 39h10',
    l: 'M11 26h12v17a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2Z',
    f: null,
  },
  beerjug: {
    g: 'M5 14h20v30a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3Z M25 19h3a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3h-3 M25 23h2v11h-2 M10 21v22 M15 21v22 M20 21v22',
    l: 'M7 18h16v25a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z',
    f: 'M5 15c0-4 2.5-7 6-7 1.5-4 7.5-5 10-1 3.5-.5 6 2.5 6 6v4H5Z',
  },
};

interface GlassProps {
  /** Which glass silhouette to draw. */
  kind: GlassKind;
  /** Fill for the liquid shape. This is a drink's `identity.chroma`. */
  chroma: string;
  /**
   * How the glass is painted.
   *
   * `ink` is the Utolsó Kör treatment and what an enamel plate uses: one flat silhouette in the
   * surface's own ink, so a sign reads as a sign. `chroma` fills the liquid with the drink's own
   * colour, which belongs to the luminous direction the redesign did not take, and survives here
   * only for surfaces not yet restyled.
   *
   * The outline is `currentColor` either way. It used to be a fixed bone rgba, which is legible
   * on a dark ground and all but invisible on the pale Duvel plate.
   */
  tone?: 'ink' | 'chroma';
  /**
   * Fill for the foam shape, drawn only if this glass kind has one (pint, tulip and beer jug)
   * and a colour is given. Not sourced from `identity.ts`: the identity table
   * carries glass, field, ink and chroma only, so foam is a caller's decision until a foam
   * colour becomes part of that table.
   */
  foam?: string;
}

/**
 * A drink's glassware silhouette, drawn from `identity.ts`'s `glass` and `chroma`.
 *
 * Always `aria-hidden`: the drink's name is rendered as real text next to every glass this app
 * draws, so the glass carries no information a screen reader user would otherwise be missing,
 * and exposing it would only be noise.
 *
 * Every path sets its own `fill` explicitly, including the outline (`fill="none"`), because an
 * SVG `<path>` with no `fill` attribute defaults to solid black rather than to nothing.
 */
export const Glass: React.FC<GlassProps> = ({ kind, chroma, foam, tone = 'chroma' }) => {
  const paths = GLASS_PATHS[kind];
  const flat = tone === 'ink';
  return (
    <svg viewBox="0 0 34 50" aria-hidden="true" width="100%" height="100%" data-testid={`glass-${kind}`}>
      <path d={paths.l} fill={flat ? 'currentColor' : chroma} opacity={flat ? 0.92 : 1} />
      {paths.f && (flat || foam) ? (
        <path d={paths.f} fill={flat ? 'currentColor' : (foam as string)} opacity={flat ? 0.45 : 1} />
      ) : null}
      <path
        d={paths.g}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
        opacity={flat ? 0.95 : 0.44}
      />
    </svg>
  );
};
