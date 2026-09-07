import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the local compose stack, not a mock.
 *
 * `docker-compose up -d --build` from the repository root must be running, with
 * the web app on :3000, the backend on :8080 and Keycloak on :8081/auth.
 *
 * The `setup` project logs in once through the real Keycloak form and saves the
 * session, so the journey tests do not each pay for a redirect round trip. One
 * test deliberately performs the interactive login itself, because that is the
 * part most likely to break and the part storageState would otherwise hide.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      // login.spec.ts must NOT run here: this project is already authenticated
      // via storageState, so it would never see the Keycloak redirect.
      testIgnore: /login\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
    {
      // The interactive login cannot reuse a saved session, by definition.
      name: 'login',
      testMatch: /login\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
