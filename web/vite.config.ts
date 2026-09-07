/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
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
      thresholds: {
        statements: 91,
        branches: 85,
        functions: 89,
        lines: 93,
      },
    },
  },
})
