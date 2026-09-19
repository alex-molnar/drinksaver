import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { Glass } from '../../drink/glassware';
import { useDesign } from '../../drink/useDesign';
import type { Glassware } from '../../types/api';

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

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-family: var(--ds-type-caption-font-family);
  font-size: var(--ds-type-caption-font-size);
  color: var(--ds-ink-tertiary);
`;

/** Trigger + its fixed-size preview swatch only - kept apart from the listbox and help text below
 *  it so an open listbox growing tall never drags the preview down with it (a plain grid with
 *  `align-items: end` covering the whole field did exactly that). */
const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

/** The actual flex child of `Row` - the trigger button alone can't answer to `flex: 1` there,
 *  because its real parent is this wrapper (`DesignPicker`'s root), one level further in. Without
 *  this, the wrapper shrink-wraps to the button's content and the button just fills whatever
 *  width that leaves it, so its width tracks the current option's text length instead of staying
 *  fixed. */
const PickerWrap = styled.div`
  flex: 1;
  min-width: 0;
`;

const Trigger = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 0 12px;
  border: 1.4px solid color-mix(in srgb, var(--ds-ink-primary) 52%, transparent);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-recess);
  color: var(--ds-ink-primary);
  font: inherit;
  font-size: 16px;
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--ds-ink-secondary);
    outline-offset: 2px;
  }

  &:disabled {
    color: var(--ds-ink-tertiary);
    cursor: default;
  }
`;

const TriggerText = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Chevron = styled.span<{ $open: boolean }>`
  flex: none;
  color: var(--ds-ink-tertiary);
  font-size: 11px;
  transform: rotate(${(p) => (p.$open ? '180deg' : '0deg')});
  transition: transform var(--ds-motion-duration-fast) var(--ds-motion-easing-standard);
`;

const PalettePreview = styled.span`
  display: block;
  flex: none;
  width: 44px;
  height: 44px;
  border: 1px solid color-mix(in srgb, var(--ds-ink-primary) 32%, transparent);
  border-radius: var(--ds-radius-sm);
`;

const GlassPreview = styled.span`
  display: grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
  color: var(--ds-ink-secondary);

  svg {
    width: 25px;
    height: 38px;
  }
`;

const OptionSwatch = styled.span`
  display: block;
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: var(--ds-radius-sm);
  border: 1px solid color-mix(in srgb, var(--ds-ink-primary) 32%, transparent);
`;

const OptionGlassIcon = styled.span`
  display: grid;
  place-items: center;
  flex: none;
  width: 18px;
  height: 27px;
  color: var(--ds-ink-secondary);

  svg {
    width: 100%;
    height: 100%;
  }
`;

const OptionList = styled.ul`
  margin: 6px 0 0;
  padding: 4px;
  list-style: none;
  max-height: 240px;
  overflow-y: auto;
  border: 1.4px solid color-mix(in srgb, var(--ds-ink-primary) 22%, transparent);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-raised);
  box-shadow: var(--ds-elevation-overlay);

  &:focus {
    outline: none;
  }
`;

const OptionRow = styled.li<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 6px 10px;
  border-radius: var(--ds-radius-sm);
  cursor: pointer;
  background: ${(p) => (p.$selected ? 'color-mix(in srgb, var(--ds-accent-primary) 22%, transparent)' : 'transparent')};

  &:hover {
    background: color-mix(in srgb, var(--ds-ink-primary) 8%, transparent);
  }

  &:focus {
    outline: 2px solid var(--ds-ink-secondary);
    outline-offset: -2px;
  }

  &[aria-disabled='true'] {
    color: var(--ds-ink-tertiary);
    cursor: default;
  }
`;

const Help = styled.p`
  margin: 5px 0 0;
  font-family: var(--ds-type-caption-font-family);
  font-size: var(--ds-type-caption-font-size);
  color: var(--ds-ink-tertiary);
