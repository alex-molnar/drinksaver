import { test, expect, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * IOS-002: freeze the visual reference catalogue for the native iOS parity work.
 *
 * Drives the frozen web baseline (served by the isolated `drinksaver-ios-ref` compose
 * project built from commit 28c33fde) through a real Keycloak session. Captures each
 * state/theme/viewport as a 3x sRGB PNG only with IOS_REFERENCE_REGENERATE=1; ordinary runs
 * validate the committed catalogue without changing it. API fixtures and a fixed clock keep
 * the data deterministic without writing to the backend. See ios/Reference/README.md.
 */

// Freeze browser formatting and rasterization to match the committed catalogue.
test.use({ deviceScaleFactor: 3, locale: 'en-GB', timezoneId: 'Europe/Amsterdam' });

const DEV_USER_ID = '423c91e4-491f-4f82-aba6-3c982857e0e4';

// 14:00 in Amsterdam (UTC+02:00), safely after the 06:00 drinking-day rollover.
const FIXED_TIME = new Date('2026-09-10T12:00:00.000Z');

const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 375, height: 812 },
  { width: 440, height: 956 },
] as const;

const THEMES = ['dark', 'light'] as const;
type Theme = (typeof THEMES)[number];

const STATE_IDS = [
  'quick-ready',
  'quick-loading',
  'quick-error',
  'history-populated',
  'history-empty',
  'history-error',
  'recs-ready',
  'recs-empty',
  'recs-error',
  'add-root',
] as const;
type StateId = (typeof STATE_IDS)[number];

interface ReferenceCase {
  id: string;
  state: StateId;
  theme: Theme;
  width: number;
  height: number;
}

const referenceCases: ReferenceCase[] = STATE_IDS.flatMap((state) =>
  THEMES.flatMap((theme) =>
    VIEWPORTS.map(({ width, height }) => ({
      id: `${state}-${theme}-${width}x${height}`,
      state,
      theme,
      width,
      height,
    })),
  ),
);

// Fixtures mirror deploy/local/seed.sql so the reference matches the frozen demo data.
const COLOR_PALETTES = [
  { id: 1, name: 'green', field: '#2B7454', inkDark: '#F4E9CE', inkLight: '#FFF6E3' },
  { id: 2, name: 'brown', field: '#2B1A13', inkDark: '#EBD9B4', inkLight: '#FFF3DA' },
  { id: 3, name: 'cream', field: '#DFD1B0', inkDark: '#2B1A14', inkLight: '#3B241B' },
  { id: 4, name: 'red', field: '#BA422C', inkDark: '#F9EDD4', inkLight: '#FFF4DB' },
  { id: 5, name: 'blue', field: '#2C4B6E', inkDark: '#EFE2C8', inkLight: '#FFF2D8' },
  { id: 6, name: 'plum', field: '#6B3350', inkDark: '#F2E4CE', inkLight: '#FFF0DD' },
  { id: 7, name: 'amber', field: '#C9973B', inkDark: '#2B1A14', inkLight: '#342016' },
  { id: 8, name: 'rose', field: '#D4A0A7', inkDark: '#2B1A14', inkLight: '#3B211C' },
];

const GLASSWARE = [
  {
    id: 1,
    name: 'pint',
    g: 'M8 5h18l-2.2 40a3 3 0 0 1-3 2.6h-7.6a3 3 0 0 1-3-2.6Z',
    l: 'M9.5 15h15l-1.85 29.4a1.5 1.5 0 0 1-1.5 1.3h-8.3a1.5 1.5 0 0 1-1.5-1.3Z',
    f: 'M8.7 8.4h16.6l-.42 6.6H9.12Z',
  },
  {
    id: 3,
    name: 'wine',
    g: 'M8 5c0 12 2 17.2 9 19.6 7-2.4 9-7.6 9-19.6Z M16.1 24.6h1.8v16.6h-1.8Z M9.8 43.9h14.4v3H9.8Z',
    l: 'M9.7 12.6c.75 6.5 2.7 9.9 7.3 11.7 4.6-1.8 6.55-5.2 7.3-11.7Z',
    f: null,
  },
  {
    id: 4,
    name: 'highball',
    g: 'M10 4h14v39a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3Z',
    l: 'M11.4 13.6h11.2v28.9a1.5 1.5 0 0 1-1.5 1.4h-8.2a1.5 1.5 0 0 1-1.5-1.4Z',
    f: null,
  },
  {
    id: 11,
    name: 'beerbottle',
    g: 'M 14.5 7 h 5 A 4 2 0 0 1 19 8 L 20 15 c 1 2 2 3 3 6 c 0.5 3 0.5 4 0.5 10 v 12 a 3 3 0 0 1 -3 3 H 12 a 3 3 0 0 1 -1.5 -3 V 31 c 0 -4 0 -7 0.5 -10 c 1 -3 2 -4 3 -6 L 15 8 A 4 2 0 0 1 14.5 7 L 14 7 C 14.2 6.2 14.2 6.2 15 6 H 19 C 19.8 6.2 19.8 6.2 20 7 Z M 12 29 h 10 M 12 39 h 10',
    l: 'M11 26h12v17a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2Z',
    f: null,
  },
];

