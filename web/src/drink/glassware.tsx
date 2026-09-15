import React from 'react';
import type { Glassware } from '../types/api';

interface GlassProps {
  /** SVG path data returned by GET /v1/design/glassware. */
  glassware: Glassware;
  /** Fill for the liquid shape. */
  chroma: string;
  /** Flat ink is used by enamel plates and History; chroma is retained for luminous surfaces. */
  tone?: 'ink' | 'chroma';
  /** Optional foam colour. Flat ink always draws a configured foam path. */
  foam?: string;
}

/**
 * Draws backend-provided paths directly as SVG attributes. No markup is injected: React writes
 * each string only to a path's `d` attribute, so the server controls geometry without creating an
 * HTML injection surface. The adjacent drink name provides semantics, so the SVG stays hidden
 * from assistive technology.
 */
export const Glass: React.FC<GlassProps> = ({ glassware, chroma, foam, tone = 'chroma' }) => {
  const flat = tone === 'ink';
  return (
    <svg
      viewBox="0 0 34 50"
      aria-hidden="true"
      width="100%"
      height="100%"
      data-testid={`glass-${glassware.name}`}
      data-glassware-id={glassware.id}
    >
      <path d={glassware.l} fill={flat ? 'currentColor' : chroma} opacity={flat ? 0.92 : 1} />
      {glassware.f && (flat || foam) ? (
        <path d={glassware.f} fill={flat ? 'currentColor' : (foam as string)} opacity={flat ? 0.45 : 1} />
      ) : null}
      <path
        d={glassware.g}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
        opacity={flat ? 0.95 : 0.44}
      />
    </svg>
  );
};
