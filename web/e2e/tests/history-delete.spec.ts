import { test, expect, type Page } from '@playwright/test';

/**
 * Once saved, the "Gin and tonic" recommendation is displayed as
 * "Gin (Long drink - 0.25l)": the backend composes the name from the subtype
 * and volume. Counting rows with that name works regardless of how many the
 * seed data already provided.
 */
const GIN = /Gin \(Long drink/;

/**
 * The date field renders before the day's drinks arrive, so waiting on it is
 * not enough. Counting too early reports zero rows and the assertions become
 * nonsense. Wait for the loading spinner to clear instead.
 */
const waitForHistoryLoaded = async (page: Page) => {
  await expect(page.getByRole('textbox', { name: 'Date' })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 15_000 });
};

const ginRows = (page: Page) => page.getByText(GIN).count();

test('a saved drink can be deleted from history and stays deleted', async ({ page }) => {
  await page.goto('/history');
  await waitForHistoryLoaded(page);
  const before = await ginRows(page);

  await page.goto('/');
  await page.getByRole('button', { name: 'Gin and tonic' }).click();
  await expect(page.getByText(/gin and tonic/i)).toBeVisible({ timeout: 15_000 });

  await page.goto('/history');
  await waitForHistoryLoaded(page);
  await expect.poll(() => ginRows(page), { timeout: 15_000 }).toBe(before + 1);

  // Clicking a row toggles its checkbox; the bottom button deletes the selection.
  await page.getByRole('button').filter({ hasText: GIN }).first().click();
  await page.getByRole('button', { name: 'delete selected' }).click();

  await expect.poll(() => ginRows(page), { timeout: 15_000 }).toBe(before);

  // It must be gone from the database, not merely from the rendered list.
  await page.reload();
  await waitForHistoryLoaded(page);
  await expect.poll(() => ginRows(page), { timeout: 15_000 }).toBe(before);
});
