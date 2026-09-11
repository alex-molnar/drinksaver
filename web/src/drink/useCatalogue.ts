import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  getAlcoholTypes,
  getVolumesByAlcoholType,
  getSubtypesByAlcoholType,
  getConsumptionTypes,
  getBrands,
  getBeerFlavours,
} from '../api/endpoints';
import type { AlcoholType, AlcoholVolume, AlcoholSubtype, ConsumptionType, Brand, BeerFlavour } from '../types/api';
import type { DraftState } from './draftReducer';

// Beer type ID - typically ID 1, but we check by name as fallback. Ported verbatim from
// DetailedPage, which this replaces.
const BEER_TYPE_NAME = 'Beer';

export interface UseCatalogueResult {
  alcoholTypes: UseQueryResult<AlcoholType[]>;
  volumes: UseQueryResult<AlcoholVolume[]>;
  subtypes: UseQueryResult<AlcoholSubtype[]>;
  consumptionTypes: UseQueryResult<ConsumptionType[]>;
  brands: UseQueryResult<Brand[]>;
  beerFlavours: UseQueryResult<BeerFlavour[]>;
  /** Whether the draft's chosen type is Beer, by name - too coarse an id to hardcode, since a
   *  deployment's catalogue assigns it. See `drink/identity.ts`'s module doc for the same caveat
   *  applied to glassware. */
  isBeer: boolean;
}

/**
 * The six catalogue queries `DetailedPage` used to scatter through itself, unified behind one
 * hook so `MenuPanel` and `OptionPanel` share one set of query keys and one `isBeer` derivation
 * rather than each recomputing it. Query keys and `enabled` conditions are unchanged from the
 * page this replaces, so an in-flight cache entry from elsewhere in the app (there is none today,
 * but a future screen might) would still be shared correctly.
 */
export const useCatalogue = (draft: DraftState): UseCatalogueResult => {
  const alcoholTypeId = draft.alcoholTypeId;
  const brandId = draft.brandId;

  const alcoholTypes = useQuery({
    queryKey: ['alcoholTypes'],
    queryFn: () => getAlcoholTypes(),
  });

  const selectedType = alcoholTypes.data?.find((t) => t.id === alcoholTypeId);
  const isBeer = selectedType?.name.toLowerCase() === BEER_TYPE_NAME.toLowerCase();

  const volumes = useQuery({
    queryKey: ['volumes', alcoholTypeId],
    queryFn: () => getVolumesByAlcoholType(alcoholTypeId as number),
    enabled: alcoholTypeId !== null,
  });

  const subtypes = useQuery({
    queryKey: ['subtypes', alcoholTypeId],
    queryFn: () => getSubtypesByAlcoholType(alcoholTypeId as number),
    enabled: alcoholTypeId !== null && !isBeer,
  });

  const consumptionTypes = useQuery({
    queryKey: ['consumptionTypes'],
    queryFn: () => getConsumptionTypes(),
    enabled: isBeer,
  });

  const brands = useQuery({
    queryKey: ['brands'],
    queryFn: () => getBrands(),
    enabled: isBeer,
  });

  const beerFlavours = useQuery({
    queryKey: ['beerFlavours', brandId],
    queryFn: () => getBeerFlavours(brandId as number),
    enabled: isBeer && brandId !== null,
  });

  return { alcoholTypes, volumes, subtypes, consumptionTypes, brands, beerFlavours, isBeer };
};
