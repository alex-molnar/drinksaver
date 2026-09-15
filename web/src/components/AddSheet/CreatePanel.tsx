import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { useDraft } from '../../drink/useDraft';
import { useCatalogue } from '../../drink/useCatalogue';
import { useDesign } from '../../drink/useDesign';
import { useCreateCatalogueEntry, type CreatableCatalogueField } from '../../drink/useCreateCatalogueEntry';
import DesignSelector from './DesignSelector';

export interface CreatePanelProps {
  field: CreatableCatalogueField;
  onPopPanel: () => void;
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

/** Colours only the parent's name within the heading (e.g. "New subtype for Wine"), matching the
 *  identity colour its own swatch shows elsewhere in the sheet - see `PaletteSwatch`. */
const ContextName = styled.span<{ $color: string }>`
  color: ${(p) => p.$color};
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 6px 12px 0;
  padding: 8px 10px;
  min-height: 44px;
  border: 0;
  border-radius: var(--ds-radius-sm);
  background: none;
  color: var(--ds-ink-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    color: var(--ds-ink-primary);
    background: color-mix(in srgb, var(--ds-ink-primary) 6%, transparent);
  }
`;

const Form = styled.form`
  padding: 6px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const FieldLabel = styled.label`
  font-family: var(--ds-type-caption-font-family);
  font-size: var(--ds-type-caption-font-size);
  color: var(--ds-ink-tertiary);
  display: block;
  margin-bottom: 6px;
`;

const TextInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  border-radius: var(--ds-radius-sm);
  border: 1.4px solid color-mix(in srgb, var(--ds-ink-primary) 22%, transparent);
  background: color-mix(in srgb, var(--ds-ink-primary) 5%, transparent);
  color: var(--ds-ink-primary);
  font: inherit;
  font-size: 16px;
`;

const SubmitButton = styled.button`
  margin-top: 4px;
  height: 54px;
  min-height: 44px;
  border-radius: var(--ds-radius-sm);
  border: 0;
  background: var(--ds-accent-primary);
  color: var(--ds-ink-primary);
  font-family: var(--ds-type-display-s-font-family);
  font-weight: var(--ds-type-display-s-font-weight);
  font-size: 17px;
  cursor: pointer;

  &:disabled {
    background: color-mix(in srgb, var(--ds-ink-primary) 8%, transparent);
    color: var(--ds-ink-tertiary);
    cursor: default;
  }
`;

const ErrorText = styled.p`
  margin: 0 20px;
  color: var(--ds-accent-danger);
  font-family: var(--ds-type-caption-font-family);
  font-size: var(--ds-type-caption-font-size);
`;

const CREATE_TITLES: Record<CreatableCatalogueField, string> = {
  alcoholType: 'drink type',
  volume: 'size',
  subtype: 'subtype',
  brand: 'brand',
  beerFlavour: 'flavour',
};

/** Matches the deployed `repository.beer-id` contract; creation inheritance must not inspect names. */
const BEER_ALCOHOL_TYPE_ID = 4;

/**
 * The sheet's create panel: one small form behind any "New ..." row in `OptionPanel`. Adopts the
 * created entry into the draft and returns to the menu on success - see `useCreateCatalogueEntry`,
 * whose `onAdopted` callback this wires straight to `onPopPanel`, matching the design doc's
 * "it is saved and picked for you, you stay right here."
 */
const CreatePanel: React.FC<CreatePanelProps> = ({ field, onPopPanel }) => {
  const { draft } = useDraft();
  const catalogue = useCatalogue(draft);
  const design = useDesign();
  const [name, setName] = useState('');
  const [volume, setVolume] = useState('');
  const [colorPaletteId, setColorPaletteId] = useState<number | null>(null);
  const [glasswareId, setGlasswareId] = useState<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const onAdopted = useCallback(() => onPopPanel(), [onPopPanel]);
  const mutation = useCreateCatalogueEntry(onAdopted);

  // Only these two fields nest under another catalogue choice already on the draft - see
  // `handleSubmit` below, which is what actually needs the parent id. This just names it back to
  // the user, the way the pre-sheet `NewSubtypePage`/`NewBeerFlavourPage` did with their own
  // "Adding a new ... for ..." banner - coloured to match, per the parent's own colour, not a
  // fallback chain through a sibling that has not been chosen here.
  const parentAlcoholType = catalogue.alcoholTypes.data?.find((t) => t.id === draft.alcoholTypeId);
  const parentBrand = catalogue.brands.data?.find((b) => b.id === draft.brandId);
  const structuralBeerParent = draft.alcoholTypeId === BEER_ALCOHOL_TYPE_ID ? parentAlcoholType : undefined;

  const contextName = field === 'subtype' ? parentAlcoholType?.name : field === 'beerFlavour' ? parentBrand?.name : undefined;

  const contextColorPaletteId =
    field === 'subtype'
      ? parentAlcoholType?.colorPaletteId
      : field === 'beerFlavour'
        ? (parentBrand?.colorPaletteId ?? parentAlcoholType?.colorPaletteId)
        : undefined;

  const inheritedColorPaletteId =
    field === 'subtype'
      ? parentAlcoholType?.colorPaletteId
      : field === 'brand'
        ? structuralBeerParent?.colorPaletteId
        : field === 'beerFlavour'
          ? (parentBrand?.colorPaletteId ?? structuralBeerParent?.colorPaletteId)
          : undefined;
  const inheritedGlasswareId = field === 'subtype' ? parentAlcoholType?.glasswareId : undefined;
  const supportsPalette = field !== 'volume';
  const supportsGlassware = field === 'alcoholType' || field === 'subtype';
  const hasPaletteChoice = !supportsPalette || colorPaletteId !== null || inheritedColorPaletteId !== undefined;
  const hasGlasswareChoice = !supportsGlassware || glasswareId !== null || inheritedGlasswareId !== undefined;

  const trimmedName = name.trim();
  const volumeNumber = Number(volume);
  const volumeProvided = volume.trim() !== '' && Number.isFinite(volumeNumber) && volumeNumber > 0;
  const canSubmit = trimmedName !== '' && (field !== 'volume' || volumeProvided) && hasPaletteChoice && hasGlasswareChoice && !mutation.isPending;
  const designOverrides = {
    ...(colorPaletteId !== null ? { colorPaletteId } : {}),
    ...(glasswareId !== null ? { glasswareId } : {}),
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    switch (field) {
      case 'alcoholType':
        mutation.mutate({ field, name: trimmedName, ...designOverrides });
        return;
      case 'brand':
        mutation.mutate({ field, name: trimmedName, ...designOverrides });
        return;
      case 'subtype':
        mutation.mutate({ field, name: trimmedName, alcoholTypeId: draft.alcoholTypeId ?? undefined, ...designOverrides });
        return;
      case 'beerFlavour':
        mutation.mutate({ field, name: trimmedName, brandId: draft.brandId ?? undefined, ...designOverrides });
        return;
      case 'volume':
        mutation.mutate({ field, name: trimmedName, volume: volumeNumber, alcoholTypeId: draft.alcoholTypeId ?? undefined });
    }
  };

  return (
    <div>
      <BackButton type="button" onClick={onPopPanel}>
        Back
      </BackButton>
      <Heading id="add-sheet-heading" tabIndex={-1} ref={headingRef}>
        New {CREATE_TITLES[field]}
        {contextName ? (
          <>
            {' for '}
            <ContextName $color={design.paletteForId(contextColorPaletteId).field}>{contextName}</ContextName>
          </>
        ) : null}
      </Heading>
      <Hint>It is saved and picked for you. You stay right here.</Hint>
      <Form onSubmit={handleSubmit}>
        <div>
          <FieldLabel htmlFor="add-sheet-create-name">Name</FieldLabel>
          <TextInput id="add-sheet-create-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        </div>
        {field === 'volume' ? (
          <div>
            <FieldLabel htmlFor="add-sheet-create-volume">Litres</FieldLabel>
            <TextInput
              id="add-sheet-create-volume"
              type="number"
              step="0.01"
              min="0.01"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              placeholder="Litres"
            />
          </div>
        ) : null}
        {supportsPalette ? (
          <DesignSelector
            colorPaletteId={colorPaletteId}
            inheritedColorPaletteId={inheritedColorPaletteId}
            onColorPaletteIdChange={setColorPaletteId}
            glasswareId={supportsGlassware ? glasswareId : undefined}
            inheritedGlasswareId={supportsGlassware ? inheritedGlasswareId : undefined}
            onGlasswareIdChange={supportsGlassware ? setGlasswareId : undefined}
          />
        ) : null}
        <SubmitButton type="submit" disabled={!canSubmit}>
          Add and use it
        </SubmitButton>
      </Form>
      {mutation.isError ? <ErrorText role="alert">Couldn&apos;t add it. Try again.</ErrorText> : null}
    </div>
  );
};

export default CreatePanel;
