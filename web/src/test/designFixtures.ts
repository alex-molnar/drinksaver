import { createDesignCatalogue } from '../drink/designCatalogue';
import type { ColorPalette, Glassware } from '../types/api';

export const TEST_PALETTES: readonly ColorPalette[] = [
  { id: 1, name: 'green', field: '#2B7454', inkDark: '#F4E9CE', inkLight: null },
  { id: 2, name: 'brown', field: '#2B1A13', inkDark: '#EBD9B4', inkLight: null },
  { id: 3, name: 'cream', field: '#DFD1B0', inkDark: '#2B1A14', inkLight: null },
  { id: 4, name: 'red', field: '#BA422C', inkDark: '#F9EDD4', inkLight: null },
  { id: 5, name: 'blue', field: '#2C4B6E', inkDark: '#EFE2C8', inkLight: null },
  { id: 6, name: 'plum', field: '#6B3350', inkDark: '#F2E4CE', inkLight: null },
  { id: 7, name: 'amber', field: '#C9973B', inkDark: '#2B1A14', inkLight: null },
  { id: 8, name: 'rose', field: '#D4A0A7', inkDark: '#2B1A14', inkLight: null },
];

const GLASSWARE_NAMES = [
  'pint',
  'tulip',
  'wine',
  'highball',
  'rocks',
  'shot',
  'coupe',
  'flute',
  'palinka',
  'beercan',
  'beerbottle',
  'beerjug',
] as const;

export const TEST_GLASSWARE: readonly Glassware[] = GLASSWARE_NAMES.map((name, index) => ({
  id: index + 1,
  name,
  g: 'M10 4h14v42H10Z',
  l: 'M12 12h10v32H12Z',
  f: name === 'pint' || name === 'tulip' || name === 'beerjug' ? 'M10 8h14v4H10Z' : null,
}));

export const TEST_DESIGN = createDesignCatalogue(TEST_PALETTES, TEST_GLASSWARE);
export const TEST_PALETTE_BY_NAME = Object.fromEntries(
  TEST_PALETTES.map((palette) => [palette.name, palette]),
) as Readonly<Record<string, ColorPalette>>;
