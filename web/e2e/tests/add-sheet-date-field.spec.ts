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

/**
 * Regression for the actual reported symptom: iOS (Safari and Chrome, same WebKit engine) can
 * commit the native date input's value and fire its change event before the user has deliberately
 * finished choosing one. Setting the value alone must never leave the panel - only the explicit
 * "Set date" tap may. Chromium doesn't reproduce iOS's early-fire timing, but this proves our own
 * code no longer treats the change event as authoritative, which is what makes that timing safe
 * regardless of when WebKit actually fires it.
 */
test('choosing a custom date requires an explicit Set date tap, not just a change event', async ({ page }) => {
  await page.goto('/');

  const add = page.getByRole('button', { name: 'Something else', exact: true });
  await add.scrollIntoViewIfNeeded();
  await add.click();

  await page.getByRole('button', { name: /^When,/ }).click();
  await page.getByRole('button', { name: 'Another day' }).click();

  const dateInput = page.getByLabel(/choose a date/i);
  const setDate = page.getByRole('button', { name: 'Set date' });
  await expect(setDate).toBeDisabled();

  await dateInput.fill('2026-01-05');
  await expect(page.getByRole('heading', { name: 'When was it?' })).toBeVisible();
  await expect(setDate).toBeEnabled();

  await setDate.click();
  await expect(page.getByRole('button', { name: /^When, 5 Jan/ })).toBeVisible();
});
