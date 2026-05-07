import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

test.describe('DemoPie', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Pie', '#F1', 10000);
  });

  test.beforeEach(async () => {
    // Small delay before each test to let EWC server settle
    await new Promise(r => setTimeout(r, 100));
  });

  test('displays ellipse pie chart (P1)', async () => {
    // P1 is an ellipse-based pie chart
    const p1 = page.locator('#F1\\.P1');
    await expect(p1).toBeVisible();
  });

  test('displays circle pie chart (P2)', async () => {
    // P2 is a circle-based pie chart
    const p2 = page.locator('#F1\\.P2');
    await expect(p2).toBeVisible();
  });

  test('displays multiple ellipse segments (E1-E8)', async () => {
    // The demo creates 8 ellipse segments for a detailed pie chart
    const e1 = page.locator('#F1\\.E1');
    const e8 = page.locator('#F1\\.E8');

    await expect(e1).toBeVisible();
    await expect(e8).toBeVisible();
  });

  test('pie elements have content', async () => {
    // Pie charts contain SVG or canvas for rendering
    const p1 = page.locator('#F1\\.P1');
    const p1Content = await p1.innerHTML();
    expect(p1Content.length).toBeGreaterThan(0);
  });

  test('visual regression - pie demo', async () => {
    await expect(page).toHaveScreenshot('pie-demo.png');
  });
});
