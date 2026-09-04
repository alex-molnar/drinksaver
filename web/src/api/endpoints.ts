import apiClient, { getCurrentUserId } from './client';
import type {
  Drink,
  SavedDrink,
  Brand,
  AlcoholType,
  AlcoholVolume,
  AlcoholSubtype,
  NewAlcoholEntry,
  NewVolumeEntry,
  Recommendation,
  ConsumptionType,
  BeerFlavour,
  NewBeerBrand,
  EditableDrink,
} from '../types/api';

// Drinks endpoints
export const saveDrink = async (drink: Omit<Drink, 'userId' | 'date'> & { date?: string }): Promise<SavedDrink> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const payload: Drink = {
    ...drink,
    userId: userId,
    date: drink.date || new Date().toISOString().split('T')[0],
  };
  const response = await apiClient.post<SavedDrink>('/v1/drinks/new', payload);
  return response.data;
};

// Recommendations endpoints
export const getRecommendations = async (): Promise<Recommendation[]> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');
  
  const response = await apiClient.get<Recommendation[]>(`/v1/recommendations/${userId}/list`);
  return response.data;
};

// Alcohol endpoints
export const getAlcoholTypes = async (): Promise<AlcoholType[]> => {
  const userId = getCurrentUserId();
  const response = await apiClient.get<AlcoholType[]>('/v1/alcohol/types', {
    params: { userId },
  });
  return response.data;
};

export const createAlcoholType = async (entry: Omit<NewAlcoholEntry, 'userId'>): Promise<AlcoholType> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const payload: NewAlcoholEntry = {
    ...entry,
    userId,
  };
  const response = await apiClient.post<AlcoholType>('/v1/alcohol/types', payload);
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
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const response = await apiClient.get<AlcoholSubtype[]>(
    `/v1/alcohol/types/${alcoholTypeId}/subtypes`,
    { params: { userId } }
  );
  return response.data;
};

export const createSubtypeForAlcoholType = async (
  alcoholTypeId: number,
  name: string
): Promise<AlcoholSubtype> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const response = await apiClient.post<AlcoholSubtype>(
    `/v1/alcohol/types/${alcoholTypeId}/subtypes`,
    { alcoholTypeId, userId, name }
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
  const userId = getCurrentUserId();
  const response = await apiClient.get<Brand[]>('/v1/beer/brands', {
    params: { userId },
  });
  return response.data;
};

export const createBrand = async (brand: NewBeerBrand): Promise<Brand> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const response = await apiClient.post<Brand>(`/v1/beer/${userId}/brands`, brand);
  return response.data;
};

export const getBeerFlavours = async (brandId: number): Promise<BeerFlavour[]> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const response = await apiClient.get<BeerFlavour[]>(
    `/v1/beer/brands/${brandId}/flavours`,
    { params: { userId } }
  );
  return response.data;
};

export const createBeerFlavour = async (brandId: number, name: string): Promise<BeerFlavour> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const response = await apiClient.post<BeerFlavour>(
    `/v1/beer/brands/${brandId}/flavours`,
    { userId, name }
  );
  return response.data;
};

// History/Consumption endpoints
export const getSavedDrinksByDate = async (date: string): Promise<EditableDrink[]> => {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('User not authenticated');

  const response = await apiClient.get<EditableDrink[]>(
    `/v1/drinks/${userId}/date/${date}`
  );
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
