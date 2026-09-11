import { test as setup, expect } from '@playwright/test';

/**
 * Logs in through the real Keycloak form once and saves the session for the
 * journey tests. The credentials come from deploy/local/keycloak-realm.json and
 * are local throwaways.
 */
setup('authenticate', async ({ page, browserName }) => {
  await page.goto('/');

  // Keycloak owns the login form, so wait for its origin rather than a selector
  // that might exist on our own page.
  await page.waitForURL(/localhost:8081\/auth\//, { timeout: 30_000 });

  // Target roles, not labels: Keycloak renders a "Show password" button whose
  // accessible name also matches /password/i.
  await page.getByRole('textbox', { name: /username or email/i }).fill('dev');
  await page.getByRole('textbox', { name: /^password$/i }).fill('dev');
  await page.getByRole('button', { name: /^sign in$/i }).click();

  await page.waitForURL('http://localhost:3000/**', { timeout: 30_000 });
  await expect(page.locator('body')).toBeVisible();

  await page.context().storageState({ path: `e2e/.auth/${browserName === 'webkit' ? 'webkit-user' : 'user'}.json` });
});
