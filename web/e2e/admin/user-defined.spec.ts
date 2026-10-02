import { test, expect } from '@playwright/test';
import { adminApi, consumerApi, deleteFixture, uniqueName } from './support';

test('publishes a filtered user type without promoting its child', async ({ page, request }) => {
  const cleanup = await adminApi(page);
  const consumer = await consumerApi(request);
  const typeName = uniqueName('E2E user type');
  const childName = uniqueName('E2E user child');
  const otherName = uniqueName('E2E untouched type');
  let typeId: number | undefined;
  let childId: number | undefined;
  let otherId: number | undefined;

  try {
    const created = await consumer.post('/v1/alcohol/types', {
      data: { name: typeName, colorPaletteId: 1, glasswareId: 1 },
    });
    expect(created.ok()).toBeTruthy();
    typeId = (await created.json()).id as number;
    const child = await consumer.post(`/v1/alcohol/types/${typeId}/subtypes`, {
      data: { alcoholTypeId: typeId, name: childName, colorPaletteId: 1, glasswareId: 1 },
    });
    expect(child.ok()).toBeTruthy();
    childId = (await child.json()).id as number;
    const other = await consumer.post('/v1/alcohol/types', {
      data: { name: otherName, colorPaletteId: 1, glasswareId: 1 },
    });
    expect(other.ok()).toBeTruthy();
    otherId = (await other.json()).id as number;

    await page.goto('/user-defined?kind=types');
    const search = page.getByRole('textbox', { name: 'Search user-defined types' });
    await search.fill(typeName);
    await expect(page.getByRole('heading', { name: typeName })).toBeVisible();
    await expect(page.getByRole('heading', { name: otherName })).toHaveCount(0);
    await page.getByRole('button', { name: `Publish ${typeName}` }).click();
    const dialog = page.getByRole('dialog', { name: `Publish ${typeName}?` });
    await dialog.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('heading', { name: typeName })).toHaveCount(0);
    await search.fill('');
    await expect(page.getByRole('heading', { name: otherName })).toBeVisible();

    await page.goto('/alcohol-types');
    await expect(page.getByRole('heading', { name: typeName })).toBeVisible();
    await page.goto(`/alcohol-types/${typeId}/subtypes`);
    await expect(page.getByRole('heading', { name: 'Nothing here yet' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Nothing here yet' })).toBeVisible();

    await page.goto(`/user-defined?kind=subtypes&parentId=${typeId}`);
    await expect(page.getByRole('heading', { name: childName })).toBeVisible();
  } finally {
    if (childId !== undefined) await deleteFixture(cleanup, `/v1/admin/alcohol/subtypes/${childId}`);
    if (typeId !== undefined) {
      const children = await cleanup.get(`/v1/admin/user-defined/alcohol/types/${typeId}/subtypes`);
      for (const child of await children.json() as { id: number; name: string }[]) {
        if (child.name === childName) await deleteFixture(cleanup, `/v1/admin/alcohol/subtypes/${child.id}`);
      }
      await deleteFixture(cleanup, `/v1/admin/alcohol/types/${typeId}`);
    }
    if (otherId !== undefined) await deleteFixture(cleanup, `/v1/admin/alcohol/types/${otherId}`);
    await consumer.dispose();
    await cleanup.dispose();
  }
});
