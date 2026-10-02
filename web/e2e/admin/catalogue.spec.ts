import { test, expect } from '@playwright/test';
import { adminApi, chooseOption, deleteFixture, uniqueName } from './support';

test('creates, edits and deletes a default type with its initial child', async ({ page }) => {
  const api = await adminApi(page);
  const typeName = uniqueName('E2E spirit');
  const editedTypeName = `${typeName} edited`;
  const childName = uniqueName('E2E subtype');
  const editedChildName = `${childName} edited`;
  let typeId: number | undefined;
  let childId: number | undefined;

  try {
    await page.goto('/alcohol-types');
    await page.getByRole('button', { name: 'New alcohol type' }).click();
    const editor = page.getByRole('dialog', { name: 'Create alcohol type' });
    await editor.getByRole('textbox', { name: 'Name' }).fill(typeName);
    await chooseOption(page, 'Palette', 'green');
    await chooseOption(page, 'Glassware', 'pint');
    await editor.getByRole('button', { name: 'Add initial subtype' }).click();
    await editor.getByRole('textbox', { name: 'Initial subtype 1' }).fill(childName);
    const created = page.waitForResponse((response) => response.url().endsWith('/v1/admin/default/alcohol/types') && response.request().method() === 'POST');
    await editor.getByRole('button', { name: 'Create type' }).click();
    const typeResponse = await created;
    expect(typeResponse.ok()).toBeTruthy();
    typeId = (await typeResponse.json()).id as number;
    await expect(page.getByRole('heading', { name: typeName })).toBeVisible();

    const children = await api.get(`/v1/admin/default/alcohol/types/${typeId}/subtypes`);
    childId = ((await children.json()) as { id: number; name: string }[]).find((row) => row.name === childName)?.id;
    expect(childId).toBeDefined();

    await page.goto(`/alcohol-types/${typeId}/subtypes`);
    await expect(page.getByRole('heading', { name: `Subtypes for ${typeName}` })).toBeVisible();
    await expect(page.getByRole('heading', { name: childName })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: childName })).toBeVisible();

    await page.getByRole('button', { name: `Edit ${childName}` }).click();
    const edit = page.getByRole('dialog', { name: `Edit ${childName}` });
    await edit.getByRole('textbox', { name: 'Name' }).fill(editedChildName);
    const patch = page.waitForResponse((response) => response.url().endsWith(`/v1/admin/alcohol/subtypes/${childId}`) && response.request().method() === 'PATCH');
    await edit.getByRole('button', { name: 'Save subtype' }).click();
    expect((await patch).ok()).toBeTruthy();
    await expect(page.getByRole('heading', { name: editedChildName })).toBeVisible();

    await page.getByRole('button', { name: `Delete ${editedChildName}` }).click();
    await page.getByRole('dialog', { name: `Delete ${editedChildName}?` }).getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('heading', { name: editedChildName })).toHaveCount(0);
    childId = undefined;

    await page.goto('/alcohol-types');
    await page.getByRole('button', { name: `Edit ${typeName}` }).click();
    const editType = page.getByRole('dialog', { name: 'Edit alcohol type' });
    await editType.getByRole('textbox', { name: 'Name' }).fill(editedTypeName);
    const typePatch = page.waitForResponse((response) => response.url().endsWith(`/v1/admin/alcohol/types/${typeId}`) && response.request().method() === 'PATCH');
    await editType.getByRole('button', { name: 'Save type' }).click();
    expect((await typePatch).ok()).toBeTruthy();
    await expect(page.getByRole('heading', { name: editedTypeName })).toBeVisible();
    await page.getByRole('button', { name: `Delete ${editedTypeName}` }).click();
    await page.getByRole('dialog', { name: `Delete ${editedTypeName}?` }).getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('heading', { name: editedTypeName })).toHaveCount(0);
    typeId = undefined;
  } finally {
    if (childId !== undefined) await deleteFixture(api, `/v1/admin/alcohol/subtypes/${childId}`);
    if (typeId !== undefined) {
      const children = await api.get(`/v1/admin/default/alcohol/types/${typeId}/subtypes`);
      for (const child of await children.json() as { id: number; name: string }[]) {
        if (child.name === childName || child.name === editedChildName) await deleteFixture(api, `/v1/admin/alcohol/subtypes/${child.id}`);
      }
      await deleteFixture(api, `/v1/admin/alcohol/types/${typeId}`);
    }
    await api.dispose();
  }
});

