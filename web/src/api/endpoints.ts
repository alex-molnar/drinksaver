/**
 * Every endpoint here derives the caller's identity from the JWT the request
 * interceptor attaches, never from a userId in the payload. The client used to send
 * one in eight places; the backend ignored all eight, so it was dead weight that also
 * read as though the client's claim about who it was still counted for something.
 */
import apiClient from './client';
import { drinkingDay } from '../drink/day';
import type {
  Drink,
  SavedDrink,
  Brand,
  AlcoholType,
  AlcoholVolume,
  AlcoholSubtype,
  NewAlcoholEntry,
  NewVolumeEntry,
  NewAlcoholSubtype,
  Recommendation,
  RecommendationEdit,
  ConsumptionType,
  BeerFlavour,
  NewBeerBrand,
  NewBeerFlavour,
  EditableDrink,
  ColorPalette,
  Glassware,
} from '../types/api';

// Drinks endpoints
/**
 * Returns every row the server wrote, so a caller that saved `quantity` drinks holds all the
 * ids and can undo the whole save. Before 4.0.0 the endpoint returned a bare object holding
 * only the first id, which made undo on a batch save silently orphan the rest.
 *
 * The single-object branch is deploy skew tolerance, not a supported shape: the web pod and the
 * backend pod do not cut over together, so for about a minute after a release a new bundle can
 * reach an old backend. Remove it in 4.1.0, once no 3.x backend is running anywhere.
 */
export type SaveDrinkRequest = Omit<Drink, 'userId' | 'date' | 'colorPaletteId' | 'glasswareId'> & {
  date?: string;
  colorPaletteId: number;
  glasswareId: number;
};

export const saveDrink = async (drink: SaveDrinkRequest): Promise<SavedDrink[]> => {
  const payload: Omit<Drink, 'userId'> = {
    ...drink,
    date: drink.date || drinkingDay(new Date()),
  };
  const response = await apiClient.post<SavedDrink | SavedDrink[]>('/v1/drinks/new', payload);
  return Array.isArray(response.data) ? response.data : [response.data];
};

// Recommendations endpoints
export const getRecommendations = async (): Promise<Recommendation[]> => {
  const response = await apiClient.get<Recommendation[]>('/v1/recommendations/list');
  return response.data;
};

/**
 * Rewrites the caller's recommendation list: every surviving row's name, in the order they
 * should be shown. Deleted rows are simply absent, so the caller must flush its pending deletes
 * before calling this (see `useRecommendationQueue`), or the server would be told an order that
 * omits a row the user can still bring back.
 *
 * No userId in the payload: like every other endpoint here, the server derives identity from
 * the JWT the request interceptor attaches. See this module's header.
 */
export const editRecommendations = async (edits: readonly RecommendationEdit[]): Promise<void> => {
  await apiClient.patch('/v1/recommendations/edit', edits);
};

export const deleteRecommendation = async (id: number): Promise<void> => {
  await apiClient.delete(`/v1/recommendations/${id}`);
};

// Alcohol endpoints
export const getAlcoholTypes = async (): Promise<AlcoholType[]> => {
  const response = await apiClient.get<AlcoholType[]>('/v1/alcohol/types');
  return response.data;
};

export const createAlcoholType = async (entry: NewAlcoholEntry): Promise<AlcoholType> => {
  const response = await apiClient.post<AlcoholType>(
    '/v1/alcohol/types',
    withoutUndefinedDesignOverrides(entry)
  );
  return response.data;
};

export const getVolumesByAlcoholType = async (alcoholTypeId: number): Promise<AlcoholVolume[]> => {
  const response = await apiClient.get<AlcoholVolume[]>(
    `/v1/alcohol/types/${alcoholTypeId}/volumes`
  );
  return response.data;
};

export const createVolumeForAlcoholType = async (
  alcoholTypeId: number,
  entry: NewVolumeEntry
): Promise<AlcoholVolume> => {
  const response = await apiClient.post<AlcoholVolume>(
    `/v1/alcohol/types/${alcoholTypeId}/volumes`,
    entry
  );
  return response.data;
};

export const getSubtypesByAlcoholType = async (alcoholTypeId: number): Promise<AlcoholSubtype[]> => {
  const response = await apiClient.get<AlcoholSubtype[]>(
    `/v1/alcohol/types/${alcoholTypeId}/subtypes`
  );
  return response.data;
};

export const createSubtypeForAlcoholType = async (
  alcoholTypeId: number,
  entry: NewAlcoholSubtype
): Promise<AlcoholSubtype> => {
  const response = await apiClient.post<AlcoholSubtype>(
    `/v1/alcohol/types/${alcoholTypeId}/subtypes`,
    withoutUndefinedDesignOverrides(entry)
  );
  return response.data;
};

// Beer endpoints
export const getConsumptionTypes = async (amount: number = 100): Promise<ConsumptionType[]> => {
  const response = await apiClient.get<ConsumptionType[]>('/v1/beer/consumption-types', {
    params: { amount },
  });
  return response.data;
};

export const getBrands = async (): Promise<Brand[]> => {
  const response = await apiClient.get<Brand[]>('/v1/beer/brands');
  return response.data;
};

export const createBrand = async (brand: NewBeerBrand): Promise<Brand> => {
  const response = await apiClient.post<Brand>(
    '/v1/beer/brands',
    withoutUndefinedDesignOverrides(brand)
  );
  return response.data;
};

export const getBeerFlavours = async (brandId: number): Promise<BeerFlavour[]> => {
  const response = await apiClient.get<BeerFlavour[]>(
    `/v1/beer/brands/${brandId}/flavours`
  );
  return response.data;
};

export const createBeerFlavour = async (
  brandId: number,
  entry: NewBeerFlavour
): Promise<BeerFlavour> => {
  const response = await apiClient.post<BeerFlavour>(
    `/v1/beer/brands/${brandId}/flavours`,
    withoutUndefinedDesignOverrides(entry)
  );
  return response.data;
};

const withoutUndefinedDesignOverrides = <T extends {
  colorPaletteId?: number;
  glasswareId?: number;
}>(entry: T) => {
  const { colorPaletteId, glasswareId, ...payload } = entry;
  return {
    ...payload,
    ...(colorPaletteId !== undefined ? { colorPaletteId } : {}),
    ...(glasswareId !== undefined ? { glasswareId } : {}),
  };
};

// Design endpoints
export const getColorPalettes = async (): Promise<ColorPalette[]> => {
  const response = await apiClient.get<ColorPalette[]>('/v1/design/color-palettes');
  return response.data;
};

export const getGlassware = async (): Promise<Glassware[]> => {
  const response = await apiClient.get<Glassware[]>('/v1/design/glassware');
  return response.data;
};

// History/Consumption endpoints
export const getSavedDrinksByDate = async (date: string): Promise<EditableDrink[]> => {
  const response = await apiClient.get<EditableDrink[]>(`/v1/drinks/date/${date}`);
  return response.data;
};

export const deleteDrinksByIds = async (drinkIds: number[]): Promise<number> => {
  const response = await apiClient.delete<number>('/v1/drinks/byIds', {
    params: { drinkIds },
    paramsSerializer: {
      indexes: null, // Serialize as drinkIds=1&drinkIds=2 instead of drinkIds[0]=1&drinkIds[1]=2
    },
  });
  return response.data;
};
