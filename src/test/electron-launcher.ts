import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { app } from 'electron';
import path from 'path';

export class ElectronLauncher {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async launch() {
    try {
      // Launch Electron with specific options
      this.browser = await chromium.launch({
        executablePath: process.env.ELECTRON_PATH || 'electron',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ignoreDefaultArgs: ['--enable-automation'],
        timeout: 30000,
      });

      // Create a new context with specific permissions
      this.context = await this.browser.newContext({
        permissions: ['clipboard-read', 'clipboard-write'],
        viewport: { width: 1280, height: 720 },
      });

      // Create a new page
      this.page = await this.context.newPage();

      // Wait for Electron to be ready
      await this.page.waitForFunction(() => {
        return window.electronAPI !== undefined;
      }, { timeout: 10000 });

      return this.page;
    } catch (error) {
      console.error('Failed to launch Electron:', error);
      await this.close();
      throw error;
    }
  }

  async close() {
    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
    } catch (error) {
      console.error('Error while closing Electron:', error);
    } finally {
      this.page = null;
      this.context = null;
      this.browser = null;
    }
  }
} 