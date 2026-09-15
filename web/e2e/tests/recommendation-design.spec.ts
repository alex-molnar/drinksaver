import { test, expect } from '@playwright/test';

const palettes = [
  { id: 1, name: 'green', field: '#135E4A', inkDark: '#FFF1D6', inkLight: null },
  { id: 2, name: 'brown', field: '#32170F', inkDark: '#F7E2BD', inkLight: null },
  { id: 3, name: 'cream', field: '#E8D8B8', inkDark: '#24150F', inkLight: null },
  { id: 4, name: 'red', field: '#A93327', inkDark: '#FFF0D8', inkLight: null },
  { id: 5, name: 'blue', field: '#234E78', inkDark: '#F9EBD0', inkLight: null },
  { id: 6, name: 'plum', field: '#713153', inkDark: '#F9E8D4', inkLight: null },
  { id: 7, name: 'amber', field: '#D69A24', inkDark: '#26160E', inkLight: null },
  { id: 8, name: 'rose', field: '#D99AA5', inkDark: '#25140F', inkLight: null },
];

const glasswareNames = [
  'pint', 'tulip', 'wine', 'highball', 'rocks', 'shot',
  'coupe', 'flute', 'palinka', 'beercan', 'beerbottle', 'beerjug',
] as const;
const glassware = glasswareNames.map((name, index) => ({
  id: index + 1,
  name,
  g: `M${index + 1} 4h12v40H${index + 1}Z`,
  l: `M${index + 2} 12h10v30H${index + 2}Z`,
  f: name === 'pint' || name === 'tulip' || name === 'beerjug' ? 'M8 8h18v5H8Z' : null,
}));

const designs = [
  { colorPaletteId: 1, glasswareId: 1 },
  { colorPaletteId: 2, glasswareId: 2 },
  { colorPaletteId: 3, glasswareId: 3 },
  { colorPaletteId: 4, glasswareId: 4 },
  { colorPaletteId: 5, glasswareId: 5 },
  { colorPaletteId: 6, glasswareId: 6 },
  { colorPaletteId: 7, glasswareId: 7 },
  { colorPaletteId: 8, glasswareId: 8 },
  { colorPaletteId: 7, glasswareId: 9 },
  { colorPaletteId: 7, glasswareId: 10 },
  { colorPaletteId: 2, glasswareId: 11 },
  { colorPaletteId: 3, glasswareId: 12 },
  { colorPaletteId: 999, glasswareId: 999 },
];

const fallbackPalette = palettes.find((palette) => palette.name === 'cream')!;
const rgb = (hex: string) => `rgb(${[1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)).join(', ')})`;

for (const width of [375, 768]) {
  test(`recommendation tiles use fetched palette and glassware definitions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    const recommendations = designs.map(({ colorPaletteId, glasswareId }, i) => ({
      id: i + 1,
      userId: '423c91e4-491f-4f82-aba6-3c982857e0e4',
      name: `Runtime design ${i + 1}`,
      alcoholTypeId: 4,
      alcoholVolumeId: 1,
      colorPaletteId,
      glasswareId,
    }));

    await page.route('**/v1/design/color-palettes', (route) => route.fulfill({ json: palettes }));
    await page.route('**/v1/design/glassware', (route) => route.fulfill({ json: glassware }));
    await page.route('**/v1/recommendations/list', (route) => route.fulfill({ json: recommendations }));
    await page.goto('/');

    for (const [i, ids] of designs.entries()) {
      const tile = page.getByRole('button', { name: recommendations[i].name, exact: true });
      const palette = palettes.find((item) => item.id === ids.colorPaletteId) ?? fallbackPalette;
      const shape = glassware.find((item) => item.id === ids.glasswareId);
      await tile.scrollIntoViewIfNeeded();
      await expect(tile).toHaveCSS('background-color', rgb(palette.field));
      await expect(tile).toHaveCSS('color', rgb(palette.inkDark));
      await expect(tile.getByTestId(`glass-${shape?.name ?? 'highball'}`)).toBeVisible();
    }

    const firstGlass = page
      .getByRole('button', { name: recommendations[0].name, exact: true })
      .locator('svg');
    await expect(firstGlass).toHaveAttribute('data-glassware-id', '1');
    await expect(firstGlass.locator('path').last()).toHaveAttribute('d', glassware[0].g);

    const add = page.getByRole('button', { name: 'Something else', exact: true });
    await add.scrollIntoViewIfNeeded();
    await expect(add).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}
