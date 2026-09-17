import { test, expect } from '@playwright/test';

/**
 * Regression for a bug reported on an iPhone 13 mini (375x812 logical viewport): the native
 * date input under When -> Another day rendered wider than its container and spilled past the
 * screen edge, which is also what was dragging the whole page into an iOS scroll-into-view/
 * mis-tap chain that dismissed the sheet. `SheetHost`'s Drawer paper now clips horizontally, so
 * nothing in any panel can escape the sheet - the same invariant `add-sheet-identity.spec.ts`
 * checks for the wider catalogue flow, scoped here to the one field that actually broke it.
 */
test('the custom date field stays inside the sheet on a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  const add = page.getByRole('button', { name: 'Something else', exact: true });
  await add.scrollIntoViewIfNeeded();
  await add.click();

  await page.getByRole('button', { name: /^When,/ }).click();
  await expect(page.getByRole('heading', { name: 'When was it?' })).toBeVisible();

  await page.getByRole('button', { name: 'Another day' }).click();
  const dateInput = page.getByLabel(/choose a date/i);
  await expect(dateInput).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);

  // A dismiss would pop the sheet back to its menu (or close it outright); staying on this
  // panel is what the CSS fix protects against.
  await expect(page.getByRole('heading', { name: 'When was it?' })).toBeVisible();
});
