import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for Synpress/MetaMask E2E tests.
 * Uses webpack dev mode (not turbopack) to avoid Turbopack scanning
 * the .cache-synpress directory which contains Unix socket files.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/wallet-synpress.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 90_000,
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'NEXT_PUBLIC_E2E_TEST=true next dev -p 3002',
    url: 'http://localhost:3002',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
