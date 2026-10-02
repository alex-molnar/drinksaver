export interface AlcoholType {
  id: number;
  userId?: string;
  name: string;
  volumeIds?: number[];
  colorPaletteId: number | null;
  glasswareId: number | null;
}

export interface AlcoholSubtype {
  id: number;
  alcoholTypeId: number;
  userId?: string;
  name: string;
  colorPaletteId: number | null;
  glasswareId: number | null;
}

export interface Brand {
  id: number;
  userId?: string;
  name: string;
  colorPaletteId: number | null;
}

export interface BeerFlavour {
  id: number;
  brandId: number;
  userId?: string;
  name: string;
  colorPaletteId: number | null;
}

export interface AlcoholVolume {
  id: number;
  name: string;
  volume: number;
}

export interface ConsumptionType {
  id: number;
  name: string;
  glasswareId: number | null;
}

export interface ColorPalette {
  id: number;
  name: string;
  field: string;
  inkLight: string | null;
  inkDark: string | null;
}

export interface Glassware {
  id: number;
  name: string;
  g: string;
  l: string;
  f: string | null;
}

export interface DefaultRecommendation {
  id: number;
  name: string;
  alcoholTypeId: number;
  alcoholSubtypeId: number | null;
  alcoholVolumeId: number | null;
  brandId: number | null;
  beerFlavourId: number | null;
  consumptionTypeId: number | null;
  colorPaletteId: number;
  glasswareId: number;
  orderNumber: number;
}

export interface NewAlcoholType {
  name: string;
  colorPaletteId: number;
  glasswareId: number;
  alcoholSubtypes?: string[];
}

export interface NewAlcoholSubtype {
  name: string;
  colorPaletteId: number;
  glasswareId: number;
}

export interface NewBrand {
  name: string;
  colorPaletteId: number;
  flavours?: string[];
}

export interface NewBeerFlavour {
  name: string;
  colorPaletteId: number;
}

export interface NewConsumptionType {
  name: string;
  glasswareId: number;
}

export interface NewColorPalette {
  name: string;
  field: string;
  inkLight?: string;
  inkDark?: string;
}

export interface UpdateColorPalette {
  name?: string;
  field?: string;
  inkLight?: string;
  inkDark?: string;
}

export interface NewGlassware {
  name: string;
  g: string;
  l: string;
  f?: string;
}

export interface UpdateGlassware {
  name?: string;
  g?: string;
  l?: string;
  f?: string;
}

export interface NewDefaultRecommendation {
  name: string;
  alcoholTypeId: number;
  alcoholSubtypeId?: number;
  alcoholVolumeId?: number;
  brandId?: number;
  beerFlavourId?: number;
  consumptionTypeId?: number;
  colorPaletteId: number;
  glasswareId: number;
}

export interface RecommendationUpdate {
  id: number;
  name: string;
}
