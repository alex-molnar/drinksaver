import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Keep each test mounted into a fresh DOM regardless of framework auto-cleanup support.
afterEach(() => {
  cleanup();
});
