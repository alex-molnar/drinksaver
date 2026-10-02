import { test, expect } from '@playwright/test';
import { adminApi, chooseOption, deleteFixture, uniqueName } from './support';

test('edits live palette and glassware previews and exercises design CRUD and conflicts', async ({ page }, testInfo) => {
  const api = await adminApi(page);
  const paletteName = uniqueName('E2E palette');
  const glasswareName = uniqueName('E2E glass');
  const outline = 'M4 2h12v38H4Z';
  const liquid = 'M5 18h10v21H5Z';
  let paletteId: number | undefined;
  let glasswareId: number | undefined;
  let consumptionId: number | undefined;
  let recommendationId: number | undefined;

  try {
    await page.goto('/design?tab=palettes');
    await page.getByRole('button', { name: 'New palette' }).click();
    const paletteEditor = page.getByRole('dialog', { name: 'Create palette' });
    await paletteEditor.getByRole('textbox', { name: 'Name' }).fill(paletteName);
    await paletteEditor.getByRole('textbox', { name: 'Field colour', exact: true }).fill('#244466');
    await paletteEditor.getByRole('textbox', { name: 'Light ink', exact: true }).fill('#ffffff');
    await paletteEditor.getByRole('textbox', { name: 'Dark ink', exact: true }).fill('#102030');
    await expect(page.getByTestId('palette-preview-light')).toBeVisible();
    await expect(page.getByTestId('palette-preview-dark')).toBeVisible();
    await page.getByTestId('palette-preview-light').screenshot({ path: testInfo.outputPath('palette-preview.png') });
    const createPalette = page.waitForResponse((response) => response.url().endsWith('/v1/admin/design/color-palette') && response.request().method() === 'POST');
    await paletteEditor.getByRole('button', { name: 'Create palette' }).click();
    const paletteResponse = await createPalette;
    expect(paletteResponse.ok()).toBeTruthy();
    paletteId = (await paletteResponse.json()).id as number;
    await expect(page.getByRole('heading', { name: paletteName })).toBeVisible();

    await page.getByRole('button', { name: `Edit ${paletteName}` }).click();
    const paletteEdit = page.getByRole('dialog', { name: `Edit ${paletteName}` });
    await paletteEdit.getByRole('textbox', { name: 'Field colour', exact: true }).fill('#654321');
    await paletteEdit.getByRole('button', { name: 'Save palette' }).click();
    await expect(page.getByText(/Field: #654321/)).toBeVisible();

    await page.getByRole('tab', { name: 'Glassware' }).click();
    await page.getByRole('button', { name: 'New glassware' }).click();
    const glassEditor = page.getByRole('dialog', { name: 'Create glassware' });
    await glassEditor.getByRole('textbox', { name: 'Name' }).fill(glasswareName);
    await glassEditor.getByRole('textbox', { name: 'Outline path' }).fill(outline);
    await glassEditor.getByRole('textbox', { name: 'Liquid path' }).fill(liquid);
    await expect(page.getByTestId('glassware-preview').locator('svg path').last()).toHaveAttribute('d', outline);
    const createGlass = page.waitForResponse((response) => response.url().endsWith('/v1/admin/design/glassware') && response.request().method() === 'POST');
    await glassEditor.getByRole('button', { name: 'Create glassware' }).click();
    const glassResponse = await createGlass;
    expect(glassResponse.ok()).toBeTruthy();
    glasswareId = (await glassResponse.json()).id as number;
    await expect(page.getByRole('heading', { name: glasswareName })).toBeVisible();

    await page.getByRole('button', { name: `Edit ${glasswareName}` }).click();
    const glassEdit = page.getByRole('dialog', { name: `Edit ${glasswareName}` });
    await glassEdit.getByRole('textbox', { name: 'Outline path' }).fill('M7 2h12v38H7Z');
    await expect(page.getByTestId('glassware-preview').locator('svg path').last()).toHaveAttribute('d', 'M7 2h12v38H7Z');
    await glassEdit.getByRole('button', { name: 'Save glassware' }).click();

    await page.getByRole('tab', { name: 'Consumption types' }).click();
    const consumptionName = uniqueName('E2E consumption');
    await page.getByRole('button', { name: 'New consumption type' }).click();
    const consumptionEditor = page.getByRole('dialog', { name: 'Create consumption type' });
    await consumptionEditor.getByRole('textbox', { name: 'Name' }).fill(consumptionName);
    await chooseOption(page, 'Glassware', glasswareName);
    const createConsumption = page.waitForResponse((response) => response.url().endsWith('/v1/admin/default/beer/consumption-types') && response.request().method() === 'POST');
    await consumptionEditor.getByRole('button', { name: 'Create consumption type' }).click();
    const consumptionResponse = await createConsumption;
    expect(consumptionResponse.ok()).toBeTruthy();
    consumptionId = (await consumptionResponse.json()).id as number;
    await expect(page.getByRole('heading', { name: consumptionName })).toBeVisible();
    await page.getByRole('button', { name: `Edit ${consumptionName}` }).click();
    const consumptionEdit = page.getByRole('dialog', { name: `Edit ${consumptionName}` });
    const editedConsumption = `${consumptionName} edited`;
    await consumptionEdit.getByRole('textbox', { name: 'Name' }).fill(editedConsumption);
    await consumptionEdit.getByRole('button', { name: 'Save consumption type' }).click();
    await expect(page.getByRole('heading', { name: editedConsumption })).toBeVisible();

    const reference = await api.post('/v1/admin/recommendations', {
      data: { name: uniqueName('E2E palette reference'), alcoholTypeId: 4, consumptionTypeId: consumptionId, colorPaletteId: paletteId, glasswareId },
    });
    expect(reference.ok()).toBeTruthy();
    recommendationId = (await reference.json()).id as number;

    await page.getByRole('tab', { name: 'Palettes' }).click();
    await page.getByRole('button', { name: `Delete ${paletteName}` }).click();
    const paletteConflict = page.getByRole('dialog', { name: `Delete ${paletteName}?` });
    await paletteConflict.getByRole('button', { name: 'Confirm' }).click();
    await expect(paletteConflict.getByRole('alert')).toBeVisible();
    await paletteConflict.getByRole('button', { name: 'Cancel' }).click();
    await deleteFixture(api, `/v1/admin/recommendations/${recommendationId}`);
    recommendationId = undefined;

    await page.getByRole('tab', { name: 'Consumption types' }).click();
    await page.getByRole('button', { name: `Delete ${editedConsumption}` }).click();
    await page.getByRole('dialog', { name: `Delete ${editedConsumption}?` }).getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('heading', { name: editedConsumption })).toHaveCount(0);
    consumptionId = undefined;

    await page.getByRole('tab', { name: 'Glassware' }).click();
    await page.getByRole('button', { name: `Delete ${glasswareName}` }).click();
    await page.getByRole('dialog', { name: `Delete ${glasswareName}?` }).getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('heading', { name: glasswareName })).toHaveCount(0);
    glasswareId = undefined;

    await page.getByRole('tab', { name: 'Palettes' }).click();
    await page.getByRole('button', { name: `Delete ${paletteName}` }).click();
    await page.getByRole('dialog', { name: `Delete ${paletteName}?` }).getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('heading', { name: paletteName })).toHaveCount(0);
    paletteId = undefined;

  } finally {
    if (recommendationId !== undefined) await deleteFixture(api, `/v1/admin/recommendations/${recommendationId}`);
    if (consumptionId !== undefined) await deleteFixture(api, `/v1/admin/beer/consumption-types/${consumptionId}`);
    if (glasswareId !== undefined) await deleteFixture(api, `/v1/admin/design/glassware/${glasswareId}`);
    if (paletteId !== undefined) await deleteFixture(api, `/v1/admin/design/color-palette/${paletteId}`);
    await api.dispose();
  }
});
