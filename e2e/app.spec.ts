import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import path from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: [
      ...(process.env.CI ? ['--no-sandbox'] : []),
      path.join(__dirname, '../out/main/index.js'),
    ],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });
  page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await electronApp.close();
});

test('app window opens', async () => {
  const title = await electronApp.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    return win?.getTitle();
  });
  expect(title).toBeDefined();
});

test('app renders initial UI', async () => {
  // The app should show either onboarding or main UI
  const body = await page.locator('body').textContent();
  expect(body).toBeTruthy();
});

test('app has correct window dimensions', async () => {
  const { width, height } = await electronApp.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    const [w, h] = win?.getSize() ?? [0, 0];
    return { width: w, height: h };
  });
  expect(width).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);
});
