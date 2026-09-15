import { describe, expect, it } from 'vitest';
import { initialDraftState, type DraftState } from './draftReducer';
import type { DraftFieldsCatalogue } from './draftFields';
import { resolveDraftDesign, resolveRecommendationDesign, resolveRecommendationSaveDesign } from './designSelection';

const TYPE = { id: 1, name: 'Beer', volumeIds: [10], colorPaletteId: 3, glasswareId: 4 };
const BASE_CATALOGUE: DraftFieldsCatalogue = {
  alcoholTypes: [TYPE],
  brands: [{ id: 20, name: 'Brand', colorPaletteId: 2 }],
  beerFlavours: [{ id: 30, brandId: 20, name: 'Flavour', colorPaletteId: 1 }],
  consumptionTypes: [{ id: 40, name: 'Draft', glasswareId: 5 }],
  subtypes: [{ id: 50, alcoholTypeId: 1, name: 'Subtype', colorPaletteId: 6, glasswareId: 7 }],
};

const draft = (overrides: Partial<DraftState> = {}): DraftState => ({
  ...initialDraftState('2026-09-14'),
  alcoholTypeId: 1,
  ...overrides,
});

describe('resolveDraftDesign', () => {
  it('uses beer flavour before brand and the alcohol-type fallback for colour', () => {
    expect(resolveDraftDesign(draft({ brandId: 20, beerFlavourId: 30, consumptionTypeId: 40 }), BASE_CATALOGUE, true))
      .toEqual({ colorPaletteId: 1, glasswareId: 5 });

    expect(resolveDraftDesign(
      draft({ brandId: 20, beerFlavourId: 30, consumptionTypeId: 40 }),
      { ...BASE_CATALOGUE, beerFlavours: [{ ...BASE_CATALOGUE.beerFlavours![0], colorPaletteId: null }] },
      true,
    )).toEqual({ colorPaletteId: 2, glasswareId: 5 });

    expect(resolveDraftDesign(
      draft({ brandId: 20, beerFlavourId: 30, consumptionTypeId: 40 }),
      {
        ...BASE_CATALOGUE,
        beerFlavours: [{ ...BASE_CATALOGUE.beerFlavours![0], colorPaletteId: null }],
        brands: [{ ...BASE_CATALOGUE.brands![0], colorPaletteId: null }],
      },
      true,
    )).toEqual({ colorPaletteId: 3, glasswareId: 5 });
  });

  it('uses the selected beer consumption type as the glassware source', () => {
    expect(resolveDraftDesign(draft({ consumptionTypeId: 40 }), BASE_CATALOGUE, true))
      .toEqual({ colorPaletteId: 3, glasswareId: 5 });
  });

  it('resolves non-beer palette and glassware independently from subtype then alcohol type', () => {
    expect(resolveDraftDesign(draft({ subtypeId: 50 }), BASE_CATALOGUE, false))
      .toEqual({ colorPaletteId: 6, glasswareId: 7 });

    expect(resolveDraftDesign(
      draft({ subtypeId: 50 }),
      { ...BASE_CATALOGUE, subtypes: [{ ...BASE_CATALOGUE.subtypes![0], colorPaletteId: null }] },
      false,
    )).toEqual({ colorPaletteId: 3, glasswareId: 7 });

    expect(resolveDraftDesign(
      draft({ subtypeId: 50 }),
      { ...BASE_CATALOGUE, subtypes: [{ ...BASE_CATALOGUE.subtypes![0], glasswareId: null }] },
      false,
    )).toEqual({ colorPaletteId: 6, glasswareId: 4 });
  });

  it('uses both alcohol-type defaults when no subtype is selected', () => {
    expect(resolveDraftDesign(draft(), BASE_CATALOGUE, false))
      .toEqual({ colorPaletteId: 3, glasswareId: 4 });
  });
});

describe('resolveRecommendationDesign', () => {
  it('uses the final design returned by the recommendation endpoint', () => {
    expect(resolveRecommendationDesign({ colorPaletteId: 8, glasswareId: 9 }))
      .toEqual({ colorPaletteId: 8, glasswareId: 9 });
  });

  it('applies only explicit recommendation overrides over the resolved drink design', () => {
    expect(resolveRecommendationSaveDesign(
      { colorPaletteId: 3, glasswareId: 4 },
      { colorPaletteId: null, glasswareId: 8 },
    )).toEqual({ colorPaletteId: 3, glasswareId: 8 });
  });
});
