import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000, // Increase timeout to 60 seconds
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: {
      slowMo: 100, // Add a small delay between actions
    },
  },
  projects: [
    {
      name: 'electron',
      testMatch: /.*\.e2e\.ts/,
      use: {
        // Electron-specific settings
        launchOptions: {
          args: ['.'],
        },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes
  },
}); 