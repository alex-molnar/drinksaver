import React from 'react';
import type { GlassKind } from './identity';

/**
 * The four glass silhouettes' path data, reused verbatim from the approved prototype rather
 * than redrawn. `g` is the glass outline, `l` the liquid, `f` the foam, `null` where a glass has
 * none (wine and highball). All four share the same 34x50 viewBox.
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
};

interface GlassProps {
  /** Which of the four silhouettes to draw. */
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
   * Fill for the foam shape, drawn only if this glass kind has one (pint and tulip; wine and
   * highball never do) and a colour is given. Not sourced from `identity.ts`: the identity table
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
