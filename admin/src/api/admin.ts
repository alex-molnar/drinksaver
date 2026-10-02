import apiClient from './client';
import type {
  AlcoholSubtype,
  AlcoholType,
  AlcoholVolume,
  BeerFlavour,
  Brand,
  ColorPalette,
  ConsumptionType,
  DefaultRecommendation,
  Glassware,
  NewAlcoholSubtype,
  NewAlcoholType,
  NewBeerFlavour,
  NewBrand,
  NewColorPalette,
  NewConsumptionType,
  NewDefaultRecommendation,
  NewGlassware,
  RecommendationUpdate,
  UpdateColorPalette,
  UpdateGlassware,
} from '../types/api';

const assertSafeIdentifiers = (value: unknown): void => {
  if (Array.isArray(value)) return value.forEach(assertSafeIdentifiers);
  if (value === null || typeof value !== 'object') return;
  for (const [key, field] of Object.entries(value)) {
    if ((key === 'id' || key === 'alcoholSubtypeId') && typeof field === 'number' && !Number.isSafeInteger(field)) {
      throw new RangeError(`API ${key} exceeds JavaScript's safe integer range`);
    }
    assertSafeIdentifiers(field);
  }
};

const data = async <T>(request: Promise<{ data: T }>): Promise<T> => {
  const result = (await request).data;
  assertSafeIdentifiers(result);
  return result;
};

export const getDefaultTypes = () => data<AlcoholType[]>(apiClient.get('/v1/admin/default/alcohol/types'));
export const getDefaultSubtypes = (typeId: number) => data<AlcoholSubtype[]>(apiClient.get(`/v1/admin/default/alcohol/types/${typeId}/subtypes`));
export const createDefaultType = (input: NewAlcoholType) => data<AlcoholType>(apiClient.post('/v1/admin/default/alcohol/types', input));
export const createDefaultSubtype = (typeId: number, input: NewAlcoholSubtype) => data<AlcoholSubtype>(apiClient.post(`/v1/admin/default/alcohol/types/${typeId}/subtypes`, { ...input, alcoholTypeId: typeId }));
export const updateType = (id: number, input: Partial<Pick<AlcoholType, 'name' | 'colorPaletteId' | 'glasswareId'>>) => data<AlcoholType>(apiClient.patch(`/v1/admin/alcohol/types/${id}`, input));
export const updateSubtype = (id: number, input: Partial<Pick<AlcoholSubtype, 'name' | 'colorPaletteId' | 'glasswareId'>>) => data<AlcoholSubtype>(apiClient.patch(`/v1/admin/alcohol/subtypes/${id}`, input));
export const deleteType = (id: number) => apiClient.delete(`/v1/admin/alcohol/types/${id}`).then(() => undefined);
export const deleteSubtype = (id: number) => apiClient.delete(`/v1/admin/alcohol/subtypes/${id}`).then(() => undefined);

export const getDefaultBrands = () => data<Brand[]>(apiClient.get('/v1/admin/default/beer/brands'));
export const getDefaultFlavours = (brandId: number) => data<BeerFlavour[]>(apiClient.get(`/v1/admin/default/beer/brands/${brandId}/flavours`));
export const getConsumptionTypes = () => data<ConsumptionType[]>(apiClient.get('/v1/admin/default/beer/consumption-types'));
export const createDefaultBrand = (input: NewBrand) => data<Brand>(apiClient.post('/v1/admin/default/beer/brands', input));
export const createDefaultFlavour = (brandId: number, input: NewBeerFlavour) => data<BeerFlavour>(apiClient.post(`/v1/admin/default/beer/brands/${brandId}/flavours`, input));
export const createConsumptionType = (input: NewConsumptionType) => data<ConsumptionType>(apiClient.post('/v1/admin/default/beer/consumption-types', input));
export const updateBrand = (id: number, input: Partial<Pick<Brand, 'name' | 'colorPaletteId'>>) => data<Brand>(apiClient.patch(`/v1/admin/beer/brands/${id}`, input));
export const updateFlavour = (id: number, input: Partial<Pick<BeerFlavour, 'name' | 'colorPaletteId'>>) => data<BeerFlavour>(apiClient.patch(`/v1/admin/beer/brands/flavours/${id}`, input));
export const updateConsumptionType = (id: number, input: Partial<Pick<ConsumptionType, 'name' | 'glasswareId'>>) => data<ConsumptionType>(apiClient.patch(`/v1/admin/beer/consumption-types/${id}`, input));
export const deleteBrand = (id: number) => apiClient.delete(`/v1/admin/beer/brands/${id}`).then(() => undefined);
export const deleteFlavour = (id: number) => apiClient.delete(`/v1/admin/beer/brands/flavours/${id}`).then(() => undefined);
export const deleteConsumptionType = (id: number) => apiClient.delete(`/v1/admin/beer/consumption-types/${id}`).then(() => undefined);