const RECOMMENDATIONS = [
  { id: 1, userId: DEV_USER_ID, name: 'Heineken pint', alcoholTypeId: 4, alcoholVolumeId: 6, brandId: 1, beerFlavourId: 1, consumptionTypeId: 3, colorPaletteId: 1, glasswareId: 1 },
  { id: 2, userId: DEV_USER_ID, name: 'Guinness pint', alcoholTypeId: 4, alcoholVolumeId: 6, brandId: 2, beerFlavourId: 3, consumptionTypeId: 3, colorPaletteId: 2, glasswareId: 1 },
  { id: 3, userId: DEV_USER_ID, name: 'Duvel bottle', alcoholTypeId: 4, alcoholVolumeId: 5, brandId: 3, beerFlavourId: 4, consumptionTypeId: 1, colorPaletteId: 7, glasswareId: 11 },
  { id: 4, userId: DEV_USER_ID, name: 'Chouffe bottle', alcoholTypeId: 4, alcoholVolumeId: 5, brandId: 4, beerFlavourId: 5, consumptionTypeId: 1, colorPaletteId: 4, glasswareId: 11 },
  { id: 5, userId: DEV_USER_ID, name: 'Gin and tonic', alcoholTypeId: 1, alcoholSubtypeId: 1, alcoholVolumeId: 2, colorPaletteId: 1, glasswareId: 4 },
  { id: 6, userId: DEV_USER_ID, name: 'Glass of red', alcoholTypeId: 2, alcoholSubtypeId: 4, alcoholVolumeId: 4, colorPaletteId: 4, glasswareId: 3 },
];

const HISTORY_DRINKS = [
  { id: 1, name: 'Heineken pint (Draft/Tap - 0.50l)', alcoholTypeId: 4, colorPaletteId: 1, glasswareId: 1 },
  { id: 2, name: 'Heineken pint (Draft/Tap - 0.50l)', alcoholTypeId: 4, colorPaletteId: 1, glasswareId: 1 },
  { id: 3, name: 'Duvel bottle (Bottle - 0.33l)', alcoholTypeId: 4, colorPaletteId: 7, glasswareId: 11 },
  { id: 4, name: 'Glass of red (Large glass - 0.30l)', alcoholTypeId: 2, colorPaletteId: 4, glasswareId: 3 },
];

const ALCOHOL_TYPES = [
  { id: 1, name: 'Spirits', volumeIds: [1, 2], colorPaletteId: 1, glasswareId: 4 },
  { id: 2, name: 'Wine', volumeIds: [3, 4, 7], colorPaletteId: 4, glasswareId: 3 },
  { id: 3, name: 'Cocktail', volumeIds: [2, 4], colorPaletteId: 6, glasswareId: 4 },
  { id: 4, name: 'Beer', volumeIds: [3, 5, 6], colorPaletteId: 7, glasswareId: 1 },
];

const VOLUMES = [
  { id: 1, name: 'Shot', volume: 0.04 },
  { id: 2, name: 'Long drink', volume: 0.25 },
  { id: 3, name: 'Small glass', volume: 0.2 },
  { id: 4, name: 'Large glass', volume: 0.3 },
  { id: 5, name: 'Small bottle', volume: 0.33 },
  { id: 6, name: 'Pint', volume: 0.5 },
  { id: 7, name: 'Bottle', volume: 0.75 },
];

