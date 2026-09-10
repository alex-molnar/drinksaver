import { test, expect } from '@playwright/test';

/**
 * The only test that logs in interactively. Every other journey reuses the
 * saved session, which is faster but would hide a broken Keycloak redirect,
 * client id or realm. This one covers exactly that.
 */
test('an unauthenticated visitor is sent to Keycloak and lands on the home screen', async ({ page }) => {
  await page.goto('/');

  await page.waitForURL(/localhost:8081\/auth\//, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible();

  await page.getByRole('textbox', { name: /username or email/i }).fill('dev');
  await page.getByRole('textbox', { name: /^password$/i }).fill('dev');
  await page.getByRole('button', { name: /^sign in$/i }).click();

  await page.waitForURL('http://localhost:3000/**', { timeout: 30_000 });
  // The painted-board header reads "Today", not "Quick Save": see feat/quick-save-plates.
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  // Seeded recommendations came back from the real API, rendered as enamel plates.
  await expect(page.getByRole('button', { name: 'Guinness pint' })).toBeVisible();
});
