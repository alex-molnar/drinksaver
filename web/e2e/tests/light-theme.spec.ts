import { expect, test } from '@playwright/test';

test('light theme is the final menu action, uses light palette ink and survives reload', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
  await page.evaluate(() => localStorage.removeItem('drinksaver-theme'));
  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Open menu' }).click();

  const menu = page.getByRole('menu');
  const items = menu.locator('[role^="menuitem"]');
  await expect(items).toHaveText(['Recommendations', 'Add new type', 'Logout', 'Light theme']);

  const toggle = page.getByRole('menuitemcheckbox', { name: 'Light theme' });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();

  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(menu).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#F3E8D4');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Heineken pint' })).toHaveCSS('color', 'rgb(255, 246, 227)');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Open menu' }).click();
  const restoredToggle = page.getByRole('menuitemcheckbox', { name: 'Light theme' });
  await expect(restoredToggle).toHaveAttribute('aria-checked', 'true');
  await restoredToggle.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
