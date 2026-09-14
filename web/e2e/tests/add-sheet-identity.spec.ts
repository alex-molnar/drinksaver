import { test, expect, type Page } from '@playwright/test';
import { PALETTES } from '../../src/drink/identity';

const rgb = (hex: string) => `rgb(${[1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)).join(', ')})`;
const menuRow = (page: Page, label: string) => page.getByRole('button', { name: new RegExp(`^${label},`) });

for (const viewport of [
  { name: 'narrow portrait', width: 375, height: 812 },
  { name: 'phone landscape', width: 812, height: 375 },
]) {
  test(`catalogue palettes follow API IDs and fallbacks in the ${viewport.name} add sheet`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/v1/alcohol/types', (route) => route.fulfill({
      json: [
        { id: 1, name: 'Beer', volumeIds: [10], colorPaletteId: 7, glasswareId: 4 },
        { id: 2, name: 'Wine', volumeIds: [10], colorPaletteId: 6, glasswareId: 3 },
        { id: 3, name: 'Custom', volumeIds: [10], colorPaletteId: 999, glasswareId: 4 },
      ],
    }));
    await page.route('**/v1/alcohol/types/1/volumes', (route) => route.fulfill({
      json: [{ id: 10, name: 'Pint', volume: 0.5 }],
    }));
    await page.route('**/v1/alcohol/types/2/subtypes', (route) => route.fulfill({
      json: [
        { id: 30, alcoholTypeId: 2, name: 'Red', colorPaletteId: 4, glasswareId: 8 },
        { id: 31, alcoholTypeId: 2, name: 'White', colorPaletteId: null, glasswareId: 3 },
      ],
    }));
    await page.route('**/v1/beer/consumption-types?*', (route) => route.fulfill({
      json: [{ id: 40, name: 'Draft', glasswareId: 5 }],
    }));
    await page.route('**/v1/beer/brands', (route) => route.fulfill({
      json: [
        { id: 50, name: 'Heineken', colorPaletteId: 1 },
        { id: 51, name: 'Guinness', colorPaletteId: 2 },
        { id: 52, name: 'House lager', colorPaletteId: null },
      ],
    }));
    await page.route('**/v1/beer/brands/51/flavours', (route) => route.fulfill({
      json: [
        { id: 60, brandId: 51, name: 'Stout', colorPaletteId: 7 },
        { id: 61, brandId: 51, name: 'Classic', colorPaletteId: null },
      ],
    }));
    await page.route('**/v1/drinks/new', (route) => route.fulfill({
      json: [{ id: 9001, userId: 'user-1', date: '2026-09-14', alcoholTypeId: 1, alcoholVolumeId: 10 }],
    }));

    await page.goto('/');
    const add = page.getByRole('button', { name: 'Something else', exact: true });
    await add.scrollIntoViewIfNeeded();
    await add.click();

    await menuRow(page, 'Drink').click();
    const beer = page.getByRole('button', { name: 'Beer', exact: true });
    const wine = page.getByRole('button', { name: 'Wine', exact: true });
    const custom = page.getByRole('button', { name: 'Custom', exact: true });
    await expect(beer.locator('[data-color-palette-id="7"]')).toHaveCSS('background-color', rgb(PALETTES.amber.field));
    await expect(wine.locator('[data-color-palette-id="6"]')).toHaveCSS('background-color', rgb(PALETTES.plum.field));
    await expect(custom.locator('[data-color-palette-id="999"]')).toHaveCSS('background-color', rgb(PALETTES.cream.field));

    await wine.click();
    await menuRow(page, 'Subtype').click();
    await expect(page.getByRole('button', { name: 'Red', exact: true }).locator('[data-color-palette-id="4"]'))
      .toHaveCSS('background-color', rgb(PALETTES.red.field));
    await expect(page.getByRole('button', { name: 'White', exact: true }).locator('[data-color-palette-id="6"]'))
      .toHaveCSS('background-color', rgb(PALETTES.plum.field));
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await menuRow(page, 'Drink').click();

    await beer.click();
    await expect(menuRow(page, 'Drink').locator('[data-color-palette-id="7"]')).toHaveCSS('background-color', rgb(PALETTES.amber.field));

    await menuRow(page, 'Brand').click();
    const heineken = page.getByRole('button', { name: 'Heineken', exact: true });
    const guinness = page.getByRole('button', { name: 'Guinness', exact: true });
    const houseLager = page.getByRole('button', { name: 'House lager', exact: true });
    await expect(heineken.locator('[data-color-palette-id="1"]')).toHaveCSS('background-color', rgb(PALETTES.green.field));
    await expect(guinness.locator('[data-color-palette-id="2"]')).toHaveCSS('background-color', rgb(PALETTES.brown.field));
    await expect(houseLager.locator('[data-color-palette-id="7"]')).toHaveCSS('background-color', rgb(PALETTES.amber.field));

    await guinness.click();
    await expect(menuRow(page, 'Brand')).toHaveAccessibleName('Brand, Guinness');
    await expect(menuRow(page, 'Brand').locator('[data-color-palette-id="2"]')).toHaveCSS('background-color', rgb(PALETTES.brown.field));

    await menuRow(page, 'Flavour').click();
    await expect(page.getByRole('button', { name: 'Stout', exact: true }).locator('[data-color-palette-id="7"]'))
      .toHaveCSS('background-color', rgb(PALETTES.amber.field));
    await expect(page.getByRole('button', { name: 'Classic', exact: true }).locator('[data-color-palette-id="2"]'))
      .toHaveCSS('background-color', rgb(PALETTES.brown.field));
    await page.getByRole('button', { name: 'Back', exact: true }).click();

    await menuRow(page, 'Size').click();
    await page.getByRole('button', { name: 'Pint (0.5L)', exact: true }).click();
    await menuRow(page, 'Served').click();
    await page.getByRole('button', { name: 'Draft', exact: true }).click();

    const saveRequest = page.waitForRequest('**/v1/drinks/new');
    await page.getByRole('button', { name: 'Save drink', exact: true }).click();
    const savedPayload = (await saveRequest).postDataJSON();
    expect(savedPayload).toMatchObject({ colorPaletteId: 2, glasswareId: 5 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
  });
}
