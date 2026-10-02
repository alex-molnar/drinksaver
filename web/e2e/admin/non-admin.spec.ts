import { test, expect } from '@playwright/test';
import { consumerApi } from './support';

test('consumer user cannot open the panel or call an admin endpoint', async ({ page, request }) => {
  const api = await consumerApi(request);
  try {
    const denied = await api.get('/v1/admin/default/alcohol/types');
    expect(denied.status()).toBe(403);
  } finally {
    await api.dispose();
  }

  await page.goto('/');
  await page.waitForURL(/localhost:8081\/auth\//, { timeout: 30_000 });
  await page.getByRole('textbox', { name: /username or email/i }).fill('dev');
  await page.getByRole('textbox', { name: /^password$/i }).fill('dev');
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await expect(page.getByRole('heading', { name: 'Not authorised' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Alcohol types' })).toHaveCount(0);
});
