import { test as setup, expect } from '@playwright/test';

setup('authenticate the dedicated admin user through Keycloak', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL(/localhost:8081\/auth\//, { timeout: 30_000 });
  await page.getByRole('textbox', { name: /username or email/i }).fill('admin');
  await page.getByRole('textbox', { name: /^password$/i }).fill('admin');
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL('http://localhost:3001/**', { timeout: 30_000 });
  await expect(page.getByRole('link', { name: 'Recommendations' })).toBeVisible();
  await page.context().storageState({ path: 'e2e/.auth/admin.json' });
});
