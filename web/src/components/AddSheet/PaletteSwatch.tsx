import React from 'react';
import styled from '@emotion/styled';
import { useDesign } from '../../drink/useDesign';

const Swatch = styled.span`
  display: inline-block;
  width: 14px;
  height: 14px;
  flex: none;
  border-radius: 50%;
  background: var(--palette-swatch-field);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ds-ink-primary) 32%, transparent);
`;

interface PaletteSwatchProps {
  colorPaletteId?: number | null;
}

/** A restrained, decorative echo of a drink plate's backend-selected field colour. */
const PaletteSwatch: React.FC<PaletteSwatchProps> = ({ colorPaletteId }) => {
  const palette = useDesign().paletteForId(colorPaletteId);

  return (
    <Swatch
      aria-hidden="true"
      data-color-palette-id={colorPaletteId ?? 'fallback'}
      style={{ '--palette-swatch-field': palette.field } as React.CSSProperties}
    />
  );
};

export default PaletteSwatch;
