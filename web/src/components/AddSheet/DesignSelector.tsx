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
  background: color-mix(in srgb, var(--ds-ink-primary) 5%, transparent);
  color: var(--ds-ink-primary);
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

const DesignSelector: React.FC<DesignSelectorProps> = ({
  colorPaletteId,
  inheritedColorPaletteId,
  onColorPaletteIdChange,
  glasswareId,
  inheritedGlasswareId,
  onGlasswareIdChange,
}) => {
  const design = useDesign();
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
            disabled={design.palettes.length === 0}
            onChange={(event) => onColorPaletteIdChange(idForChange(event.target.value, design.palettes))}
          >
            <option value="">Use inherited default</option>
            {design.palettes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
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
              disabled={design.glassware.length === 0}
              onChange={(event) => onGlasswareIdChange(idForChange(event.target.value, design.glassware))}
            >
              <option value="">Use inherited default</option>
              {design.glassware.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
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
