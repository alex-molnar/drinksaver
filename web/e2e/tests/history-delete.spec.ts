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
  await expect(page.getByLabel('Pick a date')).toBeVisible();
  // The paper tab announces an unread day with role=status, and a day that has arrived drops it.
  // Waiting on this rather than on a count is what stops an assertion passing against a tab that
  // has not loaded yet, which is the same distinction the day strip is built on.
  await expect(page.getByRole('status').filter({ hasText: /loading/i })).toHaveCount(0, {
    timeout: 15_000,
  });
};

const ginRows = (page: Page) => page.getByText(GIN).count();

const saveAGinAndTonic = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Gin and tonic' }).click();
  // Logging never navigates: the confirmation is an inline strip on the same screen.
  await expect(page.getByRole('status')).toContainText(/gin and tonic/i, { timeout: 15_000 });
};

test('a saved drink can be deleted from history and stays deleted after the undo window closes', async ({ page }) => {
  await page.goto('/history');
  await waitForHistoryLoaded(page);
  const before = await ginRows(page);

  await saveAGinAndTonic(page);

  await page.goto('/history');
  await waitForHistoryLoaded(page);
  await expect.poll(() => ginRows(page), { timeout: 15_000 }).toBe(before + 1);

  // Clicking a row toggles its checkbox; the bottom button defers a delete for the selection.
  const ginRow = page.getByRole('button').filter({ hasText: GIN }).first();
  await ginRow.click();
  await expect(ginRow.getByRole('checkbox')).toBeChecked({ timeout: 5_000 });
  await page.getByRole('button', { name: /delete selected/i }).click();

  // The strip is asserted first, and deliberately so: it only exists for the length of the undo
  // window, so anything polled ahead of it can outlast the thing being checked. The row count is
  // suppressed from the merged view in the same tick, so nothing is lost by checking it second.
  await expect(page.getByRole('status')).toBeVisible();
  await expect.poll(() => ginRows(page), { timeout: 15_000 }).toBe(before);

  // Move the pointer off the strip before waiting it out. The strip appears at the bottom of the
  // viewport, which is where the delete control just was, so Playwright's cursor is left sitting
  // on top of it. Hovering pauses the window on purpose (WCAG 2.2 SC 2.2.1), so leaving the mouse
  // there means it never elapses at all. A real user moves; a scripted one has to be told to.
  await page.mouse.move(0, 0);

  // Wait out the undo window rather than racing it with a reload. Once the strip clears, the
  // DELETE has already been sent for real, through the ordinary awaited path - a reload this
  // soon would instead be exercising the pagehide/keepalive fallback, which is a different thing
  // to prove and not what this test is for.
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 10_000 });

  // It must be gone from the database, not merely from the rendered list.
  await page.reload();
  await waitForHistoryLoaded(page);
  await expect.poll(() => ginRows(page), { timeout: 15_000 }).toBe(before);
});

/**
 * There is no undelete endpoint, so undoing a delete has to mean the DELETE is never sent at
 * all. Reloading proves that: if Undo had merely re-shown the row while the delete still went
 * through underneath it, the row would vanish again the moment the page re-fetches from the
 * server.
 */
test('undoing a delete keeps the drink, because the delete was never sent', async ({ page }) => {
  await page.goto('/history');
  await waitForHistoryLoaded(page);
  const before = await ginRows(page);

  await saveAGinAndTonic(page);

  await page.goto('/history');
  await waitForHistoryLoaded(page);
  await expect.poll(() => ginRows(page), { timeout: 15_000 }).toBe(before + 1);

  await page.getByRole('button').filter({ hasText: GIN }).first().click();
  await page.getByRole('button', { name: /delete selected/i }).click();

  // Undo before anything else. The control lives on a strip that clears itself when the window
  // closes, so polling the row count first spends the very budget the click needs. Waiting on
  // the row count here is what made this test burn its whole timeout looking for a button that
  // had already retired.
  await expect(page.getByRole('status')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();

  await expect.poll(() => ginRows(page), { timeout: 15_000 }).toBe(before + 1);

  await page.reload();
  await waitForHistoryLoaded(page);
  await expect.poll(() => ginRows(page), { timeout: 15_000 }).toBe(before + 1);
});
