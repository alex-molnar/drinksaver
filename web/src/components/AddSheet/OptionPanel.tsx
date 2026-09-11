import React, { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { useDraft } from '../../drink/useDraft';
import { useCatalogue, type UseCatalogueResult } from '../../drink/useCatalogue';
import { previousIsoDate, type MenuRowKey } from '../../drink/draftFields';
import { drinkingDay } from '../../drink/day';
import type { DraftFieldKey, DraftState } from '../../drink/draftReducer';
import type { CreatableCatalogueField } from '../../drink/useCreateCatalogueEntry';
import type { AddSheetPanel } from './panels';

export interface OptionPanelProps {
  field: MenuRowKey;
  onPushPanel: (panel: AddSheetPanel) => void;
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

const OptionList = styled.div`
  overflow-y: auto;
  padding: 4px 0 8px;
`;

const OptionRow = styled.button`
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  min-height: 44px;
  padding: 11px 20px;
  border: 0;
  border-top: 1px solid var(--ds-line-hairline);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: color-mix(in srgb, var(--ds-ink-primary) 5%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--ds-ink-secondary);
    outline-offset: -3px;
  }
`;

const OptionName = styled.strong`
  font-family: var(--ds-type-display-s-font-family);
  font-weight: var(--ds-type-display-s-font-weight);
  font-size: 19px;
`;

const Selected = styled.span`
  margin-left: auto;
  color: var(--ds-accent-active);
`;

const NewRow = styled(OptionRow)`
  color: var(--ds-ink-secondary);
`;

const LoadingStatus = styled.p`
  padding: 16px 20px;
  color: var(--ds-ink-tertiary);
  font-family: var(--ds-type-caption-font-family);
  font-size: var(--ds-type-caption-font-size);
`;

const FieldPanel = styled.div`
  padding: 4px 20px 20px;
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

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--ds-radius-sm);
  border: 1.4px solid color-mix(in srgb, var(--ds-ink-primary) 22%, transparent);
  background: color-mix(in srgb, var(--ds-ink-primary) 5%, transparent);
  color: var(--ds-ink-primary);
  font: inherit;
  font-size: 15px;
  resize: vertical;
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  cursor: pointer;

  input {
    width: 22px;
    height: 22px;
  }
`;

interface OptionListSpec {
  title: string;
  createLabel?: string;
  isLoading: boolean;
  options: { id: number; label: string }[];
}

/** Every catalogue-backed field's list, and how to label its options. `volume` is the only field
 *  needing a bespoke label rather than a plain name - see `menuFields`'s own `volumeLabel`, which
 *  this mirrors for a list of candidates rather than a single chosen one. */
const buildOptionList = (field: DraftFieldKey, catalogue: UseCatalogueResult): OptionListSpec => {
  switch (field) {
    case 'alcoholType':
      return {
        title: 'What are you drinking?',
        createLabel: 'drink type',
        isLoading: catalogue.alcoholTypes.isLoading,
        options: (catalogue.alcoholTypes.data ?? []).map((t) => ({ id: t.id, label: t.name })),
      };
    case 'volume':
      return {
        title: 'What size?',
        createLabel: 'size',
        isLoading: catalogue.volumes.isLoading,
        options: (catalogue.volumes.data ?? []).map((v) => ({ id: v.id, label: `${v.name} (${v.volume}L)` })),
      };
    case 'subtype':
      return {
        title: 'Which kind?',
        createLabel: 'subtype',
        isLoading: catalogue.subtypes.isLoading,
        options: (catalogue.subtypes.data ?? []).map((s) => ({ id: s.id, label: s.name })),
      };
    case 'consumptionType':
      return {
        title: 'How is it served?',
        isLoading: catalogue.consumptionTypes.isLoading,
        options: (catalogue.consumptionTypes.data ?? []).map((c) => ({ id: c.id, label: c.name })),
      };
    case 'brand':
      return {
        title: 'Which brand?',
        createLabel: 'brand',
        isLoading: catalogue.brands.isLoading,
        options: (catalogue.brands.data ?? []).map((b) => ({ id: b.id, label: b.name })),
      };
    case 'beerFlavour':
      return {
        title: 'Which flavour?',
        createLabel: 'flavour',
        isLoading: catalogue.beerFlavours.isLoading,
        options: (catalogue.beerFlavours.data ?? []).map((f) => ({ id: f.id, label: f.name })),
      };
  }
};

const selectedIdFor = (field: DraftFieldKey, draft: DraftState): number | null => {
  switch (field) {
    case 'alcoholType':
      return draft.alcoholTypeId;
    case 'volume':
      return draft.volumeId;
    case 'subtype':
      return draft.subtypeId;
    case 'consumptionType':
      return draft.consumptionTypeId;
    case 'brand':
      return draft.brandId;
    case 'beerFlavour':
      return draft.beerFlavourId;
  }
};

/** Whether `field` can be created from within its own option list. Consumption type is the one
 *  `MenuRowKey`/`DraftFieldKey` this excludes: see `useCreateCatalogueEntry.ts`'s module doc. */
const isCreatable = (field: DraftFieldKey): field is CreatableCatalogueField => field !== 'consumptionType';

const CatalogueField: React.FC<{
  field: DraftFieldKey;
  headingRef: React.Ref<HTMLHeadingElement>;
  onPushPanel: (panel: AddSheetPanel) => void;
  onPopPanel: () => void;
}> = ({ field, headingRef, onPushPanel, onPopPanel }) => {
  const { draft, dispatch } = useDraft();
  const catalogue = useCatalogue(draft);
  const spec = buildOptionList(field, catalogue);
  const selectedId = selectedIdFor(field, draft);

  return (
    <>
      <Heading id="add-sheet-heading" tabIndex={-1} ref={headingRef}>
        {spec.title}
      </Heading>
      {spec.isLoading ? (
        <LoadingStatus role="status">Loading…</LoadingStatus>
      ) : (
        <OptionList>
          {spec.options.map((option) => (
            <OptionRow
              key={option.id}
              type="button"
              aria-pressed={option.id === selectedId}
              onClick={() => {
                dispatch({ type: 'select', field, id: option.id });
                onPopPanel();
              }}
            >
              <OptionName>{option.label}</OptionName>
              {option.id === selectedId ? <Selected aria-hidden="true">✓</Selected> : null}
            </OptionRow>
          ))}
          {spec.createLabel && isCreatable(field) ? (
            <NewRow type="button" onClick={() => onPushPanel({ kind: 'create', field })}>
              New {spec.createLabel}
            </NewRow>
          ) : null}
        </OptionList>
      )}
    </>
  );
};

const WhenField: React.FC<{ headingRef: React.Ref<HTMLHeadingElement>; onPopPanel: () => void }> = ({ headingRef, onPopPanel }) => {
  const { draft, dispatch } = useDraft();
  const [showCustom, setShowCustom] = useState(false);
  const today = drinkingDay(new Date());
  const yesterday = previousIsoDate(today);

  const pick = (date: string) => {
    dispatch({ type: 'setDate', date });
    onPopPanel();
  };

  return (
    <>
      <Heading id="add-sheet-heading" tabIndex={-1} ref={headingRef}>
        When was it?
      </Heading>
      <OptionList>
        <OptionRow type="button" aria-pressed={draft.date === today} onClick={() => pick(today)}>
          <OptionName>Today</OptionName>
        </OptionRow>
        <OptionRow type="button" aria-pressed={draft.date === yesterday} onClick={() => pick(yesterday)}>
          <OptionName>Yesterday</OptionName>
        </OptionRow>
        {showCustom ? (
          <FieldPanel>
            <div>
              <FieldLabel htmlFor="add-sheet-custom-date">Choose a date</FieldLabel>
              <TextInput
                id="add-sheet-custom-date"
                type="date"
                max={today}
                defaultValue={draft.date !== today && draft.date !== yesterday ? draft.date : undefined}
                onChange={(e) => {
                  if (e.target.value) {
                    pick(e.target.value);
                  }
                }}
              />
            </div>
          </FieldPanel>
        ) : (
          <OptionRow type="button" onClick={() => setShowCustom(true)}>
            <OptionName>Another day</OptionName>
          </OptionRow>
        )}
      </OptionList>
    </>
  );
};

const NotesField: React.FC<{ headingRef: React.Ref<HTMLHeadingElement> }> = ({ headingRef }) => {
  const { draft, dispatch } = useDraft();

  return (
    <>
      <Heading id="add-sheet-heading" tabIndex={-1} ref={headingRef}>
        Notes
      </Heading>
      <FieldPanel>
        <div>
          <FieldLabel htmlFor="add-sheet-notes">Notes</FieldLabel>
          <TextArea
            id="add-sheet-notes"
            rows={4}
            value={draft.comments}
            placeholder="Add any notes about this drink"
            onChange={(e) => dispatch({ type: 'setNotes', comments: e.target.value })}
          />
        </div>
      </FieldPanel>
    </>
  );
};

const RecommendField: React.FC<{ headingRef: React.Ref<HTMLHeadingElement> }> = ({ headingRef }) => {
  const { draft, dispatch } = useDraft();

  return (
    <>
      <Heading id="add-sheet-heading" tabIndex={-1} ref={headingRef}>
        Recommend this?
      </Heading>
      <FieldPanel>
        <CheckboxRow htmlFor="add-sheet-recommend">
          <input
            id="add-sheet-recommend"
            type="checkbox"
            checked={draft.addToRecommendations}
            onChange={(e) => dispatch({ type: 'setRecommend', addToRecommendations: e.target.checked })}
          />
          Add as a recommendation
        </CheckboxRow>
        {draft.addToRecommendations ? (
          <>
            <CheckboxRow htmlFor="add-sheet-only-temporarily">
              <input
                id="add-sheet-only-temporarily"
                type="checkbox"
                checked={draft.onlyTemporarily}
                onChange={(e) => dispatch({ type: 'setOnlyTemporarily', onlyTemporarily: e.target.checked })}
              />
              Only temporarily
            </CheckboxRow>
            <div>
              <FieldLabel htmlFor="add-sheet-recommendation-name">Name</FieldLabel>
              <TextInput
                id="add-sheet-recommendation-name"
                type="text"
                value={draft.recommendationName}
                placeholder="Optional name for the recommendation"
                onChange={(e) => dispatch({ type: 'setRecommendationName', recommendationName: e.target.value })}
              />
            </div>
          </>
        ) : null}
      </FieldPanel>
    </>
  );
};

/**
 * The sheet's second-level panel: one field's own list of choices, pushed by `MenuPanel` for any
 * row. Branches on `field` rather than being six different components, because every branch
 * shares the same back button, heading id and focus-on-mount behaviour, and there is nothing left
 * over once those are factored out - see the design doc's file list for the add sheet, which
 * budgets one option panel, not six.
 */
const OptionPanel: React.FC<OptionPanelProps> = ({ field, onPushPanel, onPopPanel }) => {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div>
      <BackButton type="button" onClick={onPopPanel}>
        Back
      </BackButton>
      {field === 'notes' && <NotesField headingRef={headingRef} />}
      {field === 'recommend' && <RecommendField headingRef={headingRef} />}
      {field === 'date' && <WhenField headingRef={headingRef} onPopPanel={onPopPanel} />}
      {field !== 'notes' && field !== 'recommend' && field !== 'date' && (
        <CatalogueField field={field} headingRef={headingRef} onPushPanel={onPushPanel} onPopPanel={onPopPanel} />
      )}
    </div>
  );
};

export default OptionPanel;
