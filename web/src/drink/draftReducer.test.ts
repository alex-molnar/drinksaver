import { describe, expect, it } from 'vitest';
import { initialDraftState, reduceDraft, QUANTITY_MAX, QUANTITY_MIN } from './draftReducer';

const TODAY = '2026-09-10';

describe('reduceDraft', () => {
  describe('select', () => {
    /**
     * The port of e2e/tests/detailed-save.spec.ts:48 ("changing the alcohol type clears the
     * dependent fields"), and of DetailedPage.test.tsx's "clears volume, subtype, consumption
     * type, brand and flavour when the alcohol type changes". Written first, against a module
     * that does not exist yet, per CLAUDE.md's test-first mandate.
     */
    it('selecting an alcohol type after a volume has been chosen clears volumeId, subtypeId, brandId, beerFlavourId and consumptionTypeId', () => {
      const withSelections = [
        { type: 'select' as const, field: 'alcoholType' as const, id: 1 },
        { type: 'select' as const, field: 'volume' as const, id: 10 },
        { type: 'select' as const, field: 'subtype' as const, id: 30 },
        { type: 'select' as const, field: 'consumptionType' as const, id: 40 },
        { type: 'select' as const, field: 'brand' as const, id: 50 },
        { type: 'select' as const, field: 'beerFlavour' as const, id: 60 },
      ].reduce(reduceDraft, initialDraftState(TODAY));

      expect(withSelections).toMatchObject({
        alcoholTypeId: 1,
        volumeId: 10,
        subtypeId: 30,
        consumptionTypeId: 40,
        brandId: 50,
        beerFlavourId: 60,
      });

      const afterNewType = reduceDraft(withSelections, { type: 'select', field: 'alcoholType', id: 2 });

      expect(afterNewType).toMatchObject({
        alcoholTypeId: 2,
        volumeId: null,
        subtypeId: null,
        consumptionTypeId: null,
        brandId: null,
        beerFlavourId: null,
      });
    });

    it('selecting a brand clears the beer flavour', () => {
      const state = [
        { type: 'select' as const, field: 'alcoholType' as const, id: 1 },
        { type: 'select' as const, field: 'brand' as const, id: 50 },
        { type: 'select' as const, field: 'beerFlavour' as const, id: 60 },
      ].reduce(reduceDraft, initialDraftState(TODAY));

      const afterNewBrand = reduceDraft(state, { type: 'select', field: 'brand', id: 51 });

      expect(afterNewBrand).toMatchObject({ brandId: 51, beerFlavourId: null });
    });

    it('selecting a volume, subtype or consumption type only changes that field', () => {
      const state = initialDraftState(TODAY);

      expect(reduceDraft(state, { type: 'select', field: 'volume', id: 10 })).toMatchObject({ volumeId: 10 });
      expect(reduceDraft(state, { type: 'select', field: 'subtype', id: 30 })).toMatchObject({ subtypeId: 30 });
      expect(reduceDraft(state, { type: 'select', field: 'consumptionType', id: 40 })).toMatchObject({
        consumptionTypeId: 40,
      });
      expect(reduceDraft(state, { type: 'select', field: 'beerFlavour', id: 60 })).toMatchObject({
        beerFlavourId: 60,
      });
    });
  });

  describe('adoptCreated', () => {
    it('behaves exactly like select: a newly created catalogue entry is selected and cascades the same way', () => {
      const state = [
        { type: 'select' as const, field: 'alcoholType' as const, id: 1 },
        { type: 'select' as const, field: 'brand' as const, id: 50 },
        { type: 'select' as const, field: 'beerFlavour' as const, id: 60 },
      ].reduce(reduceDraft, initialDraftState(TODAY));

      const afterAdopt = reduceDraft(state, { type: 'adoptCreated', field: 'brand', id: 999 });

      expect(afterAdopt).toMatchObject({ brandId: 999, beerFlavourId: null });
    });

    it('adopting a newly created alcohol type clears the same dependents as selecting one', () => {
      const state = [
        { type: 'select' as const, field: 'alcoholType' as const, id: 1 },
        { type: 'select' as const, field: 'volume' as const, id: 10 },
      ].reduce(reduceDraft, initialDraftState(TODAY));

      const afterAdopt = reduceDraft(state, { type: 'adoptCreated', field: 'alcoholType', id: 999 });

      expect(afterAdopt).toMatchObject({ alcoholTypeId: 999, volumeId: null });
    });
  });

  describe('setQuantity', () => {
    it('sets the quantity within range', () => {
      const state = initialDraftState(TODAY);
      expect(reduceDraft(state, { type: 'setQuantity', quantity: 5 }).quantity).toBe(5);
    });

    it(`clamps to a minimum of ${QUANTITY_MIN}`, () => {
      const state = initialDraftState(TODAY);
      expect(reduceDraft(state, { type: 'setQuantity', quantity: 0 }).quantity).toBe(QUANTITY_MIN);
      expect(reduceDraft(state, { type: 'setQuantity', quantity: -3 }).quantity).toBe(QUANTITY_MIN);
    });

    it(`clamps to a maximum of ${QUANTITY_MAX}, raised from the old cap of 9`, () => {
      const state = initialDraftState(TODAY);
      expect(reduceDraft(state, { type: 'setQuantity', quantity: 25 }).quantity).toBe(QUANTITY_MAX);
      expect(QUANTITY_MAX).toBe(24);
    });
  });

  describe('setDate', () => {
    it('sets the date', () => {
      const state = initialDraftState(TODAY);
      expect(reduceDraft(state, { type: 'setDate', date: '2026-01-01' }).date).toBe('2026-01-01');
    });
  });

  describe('setNotes / setRecommend / setOnlyTemporarily / setRecommendationName', () => {
    it('updates comments without touching anything else', () => {
      const state = initialDraftState(TODAY);
      const next = reduceDraft(state, { type: 'setNotes', comments: 'A lovely evening' });
      expect(next.comments).toBe('A lovely evening');
      expect(next).toMatchObject({ alcoholTypeId: null, volumeId: null });
    });

    it('toggles addToRecommendations', () => {
      const state = initialDraftState(TODAY);
      expect(reduceDraft(state, { type: 'setRecommend', addToRecommendations: true }).addToRecommendations).toBe(
        true
      );
    });

    it('clears onlyTemporarily and the recommendation name when addToRecommendations is turned off', () => {
      const state = [
        { type: 'setRecommend' as const, addToRecommendations: true },
        { type: 'setOnlyTemporarily' as const, onlyTemporarily: true },
        { type: 'setRecommendationName' as const, recommendationName: 'House lager' },
      ].reduce(reduceDraft, initialDraftState(TODAY));

      const afterTurnedOff = reduceDraft(state, { type: 'setRecommend', addToRecommendations: false });

      expect(afterTurnedOff).toMatchObject({
        addToRecommendations: false,
        onlyTemporarily: false,
        recommendationName: '',
      });
    });

    it('sets onlyTemporarily and the recommendation name independently while recommend is on', () => {
      const state = reduceDraft(initialDraftState(TODAY), { type: 'setRecommend', addToRecommendations: true });
      const next = reduceDraft(
        reduceDraft(state, { type: 'setOnlyTemporarily', onlyTemporarily: true }),
        { type: 'setRecommendationName', recommendationName: 'House lager' }
      );
      expect(next).toMatchObject({ onlyTemporarily: true, recommendationName: 'House lager' });
    });
  });

  describe('reset', () => {
    it('returns a fresh draft for the given date, discarding every prior selection', () => {
      const dirty = [
        { type: 'select' as const, field: 'alcoholType' as const, id: 1 },
        { type: 'select' as const, field: 'volume' as const, id: 10 },
        { type: 'setQuantity' as const, quantity: 4 },
        { type: 'setNotes' as const, comments: 'notes' },
      ].reduce(reduceDraft, initialDraftState(TODAY));

      const afterReset = reduceDraft(dirty, { type: 'reset', today: '2026-09-11' });

      expect(afterReset).toEqual(initialDraftState('2026-09-11'));
    });
  });
});
