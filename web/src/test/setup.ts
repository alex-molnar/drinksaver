import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only auto-cleans when it detects a global afterEach from a
// supported framework. Registering it explicitly keeps each test mounting into
// a fresh DOM regardless of how globals are configured.
afterEach(() => {
  cleanup();
});

/**
 * jsdom gives every element a zero-size rect, and dnd-kit's sortable computes its drop target
 * from real geometry. Without a size, a keyboard reorder resolves every row to the same point
 * and the list never moves. Stubbing only rows keeps the fiction as small as possible - except
 * for one thing rows alone cannot supply: `@dnd-kit/modifiers`' `restrictToParentElement` reads
 * the dragged row's own DOM parent's rect (`containerNodeRect`) to clamp the drag transform, and
 * a real (zero-size) rect there clamps every reorder back to a no-op. So an element that is an
 * ancestor of stubbed rows gets a rect enclosing them; every other element still gets the real,
 * zero-size jsdom rect, which is what keeps this stub from leaking into unrelated layout tests.
 */
const ROW_HEIGHT = 48;
const realRect = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function getBoundingClientRect(this: Element) {
  const row = this instanceof HTMLElement ? this.dataset.recommendationRow : undefined;
  if (row !== undefined) {
    const index = Number(this.getAttribute('data-recommendation-index') ?? 0);
    const top = index * ROW_HEIGHT;
    return {
      x: 0, y: top, top, left: 0, right: 320, bottom: top + ROW_HEIGHT,
      width: 320, height: ROW_HEIGHT, toJSON: () => ({}),
    } as DOMRect;
  }
  const descendantRows = this.querySelectorAll?.('[data-recommendation-row]') ?? [];
  if (descendantRows.length > 0) {
    const count = descendantRows.length;
    return {
      x: 0, y: 0, top: 0, left: 0, right: 320, bottom: count * ROW_HEIGHT,
      width: 320, height: count * ROW_HEIGHT, toJSON: () => ({}),
    } as DOMRect;
  }
  return realRect.call(this);
};
