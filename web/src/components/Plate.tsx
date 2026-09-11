import React from 'react';
import styled from '@emotion/styled';
import { drinkIdentity } from '../drink/identity';
import { Glass } from '../drink/glassware';

/**
 * 'saving' dims the plate and marks it `aria-busy`; 'done' raises the stamp. Both are transient:
 * the caller derives them fresh from the save queue on every render (see `QuickSavePage.tsx`),
 * so there is no local state here to fall out of sync with it.
 */
export type PlateStatus = 'idle' | 'saving' | 'done';

interface BasePlateProps {
  /** Degrees, computed by `PlateGrid` from the plate's position - deterministic, never random,
   *  so it does not change on re-render. Applied as a CSS custom property, never a styled-prop,
   *  so it never needs forwarding to (or filtering from) the underlying `<button>`. */
  rotation: number;
  onClick: () => void;
  disabled?: boolean;
}

interface DrinkPlateProps extends BasePlateProps {
  variant: 'drink';
  /** The drink's display name. Also the accessible name: nothing else in the button renders
   *  visible text of its own besides an optional caption, which is plain content, not a label. */
  name: string;
  /** The second rung of `drinkIdentity`'s lookup - see `drink/identity.ts`. */
  alcoholTypeId?: number;
  /** Optional serving detail ("0.5 L draft"). Renders at full ink opacity: see the design doc's
   *  drink identity table, which was gated against exactly the caption's own opacity being 1. */
  caption?: string;
  status?: PlateStatus;
}

interface AddPlateProps extends BasePlateProps {
  variant: 'add';
  /** "Something else" for the trailing plate in the grid, but not hardcoded here: this component
   *  draws whatever plate `PlateGrid` asks for. */
  label: string;
}

type PlateProps = DrinkPlateProps | AddPlateProps;

/**
 * The shared physicality: rotation, focus ring, active-press, and the reduced-motion carve-outs
 * for both. Declared once so the two variants below cannot drift apart on the rules that must
 * hold for either of them.
 */
const plateBase = `
  position: relative;
  width: 100%;
  min-height: 150px;
  border-radius: var(--ds-radius-md);
  border: 0;
  cursor: pointer;
  padding: 19px 13px 14px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  text-align: left;
  font: inherit;
  transform: rotate(var(--rot, 0deg));
  -webkit-tap-highlight-color: transparent;
  transition:
    transform var(--ds-motion-duration-fast) var(--ds-motion-easing-standard),
    box-shadow var(--ds-motion-duration-fast) var(--ds-motion-easing-standard);

  &:active:not(:disabled) {
    transform: rotate(var(--rot, 0deg)) scale(0.965);
  }
  &:focus-visible {
    outline: 2px solid var(--ds-ink-primary);
    outline-offset: 3px;
  }
  &:disabled {
    cursor: default;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active:not(:disabled) {
      transform: rotate(var(--rot, 0deg));
    }
  }
`;

/**
 * The enamel sign. Shadow is a single token (`--ds-elevation-raised`, two layers) rather than the
 * prototype's four: see the design doc's performance note. The screw holes and the worn-enamel
 * speckle read `--ds-surface-recess` - the colour token doc names for exactly this role - through
 * `color-mix`, rather than a literal, so no hex value lives outside `theme/` or `identity/`.
 */
