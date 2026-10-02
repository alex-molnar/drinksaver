import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './admin',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['html', { outputFolder: 'playwright-report/admin', open: 'never' }], ['list']]
    : [['list']],
  outputDir: 'test-results/admin',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.ADMIN_E2E_BASE_URL ?? 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'admin-setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'admin-chromium',
      testIgnore: /auth\.setup\.ts|non-admin\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
      dependencies: ['admin-setup'],
    },
    {
      name: 'admin-non-admin',
      testMatch: /non-admin\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