export const getPalettes = () => data<ColorPalette[]>(apiClient.get('/v1/admin/design/color-palettes'));
export const createPalette = (input: NewColorPalette) => data<ColorPalette>(apiClient.post('/v1/admin/design/color-palette', input));
export const updatePalette = (id: number, input: UpdateColorPalette) => data<ColorPalette>(apiClient.patch(`/v1/admin/design/color-palette/${id}`, input));
export const deletePalette = (id: number) => apiClient.delete(`/v1/admin/design/color-palette/${id}`).then(() => undefined);
export const getGlassware = () => data<Glassware[]>(apiClient.get('/v1/admin/design/glassware'));
export const createGlassware = (input: NewGlassware) => data<Glassware>(apiClient.post('/v1/admin/design/glassware', input));
export const updateGlassware = (id: number, input: UpdateGlassware) => data<Glassware>(apiClient.patch(`/v1/admin/design/glassware/${id}`, input));
export const deleteGlassware = (id: number) => apiClient.delete(`/v1/admin/design/glassware/${id}`).then(() => undefined);

export const getRecommendations = () => data<DefaultRecommendation[]>(apiClient.get('/v1/admin/recommendations/list'));
export const createRecommendation = (input: NewDefaultRecommendation) => data<DefaultRecommendation>(apiClient.post('/v1/admin/recommendations', input));
export const updateRecommendations = (input: RecommendationUpdate[]) => data<DefaultRecommendation[]>(apiClient.patch('/v1/admin/recommendations/edit', input));
export const deleteRecommendation = (id: number) => apiClient.delete(`/v1/admin/recommendations/${id}`).then(() => undefined);

export const getUserTypes = () => data<AlcoholType[]>(apiClient.get('/v1/admin/user-defined/alcohol/types'));
export const getUserSubtypes = (typeId: number) => data<AlcoholSubtype[]>(apiClient.get(`/v1/admin/user-defined/alcohol/types/${typeId}/subtypes`));
export const publishType = (id: number) => data<AlcoholType>(apiClient.post(`/v1/admin/user-defined/alcohol/types/${id}/publish`));
export const publishSubtype = (id: number) => data<AlcoholSubtype>(apiClient.post(`/v1/admin/user-defined/alcohol/subtypes/${id}/publish`));
export const getUserBrands = () => data<Brand[]>(apiClient.get('/v1/admin/user-defined/beer/brands'));
export const getUserFlavours = (brandId: number) => data<BeerFlavour[]>(apiClient.get(`/v1/admin/user-defined/beer/brands/${brandId}/flavours`));
export const publishBrand = (id: number) => data<Brand>(apiClient.post(`/v1/admin/user-defined/beer/brands/${id}/publish`));
export const publishFlavour = (id: number) => data<BeerFlavour>(apiClient.post(`/v1/admin/user-defined/beer/brands/flavours/${id}/publish`));

export const getVolumesByType = (typeId: number) => data<AlcoholVolume[]>(apiClient.get(`/v1/alcohol/types/${typeId}/volumes`));
