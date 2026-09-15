import React, { useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { useDraft } from '../../drink/useDraft';
import { useCatalogue } from '../../drink/useCatalogue';
import { menuFields, type DraftFieldsCatalogue, type MenuRow } from '../../drink/draftFields';
import { drinkingDay } from '../../drink/day';
import { resolveBrandColorPaletteId } from '../../drink/designSelection';
import type { AddSheetPanel } from './panels';
import PaletteSwatch from './PaletteSwatch';
import SaveControls from './SaveControls';

export interface MenuPanelProps {
  onPushPanel: (panel: AddSheetPanel) => void;
  onDismiss: () => void;
}

const Heading = styled.h2`
  margin: 6px 20px 0;
  font-family: var(--ds-type-display-l-font-family);
  font-weight: var(--ds-type-display-l-font-weight);
  font-size: 27px;
  line-height: 1.08;
  letter-spacing: -0.01em;

  &:focus-visible {
    outline: none;
  }
`;

const Hint = styled.p`
  margin: 5px 20px 12px;
  font-family: var(--ds-type-caption-font-family);
  font-size: var(--ds-type-caption-font-size);
  color: var(--ds-ink-tertiary);
`;

const Rows = styled.div`
  overflow-y: auto;
  padding: 0 0 6px;
`;

const Row = styled.button`
  display: flex;
  align-items: baseline;
  gap: 9px;
  width: 100%;
  min-height: 44px;
  padding: 14px var(--ds-space-lg);
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background var(--ds-motion-duration-fast) var(--ds-motion-easing-standard);

  &:hover {
    background: color-mix(in srgb, var(--ds-ink-primary) 5%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--ds-ink-secondary);
    outline-offset: -3px;
  }
`;

const Label = styled.span`
  font-family: var(--ds-type-display-s-font-family);
  font-weight: var(--ds-type-display-s-font-weight);
  font-size: 18px;
  flex: none;
`;

const Lead = styled.span`
  flex: 1;
  height: 0;
  border-bottom: 2px dotted var(--ds-line-hairline);
  transform: translateY(-5px);
  min-width: 18px;
`;

const ValueGroup = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex: none;
  min-width: 0;
  max-width: 52%;
`;

const Value = styled.span<{ $placeholder: boolean }>`
  font-size: 15px;
  color: ${(p) => (p.$placeholder ? 'var(--ds-ink-tertiary)' : 'var(--ds-accent-active)')};
  min-width: 0;
  text-align: right;
  line-height: 1.25;
  overflow-wrap: anywhere;
`;

/**
 * The placeholder a row shows when nothing is chosen. Shared between the accessible name and the
 * rendered value on purpose: WCAG 2.5.3 (Label in Name) wants the accessible name to contain the
 * visible text, so a speech-input user can say what they see. Naming the state ("not set") while
 * showing an invitation ("Choose") breaks that, and it broke a locator too.
 */
const UNSET = 'Choose';

const rowAccessibleName = (row: MenuRow): string => `${row.label}, ${row.value ?? UNSET}`;

const paletteIdForRow = (
  row: MenuRow,
  catalogue: DraftFieldsCatalogue,
  draft: { alcoholTypeId: number | null; brandId: number | null },
): number | null | undefined => {
  if (row.key === 'alcoholType') {
    return catalogue.alcoholTypes?.find((item) => item.id === draft.alcoholTypeId)?.colorPaletteId;
  }
  if (row.key === 'brand' && draft.brandId !== null) {
    return resolveBrandColorPaletteId(
      catalogue.brands?.find((item) => item.id === draft.brandId)?.colorPaletteId,
      catalogue.alcoholTypes?.find((item) => item.id === draft.alcoholTypeId)?.colorPaletteId,
    );
  }
  return undefined;
};

/**
 * The sheet's root panel: the bar menu. One row per field from `menuFields`, a quantity stepper
 * and the save control. Every row push and the quantity stepper are the only interaction this
 * panel offers directly; every field's own value is chosen one level down, in `OptionPanel`.
 */
const MenuPanel: React.FC<MenuPanelProps> = ({ onPushPanel, onDismiss }) => {
  const { draft } = useDraft();
  const catalogue = useCatalogue(draft);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const draftCatalogue: DraftFieldsCatalogue = {
    alcoholTypes: catalogue.alcoholTypes.data,
    volumes: catalogue.volumes.data,
    subtypes: catalogue.subtypes.data,
    consumptionTypes: catalogue.consumptionTypes.data,
    brands: catalogue.brands.data,
    beerFlavours: catalogue.beerFlavours.data,
  };

  const today = drinkingDay(new Date());
  const rows = menuFields(draft, draftCatalogue, catalogue.isBeer, today);

  return (
    <div>
      <Heading id="add-sheet-heading" tabIndex={-1} ref={headingRef}>
        What are you having?
      </Heading>
      <Hint>Drink and size are all it needs.</Hint>
      <Rows>
        {rows.map((row) => (
          <Row key={row.key} type="button" aria-label={rowAccessibleName(row)} onClick={() => onPushPanel({ kind: 'option', field: row.key })}>
            <Label>{row.label}</Label>
            <Lead aria-hidden="true" />
            <ValueGroup>
              {(row.key === 'alcoholType' || row.key === 'brand') && row.value !== null ? (
                <PaletteSwatch colorPaletteId={paletteIdForRow(row, draftCatalogue, draft)} />
              ) : null}
              <Value $placeholder={row.value === null}>{row.value ?? UNSET}</Value>
            </ValueGroup>
          </Row>
        ))}
      </Rows>
      <SaveControls onSaved={onDismiss} />
    </div>
  );
};

export default MenuPanel;
