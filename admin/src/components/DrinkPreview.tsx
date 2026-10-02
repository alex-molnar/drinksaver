import type { ColorPalette, Glassware } from '../types/api';

export interface DrinkPreviewProps {
  label: string;
  glassware?: Glassware;
  palette?: ColorPalette;
}

export const DrinkPreview = ({ label, glassware, palette }: DrinkPreviewProps) => (
  <div className="drink-preview">
    <div className="drink-preview-art" style={{ color: palette?.inkDark ?? 'var(--ds-ink-primary)' }}>
      {glassware ? (
        <svg viewBox="0 0 34 50" aria-hidden="true">
          <path d={glassware.l} fill={palette?.field ?? 'var(--ds-surface-raised)'} />
          {glassware.f && <path d={glassware.f} fill={palette?.inkLight ?? 'var(--ds-ink-secondary)'} />}
          <path d={glassware.g} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      ) : <span className="preview-fallback" aria-hidden="true">◌</span>}
    </div>
    <span className="drink-preview-label">{label}</span>
  </div>
);

export default DrinkPreview;