const DrinkButton = styled.button`
  ${plateBase}
  background-color: var(--fld);
  background-image:
    linear-gradient(118deg, rgba(255, 255, 255, 0.13) 0%, rgba(255, 255, 255, 0.02) 30%, transparent 52%),
    radial-gradient(
      circle at 93.5% 8%,
      color-mix(in srgb, var(--ds-surface-recess) 85%, transparent) 0 3.1px,
      transparent 3.7px
    ),
    radial-gradient(
      circle at 6.5% 8%,
      color-mix(in srgb, var(--ds-surface-recess) 85%, transparent) 0 3.1px,
      transparent 3.7px
    ),
    radial-gradient(
      circle at 9% 91%,
      color-mix(in srgb, var(--ds-surface-recess) 55%, transparent) 0 1.8px,
      transparent 2.4px
    );
  box-shadow: var(--ds-elevation-raised);

  &::before {
    content: '';
    position: absolute;
    inset: 6px;
    border: 1.4px solid color-mix(in srgb, var(--ds-ink-primary) 50%, transparent);
    border-radius: var(--ds-radius-sm);
    pointer-events: none;
  }

  &[aria-busy='true'] {
    opacity: 0.72;
  }

  .glass {
    height: 58px;
    margin-bottom: auto;
    display: flex;
    align-items: flex-end;
    position: relative;
    opacity: 0.94;
  }
  .glass svg {
    height: 58px;
    width: auto;
    display: block;
  }
  .name {
    position: relative;
    font-family: var(--ds-type-display-m-font-family);
    font-size: var(--ds-type-display-m-font-size);
    font-weight: var(--ds-type-display-m-font-weight);
    line-height: 1.02;
    letter-spacing: -0.005em;
    margin-top: 9px;
  }
  .caption {
    /* Full ink opacity, deliberately: see the module doc. */
    position: relative;
    font-family: var(--ds-type-caption-font-family);
    font-size: var(--ds-type-caption-font-size);
    font-weight: var(--ds-type-caption-font-weight);
    letter-spacing: 0.02em;
    margin-top: 5px;
  }
  .stamp {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    opacity: 0;
    pointer-events: none;
    transform: rotate(-9deg);
  }
  .stamp span {
    font-family: var(--ds-type-display-m-font-family);
    font-weight: 800;
    font-size: var(--ds-type-display-m-font-size);
    letter-spacing: 0.04em;
    color: var(--ds-accent-primary);
    border: 2.5px solid var(--ds-accent-primary);
    border-radius: var(--ds-radius-sm);
    padding: 5px 13px;
    background: color-mix(in srgb, var(--ds-surface-paper) 93%, transparent);
  }
  &[data-done] .stamp {
    opacity: 1;
  }
  @media (prefers-reduced-motion: no-preference) {
    &[data-done] .stamp {
      animation: ds-plate-stamp 380ms cubic-bezier(0.3, 1.5, 0.5, 1);
    }
  }
  @keyframes ds-plate-stamp {
    0% {
      opacity: 0;
      transform: scale(1.7) rotate(-14deg);
    }
    60% {
      opacity: 1;
    }
    100% {
      opacity: 1;
      transform: scale(1) rotate(-9deg);
    }
  }
`;

/** The trailing "Something else" plate: dashed, fieldless, no identity of its own. */
const AddButton = styled.button`
  ${plateBase}
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 1.6px dashed color-mix(in srgb, var(--ds-ink-primary) 28%, transparent);
  background: none;
  color: var(--ds-ink-secondary);

  &:disabled {
    opacity: 0.5;
  }

  .plus {
    font-family: var(--ds-type-display-l-font-family);
    font-size: 30px;
    line-height: 1;
    color: var(--ds-ink-tertiary);
    margin-bottom: 6px;
  }
  .label {
    font-family: var(--ds-type-display-m-font-family);
    font-size: var(--ds-type-display-m-font-size);
    font-weight: var(--ds-type-display-m-font-weight);
  }
`;

/**
 * The enamel sign, or its dashed "add" sibling. A real `<button>` either way, never a `div` with
 * a click handler, so it is focusable and has an accessible name for free.
 *
 * Field colour and ink always come from `drinkIdentity`, never from a literal here: this
 * component only ever reads `identity.field` / `identity.inkDark` / `identity.chroma` /
 * `identity.glass`, all resolved by `drinkIdentity`, and passes the two colours through as CSS
 * custom properties (`--fld`, plus the inherited `color`) rather than as styled-component props,
 * so nothing needs filtering before it reaches the DOM.
 */
const Plate: React.FC<PlateProps> = (props) => {
  const { rotation, onClick, disabled = false } = props;
  const style = { '--rot': `${rotation}deg` } as React.CSSProperties;

  if (props.variant === 'add') {
    return (
      <AddButton type="button" onClick={onClick} disabled={disabled} style={style}>
        <span className="plus" aria-hidden="true">
          +
        </span>
        <span className="label">{props.label}</span>
      </AddButton>
    );
  }

  const { name, alcoholTypeId, caption, status = 'idle' } = props;
  const identity = drinkIdentity(name, alcoholTypeId);
  const isSaving = status === 'saving';
  const isDone = status === 'done';

  return (
    <DrinkButton
      type="button"
      onClick={onClick}
      disabled={disabled || isSaving}
      aria-busy={isSaving || undefined}
      data-done={isDone ? '' : undefined}
      style={{ ...style, '--fld': identity.field, color: identity.inkDark } as React.CSSProperties}
    >
      <span className="glass">
        <Glass kind={identity.glass} chroma={identity.chroma} tone="ink" />
      </span>
      <span className="name">{name}</span>
      {caption ? <span className="caption">{caption}</span> : null}
      <span className="stamp" aria-hidden="true">
        <span>Saved</span>
      </span>
    </DrinkButton>
  );
};

export default Plate;
