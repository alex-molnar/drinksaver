import { test, expect } from '@playwright/test';

test('editing a recommendation and saving navigates to home page', async ({ page }) => {
  const postSaveRequests: string[] = [];
  let saveStarted = false;

  // Mock the recommendations API
  await page.route('**/v1/recommendations/list', async (route) => {
    if (saveStarted) postSaveRequests.push('list');
    await route.fulfill({
      json: [
        {
          id: 7,
          userId: '423c91e4-491f-4f82-aba6-3c982857e0e4',
          name: 'Test Beer',
          alcoholTypeId: 4,
          alcoholVolumeId: 6,
          brandId: 2,
          beerFlavourId: 3,
          consumptionTypeId: 3,
          colorPaletteId: 2,
          glasswareId: 1,
        },
      ],
    });
  });

  // Mock the edit API
  await page.route('**/v1/recommendations/edit', async (route) => {
    if (saveStarted) postSaveRequests.push('edit');
    await route.fulfill({ status: 200 });
  });

  await page.goto('/recommendations');
  // The row itself has the name as accessible name, but there are multiple buttons with "Test Beer"
  // Use the row's data attribute to find it
  await expect(page.locator('[data-recommendation-row="7"]')).toBeVisible();

  // Click rename button (has exact name "Rename Test Beer")
  await page.getByRole('button', { name: 'Rename Test Beer', exact: true }).click();

  // Wait for the input to become enabled (editing mode) - the input might be disabled initially
  // Wait for editing mode to activate by checking if the Save name button appears
  await expect(page.getByRole('button', { name: 'Save name for Test Beer', exact: true })).toBeVisible({ timeout: 5_000 });

  // Now the input should be enabled
  const input = page.getByRole('textbox');

  // Clear and type new name
  await input.fill('Renamed Beer');

  // Click save name
  await page.getByRole('button', { name: 'Save name for Test Beer', exact: true }).click();

  // Click Save button in the bottom bar
  saveStarted = true;
  await page.getByRole('button', { name: 'Save' }).click();

  // Move mouse away from the strip to avoid pausing the undo timer
  await page.mouse.move(0, 0);

  // Wait for navigation to home page (happens after save commits)
  await expect(page).toHaveURL('/', { timeout: 15_000 });

  expect(postSaveRequests).toEqual(['edit', 'list']);
});
