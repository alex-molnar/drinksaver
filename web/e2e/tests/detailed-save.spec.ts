import { test, expect, type Page } from '@playwright/test';

const choose = async (page: Page, field: string, option: string) => {
  await page.getByRole('combobox', { name: field }).click();
  await page.getByRole('listbox').waitFor();
  await page.getByRole('option', { name: option, exact: true }).click();
};

const waitForHistoryLoaded = async (page: Page) => {
  await expect(page.getByRole('textbox', { name: 'Date' })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 15_000 });
};

test('a beer recorded through the detailed form appears in history', async ({ page }) => {
  await page.goto('/history');
  await waitForHistoryLoaded(page);
  const before = await page.getByText(/Guinness/).count();

  await page.goto('/detailed');
  await choose(page, 'Alcohol Type', 'Beer');
  await choose(page, 'Volume', 'Pint (0.5L)');
  await choose(page, 'Consumption Type', 'Draft/Tap');
  await choose(page, 'Brand', 'Guinness');

  // The save control only appears once the form is valid.
  await expect(page.getByText(/please fill in all required fields/i)).toHaveCount(0);
  // Targeted by class, not by role and name, because the save FAB carries no
  // accessible name: a screen reader announces only "button". MUI's icon
  // data-testid is stripped from production bundles, which is what compose
  // serves, so that is not an option either. Recorded as a finding; once the
  // FAB gains an aria-label this should become a plain getByRole query.
  await page.getByRole('button', { name: /save drink/i }).click();

  await expect(page).toHaveURL(/success|\/$/, { timeout: 15_000 });

  await page.goto('/history');
  await waitForHistoryLoaded(page);
  await expect
    .poll(() => page.getByText(/Guinness/).count(), { timeout: 15_000 })
    .toBe(before + 1);
});

/**
 * Covers the behaviour that moved out of two useEffects and into the change
 * handlers. If a future refactor drops the reset, a stale volume from the
 * previous alcohol type would survive, which is exactly what this catches.
 */
test('changing the alcohol type clears the dependent fields', async ({ page }) => {
  await page.goto('/detailed');

  await choose(page, 'Alcohol Type', 'Beer');
  await choose(page, 'Volume', 'Pint (0.5L)');
  await expect(page.getByRole('combobox', { name: 'Volume' })).toHaveText(/Pint/);

  await choose(page, 'Alcohol Type', 'Wine');

  // Volume must have been cleared, and the beer-only fields must be gone.
  await expect(page.getByRole('combobox', { name: 'Volume' })).not.toHaveText(/Pint/);
  await expect(page.getByRole('combobox', { name: 'Consumption Type' })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Brand' })).toHaveCount(0);
});
