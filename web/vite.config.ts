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
      // `all` counts files no test imports. Without it the report only covers
      // what the suite already touches and reads as ~100%, which is useless as
      // a floor.
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/vite-env.d.ts', 'src/main.tsx'],
      // A ratchet, not a target. Set just below the measured value at the time
      // the suite was introduced so coverage cannot regress. Raise it as tests
      // are added; do not lower it.
      thresholds: {
        statements: 2.5,
        branches: 7,
        functions: 3,
        lines: 2.5,
      },
    },
  },
})