const SUBTYPES = [
  { id: 1, alcoholTypeId: 1, name: 'Gin', colorPaletteId: null, glasswareId: null },
  { id: 2, alcoholTypeId: 1, name: 'Whisky', colorPaletteId: null, glasswareId: null },
  { id: 4, alcoholTypeId: 2, name: 'Red', colorPaletteId: 4, glasswareId: 3 },
  { id: 5, alcoholTypeId: 2, name: 'White', colorPaletteId: null, glasswareId: 3 },
];

const BRANDS = [
  { id: 1, name: 'Heineken', colorPaletteId: 1 },
  { id: 2, name: 'Guinness', colorPaletteId: 2 },
  { id: 3, name: 'Duvel', colorPaletteId: 7 },
  { id: 4, name: 'La Chouffe', colorPaletteId: 4 },
];

const FLAVOURS = [
  { id: 1, brandId: 1, name: 'Original', colorPaletteId: null },
  { id: 3, brandId: 2, name: 'Draught', colorPaletteId: null },
  { id: 4, brandId: 3, name: 'Blond', colorPaletteId: null },
  { id: 5, brandId: 4, name: 'Blonde', colorPaletteId: null },
];

const CONSUMPTION_TYPES = [
  { id: 1, name: 'Bottle', glasswareId: 11 },
  { id: 2, name: 'Can', glasswareId: 1 },
  { id: 3, name: 'Draft/Tap', glasswareId: 1 },
];

const referenceDir = (testInfo: { project: { testDir: string } }): string =>
  path.resolve(testInfo.project.testDir, '..', '..', '..', 'ios', 'Reference', 'web');

const routeDesign = async (page: Page) => {
  await page.route('**/v1/design/color-palettes', (route) => route.fulfill({ json: COLOR_PALETTES }));
  await page.route('**/v1/design/glassware', (route) => route.fulfill({ json: GLASSWARE }));
};

const routeDrinksFixture = async (page: Page, rows: readonly unknown[]) => {
  await page.route('**/v1/drinks/date/*', (route) => route.fulfill({ json: rows }));
  // Never let a reference capture delete real records, including the pagehide flush.
  await page.route('**/v1/drinks/byIds?*', (route) => route.fulfill({ json: 1 }));
};

const routeAddCatalogue = async (page: Page) => {
  await page.route('**/v1/alcohol/types', (route) => route.fulfill({ json: ALCOHOL_TYPES }));
  await page.route('**/v1/alcohol/types/*/volumes', (route) => route.fulfill({ json: VOLUMES }));
  await page.route('**/v1/alcohol/types/*/subtypes', (route) => route.fulfill({ json: SUBTYPES }));
  await page.route('**/v1/beer/brands', (route) => route.fulfill({ json: BRANDS }));
  await page.route('**/v1/beer/brands/*/flavours', (route) => route.fulfill({ json: FLAVOURS }));
  await page.route('**/v1/beer/consumption-types*', (route) => route.fulfill({ json: CONSUMPTION_TYPES }));
};

const routeRecommendations = async (page: Page, state: StateId) => {
  switch (state) {
    case 'quick-ready':
    case 'history-populated':
    case 'history-empty':
    case 'history-error':
    case 'add-root':
      await page.route('**/v1/recommendations/list', (route) => route.fulfill({ json: RECOMMENDATIONS }));
      break;
    case 'recs-empty':
      await page.route('**/v1/recommendations/list', (route) => route.fulfill({ json: [] }));
      break;
    case 'quick-error':
    case 'recs-error':
      await page.route('**/v1/recommendations/list', (route) => route.fulfill({ status: 500, json: {} }));
      break;
    case 'quick-loading':
      // Hold the request open so the page stays on its loading skeleton.
      await page.route('**/v1/recommendations/list', () => undefined);
      break;
  }
};

