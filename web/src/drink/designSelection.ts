import type { DraftFieldsCatalogue } from './draftFields';
import type { DraftState } from './draftReducer';
import type { Recommendation } from '../types/api';

export interface DraftDesign {
  colorPaletteId: number;
  glasswareId: number;
}

const requiredDesignId = (value: number | null | undefined, source: string): number => {
  if (value == null) {
    throw new Error(`Missing required ${source} design ID`);
  }
  return value;
};

export const resolveBrandColorPaletteId = (
  brandColorPaletteId: number | null | undefined,
  alcoholTypeColorPaletteId: number | null | undefined,
): number => requiredDesignId(
  brandColorPaletteId ?? alcoholTypeColorPaletteId,
  'beer brand palette',
);

export const resolveBeerColorPaletteId = (
  flavourColorPaletteId: number | null | undefined,
  brandColorPaletteId: number | null | undefined,
  alcoholTypeColorPaletteId: number | null | undefined,
): number => flavourColorPaletteId ?? resolveBrandColorPaletteId(
    brandColorPaletteId,
    alcoholTypeColorPaletteId,
  );

export const resolveAlcoholColorPaletteId = (
  subtypeColorPaletteId: number | null | undefined,
  alcoholTypeColorPaletteId: number | null | undefined,
): number => requiredDesignId(
  subtypeColorPaletteId ?? alcoholTypeColorPaletteId,
  'alcohol palette',
);

/** Recommendation saves already carry their final design; fail closed if an obsolete response does not. */
export const resolveRecommendationDesign = (
  recommendation: Pick<Recommendation, 'colorPaletteId' | 'glasswareId'>,
): DraftDesign => ({
  colorPaletteId: requiredDesignId(recommendation.colorPaletteId, 'recommendation palette'),
  glasswareId: requiredDesignId(recommendation.glasswareId, 'recommendation glassware'),
});

/**
 * Resolves the design metadata accumulated by the manual add flow. Each property has its own
 * nullish fallback chain: a palette choice must never change the glass choice, or vice versa.
 */
export const resolveDraftDesign = (
  draft: DraftState,
  catalogue: DraftFieldsCatalogue,
  isBeer: boolean,
): DraftDesign => {
  const alcoholType = catalogue.alcoholTypes?.find((item) => item.id === draft.alcoholTypeId);

  if (isBeer) {
    const brand = catalogue.brands?.find((item) => item.id === draft.brandId);
    const flavour = catalogue.beerFlavours?.find((item) => item.id === draft.beerFlavourId);
    const consumptionType = catalogue.consumptionTypes?.find((item) => item.id === draft.consumptionTypeId);

    return {
      colorPaletteId: resolveBeerColorPaletteId(
        flavour?.colorPaletteId,
        brand?.colorPaletteId,
        alcoholType?.colorPaletteId,
      ),
      glasswareId: requiredDesignId(consumptionType?.glasswareId, 'beer glassware'),
    };
  }

  const subtype = catalogue.subtypes?.find((item) => item.id === draft.subtypeId);
  return {
    colorPaletteId: resolveAlcoholColorPaletteId(
      subtype?.colorPaletteId,
      alcoholType?.colorPaletteId,
    ),
    glasswareId: requiredDesignId(
      subtype?.glasswareId ?? alcoholType?.glasswareId,
      'alcohol glassware',
    ),
  };
};