`;

interface PickerOption {
  value: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

interface DesignPickerProps {
  id: string;
  labelId: string;
  value: string;
  placeholderLabel: string;
  placeholderIcon?: React.ReactNode;
  placeholderSelectable: boolean;
  options: readonly PickerOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  ariaDescribedBy?: string;
}

/**
 * A hand-built listbox button standing in for a native `<select>`: a native `<option>` cannot
 * render a colour swatch or the drawn glass art, only plain text, so there is no way to show
 * "what you are picking" from inside a real select. Follows the WAI-ARIA "Listbox Button"
 * shape - `aria-haspopup="listbox"` trigger, options as real DOM nodes the arrow keys move real
 * focus between (so they work with plain `.focus()` in tests, not just `aria-activedescendant`).
 */
const DesignPicker: React.FC<DesignPickerProps> = ({
  id,
  labelId,
  value,
  placeholderLabel,
  placeholderIcon,
  placeholderSelectable,
  options,
  onChange,
  disabled,
  required,
  ariaDescribedBy,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const listboxId = `${id}-listbox`;

  const allOptions: readonly PickerOption[] = placeholderSelectable
    ? [{ value: '', label: placeholderLabel, icon: placeholderIcon }, ...options]
    : options;
  const selectable = allOptions.filter((option) => !option.disabled);
  const current = allOptions.find((option) => option.value === value);

  const focusOption = useCallback((optionValue: string) => {
    optionRefs.current.get(optionValue)?.focus();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const target = selectable.find((option) => option.value === value) ?? selectable[0];
    if (target) {
      focusOption(target.value);
    }
    // Only when the listbox transitions open - re-running on every option/value change would
    // steal focus back from whichever option the user just arrowed to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const close = (focusTrigger: boolean) => {
    setOpen(false);
    if (focusTrigger) {
      triggerRef.current?.focus();
    }
  };

  const selectValue = (optionValue: string) => {
    onChange(optionValue);
    close(true);
  };

  const moveFocus = (from: string, delta: 1 | -1) => {
    const index = selectable.findIndex((option) => option.value === from);
    const next = selectable[Math.min(Math.max(index + delta, 0), selectable.length - 1)];
    if (next) {
      focusOption(next.value);
    }
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || open) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onOptionKeyDown = (event: React.KeyboardEvent<HTMLLIElement>, option: PickerOption) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(option.value, 1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(option.value, -1);
        return;
      case 'Home':
        event.preventDefault();
        if (selectable[0]) {
          focusOption(selectable[0].value);
        }
        return;
      case 'End':
        event.preventDefault();
        if (selectable.length > 0) {
          focusOption(selectable[selectable.length - 1].value);
        }
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!option.disabled) {
          selectValue(option.value);
        }
        return;
      case 'Escape':
        event.preventDefault();
        close(true);
        return;
      case 'Tab':
        setOpen(false);
        return;
      default:
    }
  };

  return (
    <PickerWrap ref={wrapRef}>
      <Trigger
        ref={triggerRef}
        type="button"
        id={id}
        data-value={value}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-describedby={ariaDescribedBy}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        onKeyDown={onTriggerKeyDown}
      >
        <TriggerText>{current?.label ?? placeholderLabel}</TriggerText>
        <Chevron $open={open} aria-hidden="true">
          ▾
        </Chevron>
      </Trigger>
      {open ? (
        <OptionList role="listbox" id={listboxId} aria-labelledby={labelId} tabIndex={-1}>
          {allOptions.map((option) => (
            <OptionRow
              key={option.value || 'placeholder'}
              ref={(node) => {
                if (node) {
                  optionRefs.current.set(option.value, node);
                } else {
                  optionRefs.current.delete(option.value);
                }
              }}
              role="option"
              id={`${id}-option-${option.value || 'placeholder'}`}
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              $selected={option.value === value}
              tabIndex={-1}
              onClick={() => !option.disabled && selectValue(option.value)}
              onKeyDown={(event) => onOptionKeyDown(event, option)}
            >
              {option.icon}
              <TriggerText>{option.label}</TriggerText>
            </OptionRow>
          ))}
        </OptionList>
      ) : null}
    </PickerWrap>
  );
};

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

const glassOptionIcon = (item: Glassware, chroma: string): React.ReactNode => (
  <OptionGlassIcon aria-hidden="true">
    <Glass glassware={item} chroma={chroma} tone="ink" />
  </OptionGlassIcon>
);

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

  const paletteOptions: readonly PickerOption[] = design.palettes.map((item) => ({
    value: String(item.id),
    label: item.name,
    icon: <OptionSwatch aria-hidden="true" style={{ background: item.field }} />,
  }));

  const glasswareOptions: readonly PickerOption[] = design.glassware.map((item) => ({
    value: String(item.id),
    label: item.name,
    icon: glassOptionIcon(item, palette.field),
  }));

  return (
    <Fields aria-label="Design">
      <div>
        <Label id="add-sheet-color-palette-label" htmlFor="add-sheet-color-palette">
          Color palette
        </Label>
        <Row>
          <DesignPicker
            id="add-sheet-color-palette"
            labelId="add-sheet-color-palette-label"
            value={colorPaletteId !== null ? String(colorPaletteId) : ''}
            placeholderLabel={paletteHasInheritedDefault ? 'Use inherited default' : 'Choose a color palette'}
            placeholderIcon={paletteHasInheritedDefault ? <OptionSwatch aria-hidden="true" style={{ background: palette.field }} /> : undefined}
            placeholderSelectable={paletteHasInheritedDefault}
            options={paletteOptions}
            required={!paletteHasInheritedDefault}
            ariaDescribedBy={paletteUnavailable ? paletteHelpId : undefined}
            disabled={paletteUnavailable}
            onChange={(next) => onColorPaletteIdChange(idForChange(next, design.palettes))}
          />
          <PalettePreview aria-hidden="true" data-testid="palette-preview" style={{ background: palette.field }} />
        </Row>
        {paletteUnavailable ? (
          <Help id={paletteHelpId} role="status" aria-live="polite">
            Color palette choices are unavailable. Try again shortly.
          </Help>
        ) : null}
      </div>
      {supportsGlassware ? (
        <div>
          <Label id="add-sheet-glassware-label" htmlFor="add-sheet-glassware">
            Glassware
          </Label>
          <Row>
            <DesignPicker
              id="add-sheet-glassware"
              labelId="add-sheet-glassware-label"
              value={glasswareId !== null && glasswareId !== undefined ? String(glasswareId) : ''}
              placeholderLabel={glasswareHasInheritedDefault ? 'Use inherited default' : 'Choose glassware'}
              placeholderIcon={glasswareHasInheritedDefault ? glassOptionIcon(glassware, palette.field) : undefined}
              placeholderSelectable={glasswareHasInheritedDefault}
              options={glasswareOptions}
              required={!glasswareHasInheritedDefault}
              ariaDescribedBy={glasswareUnavailable ? glasswareHelpId : undefined}
              disabled={glasswareUnavailable}
              onChange={(next) => onGlasswareIdChange?.(idForChange(next, design.glassware))}
            />
            <GlassPreview aria-hidden="true">
              <Glass glassware={glassware} chroma={palette.field} tone="ink" />
            </GlassPreview>
          </Row>
          {glasswareUnavailable ? (
            <Help id={glasswareHelpId} role="status" aria-live="polite">
              Glassware choices are unavailable. Try again shortly.
            </Help>
          ) : null}
        </div>
      ) : null}
    </Fields>
  );
};

export default DesignSelector;
