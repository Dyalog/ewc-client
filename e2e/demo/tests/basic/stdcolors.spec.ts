import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

test.describe('DemoStdColors', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'StdColors', '#F1', 10000);
  });

  test.afterAll(async () => {
    if (browser) {
      // browser.close() removed - CDP connection shared across tests
    }
  });

  test.beforeEach(async () => {
    // Small delay before each test to let EWC server settle
    await new Promise(r => setTimeout(r, 100));
  });

  test('displays multiple color labels', async () => {
    // The demo creates COL1, COL2, etc. labels showing color codes
    const colorLabels = page.locator('[id^="F1.COL"]');
    const count = await colorLabels.count();
    expect(count).toBeGreaterThan(5); // Should have many standard colors
  });

  test('displays color name labels with backgrounds', async () => {
    // COLX labels show the color name with colored background
    const colorNameLabels = page.locator('[id^="F1.COLX"]');
    const count = await colorNameLabels.count();
    expect(count).toBeGreaterThan(5);
  });

  test('includes Windows system color names', async () => {
    // StdColors shows Windows system colors (Scrollbar, Background, Window, etc.)
    await expect(page.locator('text=Scrollbar').first()).toBeAttached();
    await expect(page.locator('text=Background').first()).toBeAttached();
    await expect(page.locator('text=Window').first()).toBeAttached();
  });

  test('visual regression - stdcolors demo', async () => {
    await expect(page).toHaveScreenshot('stdcolors-demo.png');
  });
});
