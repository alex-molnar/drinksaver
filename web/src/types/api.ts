// API Types based on OpenAPI schema

/**
 * The wire shape of a saved drink. `userId` is set by the backend from the JWT
 * subject, so it is present on responses (see SavedDrink) and never sent on a
 * request: the request payload is Omit<Drink, 'userId'>.
 */
export interface Drink {
  userId: string; // uuid
  date: string;
  alcoholTypeId: number;
  alcoholSubtypeId?: number;
  alcoholVolumeId: number;
  brandId?: number;
  beerFlavourId?: number;
  consumptionTypeId?: number;
  colorPaletteId?: number | null;
  glasswareId?: number | null;
  comments?: string;
  quantity?: number; // 1-100, rejected with a 400 outside that
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
  colorPaletteId?: number | null;
}

export interface AlcoholType {
  id: number;
  userId?: string;
  name: string;
  volumeIds: number[];
  colorPaletteId: number;
  glasswareId: number;
}

export interface AlcoholVolume {
  id: number;
  name: string;
  volume: number;
}

export interface NewAlcoholEntry {
  name: string;
  volumes?: NewVolumeEntry[];
  alcoholSubtypes?: string[];
  colorPaletteId?: number | null;
  glasswareId?: number | null;
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
  colorPaletteId?: number | null;
  glasswareId?: number | null;
}

export interface ConsumptionType {
  id: number;
  name: string;
  glasswareId: number;
}

export interface ColorPalette {
  id: number;
  name: string;
  field: string;
  inkLight: string | null;
  inkDark: string;
}

export interface Glassware {
  id: number;
  name: string;
  g: string;
  l: string;
  f: string | null;
}

// Alcohol subtype types
export interface AlcoholSubtype {
  id: number;
  alcoholTypeId: number;
  userId?: string;
  name: string;
  colorPaletteId?: number | null;
  glasswareId?: number | null;
}

export interface NewAlcoholSubtype {
  alcoholTypeId: number;
  name: string;
  colorPaletteId?: number | null;
  glasswareId?: number | null;
}

// Beer flavour types
export interface BeerFlavour {
  id: number;
  brandId: number;
  userId?: string;
  name: string;
  colorPaletteId?: number | null;
}

export interface NewBeerFlavour {
  name: string;
  colorPaletteId?: number | null;
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
  colorPaletteId?: number | null;
}
