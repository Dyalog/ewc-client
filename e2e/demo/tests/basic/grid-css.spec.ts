import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

test.describe('DemoGridCSS - CSS Property', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'GridCSS', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('styled grid has border-radius applied', async () => {
    const styledGrid = page.locator('.grid').first();
    const borderRadius = await styledGrid.evaluate(
      el => getComputedStyle(el).borderRadius
    );
    expect(borderRadius).toBe('8px');
  });

  test('styled grid has border colour applied', async () => {
    const styledGrid = page.locator('.grid').first();
    const borderColor = await styledGrid.evaluate(
      el => getComputedStyle(el).borderColor
    );
    // #336699 = rgb(51, 102, 153)
    expect(borderColor).toContain('51, 102, 153');
  });

  test('styled grid has box-shadow applied', async () => {
    const styledGrid = page.locator('.grid').first();
    const boxShadow = await styledGrid.evaluate(
      el => getComputedStyle(el).boxShadow
    );
    // Should have a non-empty box-shadow
    expect(boxShadow).not.toBe('none');
    expect(boxShadow).not.toBe('');
    // #00000026 = rgba(0, 0, 0, 0.149) — browser normalizes hex-alpha to rgba
    expect(boxShadow).toContain('rgba(0, 0, 0');
  });

  test('unstyled grid does NOT have border-radius', async () => {
    const unstyledGrid = page.locator('.grid').nth(1);
    const borderRadius = await unstyledGrid.evaluate(
      el => getComputedStyle(el).borderRadius
    );
    expect(borderRadius).toBe('0px');
  });

  test('unstyled grid does NOT have box-shadow', async () => {
    const unstyledGrid = page.locator('.grid').nth(1);
    const boxShadow = await unstyledGrid.evaluate(
      el => getComputedStyle(el).boxShadow
    );
    expect(boxShadow).toBe('none');
  });

  test('styled grid still renders column headers', async () => {
    const styledGrid = page.locator('.grid').first();
    const colHeaders = styledGrid.locator('.grid-col-header');
    await expect(colHeaders).toHaveCount(3);

    const headerTexts = await colHeaders.allTextContents();
    expect(headerTexts).toEqual(['Name', 'Score', 'Grade']);
  });

  test('styled grid still renders data cells', async () => {
    const styledGrid = page.locator('.grid').first();
    const cells = styledGrid.locator('.grid-cell');
    // 3 rows x 3 columns = 9 cells
    await expect(cells).toHaveCount(9);
  });

  test('unstyled grid also renders correctly', async () => {
    const unstyledGrid = page.locator('.grid').nth(1);
    const colHeaders = unstyledGrid.locator('.grid-col-header');
    await expect(colHeaders).toHaveCount(3);

    const cells = unstyledGrid.locator('.grid-cell');
    await expect(cells).toHaveCount(9);
  });
});
