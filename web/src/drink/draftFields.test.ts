import { describe, expect, it } from 'vitest';
import { menuFields, isDraftReady, type DraftFieldsCatalogue } from './draftFields';
import { initialDraftState, reduceDraft } from './draftReducer';

const TODAY = '2026-09-10';
const YESTERDAY = '2026-09-09';

const CATALOGUE: DraftFieldsCatalogue = {
  alcoholTypes: [
    { id: 1, name: 'Beer', volumeIds: [] },
    { id: 2, name: 'Wine', volumeIds: [] },
  ],
  volumes: [{ id: 10, name: 'Pint', volume: 0.5 }],
  subtypes: [{ id: 30, name: 'Red', alcoholTypeId: 2 }],
  consumptionTypes: [{ id: 40, name: 'Draft' }],
  brands: [{ id: 50, name: 'Heineken' }],
  beerFlavours: [{ id: 60, name: 'Lager', brandId: 50 }],
};

describe('menuFields', () => {
  it('shows only the drink type row, When, Notes and Recommend before a type is chosen', () => {
    const draft = initialDraftState(TODAY);
    const rows = menuFields(draft, CATALOGUE, false, TODAY);

    expect(rows.map((r) => r.key)).toEqual(['alcoholType', 'date', 'notes', 'recommend']);
    expect(rows[0].value).toBeNull();
  });

  it('adds the subtype and size rows for a non-beer type', () => {
    const draft = reduceDraft(initialDraftState(TODAY), { type: 'select', field: 'alcoholType', id: 2 });
    const rows = menuFields(draft, CATALOGUE, false, TODAY);

    expect(rows.map((r) => r.key)).toEqual(['alcoholType', 'subtype', 'volume', 'date', 'notes', 'recommend']);
    expect(rows.find((r) => r.key === 'alcoholType')?.value).toBe('Wine');
  });

  it('adds brand, served and size rows for beer, and flavour only once a brand is chosen', () => {
    const chosenType = reduceDraft(initialDraftState(TODAY), { type: 'select', field: 'alcoholType', id: 1 });
    const rows = menuFields(chosenType, CATALOGUE, true, TODAY);
    expect(rows.map((r) => r.key)).toEqual([
      'alcoholType',
      'brand',
      'consumptionType',
      'volume',
      'date',
      'notes',
      'recommend',
    ]);

    const withBrand = reduceDraft(chosenType, { type: 'select', field: 'brand', id: 50 });
    const rowsWithBrand = menuFields(withBrand, CATALOGUE, true, TODAY);
    expect(rowsWithBrand.map((r) => r.key)).toEqual([
      'alcoholType',
      'brand',
      'beerFlavour',
      'consumptionType',
      'volume',
      'date',
      'notes',
      'recommend',
    ]);
  });

  it('formats the chosen volume as "name (volumeL)"', () => {
    const draft = [
      { type: 'select' as const, field: 'alcoholType' as const, id: 2 },
      { type: 'select' as const, field: 'volume' as const, id: 10 },
    ].reduce(reduceDraft, initialDraftState(TODAY));
    const rows = menuFields(draft, CATALOGUE, false, TODAY);
    expect(rows.find((r) => r.key === 'volume')?.value).toBe('Pint (0.5L)');
  });

  it('labels the When row Today, Yesterday, or a formatted date', () => {
    const draft = initialDraftState(TODAY);
    expect(menuFields(draft, CATALOGUE, false, TODAY).find((r) => r.key === 'date')?.value).toBe('Today');

    const yesterday = reduceDraft(draft, { type: 'setDate', date: YESTERDAY });
    expect(menuFields(yesterday, CATALOGUE, false, TODAY).find((r) => r.key === 'date')?.value).toBe('Yesterday');

    const another = reduceDraft(draft, { type: 'setDate', date: '2026-01-05' });
    expect(menuFields(another, CATALOGUE, false, TODAY).find((r) => r.key === 'date')?.value).toBe('5 Jan');
  });

  it('shows the notes row value only once something has been typed', () => {
    const draft = initialDraftState(TODAY);
    expect(menuFields(draft, CATALOGUE, false, TODAY).find((r) => r.key === 'notes')?.value).toBeNull();

    const withNotes = reduceDraft(draft, { type: 'setNotes', comments: 'Nice evening' });
    expect(menuFields(withNotes, CATALOGUE, false, TODAY).find((r) => r.key === 'notes')?.value).toBe(
      'Nice evening'
    );

    const blank = reduceDraft(draft, { type: 'setNotes', comments: '   ' });
    expect(menuFields(blank, CATALOGUE, false, TODAY).find((r) => r.key === 'notes')?.value).toBeNull();
  });

  it('shows Yes/No for the recommend row', () => {
    const draft = initialDraftState(TODAY);
    expect(menuFields(draft, CATALOGUE, false, TODAY).find((r) => r.key === 'recommend')?.value).toBe('No');

    const on = reduceDraft(draft, { type: 'setRecommend', addToRecommendations: true });
    expect(menuFields(on, CATALOGUE, false, TODAY).find((r) => r.key === 'recommend')?.value).toBe('Yes');
  });
});

describe('isDraftReady', () => {
  it('is false until both a type and a size are chosen', () => {
    const draft = initialDraftState(TODAY);
    expect(isDraftReady(draft, false)).toBe(false);

    const withType = reduceDraft(draft, { type: 'select', field: 'alcoholType', id: 2 });
    expect(isDraftReady(withType, false)).toBe(false);

    const withVolume = reduceDraft(withType, { type: 'select', field: 'volume', id: 10 });
    expect(isDraftReady(withVolume, false)).toBe(true);
  });

  it('additionally requires a consumption type for beer, but never a brand', () => {
    const draft = [
      { type: 'select' as const, field: 'alcoholType' as const, id: 1 },
      { type: 'select' as const, field: 'volume' as const, id: 10 },
    ].reduce(reduceDraft, initialDraftState(TODAY));

    expect(isDraftReady(draft, true)).toBe(false);

    const withConsumption = reduceDraft(draft, { type: 'select', field: 'consumptionType', id: 40 });
    // Ready with no brand at all: brandId stays null throughout, matching the shipped app's
    // existing rule (Drink.brandId is optional server side), not the prototype's stricter one.
    expect(withConsumption.brandId).toBeNull();
    expect(isDraftReady(withConsumption, true)).toBe(true);
  });
});
