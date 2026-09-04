// API Types based on OpenAPI schema

export interface Drink {
  userId: string; // uuid
  date: string;
  alcoholTypeId: number;
  alcoholSubtypeId?: number;
  alcoholVolumeId: number;
  brandId?: number;
  beerFlavourId?: number;
  consumptionTypeId?: number;
  comments?: string;
  quantity?: number; // 1-9, for batch insert
  addToRecommendations?: boolean;
  onlyTemporarily?: boolean;
  name?: string;
}

export interface SavedDrink extends Drink {
  id: number;
}

export interface Brand {
  id: number;
  userId?: string;
  name: string;
}

export interface AlcoholType {
  id: number;
  userId?: string;
  name: string;
  volumeIds: number[];
}

export interface AlcoholVolume {
  id: number;
  name: string;
  volume: number;
}

export interface NewAlcoholEntry {
  userId?: string;
  name: string;
  volumes?: NewVolumeEntry[];
  alcoholSubtypes?: string[];
}

export interface NewVolumeEntry {
  name: string;
  volume: number;
}

export interface Recommendation {
  id: number;
  userId: string;
  name: string;
  alcoholTypeId: number;
  alcoholSubtypeId?: number;
  alcoholVolumeId: number;
  brandId?: number;
  beerFlavourId?: number;
  consumptionTypeId?: number;
}

export interface ConsumptionType {
  id: number;
  name: string;
}

// Navigation state types
export interface ErrorPageState {
  message: string;
}

export interface SuccessPageState {
  message: string;
}

export interface NewVolumePageState {
  alcoholTypeId: number;
  alcoholTypeName: string;
}

export interface NewSubtypePageState {
  alcoholTypeId: number;
  alcoholTypeName: string;
}

export interface NewBeerFlavourPageState {
  brandId: number;
  brandName: string;
}

// Alcohol subtype types
export interface AlcoholSubtype {
  id: number;
  alcoholTypeId: number;
  userId?: string;
  name: string;
}

export interface NewAlcoholSubtype {
  alcoholTypeId: number;
  userId?: string;
  name: string;
}

// Beer flavour types
export interface BeerFlavour {
  id: number;
  brandId: number;
  userId?: string;
  name: string;
}

export interface NewBeerFlavour {
  userId?: string;
  name: string;
}

// Editable drink (for history view)
export interface EditableDrink {
  id: number;
  name: string;
  alcoholTypeId: number;
}

// New beer brand with flavours
export interface NewBeerBrand {
  name: string;
  flavours?: string[];
}

// Helper to check if a recommendation is for beer
export const isBeerRecommendation = (rec: Recommendation): boolean => {
  return rec.brandId !== undefined && rec.brandId !== null && rec.brandId > 0;
};
