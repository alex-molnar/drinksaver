import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import {
  createAlcoholType,
  createVolumeForAlcoholType,
  createSubtypeForAlcoholType,
  createBrand,
  createBeerFlavour,
} from '../api/endpoints';
import { useDraft } from './useDraft';

/** The five catalogue kinds a "New ..." row can create. Consumption type is deliberately absent:
 *  `DetailedPage` never offered a way to create one, and neither does this. */
export type CreatableCatalogueField = 'alcoholType' | 'volume' | 'subtype' | 'brand' | 'beerFlavour';

export interface CreateCatalogueEntryInput {
  field: CreatableCatalogueField;
  name: string;
  /** Litres. Required only for 'volume'. */
  volume?: number;
  /** The type the new entry belongs to. Required for 'volume' and 'subtype'. */
  alcoholTypeId?: number;
  /** The brand the new entry belongs to. Required for 'beerFlavour'. */
  brandId?: number;
}

interface CreatedCatalogueEntry {
  field: CreatableCatalogueField;
  id: number;
}

const create = async (input: CreateCatalogueEntryInput): Promise<CreatedCatalogueEntry> => {
  switch (input.field) {
    case 'alcoholType': {
      const created = await createAlcoholType({ name: input.name });
      return { field: input.field, id: created.id };
    }
    case 'volume': {
      if (input.alcoholTypeId === undefined || input.volume === undefined) {
        throw new Error('Creating a volume requires alcoholTypeId and volume');
      }
      const created = await createVolumeForAlcoholType(input.alcoholTypeId, {
        name: input.name,
        volume: input.volume,
      });
      return { field: input.field, id: created.id };
    }
    case 'subtype': {
      if (input.alcoholTypeId === undefined) {
        throw new Error('Creating a subtype requires alcoholTypeId');
      }
      const created = await createSubtypeForAlcoholType(input.alcoholTypeId, input.name);
      return { field: input.field, id: created.id };
    }
    case 'brand': {
      const created = await createBrand({ name: input.name });
      return { field: input.field, id: created.id };
    }
    case 'beerFlavour': {
      if (input.brandId === undefined) {
        throw new Error('Creating a beer flavour requires brandId');
      }
      const created = await createBeerFlavour(input.brandId, input.name);
      return { field: input.field, id: created.id };
    }
  }
};

const queryKeyFor = (field: CreatableCatalogueField, input: CreateCatalogueEntryInput): QueryKey => {
  switch (field) {
    case 'alcoholType':
      return ['alcoholTypes'];
    case 'volume':
      return ['volumes', input.alcoholTypeId];
    case 'subtype':
      return ['subtypes', input.alcoholTypeId];
    case 'brand':
      return ['brands'];
    case 'beerFlavour':
      return ['beerFlavours', input.brandId];
  }
};

/**
 * One mutation behind all five catalogue POSTs `NewAlcoholPage`, `NewVolumePage`,
 * `NewSubtypePage`, `NewBeerBrandPage` and `NewBeerFlavourPage` used to fire separately, each from
 * its own dead-end page. On success: invalidate the query the new entry belongs in, so the option
 * list that follows includes it; adopt the entry into the draft so it is already selected,
 * exactly as if it had been picked from that list; and call `onAdopted`, which `CreatePanel`
 * wires to popping back to the menu (see `SheetHost.tsx`) so the caller stays right where it was.
 */
export const useCreateCatalogueEntry = (onAdopted?: () => void) => {
  const queryClient = useQueryClient();
  const { dispatch } = useDraft();

  return useMutation({
    mutationFn: create,
    onSuccess: (created, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeyFor(created.field, input) });
      dispatch({ type: 'adoptCreated', field: created.field, id: created.id });
      onAdopted?.();
    },
  });
};
