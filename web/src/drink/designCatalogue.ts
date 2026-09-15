import type { ColorPalette, Glassware } from '../types/api';

/**
 * The only built-in visual definitions. They keep the UI legible while design data is loading,
 * when either endpoint is unavailable, or when another response refers to an unknown design ID.
 * Every configured palette and silhouette otherwise comes from the backend.
 */
export const FALLBACK_PALETTE: ColorPalette = {
  id: 0,
  name: 'cream',
  field: '#DFD1B0',
  inkDark: '#2B1A14',
  inkLight: null,
};

export const FALLBACK_GLASSWARE: Glassware = {
  id: 0,
  name: 'highball',
  g: 'M10 4h14v39a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3Z',
  l: 'M11.4 13.6h11.2v28.9a1.5 1.5 0 0 1-1.5 1.4h-8.2a1.5 1.5 0 0 1-1.5-1.4Z',
  f: null,
};

export interface DesignCatalogue {
  palettes: readonly ColorPalette[];
  glassware: readonly Glassware[];
  paletteForId: (id?: number | null) => ColorPalette;
  paletteForName: (name?: string | null) => ColorPalette;
  glasswareForId: (id?: number | null) => Glassware;
  glasswareForName: (name?: string | null) => Glassware;
}

export const createDesignCatalogue = (
  palettes: readonly ColorPalette[],
  glassware: readonly Glassware[],
): DesignCatalogue => {
  const palettesById = new Map(palettes.map((palette) => [palette.id, palette]));
  const palettesByName = new Map(palettes.map((palette) => [palette.name.toLowerCase(), palette]));
  const glasswareById = new Map(glassware.map((item) => [item.id, item]));
  const glasswareByName = new Map(glassware.map((item) => [item.name.toLowerCase(), item]));
  const fallbackPalette = palettesByName.get('cream') ?? FALLBACK_PALETTE;
  const fallbackGlassware = glasswareByName.get('highball') ?? FALLBACK_GLASSWARE;

  return {
    palettes,
    glassware,
    paletteForId: (id) => palettesById.get(id ?? 0) ?? fallbackPalette,
    paletteForName: (name) => palettesByName.get(name?.toLowerCase() ?? '') ?? fallbackPalette,
    glasswareForId: (id) => glasswareById.get(id ?? 0) ?? fallbackGlassware,
    glasswareForName: (name) => glasswareByName.get(name?.toLowerCase() ?? '') ?? fallbackGlassware,
  };
};

export const FALLBACK_DESIGN_CATALOGUE = createDesignCatalogue([], []);
