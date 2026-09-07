import { test, expect } from '@playwright/test';

const today = () => new Date().toISOString().slice(0, 10);

test('saving a recommendation records it in history', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Duvel bottle' })).toBeVisible();

  await page.getByRole('button', { name: 'Duvel bottle' }).click();

  // The app navigates to a confirmation naming the drink.
  await expect(page.getByText(/duvel bottle/i)).toBeVisible({ timeout: 15_000 });

  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Date' })).toHaveValue(today());

  // The drink the backend resolved a name for shows up for today.
  await expect(page.getByText(/duvel/i).first()).toBeVisible({ timeout: 15_000 });
});
