import React from 'react';
import styled from '@emotion/styled';
import { useDraft } from '../../drink/useDraft';
import { useSaveDraft } from '../../drink/useSaveDraft';
import { QUANTITY_MAX, QUANTITY_MIN } from '../../drink/draftReducer';

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
  border: 1.4px solid color-mix(in srgb, var(--ds-ink-primary) 52%, transparent);
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
  color: var(--ds-ink-on-accent);
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

export interface SaveControlsProps {
  /** Called after the draft has been handed to the save queue - typically the sheet's dismiss. */
  onSaved: () => void;
}

/**
 * The quantity stepper and Save button, factored out of `MenuPanel` so the Recommend panel's own
 * shortcut save button (see `OptionPanel`'s `RecommendField`) can offer the exact same control,
 * wired to the exact same `useSaveDraft` mechanism, instead of a second hand-rolled copy.
 */
const SaveControls: React.FC<SaveControlsProps> = ({ onSaved }) => {
  const { draft, dispatch } = useDraft();
  const { ready, handleSave } = useSaveDraft(onSaved);

  return (
    <>
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
    </>
  );
};

export default SaveControls;
