import type { DesignCatalogue } from './designCatalogue';
import type { ColorPalette, Glassware } from '../types/api';

export interface DrinkIdentity extends Pick<ColorPalette, 'field' | 'inkDark' | 'inkLight'> {
  readonly glassware: Glassware;
  /** Decorative liquid colour; current plate and history silhouettes render in flat ink. */
  readonly chroma: string;
}

interface DrinkIdentitySpec {
  readonly palette: string;
  readonly glassware: string;
  readonly chroma: string;
}

/**
 * Legacy display-name associations used by History, whose response still lacks design IDs.
 * Palette values and SVG paths are deliberately absent: their names are resolved against the
 * live design catalogue, so editing either definition on the backend needs no frontend deploy.
 */
export const DRINK_IDENTITY_SPECS: Readonly<Record<string, DrinkIdentitySpec>> = {
  'Heineken pint': { palette: 'green', glassware: 'palinka', chroma: '#E0A828' },
  'Guinness pint': { palette: 'brown', glassware: 'pint', chroma: '#7A2E12' },
  'Duvel bottle': { palette: 'cream', glassware: 'tulip', chroma: '#E8C04A' },
  'Chouffe bottle': { palette: 'red', glassware: 'tulip', chroma: '#D9903A' },
  'Gin and tonic': { palette: 'blue', glassware: 'highball', chroma: '#BFD8D0' },
  'Glass of red': { palette: 'plum', glassware: 'wine', chroma: '#7A1F32' },
};

/**
 * The History API currently supplies only an alcohol type ID, not the saved design IDs. Keep its
 * old category fallback in names rather than SVG data; each name still resolves to a live backend
 * definition. This table can disappear once EditableDrink includes colorPaletteId/glasswareId.
 */
const GLASSWARE_BY_ALCOHOL_TYPE: Readonly<Record<number, string>> = {
  4: 'pint', 21: 'pint', 24: 'pint',
  13: 'wine', 14: 'wine', 19: 'wine', 20: 'wine', 22: 'wine',
  26: 'wine', 27: 'wine', 30: 'wine', 31: 'wine', 32: 'wine',
  6: 'highball', 7: 'highball', 8: 'highball', 9: 'highball', 10: 'highball',
  11: 'highball', 12: 'highball', 15: 'highball', 16: 'highball', 17: 'highball',
  18: 'highball', 23: 'highball', 25: 'highball', 28: 'highball', 29: 'highball',
};

const DEFAULT_CHROMA = '#A69A88';
const HISTORY_FALLBACK_PALETTE = {
  field: '#2E1C17',
  inkDark: '#F2E4CE',
  inkLight: null,
};

export const drinkIdentity = (
  name: string,
  alcoholTypeId: number | undefined,
  design: DesignCatalogue,
): DrinkIdentity => {
  const exact = DRINK_IDENTITY_SPECS[name];
  if (exact) {
    return {
      ...design.paletteForName(exact.palette),
      glassware: design.glasswareForName(exact.glassware),
      chroma: exact.chroma,
    };
  }

  const glasswareName = alcoholTypeId === undefined
    ? undefined
    : GLASSWARE_BY_ALCOHOL_TYPE[alcoholTypeId];

  return {
    ...HISTORY_FALLBACK_PALETTE,
    glassware: design.glasswareForName(glasswareName),
    chroma: DEFAULT_CHROMA,
  };
};
