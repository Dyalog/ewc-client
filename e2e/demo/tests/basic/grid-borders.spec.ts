import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// Grid Border property — left grid uses Border 1, right grid uses Border 0.
// The client routes Border/EdgeStyle through getBorderStyles (the same helper
// every other container component uses), so we verify the resulting computed
// border on the two grids.
test.describe('DemoGridBorders - Border property', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'GridBorders', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('both Grids render', async () => {
    await expect(page.locator('#F1\\.G1')).toBeVisible();
    await expect(page.locator('#F1\\.G0')).toBeVisible();
  });

  test('Border 1 grid shows a 1px solid border', async () => {
    const grid = page.locator('#F1\\.G1');
    const computed = await grid.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        width: cs.borderTopWidth,
        style: cs.borderTopStyle,
        // All four sides should match.
        right: cs.borderRightWidth,
        bottom: cs.borderBottomWidth,
        left: cs.borderLeftWidth,
      };
    });
    expect(computed.width).toBe('1px');
    expect(computed.style).toBe('solid');
    expect(computed.right).toBe('1px');
    expect(computed.bottom).toBe('1px');
    expect(computed.left).toBe('1px');
  });

  test('Border 0 grid renders with no border', async () => {
    const grid = page.locator('#F1\\.G0');
    const computed = await grid.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        width: cs.borderTopWidth,
        style: cs.borderTopStyle,
        right: cs.borderRightWidth,
        bottom: cs.borderBottomWidth,
        left: cs.borderLeftWidth,
      };
    });
    // border: none → computed style 'none' on all sides; widths collapse to 0px.
    expect(computed.style).toBe('none');
    expect(computed.width).toBe('0px');
    expect(computed.right).toBe('0px');
    expect(computed.bottom).toBe('0px');
    expect(computed.left).toBe('0px');
  });

  test('inline style attribute reflects the Border choice', async () => {
    // Browsers may preserve the shorthand (`border: 1px solid …`) or expand
    // it to longhand (`border-style: …`); accept either serialization.
    const inline1 = await page.locator('#F1\\.G1').getAttribute('style');
    const inline0 = await page.locator('#F1\\.G0').getAttribute('style');
    expect(inline1).toMatch(/border:\s*1px solid|border-style:\s*solid/);
    expect(inline0).toMatch(/border:\s*none|border-style:\s*none/);
  });
});
