/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Without this, vitest's default glob also matches e2e/*.spec.ts and tries
    // to run Playwright specs in jsdom.
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      // Counting files no test imports is what makes this a real floor rather
      // than ~100% of whatever the suite already touches. Vitest 5 does this by
      // default, so listing `include` is enough; the old `all` flag is gone
      // from the type.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/vite-env.d.ts', 'src/main.tsx'],
      // A ratchet, not a target. Set just below the measured value at the time
      // the suite was introduced so coverage cannot regress. Raise it as tests
      // are added; do not lower it.
      //
      // Raised 2026-09-08 after the findings work in docs/fixes-2026-09-08.md,
      // from 91/85/89/93. Measured 93.67 / 86.95 / 92.81 / 95.15.
      //
      // Branches raised 2026-09-10, from 86, when saveDrink gained tests for both
      // sides of its deploy-skew shim. Measured 93.70 / 87.43 / 92.81 / 95.18.
      //
      // Raised 2026-09-11, from 93/87/92/95, after the Utolso Kor redesign.
      // Measured 97.60 / 92.44 / 94.78 / 98.15.
      //
      // Raised 2026-09-11, from 97/92/94/98, after the History lifecycle regressions.
      // Measured 98.38 / 93.48 / 96.92 / 98.67 across presence, cancellation and layout paths.
      thresholds: {
        statements: 98,
        branches: 93,
        functions: 96,
        lines: 98,
      },
    },
  },
})
