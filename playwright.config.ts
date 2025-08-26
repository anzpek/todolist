import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:4000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        }
      },
    },
  ],

  webServer: {
    command: 'npm run dev -- --port 4000',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
  },
});