test('creates, edits and deletes a default beer brand with its initial flavour', async ({ page }) => {
  const api = await adminApi(page);
  const brandName = uniqueName('E2E brewery');
  const editedBrandName = `${brandName} edited`;
  const flavourName = uniqueName('E2E lager');
  const editedFlavourName = `${flavourName} edited`;
  let brandId: number | undefined;
  let flavourId: number | undefined;

  try {
    await page.goto('/beer-brands');
    await page.getByRole('button', { name: 'New beer brand' }).click();
    const editor = page.getByRole('dialog', { name: 'Create beer brand' });
    await editor.getByRole('textbox', { name: 'Name' }).fill(brandName);
    await chooseOption(page, 'Palette', 'green');
    await editor.getByRole('button', { name: 'Add initial flavour' }).click();
    await editor.getByRole('textbox', { name: 'Initial flavour 1' }).fill(flavourName);
    const created = page.waitForResponse((response) => response.url().endsWith('/v1/admin/default/beer/brands') && response.request().method() === 'POST');
    await editor.getByRole('button', { name: 'Create brand' }).click();
    const brandResponse = await created;
    expect(brandResponse.ok()).toBeTruthy();
    brandId = (await brandResponse.json()).id as number;
    await expect(page.getByRole('heading', { name: brandName })).toBeVisible();

    const children = await api.get(`/v1/admin/default/beer/brands/${brandId}/flavours`);
    flavourId = ((await children.json()) as { id: number; name: string }[]).find((row) => row.name === flavourName)?.id;
    expect(flavourId).toBeDefined();
    await page.goto(`/beer-brands/${brandId}/flavours`);
    await expect(page.getByRole('heading', { name: `Flavours for ${brandName}` })).toBeVisible();
    await expect(page.getByRole('heading', { name: flavourName })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: flavourName })).toBeVisible();

    await page.getByRole('button', { name: `Edit ${flavourName}` }).click();
    const edit = page.getByRole('dialog', { name: `Edit ${flavourName}` });
    await edit.getByRole('textbox', { name: 'Name' }).fill(editedFlavourName);
    await edit.getByRole('button', { name: 'Save flavour' }).click();
    await expect(page.getByRole('heading', { name: editedFlavourName })).toBeVisible();

    await page.getByRole('button', { name: `Delete ${editedFlavourName}` }).click();
    await page.getByRole('dialog', { name: `Delete ${editedFlavourName}?` }).getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('heading', { name: editedFlavourName })).toHaveCount(0);
    flavourId = undefined;

    await page.goto('/beer-brands');
    await page.getByRole('button', { name: `Edit ${brandName}` }).click();
    const editBrand = page.getByRole('dialog', { name: 'Edit beer brand' });
    await editBrand.getByRole('textbox', { name: 'Name' }).fill(editedBrandName);
    const brandPatch = page.waitForResponse((response) => response.url().endsWith(`/v1/admin/beer/brands/${brandId}`) && response.request().method() === 'PATCH');
    await editBrand.getByRole('button', { name: 'Save brand' }).click();
    expect((await brandPatch).ok()).toBeTruthy();
    await expect(page.getByRole('heading', { name: editedBrandName })).toBeVisible();
    await page.getByRole('button', { name: `Delete ${editedBrandName}` }).click();
    await page.getByRole('dialog', { name: `Delete ${editedBrandName}?` }).getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('heading', { name: editedBrandName })).toHaveCount(0);
    brandId = undefined;
  } finally {
    if (flavourId !== undefined) await deleteFixture(api, `/v1/admin/beer/brands/flavours/${flavourId}`);
    if (brandId !== undefined) {
      const children = await api.get(`/v1/admin/default/beer/brands/${brandId}/flavours`);
      for (const child of await children.json() as { id: number; name: string }[]) {
        if (child.name === flavourName || child.name === editedFlavourName) await deleteFixture(api, `/v1/admin/beer/brands/flavours/${child.id}`);
      }
      await deleteFixture(api, `/v1/admin/beer/brands/${brandId}`);
    }
    await api.dispose();
  }
});
