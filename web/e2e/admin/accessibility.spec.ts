import { test, expect } from '@playwright/test';

test('keyboard behavior, status states, reduced motion and narrow reflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  let releaseRequest!: () => void;
  const requestGate = new Promise<void>((resolve) => { releaseRequest = resolve; });
  await page.route('**/v1/admin/recommendations/list', async (route) => {
    const response = await route.fetch();
    await requestGate;
    await route.fulfill({ response });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/recommendations');
  await expect(page.getByRole('status', { name: 'Loading' })).toBeVisible();
  await expect(page.locator('.spinner')).toHaveCSS('animation-duration', '1e-05s');
  await page.screenshot({ path: testInfo.outputPath('loading-desktop.png'), fullPage: true });
  releaseRequest();
  await expect(page.getByRole('heading', { name: 'Recommendations' })).toBeVisible();
  await page.unroute('**/v1/admin/recommendations/list');
  await page.screenshot({ path: testInfo.outputPath('recommendations-desktop.png'), fullPage: true });

  const openEditor = page.getByRole('button', { name: 'New recommendation' });
  await openEditor.focus();
  const target = await openEditor.boundingBox();
  expect(target?.height).toBeGreaterThanOrEqual(24);
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Create recommendation' });
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBeTruthy();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBeTruthy();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(openEditor).toBeFocused();

  await page.setViewportSize({ width: 640, height: 900 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(640);
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(navigation.getByRole('link')).toHaveCount(5);
  expect(await navigation.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('recommendations-200-percent-equivalent.png'), fullPage: true });
  await page.setViewportSize({ width: 320, height: 812 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(navigation.getByRole('link')).toHaveCount(5);
  expect(await navigation.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('recommendations-narrow.png'), fullPage: true });

  await page.route('**/v1/admin/default/alcohol/types', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.goto('/alcohol-types');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('error-state.png'), fullPage: true });
  await page.unroute('**/v1/admin/default/alcohol/types');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('heading', { name: 'Alcohol types' })).toBeVisible();

  await page.goto('/user-defined?kind=types');
  await expect(page.getByRole('heading', { name: 'Nothing here yet' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('empty-state.png'), fullPage: true });

  await page.goto('/alcohol-types');
  const newType = page.getByRole('button', { name: 'New alcohol type' });
  await newType.click();
  await expect(page.getByRole('dialog', { name: 'Create alcohol type' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('form-state.png'), fullPage: true });
  await page.getByRole('dialog', { name: 'Create alcohol type' }).getByRole('button', { name: 'Cancel' }).click();
});
