import React, { useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { useDraft } from '../../drink/useDraft';
import { useCatalogue } from '../../drink/useCatalogue';
import { useSaveQueue } from '../../drink/useSaveQueue';
import { menuFields, isDraftReady, type DraftFieldsCatalogue, type MenuRow } from '../../drink/draftFields';
import { QUANTITY_MAX, QUANTITY_MIN } from '../../drink/draftReducer';
import { drinkingDay } from '../../drink/day';
import type { AddSheetPanel } from './panels';

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

const Value = styled.span<{ $placeholder: boolean }>`
  font-size: 15px;
  color: ${(p) => (p.$placeholder ? 'var(--ds-ink-tertiary)' : 'var(--ds-accent-active)')};
  flex: none;
  max-width: 52%;
  text-align: right;
  line-height: 1.25;
`;

const QuantityRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 14px var(--ds-space-lg) 2px;
  border-top: 1px solid var(--ds-line-hairline);
`;

const StepButton = styled.button`
  width: 52px;
  height: 52px;
  border-radius: var(--ds-radius-sm);
  border: 1.4px solid color-mix(in srgb, var(--ds-ink-primary) 30%, transparent);
  background: color-mix(in srgb, var(--ds-ink-primary) 5%, transparent);
  color: var(--ds-ink-primary);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: transform var(--ds-motion-duration-fast) var(--ds-motion-easing-standard);

  &:active:not(:disabled) {
    transform: scale(0.93);
  }
  &:disabled {
    opacity: 0.28;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid var(--ds-ink-primary);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

const QuantityNumber = styled.span`
  font-family: var(--ds-type-numeral-font-family);
  font-weight: var(--ds-type-numeral-font-weight);
  font-variant-numeric: tabular-nums;
  font-size: var(--ds-type-numeral-font-size);
  min-width: 58px;
  text-align: center;
  line-height: 1;
`;

const QuantityCaption = styled.p`
  margin: 0;
  text-align: center;
  font-family: var(--ds-type-caption-font-family);
  font-size: var(--ds-type-caption-font-size);
  color: var(--ds-ink-tertiary);
  padding-bottom: 6px;
`;

const Cta = styled.button`
  position: relative;
  margin: 10px 16px calc(16px + env(safe-area-inset-bottom));
  height: 58px;
  width: calc(100% - 32px);
  min-height: 44px;
  border-radius: var(--ds-radius-sm);
  border: 0;
  flex: none;
  background: var(--ds-accent-primary);
  color: var(--ds-ink-primary);
  font-family: var(--ds-type-display-m-font-family);
  font-weight: var(--ds-type-display-m-font-weight);
  font-size: 21px;
  letter-spacing: 0.005em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  box-shadow: var(--ds-elevation-raised);
  transition:
    transform var(--ds-motion-duration-fast) var(--ds-motion-easing-standard),
    box-shadow var(--ds-motion-duration-fast) var(--ds-motion-easing-standard);

  &:active:not(:disabled) {
    transform: translateY(1px);
  }
  &:disabled {
    background: color-mix(in srgb, var(--ds-ink-primary) 8%, transparent);
    color: var(--ds-ink-tertiary);
    box-shadow: none;
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid var(--ds-ink-primary);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active:not(:disabled) {
      transform: none;
    }
  }
`;

/**
 * A provisional display name for the row the queue and the strip show until the server's
 * composed name replaces it on the next refetch - see the design doc's known gap on this. Not a
 * verbatim port of anything in `DetailedPage`, which never needed one: it built the save payload
 * directly and let `/success`'s message stand in for a name. `useSaveQueue` needs a `label` up
 * front instead, since the strip has no page transition left to carry that message across.
 */
const provisionalLabel = (catalogue: DraftFieldsCatalogue, draft: { alcoholTypeId: number | null; brandId: number | null; subtypeId: number | null }, isBeer: boolean): string => {
  const typeName = catalogue.alcoholTypes?.find((t) => t.id === draft.alcoholTypeId)?.name ?? 'Drink';
  const detail = isBeer
    ? catalogue.brands?.find((b) => b.id === draft.brandId)?.name
    : catalogue.subtypes?.find((s) => s.id === draft.subtypeId)?.name;
  return detail ? `${typeName} (${detail})` : typeName;
};

/**
 * The placeholder a row shows when nothing is chosen. Shared between the accessible name and the
 * rendered value on purpose: WCAG 2.5.3 (Label in Name) wants the accessible name to contain the
 * visible text, so a speech-input user can say what they see. Naming the state ("not set") while
 * showing an invitation ("Choose") breaks that, and it broke a locator too.
 */
const UNSET = 'Choose';

const rowAccessibleName = (row: MenuRow): string => `${row.label}, ${row.value ?? UNSET}`;

/**
 * The sheet's root panel: the bar menu. One row per field from `menuFields`, a quantity stepper
 * and the save control. Every row push and the quantity stepper are the only interaction this
 * panel offers directly; every field's own value is chosen one level down, in `OptionPanel`.
 */
const MenuPanel: React.FC<MenuPanelProps> = ({ onPushPanel, onDismiss }) => {
  const { draft, dispatch } = useDraft();
  const catalogue = useCatalogue(draft);
  const { save } = useSaveQueue();
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
  const ready = isDraftReady(draft, catalogue.isBeer);

  // No `!ready` guard here: the only caller is the Cta button below, and it is `disabled`
  // whenever `ready` is false, so a browser (and `userEvent.click`, which respects `disabled`)
  // never actually fires this handler in that state. Guarding it a second time here would be
  // defensive code with no path that could ever exercise it.
  const handleSave = () => {
    save({
      label: provisionalLabel(draftCatalogue, draft, catalogue.isBeer),
      date: draft.date,
      alcoholTypeId: draft.alcoholTypeId as number,
      payload: {
        alcoholTypeId: draft.alcoholTypeId as number,
        alcoholSubtypeId: draft.subtypeId ?? undefined,
        alcoholVolumeId: draft.volumeId as number,
        brandId: draft.brandId ?? undefined,
        beerFlavourId: draft.beerFlavourId ?? undefined,
        consumptionTypeId: draft.consumptionTypeId ?? undefined,
        comments: draft.comments.trim() ? draft.comments : undefined,
        quantity: draft.quantity > 1 ? draft.quantity : undefined,
        addToRecommendations: draft.addToRecommendations || undefined,
        onlyTemporarily: draft.addToRecommendations && draft.onlyTemporarily ? true : undefined,
        name: draft.addToRecommendations && draft.recommendationName ? draft.recommendationName : undefined,
      },
    });
    onDismiss();
  };

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
            <Value $placeholder={row.value === null}>{row.value ?? UNSET}</Value>
          </Row>
        ))}
      </Rows>
      <QuantityRow>
        <StepButton
          type="button"
          aria-label="One fewer"
          disabled={draft.quantity <= QUANTITY_MIN}
          onClick={() => dispatch({ type: 'setQuantity', quantity: draft.quantity - 1 })}
        >
          &minus;
        </StepButton>
        <QuantityNumber>{draft.quantity}</QuantityNumber>
        <StepButton
          type="button"
          aria-label="One more"
          disabled={draft.quantity >= QUANTITY_MAX}
          onClick={() => dispatch({ type: 'setQuantity', quantity: draft.quantity + 1 })}
        >
          +
        </StepButton>
      </QuantityRow>
      <QuantityCaption>{draft.quantity > 1 ? `Saves ${draft.quantity} identical drinks` : 'How many of these?'}</QuantityCaption>
      <Cta type="button" disabled={!ready} onClick={handleSave}>
        {draft.quantity > 1 ? `Save ${draft.quantity} drinks` : 'Save drink'}
      </Cta>
    </div>
  );
};

export default MenuPanel;
