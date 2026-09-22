import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only auto-cleans when it detects a global afterEach from a
// supported framework. Registering it explicitly keeps each test mounting into
// a fresh DOM regardless of how globals are configured.
afterEach(() => {
  cleanup();
});
