// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e', // Directory where E2E tests will be located
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx http-server -p 8080 -c-1', // Command to start a local server
    url: 'http://localhost:8080', // URL of the web server
    reuseExistingServer: !process.env.CI, // Reuse existing server locally
    timeout: 120 * 1000, // Increase timeout for web server startup
  },
  use: {
    baseURL: 'http://localhost:8080', // Base URL for tests
    trace: 'on-first-retry', // Record trace only when retrying a test
  },
});
