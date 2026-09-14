import { test, expect, type Page } from '@playwright/test';
import { drinkingDay } from '../../src/drink/day';
import type { Recommendation } from '../../src/types/api';

/**
 * The same rule the app uses, imported rather than restated. A local `toISOString()` here would
 * disagree with the app between midnight and 06:00, and CI runs in UTC, so a merge to main in
 * that window would fail on a date the app is filing correctly.
 */
const expectedDay = () => drinkingDay(new Date());

const recommendations: Recommendation[] = [
  {
    id: 2,
    userId: '423c91e4-491f-4f82-aba6-3c982857e0e4',
    name: 'Guinness pint',
    alcoholTypeId: 4,
    alcoholVolumeId: 6,
    brandId: 2,
    beerFlavourId: 3,
    consumptionTypeId: 3,
    colorPaletteId: 2,
    glasswareId: 1,
  },
  {
    id: 3,
    userId: '423c91e4-491f-4f82-aba6-3c982857e0e4',
    name: 'Duvel bottle',
    alcoholTypeId: 4,
    alcoholVolumeId: 5,
    brandId: 3,
    beerFlavourId: 4,
    consumptionTypeId: 1,
    colorPaletteId: 3,
    glasswareId: 2,
  },
];

const useCurrentRecommendationContract = async (page: Page) => {
  await page.route('**/v1/recommendations/list', (route) => route.fulfill({ json: recommendations }));
};

test('saving a recommendation records it in history without navigating away', async ({ page }) => {
  await useCurrentRecommendationContract(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Duvel bottle' })).toBeVisible();

  const saveRequest = page.waitForRequest('**/v1/drinks/new');
  await page.getByRole('button', { name: 'Duvel bottle' }).click();
  const savedPayload = (await saveRequest).postDataJSON();
  expect(savedPayload).toMatchObject({ colorPaletteId: 3, glasswareId: 2 });

  // Logging never navigates: the confirmation is an inline strip on the same screen, not a
  // routed page. `/success` is gone from this flow entirely.
  await expect(page.getByRole('status')).toContainText(/duvel bottle/i, { timeout: 15_000 });
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'Duvel bottle' })).toBeVisible();

  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect(page.getByLabel('Pick a date')).toHaveValue(expectedDay());

  // The drink the backend resolved a name for shows up on the drinking day. It has to arrive by
  // the ordinary route: the save queue's provisional row would show "Duvel bottle" immediately
  // regardless of whether the write actually landed, so waiting for the composed name here is
  // what proves the round trip to the backend, not merely the optimistic merge.
  await expect(page.getByText(/duvel/i).first()).toBeVisible({ timeout: 15_000 });
});

/**
 * The drinking day rule, proven in a real browser rather than only in a unit test, because the
 * rule decides what the backend stores and a unit test cannot show that round trip.
 *
 * The clock is pinned to half past midnight. Under the calendar day this drink would be filed on
 * the 10th; under the rule it belongs to the night of the 9th, which is what both the save and
 * the History screen must agree on.
 */
test('a drink logged after midnight is filed on the night it belongs to', async ({ page }) => {
  // setFixedTime, not install: install also fakes timers, which would stall React Query's
  // retries and any transition - and now also the save queue's own undo timer.
  await page.clock.setFixedTime(new Date(2026, 8, 10, 0, 30));
  await useCurrentRecommendationContract(page);

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Guinness pint' })).toBeVisible();
  await page.getByRole('button', { name: 'Guinness pint' }).click();
  await expect(page.getByRole('status')).toContainText(/guinness pint/i, { timeout: 15_000 });

  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();

  // The night of the 9th, not the calendar date the clock reads.
  await expect(page.getByLabel('Pick a date')).toHaveValue('2026-09-09');
  await expect(page.getByText(/guinness/i).first()).toBeVisible({ timeout: 15_000 });
});
