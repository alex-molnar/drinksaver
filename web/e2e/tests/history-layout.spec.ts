import { test, expect, type Page, type Locator } from '@playwright/test';

// Deterministic layout fixtures behind the real app and Keycloak login. The neighbouring
// history-delete journeys cover persistence; these checks need repeatable row counts/names.
const drinks = Array.from({ length: 24 }, (_, i) => ({
  id: 90_000 + i,
  name: i === 23
    ? 'Last drink: ExtraordinarilyLongUnbrokenBrandName (Large serving - 0.50l)'
    : `Drink ${i + 1} (Draft/Tap - 0.50l)`,
  alcoholTypeId: 4,
}));

async function enterHistory(page: Page, rows = drinks) {
  await page.route('**/v1/drinks/date/*', (route) => route.fulfill({ json: rows }));
  // Never allow layout fixtures to delete real records, including the pagehide flush.
  await page.route('**/v1/drinks/byIds?*', (route) => route.fulfill({ json: 1 }));
  await page.goto('/');
  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /loading/i })).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

async function expectFrameAligned(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    x: window.scrollX,
    width: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    headerLeft: document.querySelector('header')!.getBoundingClientRect().left,
    navLeft: document.querySelector('nav')!.getBoundingClientRect().left,
  }))).toEqual({ x: 0, width: page.viewportSize()!.width, viewport: page.viewportSize()!.width, headerLeft: 0, navLeft: 0 });
}

async function expectAbove(a: Locator, b: Locator) {
  await expect.poll(async () => {
    const first = await a.boundingBox();
    const second = await b.boundingBox();
    return !!first && !!second && first.y + first.height <= second.y + 1;
  }).toBe(true);
}

for (const width of [320, 375, 390]) {
  test(`day navigation stays inside its strip at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await enterHistory(page);
    await expectFrameAligned(page);
    await expect(page.getByRole('button', { name: /^today,/i })).toBeInViewport({ ratio: 1 });

    const days = page.getByLabel('Pick a date').locator('../..').getByRole('button');
    for (let i = 0; i < 7; i++) {
      await days.nth(i).click();
      await expect(days.nth(i)).toBeInViewport({ ratio: 1 });
      await expectFrameAligned(page);
    }

    const picker = page.getByLabel('Pick a date');
    await picker.click();
    await expectFrameAligned(page);
    await page.keyboard.press('Escape');
    await picker.fill('2026-08-20');
    await expect(picker).toHaveValue('2026-08-20');
    await expect(picker).toBeInViewport({ ratio: 1 });
    await expectFrameAligned(page);
    // Native date inputs have different keyboard segments in Chromium and WebKit.
    await days.first().focus();
    await page.keyboard.press('Enter');
    await expect(days.first()).toHaveAttribute('aria-current', 'date');
    await expect(days.first()).toBeInViewport({ ratio: 1 });
    await expectFrameAligned(page);
  });
}

for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 812, height: 375 }]) {
  test(`all 24 rows and actions remain reachable at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await enterHistory(page);
    const history = page.getByRole('region', { name: 'Drinks for selected day' });
    const nav = page.getByRole('navigation');
    const lastRow = page.getByRole('button', { name: drinks[23].name, exact: true });
    const cross = lastRow.getByRole('button', { name: /^cross off/i });

    await history.hover();
    await page.mouse.wheel(0, 10_000);
    await expect(cross).toBeInViewport({ ratio: 1 });
    await expectAbove(lastRow, nav);
    await expectFrameAligned(page);
    // The entire long name fits in its row rather than overflowing behind the cross button.
    await expect.poll(() => lastRow.locator('span').filter({ hasText: drinks[23].name }).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

    await lastRow.click();
    const bulk = page.getByRole('button', { name: 'Delete selected' });
    await expect(bulk).toBeInViewport({ ratio: 1 });
    await history.hover();
    await page.mouse.wheel(0, 10_000);
    await expectAbove(lastRow, bulk);
    await expectAbove(bulk, nav);
    await page.screenshot({ path: testInfo.outputPath('last-row-and-bulk-action.png') });
    await bulk.click();
    const undo = page.getByRole('button', { name: 'Undo', exact: true });
    await expect(undo).toBeInViewport({ ratio: 1 });
    await undo.hover(); // Pause the undo window while checking geometry.
    await expectAbove(history, page.getByRole('status'));
    await expectAbove(page.getByRole('status'), nav);
    await page.screenshot({ path: testInfo.outputPath('history-undo.png') });
    const remaining = page.getByRole('button', { name: drinks[22].name, exact: true });
    await remaining.click();
    await expect(bulk).toBeInViewport({ ratio: 1 });
    await expect(nav).toBeInViewport({ ratio: 1 });
    await expect.poll(() => history.evaluate((el) => el.clientHeight)).toBeGreaterThanOrEqual(44);
    await expectAbove(history, bulk);
    await undo.click();
    // Undo restores exactly one keyed row, including while its exit is still running.
    expect(await lastRow.count()).toBe(1);
    await expect(lastRow).toBeVisible();

    // Keyboard scrolling must move the list too, without moving the window or navigation.
    await history.focus();
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('Home');
    await page.keyboard.press('End');
    await expect.poll(() => history.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await cross.scrollIntoViewIfNeeded();
    await cross.click();
    await expect(undo).toBeVisible();
    await undo.click();
    await expectFrameAligned(page);
  });
}

test('two rows can be scrolled into view on a short screen', async ({ page }) => {
  await page.setViewportSize({ width: 812, height: 375 });
  await enterHistory(page, drinks.slice(0, 2));
  const history = page.getByRole('region', { name: 'Drinks for selected day' });
  await history.hover();
  await page.mouse.wheel(0, 500);
  const last = page.getByRole('button', { name: drinks[1].name, exact: true });
  await expect(last).toBeInViewport({ ratio: 1 });
  await expectAbove(last, page.getByRole('navigation'));
});

test('safe-area padding leaves navigation and list controls inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterHistory(page);
  // Desktop engines report zero insets. Simulate the root padding produced by a phone's env().
  await page.addStyleTag({ content: '#root { padding-top: 20px; padding-bottom: 34px; }' });
  const history = page.getByRole('region', { name: 'Drinks for selected day' });
  await history.hover();
  await page.mouse.wheel(0, 10_000);
  await expect(page.getByRole('navigation')).toBeInViewport({ ratio: 1 });
  await expectAbove(history, page.getByRole('navigation'));
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight)).toBe(844);
});
