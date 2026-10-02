import { test, expect } from '@playwright/test';
import { adminApi, chooseOption, deleteFixture, uniqueName } from './support';

test('uses read-only volumes and persists recommendation order and name-only edits', async ({ page }) => {
  const api = await adminApi(page);
  const name = uniqueName('E2E recommendation');
  const editedName = `${name} renamed`;
  let recommendationId: number | undefined;
  let companionId: number | undefined;

  try {
    await page.goto('/recommendations');
    await page.getByRole('button', { name: 'New recommendation' }).click();
    const editor = page.getByRole('dialog', { name: 'Create recommendation' });
    await editor.getByRole('button', { name: 'Create recommendation' }).click();
    await expect(editor).toBeVisible();
    expect(await editor.getByRole('textbox', { name: 'Name' }).evaluate((element: HTMLInputElement) => element.validity.valueMissing)).toBeTruthy();
    await editor.getByRole('textbox', { name: 'Name' }).fill('   ');
    await chooseOption(page, 'Alcohol type', 'Beer');
    await chooseOption(page, 'Palette', 'brown');
    await chooseOption(page, 'Glassware', 'pint');
    await editor.getByRole('button', { name: 'Create recommendation' }).click();
    await expect(editor).toBeVisible();
    expect(await editor.getByRole('textbox', { name: 'Name' }).evaluate((element: HTMLInputElement) => element.validity.patternMismatch)).toBeTruthy();
    await editor.getByRole('textbox', { name: 'Name' }).fill(name);
    const volumes = page.getByRole('combobox', { name: 'Alcohol volume (optional)' });
    await volumes.click();
    const volumeOptions = page.getByRole('option');
    await expect(volumeOptions).toHaveCount(4);
    await volumeOptions.nth(1).click();
    await expect(editor.getByRole('button', { name: /volume|manage/i })).toHaveCount(0);
    await chooseOption(page, 'Palette', 'brown');
    await chooseOption(page, 'Glassware', 'pint');

    const create = page.waitForResponse((response) => response.url().endsWith('/v1/admin/recommendations') && response.request().method() === 'POST');
    await editor.getByRole('button', { name: 'Create recommendation' }).click();
    const created = await create;
    expect(created.ok()).toBeTruthy();
    recommendationId = (await created.json()).id as number;
    const card = page.locator('.recommendation-card').filter({ hasText: name });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: `Rename ${name}` }).click();
    const rename = page.getByRole('dialog', { name: `Rename ${name}` });
    await rename.getByRole('textbox', { name: 'Name' }).fill(editedName);
    const renameResponse = page.waitForResponse((response) => response.url().endsWith('/v1/admin/recommendations/edit') && response.request().method() === 'PATCH');
    await rename.getByRole('button', { name: 'Save name' }).click();
    const renamed = await renameResponse;
    expect(renamed.ok()).toBeTruthy();
    const nameOnlyBody = renamed.request().postDataJSON() as { id: number; name: string }[];
    expect(nameOnlyBody).toContainEqual({ id: recommendationId, name: editedName });
    expect(nameOnlyBody.every((row) => Object.keys(row).sort().join(',') === 'id,name')).toBeTruthy();
    await expect(page.locator('.recommendation-card').filter({ hasText: editedName })).toBeVisible();

    const companion = await api.post('/v1/admin/recommendations', {
      data: { name: uniqueName('E2E companion'), alcoholTypeId: 4, colorPaletteId: 2, glasswareId: 1 },
    });
    expect(companion.ok()).toBeTruthy();
    companionId = (await companion.json()).id as number;
    await page.reload();
    await expect(page.locator('.recommendation-card')).toHaveCount(2);

    const beforeMove = await page.locator('.recommendation-card h2').allTextContents();
    const currentIndex = beforeMove.map((heading) => heading.replace(/^\s*\d+\.\s*/, '').trim()).indexOf(editedName);
    const moveDirection = currentIndex === 0 ? 'down' : 'up';
    const moveResponse = page.waitForResponse((response) => response.url().endsWith('/v1/admin/recommendations/edit') && response.request().method() === 'PATCH');
    await page.locator('.recommendation-card').filter({ hasText: editedName }).getByRole('button', { name: `Move ${moveDirection}` }).click();
    const moved = await moveResponse;
    expect(moved.ok()).toBeTruthy();
    const afterMove = await page.locator('.recommendation-card h2').allTextContents();
    const nameFromHeading = (heading: string) => heading.replace(/^\s*\d+\.\s*/, '').trim();
    const beforeNames = beforeMove.map(nameFromHeading);
    const afterNames = afterMove.map(nameFromHeading);
    expect(afterNames.indexOf(editedName)).toBe(beforeNames.indexOf(editedName) + (moveDirection === 'down' ? 1 : -1));

    await page.locator('.recommendation-card').filter({ hasText: editedName }).getByRole('button', { name: `Delete ${editedName}` }).click();
    await page.getByRole('dialog', { name: `Delete ${editedName}?` }).getByRole('button', { name: 'Confirm' }).click();
    await expect(page.locator('.recommendation-card').filter({ hasText: editedName })).toHaveCount(0);
    recommendationId = undefined;
  } finally {
    if (recommendationId !== undefined) await deleteFixture(api, `/v1/admin/recommendations/${recommendationId}`);
    if (companionId !== undefined) await deleteFixture(api, `/v1/admin/recommendations/${companionId}`);
    await api.dispose();
  }
});
