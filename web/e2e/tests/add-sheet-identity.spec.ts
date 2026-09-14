import { test, expect, type Page } from '@playwright/test';
import { PALETTES } from '../../src/drink/identity';

const rgb = (hex: string) => `rgb(${[1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)).join(', ')})`;
const menuRow = (page: Page, label: string) => page.getByRole('button', { name: new RegExp(`^${label},`) });

for (const viewport of [
  { name: 'narrow portrait', width: 375, height: 812 },
  { name: 'phone landscape', width: 812, height: 375 },
]) {
  test(`drink and brand palettes follow API IDs in the ${viewport.name} add sheet`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/v1/alcohol/types', (route) => route.fulfill({
      json: [
        { id: 1, name: 'Beer', volumeIds: [], colorPaletteId: 1 },
        { id: 2, name: 'Wine', volumeIds: [], colorPaletteId: 6 },
        { id: 3, name: 'Custom', volumeIds: [], colorPaletteId: 999 },
      ],
    }));
    await page.route('**/v1/beer/brands', (route) => route.fulfill({
      json: [
        { id: 50, name: 'Heineken', colorPaletteId: 1 },
        { id: 51, name: 'Guinness', colorPaletteId: 2 },
      ],
    }));

    await page.goto('/');
    const add = page.getByRole('button', { name: 'Something else', exact: true });
    await add.scrollIntoViewIfNeeded();
    await add.click();

    await menuRow(page, 'Drink').click();
    const beer = page.getByRole('button', { name: 'Beer', exact: true });
    const wine = page.getByRole('button', { name: 'Wine', exact: true });
    const custom = page.getByRole('button', { name: 'Custom', exact: true });
    await expect(beer.locator('[data-color-palette-id="1"]')).toHaveCSS('background-color', rgb(PALETTES.green.field));
    await expect(wine.locator('[data-color-palette-id="6"]')).toHaveCSS('background-color', rgb(PALETTES.plum.field));
    await expect(custom.locator('[data-color-palette-id="999"]')).toHaveCSS('background-color', rgb(PALETTES.cream.field));

    await beer.click();
    await expect(menuRow(page, 'Drink').locator('[data-color-palette-id="1"]')).toHaveCSS('background-color', rgb(PALETTES.green.field));

    await menuRow(page, 'Brand').click();
    const heineken = page.getByRole('button', { name: 'Heineken', exact: true });
    const guinness = page.getByRole('button', { name: 'Guinness', exact: true });
    await expect(heineken.locator('[data-color-palette-id="1"]')).toHaveCSS('background-color', rgb(PALETTES.green.field));
    await expect(guinness.locator('[data-color-palette-id="2"]')).toHaveCSS('background-color', rgb(PALETTES.brown.field));

    await guinness.click();
    await expect(menuRow(page, 'Brand')).toHaveAccessibleName('Brand, Guinness');
    await expect(menuRow(page, 'Brand').locator('[data-color-palette-id="2"]')).toHaveCSS('background-color', rgb(PALETTES.brown.field));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
  });
}
