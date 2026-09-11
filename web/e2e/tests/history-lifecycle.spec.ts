import { writeFile } from 'node:fs/promises';
import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import type { Recommendation, SavedDrink } from '../../src/types/api';

test.use({ video: 'on' });
const TODAY = '2026-09-11';
const YESTERDAY = '2026-09-10';
const EMPTY = '2026-09-09';
const drinks = [1, 2, 3, 4].map((id) => ({ id: 80_000 + id, name: `Lifecycle drink ${id}`, alcoholTypeId: 4 }));
const otherDay = [{ id: 81_001, name: 'Yesterday only', alcoholTypeId: 4 }];

async function openFixture(page: Page) {
  await page.clock.setFixedTime(new Date(2026, 8, 11, 12));
  await page.route('**/v1/drinks/date/*', (route) => route.fulfill({ json:
    route.request().url().endsWith(TODAY) ? drinks : route.request().url().endsWith(YESTERDAY) ? otherDay : [],
  }));
  await page.route('**/v1/drinks/byIds?*', (route) => route.fulfill({ json: 1 }));
  await page.goto('/history');
  await expect(page.getByRole('button', { name: drinks[1].name, exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

interface Frame {
  present: boolean; sameNode: boolean; scale: number; opacity: number;
  top: number; height: number; nextTop: number; order: string[];
}

async function recordExit(row: Locator) {
  await row.evaluate((original) => {
    const host = window as unknown as { exitFrames: Frame[]; exitDone: boolean };
    const parent = original.parentElement!;
    const next = original.nextElementSibling!;
    const selector = `[data-history-row="${original.getAttribute('data-history-row')}"]`;
    host.exitFrames = [];
    host.exitDone = false;
    const start = performance.now();
    function sample() {
      const current = parent.querySelector(selector);
      const stroke = original.querySelector<HTMLElement>('[data-history-strike]')!;
      const rect = original.getBoundingClientRect();
      const value = getComputedStyle(stroke).transform;
      host.exitFrames.push({ present: !!current, sameNode: current === original,
        scale: value && value !== 'none' ? new DOMMatrix(value).a : 0,
        opacity: Number(getComputedStyle(original).opacity), top: rect.top, height: rect.height,
        nextTop: next.getBoundingClientRect().top,
        order: [...parent.querySelectorAll(':scope > [role="button"]')].map((row) => row.getAttribute('aria-label')!),
      });
      if (performance.now() - start < 1000) requestAnimationFrame(sample);
      else host.exitDone = true;
    }
    requestAnimationFrame(sample);
  });
}

async function exitFrames(page: Page) {
  await page.waitForFunction(() => (window as unknown as { exitDone: boolean }).exitDone);
  return page.evaluate(() => (window as unknown as { exitFrames: Frame[] }).exitFrames);
}

async function attachFrames(info: TestInfo, name: string, frames: Frame[]) {
  const path = info.outputPath(name);
  await writeFile(path, JSON.stringify(frames, null, 2));
  await info.attach(name, { path, contentType: 'application/json' });
}

test('strike draws on the original middle row before removal and the gap settles without a final jump', async ({ page }, info) => {
  await openFixture(page);
  await recordExit(page.getByRole('button', { name: drinks[1].name, exact: true }));
  await page.getByRole('button', { name: `Cross off ${drinks[1].name}`, exact: true }).click();
  const frames = await exitFrames(page);
  await attachFrames(info, 'strike-frames.json', frames);
  const drawing = frames.filter((frame) => frame.scale > 0.1 && frame.scale < 0.95);
  expect(drawing.length).toBeGreaterThan(0);
  for (const frame of drawing) {
    expect(frame.sameNode).toBe(true);
    expect(frame.order).toEqual(drinks.map((drink) => drink.name));
    expect(frame.opacity).toBe(1);
    expect(frame.height).toBeCloseTo(frames[0].height, 1);
  }
  expect(frames.some((frame) => frame.present && frame.scale > 0.95 && frame.opacity < 1 && frame.opacity > 0)).toBe(true);
  const settled = frames.slice(-5);
  expect(settled.every((frame) => !frame.present)).toBe(true);
  expect(Math.max(...settled.map((frame) => frame.nextTop)) - Math.min(...settled.map((frame) => frame.nextTop))).toBeLessThan(1);
  const initialTop = frames[0].nextTop;
  const finalTop = settled[0].nextTop;
  expect(initialTop - finalTop).toBeGreaterThan(20);
  expect(frames.some((frame) => !frame.present && frame.nextTop > finalTop + 1 && frame.nextTop < initialTop - 1)).toBe(true);
  await expect(page.getByText('3 drinks', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
});

test('Undo during the stroke keeps the same row, cancels cleanup and permits another cross-off', async ({ page }) => {
  await openFixture(page);
  const row = page.getByRole('button', { name: drinks[1].name, exact: true });
  await row.evaluate((element) => { (window as unknown as { original: Element }).original = element; });
  await page.getByRole('button', { name: `Cross off ${drinks[1].name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(row).toHaveCount(1);
  expect(await row.evaluate((element) => element === (window as unknown as { original: Element }).original)).toBe(true);
  await recordExit(row);
  await page.getByRole('button', { name: `Cross off ${drinks[1].name}`, exact: true }).click();
  const frames = await exitFrames(page);
  expect(frames.some((frame) => frame.scale > 0.1 && frame.scale < 0.95)).toBe(true);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(row).toHaveCount(1);
});

test('cached date switches never show another day or turn navigation into a strike-off', async ({ page }) => {
  await openFixture(page);
  for (const date of [YESTERDAY, EMPTY, TODAY, YESTERDAY, TODAY]) {
    await page.getByLabel('Pick a date').fill(date);
    const names = date === TODAY ? drinks.map((drink) => drink.name) : date === YESTERDAY ? ['Yesterday only'] : [];
    // Observe successive painted frames, including the old 320ms phantom-row interval.
    const samples = await page.getByRole('region', { name: 'Drinks for selected day' }).evaluate(async (region) => {
      const result: { names: (string | null)[]; exiting: number }[] = [];
      for (let i = 0; i < 8; i++) {
        await new Promise(requestAnimationFrame);
        result.push({ names: [...region.querySelectorAll('[role="button"]')].map((row) => row.getAttribute('aria-label')),
          exiting: region.querySelectorAll('[data-gone]').length });
      }
      return result;
    });
    for (const sample of samples) {
      expect(sample.names).toEqual(names);
      expect(sample.exiting).toBe(0);
    }
    await expect(page.getByText(names.length ? `${names.length} ${names.length === 1 ? 'drink' : 'drinks'}` : 'nothing', { exact: true })).toBeVisible();
  }
});

test('bulk deletion, navigation during exit and Undo on the other date stay independent', async ({ page }) => {
  await openFixture(page);
  for (const drink of drinks.slice(1, 3)) await page.getByRole('button', { name: drink.name, exact: true }).click();
  await page.getByRole('button', { name: 'Delete selected' }).click();
  await page.getByLabel('Pick a date').fill(YESTERDAY);
  await expect(page.getByRole('button', { name: 'Yesterday only', exact: true })).toBeVisible();
  await expect(page.locator('[data-gone]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('1 drink', { exact: true })).toBeVisible();
  await page.getByLabel('Pick a date').fill(TODAY);
  for (const drink of drinks) await expect(page.getByRole('button', { name: drink.name, exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Delete selected' })).toHaveCount(0);
});

test('loading and a late response from an abandoned date cannot bring back its rows', async ({ page }) => {
  await openFixture(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/v1/drinks/date/2026-08-01', async (route) => {
    await held;
    await route.fulfill({ json: [{ id: 82_001, name: 'Late abandoned day', alcoholTypeId: 4 }] });
  });
  await page.getByLabel('Pick a date').fill('2026-08-01');
  await expect(page.getByRole('status').filter({ hasText: 'Loading' })).toBeVisible();
  expect(await page.locator('[data-history-row]').count()).toBe(0);
  await page.getByLabel('Pick a date').fill(YESTERDAY);
  const response = page.waitForResponse('**/v1/drinks/date/2026-08-01');
  release();
  await response;
  await expect(page.locator('[data-history-row]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Yesterday only', exact: true })).toBeVisible();
  await expect(page.getByText('1 drink', { exact: true })).toBeVisible();
  expect(await page.locator('[data-gone]').count()).toBe(0);
});

test('Undo during the fade restores the original row, and changing to reduced motion cancels a new exit', async ({ page }) => {
  await openFixture(page);
  const row = page.locator(`[data-history-row="${drinks[1].id}"]`);
  await row.evaluate((element) => { (window as unknown as { original: Element }).original = element; });
  await row.getByRole('button', { name: `Cross off ${drinks[1].name}` }).click();
  // Hold the actual fade once it has painted so the Undo click deterministically lands in it.
  await page.waitForFunction((id) => {
    const row = document.querySelector<HTMLElement>(`[data-history-row="${id}"]`)!;
    const opacity = Number(getComputedStyle(row).opacity);
    if (opacity <= 0 || opacity >= 1) return false;
    row.getAnimations().forEach((animation) => animation.pause());
    return true;
  }, drinks[1].id);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await row.evaluate((element) => element === (window as unknown as { original: Element }).original)).toBe(true);
  await expect(row).toHaveCSS('opacity', '1');
  expect(await row.evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) =>
    (animation.effect as KeyframeEffect).getKeyframes().some((frame) => 'transform' in frame || 'opacity' in frame)).length)).toBe(0);
  await row.getByRole('button', { name: `Cross off ${drinks[1].name}` }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(row).toHaveCount(0);
  expect(await page.locator('[data-gone]').count()).toBe(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(row).toHaveCount(1);
});

test('reduced motion removes rows immediately and leaves Undo available', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFixture(page);
  await page.getByRole('button', { name: `Cross off ${drinks[1].name}`, exact: true }).click();
  expect(await page.locator('[data-gone]').count()).toBe(0);
  expect(await page.evaluate(() => document.getAnimations().filter((animation) => {
    const target = (animation.effect as KeyframeEffect).target;
    return animation.playState === 'running' && target?.matches('[data-history-row], [data-history-strike], [data-history-paper]');
  }).length)).toBe(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: drinks[1].name, exact: true })).toHaveCount(1);
});

test('a real saved batch draws in place, closes the bulk gap and survives Undo and reload', async ({ page }, info) => {
  const request = page.waitForRequest((request) => request.url().endsWith('/v1/recommendations/list'));
  await page.goto('/');
  const recommendationRequest = await request;
  const headers = { authorization: (await recommendationRequest.headerValue('authorization'))! };
  const api = recommendationRequest.url().replace('/v1/recommendations/list', '');
  const recommendations = await page.request.get(`${api}/v1/recommendations/list`, { headers });
  expect(recommendations.ok()).toBe(true);
  const [recommendation] = await recommendations.json() as Recommendation[];
  const { alcoholTypeId, alcoholSubtypeId, alcoholVolumeId, brandId, beerFlavourId, consumptionTypeId } = recommendation;
  const date = '2026-08-20';
  const saved = await page.request.post(`${api}/v1/drinks/new`, { headers, data: {
    date, quantity: 4, alcoholTypeId, alcoholSubtypeId, alcoholVolumeId, brandId, beerFlavourId, consumptionTypeId,
  } });
  expect(saved.ok()).toBe(true);
  const entries = await saved.json() as SavedDrink[];
  expect(entries).toHaveLength(4);
  try {
    await page.goto('/history');
    await page.getByLabel('Pick a date').fill(date);
    const batch = page.locator(entries.map(({ id }) => `[data-history-row="${id}"]`).join(','));
    await expect(batch).toHaveCount(4);
    await page.evaluate(() => document.fonts.ready);
    await batch.nth(1).click();
    await batch.nth(2).click();
    await recordExit(batch.nth(1));
    await page.getByRole('button', { name: 'Delete selected' }).click();
    const frames = await exitFrames(page);
    await attachFrames(info, 'real-batch-strike-frames.json', frames);
    expect(frames.some((frame) => frame.sameNode && frame.scale > 0.1 && frame.scale < 0.95 && frame.opacity === 1)).toBe(true);
    expect(frames.filter((frame) => frame.present).every((frame) => frame.sameNode)).toBe(true);
    await expect(batch).toHaveCount(2);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(batch).toHaveCount(4);
    await page.reload();
    await page.getByLabel('Pick a date').fill(date);
    await expect(batch).toHaveCount(4);
  } finally {
    // Only remove this test's disposable records, even if a visual assertion fails.
    const query = new URLSearchParams(entries.map(({ id }) => ['drinkIds', String(id)]));
    const cleanup = await page.request.delete(`${api}/v1/drinks/byIds?${query}`, { headers });
    expect(cleanup.ok()).toBe(true);
  }
});
