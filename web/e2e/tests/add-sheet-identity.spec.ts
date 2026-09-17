import { test, expect, type Page } from '@playwright/test';

const PALETTES = {
  green: { field: '#135E4A', inkDark: '#FFF1D6' },
  brown: { field: '#32170F', inkDark: '#F7E2BD' },
  cream: { field: '#E8D8B8', inkDark: '#24150F' },
  red: { field: '#A93327', inkDark: '#FFF0D8' },
  blue: { field: '#234E78', inkDark: '#F9EBD0' },
  plum: { field: '#713153', inkDark: '#F9E8D4' },
  amber: { field: '#D69A24', inkDark: '#26160E' },
  rose: { field: '#D99AA5', inkDark: '#25140F' },
} as const;

const paletteResponse = Object.entries(PALETTES).map(([name, palette], index) => ({
  id: index + 1,
  name,
  ...palette,
  inkLight: null,
}));

const glasswareResponse = [
  'pint', 'tulip', 'wine', 'highball', 'rocks', 'shot',
  'coupe', 'flute', 'palinka', 'beercan', 'beerbottle', 'beerjug',
].map((name, index) => ({
  id: index + 1,
  name,
  g: `M${index + 1} 4h12v40H${index + 1}Z`,
  l: `M${index + 2} 12h10v30H${index + 2}Z`,
  f: null,
}));

const rgb = (hex: string) => `rgb(${[1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)).join(', ')})`;
const menuRow = (page: Page, label: string) => page.getByRole('button', { name: new RegExp(`^${label},`) });

