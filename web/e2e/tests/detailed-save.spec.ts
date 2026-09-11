import { test, expect, type Page } from '@playwright/test';

const waitForHistoryLoaded = async (page: Page) => {
  await expect(page.getByLabel('Pick a date')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /loading/i })).toHaveCount(0, { timeout: 15_000 });
};

/** A menu row's accessible name is `"<label>, <value>"` - see `MenuPanel.tsx`'s `rowAccessibleName`
 *  - so a row is found by its label alone, regardless of whether anything has been chosen yet. */
const menuRow = (page: Page, label: string) => page.getByRole('button', { name: new RegExp(`^${label},`) });

test('a beer added through the add sheet appears in history', async ({ page }) => {
  await page.goto('/history');
  await waitForHistoryLoaded(page);
  const before = await page.getByText(/Guinness/).count();

  await page.goto('/');
  // Logging never navigates, including opening the sheet: "Something else" raises it over the
  // Quick Save screen rather than sending the user anywhere.
  await page.getByRole('button', { name: 'Something else' }).click();
  await expect(page.getByRole('heading', { name: 'What are you having?' })).toBeVisible();

  await menuRow(page, 'Drink').click();
  await expect(page.getByRole('heading', { name: 'What are you drinking?' })).toBeVisible();
  await page.getByRole('button', { name: 'Beer', exact: true }).click();

  // Picking an option returns to the menu on its own; every row push below follows the same
  // pattern, so only the panel headings are asserted, not every back-and-forth.
  await expect(page.getByRole('heading', { name: 'What are you having?' })).toBeVisible();
  await menuRow(page, 'Size').click();
  await expect(page.getByRole('heading', { name: 'What size?' })).toBeVisible();
  await page.getByRole('button', { name: 'Pint (0.5L)' }).click();

  await menuRow(page, 'Served').click();
  await expect(page.getByRole('heading', { name: 'How is it served?' })).toBeVisible();
  await page.getByRole('button', { name: 'Draft/Tap', exact: true }).click();

  await menuRow(page, 'Brand').click();
  await expect(page.getByRole('heading', { name: 'Which brand?' })).toBeVisible();
  await page.getByRole('button', { name: 'Guinness', exact: true }).click();

  // The save control is a real labelled button - "Save drink" is its own visible text, not an
  // icon-only affordance - so it needs no special targeting the way the old FAB once did.
  await expect(page.getByRole('button', { name: 'Save drink' })).toBeEnabled();
  await page.getByRole('button', { name: 'Save drink' }).click();

  // Saving dismisses the sheet and raises the strip on the screen behind it, in place.
  await expect(page.getByRole('status')).toContainText(/guinness/i, { timeout: 15_000 });
  await expect(page).toHaveURL('/');

  await page.goto('/history');
  await waitForHistoryLoaded(page);
  await expect
    .poll(() => page.getByText(/Guinness/).count(), { timeout: 15_000 })
    .toBe(before + 1);
});

/**
 * The cascade itself - clearing volume, subtype, consumption type, brand and flavour when the
 * alcohol type changes - is `draftReducer.test.ts`'s "selecting an alcohol type after a volume
 * has been chosen clears volumeId, subtypeId, brandId, beerFlavourId and consumptionTypeId" now,
 * a unit test rather than a browser one. What only a browser test can still show is that the menu
 * actually reflects it, so this stays as a short journey rather than the full round trip above.
 */
test('changing the drink type clears what depended on the old one', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Something else' }).click();
  await expect(page.getByRole('heading', { name: 'What are you having?' })).toBeVisible();

  await menuRow(page, 'Drink').click();
  await page.getByRole('button', { name: 'Beer', exact: true }).click();
  await menuRow(page, 'Size').click();
  await page.getByRole('button', { name: 'Pint (0.5L)' }).click();

  await expect(page.getByRole('button', { name: /^Size, Pint/ })).toBeVisible();
  await expect(menuRow(page, 'Served')).toBeVisible();

  await menuRow(page, 'Drink').click();
  await page.getByRole('button', { name: 'Wine', exact: true }).click();

  // Size is cleared back to its placeholder, and the beer-only rows are gone entirely.
  await expect(page.getByRole('button', { name: /^Size, Choose/ })).toBeVisible();
  await expect(menuRow(page, 'Served')).toHaveCount(0);
  await expect(menuRow(page, 'Brand')).toHaveCount(0);
});
