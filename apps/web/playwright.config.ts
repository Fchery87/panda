import { defineConfig, devices } from '@playwright/test'

const chromiumProject = {
  name: 'chromium',
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chromium',
  },
}

const mobileChromeProject = {
  name: 'Mobile Chrome',
  use: {
    ...devices['Pixel 5'],
    channel: 'chromium',
  },
}

const browserProjects =
  process.env.PW_ALL_BROWSERS === 'true'
    ? [
        chromiumProject,
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
        mobileChromeProject,
        {
          name: 'Mobile Safari',
          use: { ...devices['iPhone 12'] },
        },
      ]
    : [chromiumProject]

/**
 * Playwright Configuration for Panda.ai E2E Tests
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e-spec.ts',

  /* Run tests in files in parallel */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Default to serial locally to avoid shared-state/dev-server flake; override with PW_WORKERS */
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 1,

  /* Reporter to use */
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: browserProjects,

  /* Run your local dev server before starting the tests */
  webServer: {
    command:
      'cd ../.. && bunx concurrently "E2E_AUTH_BYPASS=true E2E_AUTH_BYPASS_CONTEXT=playwright CONVEX_SITE_URL=http://localhost:3000 NEXT_PUBLIC_APP_URL=http://localhost:3000 bunx convex dev" "cd apps/web && E2E_AUTH_BYPASS=true E2E_AUTH_BYPASS_CONTEXT=playwright NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_E2E_AUTH_BYPASS=true NEXT_PUBLIC_E2E_AGENT_MODE=spec-approval bun run dev"',
    url: 'http://localhost:3000',
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
    timeout: 120 * 1000,
  },
})