for (const viewport of [
  { name: 'narrow portrait', width: 375, height: 812 },
  { name: 'phone landscape', width: 812, height: 375 },
]) {
  test(`catalogue palettes follow API IDs and fallbacks in the ${viewport.name} add sheet`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/v1/design/color-palettes', (route) => route.fulfill({ json: paletteResponse }));
    await page.route('**/v1/design/glassware', (route) => route.fulfill({ json: [] }));
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

const postTo = (page: Page, pathname: string) => page.waitForRequest((request) => (
  request.method() === 'POST' && new URL(request.url()).pathname === pathname
));

const catalogueForLabel = (label: string) => (label === 'Glassware' ? glasswareResponse : paletteResponse);

const chooseDesignId = async (page: Page, label: string, id: number) => {
  const entry = catalogueForLabel(label).find((item) => item.id === id);
  if (!entry) {
    throw new Error(`No ${label} option with id ${id}`);
  }
  await page.getByLabel(label).click();
  await page.getByRole('option', { name: entry.name, exact: true }).click();
};

for (const viewport of [
  { name: 'narrow portrait', width: 375, height: 812 },
  { name: 'phone landscape', width: 812, height: 375 },
]) {
  test(`catalogue creation and recommendation design overrides use selected API IDs in the ${viewport.name} add sheet`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const alcoholTypes = [
      { id: 4, name: 'Beer', volumeIds: [10], colorPaletteId: 7, glasswareId: 4 },
    ];
    const volumes = [{ id: 10, name: 'Pint', volume: 0.5 }];
    const subtypes: { id: number; alcoholTypeId: number; name: string; colorPaletteId: number; glasswareId: number }[] = [];
    const brands: { id: number; name: string; colorPaletteId: number | null }[] = [];
    const flavours: { id: number; brandId: number; name: string; colorPaletteId: number | null }[] = [];

    await page.route('**/v1/design/color-palettes', (route) => route.fulfill({ json: paletteResponse }));
    await page.route('**/v1/design/glassware', (route) => route.fulfill({ json: glasswareResponse }));
    await page.route('**/v1/alcohol/types', async (route) => {
      if (route.request().method() === 'POST') {
        const entry = route.request().postDataJSON() as { name: string; colorPaletteId: number; glasswareId: number };
        alcoholTypes.push({ id: 100, name: entry.name, volumeIds: [], colorPaletteId: entry.colorPaletteId, glasswareId: entry.glasswareId });
        await route.fulfill({ json: alcoholTypes.at(-1) });
        return;
      }
      await route.fulfill({ json: alcoholTypes });
    });
    await page.route('**/v1/alcohol/types/*/volumes', async (route) => {
      if (route.request().method() === 'POST') {
        const entry = route.request().postDataJSON() as { name: string; volume: number };
        volumes.push({ id: 101, ...entry });
        await route.fulfill({ json: volumes.at(-1) });
        return;
      }
      await route.fulfill({ json: volumes });
    });
    await page.route('**/v1/alcohol/types/*/subtypes', async (route) => {
      if (route.request().method() === 'POST') {
        const entry = route.request().postDataJSON() as { alcoholTypeId: number; name: string; colorPaletteId: number; glasswareId: number };
        subtypes.push({ id: 102, ...entry });
        await route.fulfill({ json: subtypes.at(-1) });
        return;
      }
      await route.fulfill({ json: subtypes });
    });
    await page.route('**/v1/beer/consumption-types?*', (route) => route.fulfill({
      json: [{ id: 40, name: 'Draft', glasswareId: 5 }],
    }));
    await page.route('**/v1/beer/brands', async (route) => {
      if (route.request().method() === 'POST') {
        const entry = route.request().postDataJSON() as { name: string; colorPaletteId?: number };
        brands.push({ id: 103, name: entry.name, colorPaletteId: entry.colorPaletteId ?? null });
        await route.fulfill({ json: brands.at(-1) });
        return;
      }
      await route.fulfill({ json: brands });
    });
    await page.route('**/v1/beer/brands/103/flavours', async (route) => {
      if (route.request().method() === 'POST') {
        const entry = route.request().postDataJSON() as { name: string; colorPaletteId?: number };
        flavours.push({ id: 104, brandId: 103, name: entry.name, colorPaletteId: entry.colorPaletteId ?? null });
        await route.fulfill({ json: flavours.at(-1) });
        return;
      }
      await route.fulfill({ json: flavours });
    });
    await page.route('**/v1/drinks/new', (route) => route.fulfill({
      json: [{ id: 9001, userId: 'user-1', date: '2026-09-15', alcoholTypeId: 4, alcoholVolumeId: 10 }],
    }));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Something else', exact: true }).click();

    await menuRow(page, 'Drink').click();
    await page.getByRole('button', { name: 'New drink type', exact: true }).click();
    await page.getByLabel('Name').fill('Cider');
    await page.getByLabel('Glassware').click();
    await expect(page.getByRole('option', { name: 'beerjug', exact: true })).toHaveCount(1);
    await page.getByRole('option', { name: 'beerjug', exact: true }).click();
    await chooseDesignId(page, 'Color palette', 8);
    await expect(page.getByLabel('Color palette')).toHaveAttribute('data-value', '8');
    await expect(page.getByLabel('Glassware')).toHaveAttribute('data-value', '12');
    const newTypeRequest = postTo(page, '/v1/alcohol/types');
    await page.getByRole('button', { name: 'Add and use it', exact: true }).click();
    expect((await newTypeRequest).postDataJSON()).toEqual({ name: 'Cider', colorPaletteId: 8, glasswareId: 12 });
    await page.getByRole('button', { name: 'Back', exact: true }).click();

    await menuRow(page, 'Size').click();
    await page.getByRole('button', { name: 'New size', exact: true }).click();
    await page.getByLabel('Name').fill('Small');
    await page.getByLabel('Litres').fill('0.33');
    const newVolumeRequest = postTo(page, '/v1/alcohol/types/100/volumes');
    await page.getByRole('button', { name: 'Add and use it', exact: true }).click();
    expect((await newVolumeRequest).postDataJSON()).toEqual({ name: 'Small', volume: 0.33 });
    await page.getByRole('button', { name: 'Back', exact: true }).click();

    await menuRow(page, 'Subtype').click();
    await page.getByRole('button', { name: 'New subtype', exact: true }).click();
    await page.getByLabel('Name').fill('Dry');
    await expect(page.getByLabel('Color palette')).toHaveAttribute('data-value', '');
    const subtypeGlassware = page.getByLabel('Glassware');
    await subtypeGlassware.click();
    await page.getByRole('option', { name: 'tulip', exact: true }).click();
    await expect(subtypeGlassware).toHaveAttribute('data-value', '2');
    const newSubtypeRequest = postTo(page, '/v1/alcohol/types/100/subtypes');
    await page.getByRole('button', { name: 'Add and use it', exact: true }).click();
    expect((await newSubtypeRequest).postDataJSON()).toEqual({
      alcoholTypeId: 100,
      name: 'Dry',
      glasswareId: 2,
    });
    await page.getByRole('button', { name: 'Back', exact: true }).click();

    await menuRow(page, 'Drink').click();
    await page.getByRole('button', { name: 'Beer', exact: true }).click();
    await menuRow(page, 'Brand').click();
    await page.getByRole('button', { name: 'New brand', exact: true }).click();
    await page.getByLabel('Name').fill('Hops House');
    await expect(page.getByLabel('Color palette')).toHaveAttribute('data-value', '');
    const newBrandRequest = postTo(page, '/v1/beer/brands');
    await page.getByRole('button', { name: 'Add and use it', exact: true }).click();
    expect((await newBrandRequest).postDataJSON()).toEqual({ name: 'Hops House' });
    await page.getByRole('button', { name: 'Back', exact: true }).click();

    await menuRow(page, 'Flavour').click();
    await page.getByRole('button', { name: 'New flavour', exact: true }).click();
    await page.getByLabel('Name').fill('Crisp');
    await expect(page.getByLabel('Color palette')).toHaveAttribute('data-value', '');
    const newFlavourRequest = postTo(page, '/v1/beer/brands/103/flavours');
    await page.getByRole('button', { name: 'Add and use it', exact: true }).click();
    expect((await newFlavourRequest).postDataJSON()).toEqual({ name: 'Crisp' });
    await page.getByRole('button', { name: 'Back', exact: true }).click();

    await menuRow(page, 'Size').click();
    await page.getByRole('button', { name: 'Pint (0.5L)', exact: true }).click();
    await menuRow(page, 'Served').click();
    await page.getByRole('button', { name: 'Draft', exact: true }).click();
    await menuRow(page, 'Recommend').click();
    const recommendationToggle = page.getByLabel('Add as a recommendation');
    await recommendationToggle.focus();
    await page.keyboard.press('Space');
    await expect(recommendationToggle).toBeChecked();
    await chooseDesignId(page, 'Color palette', 5);
    await chooseDesignId(page, 'Glassware', 6);
    const saveRequest = postTo(page, '/v1/drinks/new');
    await page.getByRole('button', { name: 'Save drink', exact: true }).click();
    expect((await saveRequest).postDataJSON()).toMatchObject({
      alcoholTypeId: 4,
      alcoholVolumeId: 10,
      brandId: 103,
      beerFlavourId: 104,
      consumptionTypeId: 40,
      colorPaletteId: 5,
      glasswareId: 6,
      addToRecommendations: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
  });
}
