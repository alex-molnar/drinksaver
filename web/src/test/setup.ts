import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only auto-cleans when it detects a global afterEach from a
// supported framework. Registering it explicitly keeps each test mounting into
// a fresh DOM regardless of how globals are configured.
afterEach(() => {
  cleanup();
});

// jsdom implements no layout, so it has no `scrollIntoView` at all: calling it throws rather
// than doing nothing. Components that legitimately scroll something into view (the day strip
// centres the current day, which would otherwise open off the right edge on a phone) should not
// have to carry a guard for a gap in the test environment, so it is stubbed here instead.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
