import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHistoryLayoutMotion } from './useHistoryLayoutMotion';
import type { PaperTabRow } from './PaperTab';

const row = (id: number, gone = false): PaperTabRow => ({ drink: { id, name: `Drink ${id}`, alcoholTypeId: 4 }, selected: false, gone });
interface Motion { playState: string; cancel: ReturnType<typeof vi.fn> }
const motions: Motion[] = [];
const animate = vi.fn(function (this: HTMLElement) {
  const motion: Motion = { playState: 'running', cancel: vi.fn(() => { motion.playState = 'idle'; }) };
  motions.push(motion);
  return motion as unknown as Animation;
});

beforeEach(() => {
  motions.length = 0;
  animate.mockClear();
  vi.stubGlobal('DOMMatrix', class {
    m22: number; m42: number;
    constructor(value?: string) {
      const values = value?.slice(7, -1).split(',').map(Number);
      this.m22 = values?.[3] ?? 1;
      this.m42 = values?.[5] ?? 0;
    }
  });
  vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation(animate);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// jsdom has no animation API or layout; geometry is deliberately supplied by each case.
Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, writable: true, value: vi.fn() });

function setup(initial = [row(1), row(2, true), row(3), row(4)]) {
  const tab = document.createElement('div');
  const surface = document.createElement('div');
  surface.dataset.historyPaper = '';
  tab.append(surface);
  document.body.append(tab);
  let height = 300;
  Object.defineProperty(tab, 'offsetHeight', { get: () => height });
  const elements = new Map<number, HTMLElement>();
  const sync = (rows: PaperTabRow[], nextHeight: number) => {
    height = nextHeight;
    for (const node of elements.values()) node.remove();
    rows.forEach((item, i) => {
      const node = elements.get(item.drink.id) ?? document.createElement('div');
      node.dataset.historyRow = String(item.drink.id);
      node.toggleAttribute('data-gone', item.gone);
      Object.defineProperty(node, 'offsetTop', { configurable: true, get: () => i * 60 });
      elements.set(item.drink.id, node);
      tab.append(node);
    });
  };
  sync(initial, height);
  const ref = { current: tab };
  const hook = renderHook(({ rows, reduced }) => useHistoryLayoutMotion(ref, rows, reduced), { initialProps: { rows: initial, reduced: false } });
  return { tab, surface, elements,
    update(rows: PaperTabRow[], nextHeight: number, reduced = false) { sync(rows, nextHeight); hook.rerender({ rows, reduced }); },
    unmount() { hook.unmount(); tab.remove(); },
  };
}

describe('History layout motion', () => {
  it('does not animate ordinary query changes or initial rendering', () => {
    const view = setup([row(1), row(2)]);
    view.update([row(2), row(3)], 180);
    expect(animate).not.toHaveBeenCalled();
    view.unmount();
  });

  it('closes the removed row gap with translations and a separate paper scale', () => {
    const view = setup();
    view.update([row(1), row(3), row(4)], 240);
    expect(animate).toHaveBeenNthCalledWith(1, [{ transform: 'translateY(60px)' }, { transform: 'translateY(0)' }], expect.any(Object));
    expect(animate).toHaveBeenNthCalledWith(3, [{ transform: 'scaleY(1.25)' }, { transform: 'scaleY(1)' }], expect.any(Object));
    expect(animate.mock.contexts).toEqual([view.elements.get(3), view.elements.get(4), view.surface]);
    view.unmount();
    expect(motions.every((motion) => motion.cancel.mock.calls.length === 1)).toBe(true);
  });

  it('retargets a second removal from the current visual positions instead of restarting the jump', () => {
    const view = setup();
    view.update([row(1, true), row(3), row(4)], 240);
    const first = [...motions];
    view.elements.get(3)!.style.transform = 'matrix(1, 0, 0, 1, 0, 30)';
    view.surface.style.transform = 'matrix(1, 0, 0, 1.1, 0, 0)';
    view.update([row(3), row(4), row(5)], 240);
    expect(first.every((motion) => motion.cancel.mock.calls.length === 1)).toBe(true);
    expect(animate).toHaveBeenCalledWith([{ transform: 'translateY(90px)' }, { transform: 'translateY(0)' }], expect.any(Object));
    expect(animate).toHaveBeenCalledWith([{ transform: 'scaleY(1.1)' }, { transform: 'scaleY(1)' }], expect.any(Object));
    expect(animate.mock.contexts).not.toContain(view.elements.get(5));
    view.unmount();
  });

  it('does not restart an active animation for a selection-only render; reduced motion cancels it', () => {
    const view = setup();
    const remaining = [row(1), row(3), row(4)];
    view.update(remaining, 240);
    view.update(remaining, 240);
    expect(animate).toHaveBeenCalledTimes(3);
    view.update(remaining, 240, true);
    expect(animate).toHaveBeenCalledTimes(3);
    expect(motions.every((motion) => motion.cancel.mock.calls.length === 1)).toBe(true);
    view.unmount();
  });

  it('does not animate a later refresh just because an old movement completed', () => {
    const view = setup();
    view.update([row(1), row(3), row(4)], 240);
    motions.forEach((motion) => { motion.playState = 'finished'; });
    view.update([row(1), row(4)], 180);
    expect(animate).toHaveBeenCalledTimes(3);
    view.unmount();
  });

  it('handles an empty layout and a browser without WAAPI without leaving animated offsets', () => {
    const view = setup();
    view.update([], 0);
    expect(animate).not.toHaveBeenCalled();
    view.update([row(1, true)], 60);
    Object.defineProperty(view.tab, 'animate', { value: undefined });
    view.update([], 80);
    expect(animate).not.toHaveBeenCalled();
    view.unmount();
  });
});