const arrange = async (page: Page, referenceCase: ReferenceCase) => {
  const { state, theme, width, height } = referenceCase;
  await page.setViewportSize({ width, height });
  await page.clock.setFixedTime(FIXED_TIME);
  await page.addInitScript((value) => {
    localStorage.setItem('drinksaver-theme', value);
  }, theme);

  await routeDesign(page);
  await routeRecommendations(page, state);

  if (state.startsWith('history')) {
    if (state === 'history-error') {
      await page.route('**/v1/drinks/date/*', (route) => route.fulfill({ status: 500, json: {} }));
      await page.route('**/v1/drinks/byIds?*', (route) => route.fulfill({ json: 1 }));
    } else {
      await routeDrinksFixture(page, state === 'history-populated' ? HISTORY_DRINKS : []);
    }
    await page.goto('/history');
  } else if (state.startsWith('recs')) {
    await routeDrinksFixture(page, []);
    await page.goto('/recommendations');
  } else if (state === 'add-root') {
    await routeDrinksFixture(page, []);
    await routeAddCatalogue(page);
    await page.goto('/?sheet=add');
  } else {
    await routeDrinksFixture(page, []);
    await page.goto('/');
  }

  switch (state) {
    case 'quick-ready':
      await expect(page.getByRole('button', { name: 'Heineken pint' })).toBeVisible();
      break;
    case 'quick-loading':
      await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
      await expect(page.getByRole('status')).toBeVisible();
      break;
    case 'quick-error':
      await expect(page.getByRole('alert')).toContainText(/couldn't load recommendations/i);
      break;
    case 'history-populated':
      await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();
      await expect(page.getByText('Heineken pint', { exact: false }).first()).toBeVisible();
      break;
    case 'history-empty':
      await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();
      await expect(page.getByText('Nothing on this day')).toBeVisible();
      break;
    case 'history-error':
      await expect(page.getByRole('heading', { name: 'History', exact: true })).toBeVisible();
      await expect(page.getByRole('alert')).toBeVisible();
      break;
    case 'recs-ready':
      await expect(page.getByRole('heading', { name: 'Recommendations', exact: true })).toBeVisible();
      await expect(page.getByText('Heineken pint', { exact: true })).toBeVisible();
      break;
    case 'recs-empty':
      await expect(page.getByRole('heading', { name: 'Recommendations', exact: true })).toBeVisible();
      await expect(page.getByText('Nothing saved yet')).toBeVisible();
      break;
    case 'recs-error':
      await expect(page.getByRole('heading', { name: 'Recommendations', exact: true })).toBeVisible();
      await expect(page.getByRole('alert')).toContainText("Couldn't load your recommendations");
      break;
    case 'add-root':
      await expect(page.locator('#add-sheet-heading')).toHaveText('What are you having?');
      break;
  }

  await page.evaluate(() => document.fonts.ready);
  // Let any enter transition reach its resting position before freezing the frame.
  await page.waitForTimeout(state === 'add-root' ? 400 : 150);
  // MUI's loading skeleton pulse can otherwise be frozen at different opacity frames.
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
};

test('reference manifest covers both themes and the three reference widths', () => {
  expect(referenceCases.some((entry) => entry.id === 'quick-ready-dark-375x812')).toBe(true);
  expect(new Set(referenceCases.map((entry) => entry.theme))).toEqual(new Set(['dark', 'light']));
  expect(new Set(referenceCases.map((entry) => `${entry.width}x${entry.height}`))).toEqual(
    new Set(['375x667', '375x812', '440x956']),
  );
});

const regenerateReferences = process.env.IOS_REFERENCE_REGENERATE === '1';

for (const referenceCase of referenceCases) {
  test(`capture ${referenceCase.id}`, async ({ page }, testInfo) => {
    test.skip(
      !regenerateReferences,
      'Committed references are immutable by default; set IOS_REFERENCE_REGENERATE=1 to replace them.',
    );
    await arrange(page, referenceCase);
    await page.screenshot({
      path: path.join(referenceDir(testInfo), `${referenceCase.id}.png`),
      animations: 'disabled',
    });
  });
}

// PNG IHDR stores width/height as big-endian u32 at fixed offsets after the 8-byte signature.
const pngDimensions = (file: string): { width: number; height: number } => {
  const buffer = readFileSync(file);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

test('every reference capture exists on disk at 3x raster', async ({ browserName }, testInfo) => {
  expect(browserName).toBe('chromium');
  const dir = referenceDir(testInfo);
  const missing = referenceCases
    .map((entry) => `${entry.id}.png`)
    .filter((file) => !existsSync(path.join(dir, file)));
  expect(missing).toEqual([]);

  const wrongScale = referenceCases
    .map((entry) => {
      const { width, height } = pngDimensions(path.join(dir, `${entry.id}.png`));
      return { id: entry.id, width, height };
    })
    .filter(({ id, width, height }) => {
      const referenceCase = referenceCases.find((entry) => entry.id === id)!;
      return width !== referenceCase.width * 3 || height !== referenceCase.height * 3;
    });
  expect(wrongScale).toEqual([]);
});
