import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__/e2e',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'file://',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'electron',
      testMatch: /.*\.e2e\.test\.ts/,
      use: {
        launchOptions: {
          executablePath: process.env.ELECTRON_PATH || 'electron',
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          ignoreDefaultArgs: ['--enable-automation'],
        },
        viewport: { width: 1280, height: 720 },
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
  ],
}); 