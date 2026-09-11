import { test, expect } from '@playwright/test';
import { drinkingDay } from '../../src/drink/day';

/**
 * The same rule the app uses, imported rather than restated. A local `toISOString()` here would
 * disagree with the app between midnight and 06:00, and CI runs in UTC, so a merge to main in
 * that window would fail on a date the app is filing correctly.
 */
const expectedDay = () => drinkingDay(new Date());

test('saving a recommendation records it in history without navigating away', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Duvel bottle' })).toBeVisible();

  await page.getByRole('button', { name: 'Duvel bottle' }).click();

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
