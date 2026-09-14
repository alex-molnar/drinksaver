import { test, expect } from '@playwright/test';
import { PALETTES, type GlassKind, type PaletteKey } from '../../src/drink/identity';

// API contract fixtures: every design ID, with composed labels instead of prototype names.
const designs: { colorPaletteId: number; glasswareId: number; palette: PaletteKey; glass: GlassKind }[] = [
  { colorPaletteId: 1, glasswareId: 1, palette: 'green', glass: 'pint' },
  { colorPaletteId: 2, glasswareId: 2, palette: 'brown', glass: 'tulip' },
  { colorPaletteId: 3, glasswareId: 3, palette: 'cream', glass: 'wine' },
  { colorPaletteId: 4, glasswareId: 4, palette: 'red', glass: 'highball' },
  { colorPaletteId: 5, glasswareId: 5, palette: 'blue', glass: 'rocks' },
  { colorPaletteId: 6, glasswareId: 6, palette: 'plum', glass: 'shot' },
  { colorPaletteId: 7, glasswareId: 7, palette: 'amber', glass: 'coupe' },
  { colorPaletteId: 8, glasswareId: 8, palette: 'rose', glass: 'flute' },
  { colorPaletteId: 7, glasswareId: 9, palette: 'amber', glass: 'palinka' },
  { colorPaletteId: 7, glasswareId: 10, palette: 'amber', glass: 'beercan' },
  { colorPaletteId: 2, glasswareId: 11, palette: 'brown', glass: 'beerbottle' },
  { colorPaletteId: 3, glasswareId: 12, palette: 'cream', glass: 'beerjug' },
  { colorPaletteId: 999, glasswareId: 999, palette: 'cream', glass: 'highball' },
];

const rgb = (hex: string) => `rgb(${[1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)).join(', ')})`;

for (const width of [375, 768]) {
  test(`recommendation tiles use API palette and glassware IDs at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    const recommendations = designs.map(({ colorPaletteId, glasswareId }, i) => ({
      id: i + 1,
      userId: '423c91e4-491f-4f82-aba6-3c982857e0e4',
      name: i === 9 ? 'Heineken pint' : `Custom pálinka ${i + 1} (Small glass - 0.05l)`,
      alcoholTypeId: 4,
      alcoholVolumeId: 1,
      colorPaletteId,
      glasswareId,
    }));
    await page.route('**/v1/recommendations/list', (route) => route.fulfill({ json: recommendations }));
    await page.goto('/');

    for (const [i, { palette, glass }] of designs.entries()) {
      const tile = page.getByRole('button', { name: recommendations[i].name, exact: true });
      await tile.scrollIntoViewIfNeeded();
      await expect(tile).toHaveCSS('background-color', rgb(PALETTES[palette].field));
      await expect(tile).toHaveCSS('color', rgb(PALETTES[palette].inkDark));
      await expect(tile.getByTestId(`glass-${glass}`)).toBeVisible();
    }

    const add = page.getByRole('button', { name: 'Something else', exact: true });
    await add.scrollIntoViewIfNeeded();
    await expect(add).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}
