import React from 'react';
import styled from '@emotion/styled';
import { Glass } from '../../drink/glassware';
import { useDesign } from '../../drink/useDesign';

export interface DesignSelectorProps {
  colorPaletteId: number | null;
  inheritedColorPaletteId?: number | null;
  onColorPaletteIdChange: (colorPaletteId: number | null) => void;
  glasswareId?: number | null;
  inheritedGlasswareId?: number | null;
  onGlasswareIdChange?: (glasswareId: number | null) => void;
}

const Fields = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Field = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  gap: 10px;
  align-items: end;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-family: var(--ds-type-caption-font-family);
  font-size: var(--ds-type-caption-font-size);
  color: var(--ds-ink-tertiary);
`;

const Select = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border: 1.4px solid color-mix(in srgb, var(--ds-ink-primary) 22%, transparent);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-recess);
  color: var(--ds-ink-primary);

  option {
    background: var(--ds-surface-recess);
    color: inherit;
  }
  font: inherit;
  font-size: 16px;

  &:focus-visible {
    outline: 2px solid var(--ds-ink-secondary);
    outline-offset: 2px;
  }

  &:disabled {
    color: var(--ds-ink-tertiary);
  }
`;

const PalettePreview = styled.span`
  display: block;
  width: 44px;
  height: 44px;
  border: 1px solid color-mix(in srgb, var(--ds-ink-primary) 32%, transparent);
  border-radius: var(--ds-radius-sm);
`;

const GlassPreview = styled.span`
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: var(--ds-ink-secondary);

  svg {
    width: 25px;
    height: 38px;
  }
`;

const Help = styled.p`
  margin: 5px 0 0;
  font-family: var(--ds-type-caption-font-family);
  font-size: var(--ds-type-caption-font-size);
  color: var(--ds-ink-tertiary);
`;

/** Native <option> elements can't render the drawn glass art, so this marks each real glassware
 *  choice as a glass at a glance instead of leaving the option list as bare names. */
const GLASS_OPTION_GLYPH = '🥃';

const idForChange = <T extends { id: number }>(value: string, entries: readonly T[]): number | null => {
  if (value === '') {
    return null;
  }
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && entries.some((entry) => entry.id === id) ? id : null;
};

const selectionPreview = <T extends { id: number }>(
  selectedId: number | null | undefined,
  inheritedId: number | null | undefined,
  entries: readonly T[],
  fallback: T,
): T => entries.find((entry) => entry.id === (selectedId ?? inheritedId)) ?? fallback;

const hasInheritedDefault = (id: number | null | undefined): id is number => id !== null && id !== undefined && id > 0;

const DesignSelector: React.FC<DesignSelectorProps> = ({
  colorPaletteId,
  inheritedColorPaletteId,
  onColorPaletteIdChange,
  glasswareId,
  inheritedGlasswareId,
  onGlasswareIdChange,
}) => {
  const design = useDesign();
  const selectorId = React.useId();
  const paletteHasInheritedDefault = hasInheritedDefault(inheritedColorPaletteId);
  const glasswareHasInheritedDefault = hasInheritedDefault(inheritedGlasswareId);
  const paletteUnavailable = design.palettes.length === 0;
  const glasswareUnavailable = design.glassware.length === 0;
  const paletteHelpId = `${selectorId}-color-palette-help`;
  const glasswareHelpId = `${selectorId}-glassware-help`;
  const palette = selectionPreview(
    colorPaletteId,
    inheritedColorPaletteId,
    design.palettes,
    design.paletteForId(inheritedColorPaletteId),
  );
  const supportsGlassware = onGlasswareIdChange !== undefined;
  const glassware = selectionPreview(
    glasswareId,
    inheritedGlasswareId,
    design.glassware,
    design.glasswareForId(inheritedGlasswareId),
  );

  return (
    <Fields aria-label="Design">
      <Field>
        <div>
          <Label htmlFor="add-sheet-color-palette">Color palette</Label>
          <Select
            id="add-sheet-color-palette"
            value={colorPaletteId ?? ''}
            required={!paletteHasInheritedDefault}
            aria-describedby={paletteUnavailable ? paletteHelpId : undefined}
            disabled={paletteUnavailable}
            onChange={(event) => onColorPaletteIdChange(idForChange(event.target.value, design.palettes))}
          >
            <option
              value=""
              disabled={!paletteHasInheritedDefault}
              style={paletteHasInheritedDefault ? { backgroundColor: palette.field, color: palette.inkDark } : undefined}
            >
              {paletteHasInheritedDefault ? 'Use inherited default' : 'Choose a color palette'}
            </option>
            {design.palettes.map((item) => (
              <option key={item.id} value={item.id} style={{ backgroundColor: item.field, color: item.inkDark }}>
                {item.name}
              </option>
            ))}
          </Select>
          {paletteUnavailable ? (
            <Help id={paletteHelpId} role="status" aria-live="polite">
              Color palette choices are unavailable. Try again shortly.
            </Help>
          ) : null}
        </div>
        <PalettePreview aria-hidden="true" data-testid="palette-preview" style={{ background: palette.field }} />
      </Field>
      {supportsGlassware ? (
        <Field>
          <div>
            <Label htmlFor="add-sheet-glassware">Glassware</Label>
            <Select
              id="add-sheet-glassware"
              value={glasswareId ?? ''}
              required={!glasswareHasInheritedDefault}
              aria-describedby={glasswareUnavailable ? glasswareHelpId : undefined}
              disabled={glasswareUnavailable}
              onChange={(event) => onGlasswareIdChange(idForChange(event.target.value, design.glassware))}
            >
              <option value="" disabled={!glasswareHasInheritedDefault}>
                {glasswareHasInheritedDefault ? 'Use inherited default' : 'Choose glassware'}
              </option>
              {design.glassware.map((item) => (
                <option key={item.id} value={item.id}>
                  {GLASS_OPTION_GLYPH} {item.name}
                </option>
              ))}
            </Select>
            {glasswareUnavailable ? (
              <Help id={glasswareHelpId} role="status" aria-live="polite">
                Glassware choices are unavailable. Try again shortly.
              </Help>
            ) : null}
          </div>
          <GlassPreview aria-hidden="true">
            <Glass glassware={glassware} chroma={palette.field} tone="ink" />
          </GlassPreview>
        </Field>
      ) : null}
    </Fields>
  );
};

export default DesignSelector;
