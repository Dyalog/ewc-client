import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

test.describe('DemoRect', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Rect', '#F1', 10000);
  });

  test.beforeEach(async () => {
    // Small delay before each test to let EWC server settle
    await new Promise(r => setTimeout(r, 100));
  });

  test('displays rectangle element', async () => {
    // The demo creates a filled rectangle R1
    // Note: EWC renders shapes with overlays, use toBeAttached() not toBeVisible()
    const rect = page.locator('#F1\\.R1');
    await expect(rect).toBeAttached();
  });

  test('rectangle has expected structure', async () => {
    // The rect element should contain a canvas or svg for drawing
    const rect = page.locator('#F1\\.R1');
    const hasContent = await rect.innerHTML();
    expect(hasContent.length).toBeGreaterThan(0);
  });

  test('form has correct title', async () => {
    const title = await page.title();
    expect(title).toBe('EWC');
  });

  test('visual regression - rect demo', async () => {
    await expect(page).toHaveScreenshot('rect-demo.png');
  });
});
