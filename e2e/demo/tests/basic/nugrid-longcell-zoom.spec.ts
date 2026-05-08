import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// Take focused, high-resolution screenshots of the selected cell
// across several scenarios so we can visually verify whether the
// dark blue selection border spans the full cell.
test.describe('NuGrid long-cell focused screenshots', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    // Use a larger viewport for clearer screenshots
    await result.page.setViewportSize({ width: 1600, height: 1000 });
    page = await navigateToDemo(result.page, 'NuGridLongCell', '.nugrid-table', 15000);
    await page.setViewportSize({ width: 1600, height: 1000 });
  });

  // Helper: take a screenshot of the cell + neighbors with extra padding
  // around the cell so the blue border is clearly visible.
  async function snapCell(cellLocator: any, file: string, padding = 30) {
    const box = await cellLocator.boundingBox();
    if (!box) throw new Error('No bounding box for ' + file);
    await page.screenshot({
      path: `test-results/zoom/${file}`,
      clip: {
        x: Math.max(0, box.x - padding),
        y: Math.max(0, box.y - padding),
        width: box.width + 2 * padding,
        height: box.height + 2 * padding,
      },
    });
  }

  test('A: click cell (1,1) - 300px wide, very long text', async () => {
    const grid = page.locator('.nugrid').nth(0);
    const cell = grid.locator('td.nugrid-cell[data-row="1"][data-col="1"]');
    await cell.click();
    await page.waitForTimeout(400);
    await snapCell(cell, 'A-row1col1-fits.png');
  });

  test('A: click cell (3,1) — different row, still wide cell', async () => {
    const grid = page.locator('.nugrid').nth(0);
    const cell = grid.locator('td.nugrid-cell[data-row="3"][data-col="1"]');
    await cell.click();
    await page.waitForTimeout(400);
    await snapCell(cell, 'A-row3col1.png');
  });

  test('B: click cell (1,1) - 60px narrow cell with long text', async () => {
    const grid = page.locator('.nugrid').nth(1);
    const cell = grid.locator('td.nugrid-cell[data-row="1"][data-col="1"]');
    await cell.click();
    await page.waitForTimeout(400);
    await snapCell(cell, 'B-row1col1-narrow.png');
  });

  test('C: click cell (1,2) - 350px ultra-wide cell with long text', async () => {
    const grid = page.locator('.nugrid').nth(2);
    const cell = grid.locator('td.nugrid-cell[data-row="1"][data-col="2"]');
    await cell.click();
    await page.waitForTimeout(400);
    await snapCell(cell, 'C-row1col2-ultrawide.png');
  });

  test('A: click after scrolling horizontally (cell partially clipped)', async () => {
    const grid = page.locator('.nugrid').nth(0);
    const container = grid.locator('.nugrid-container');
    await container.evaluate((el) => { el.scrollLeft = 150; });
    await page.waitForTimeout(200);

    const cell = grid.locator('td.nugrid-cell[data-row="1"][data-col="1"]');
    await cell.click();
    await page.waitForTimeout(400);
    await snapCell(cell, 'A-scrolled-h.png', 60);

    await container.evaluate((el) => { el.scrollLeft = 0; });
  });

  test('A: full grid screenshot for context', async () => {
    const grid = page.locator('.nugrid').nth(0);
    const cell = grid.locator('td.nugrid-cell[data-row="1"][data-col="1"]');
    await cell.click();
    await page.waitForTimeout(400);
    const box = await grid.boundingBox();
    if (!box) return;
    await page.screenshot({
      path: 'test-results/zoom/A-full.png',
      clip: {
        x: Math.max(0, box.x - 5),
        y: Math.max(0, box.y - 5),
        width: box.width + 10,
        height: box.height + 10,
      },
    });
  });

  test('C: full grid screenshot for context', async () => {
    const grid = page.locator('.nugrid').nth(2);
    const cell = grid.locator('td.nugrid-cell[data-row="1"][data-col="2"]');
    await cell.click();
    await page.waitForTimeout(400);
    const box = await grid.boundingBox();
    if (!box) return;
    await page.screenshot({
      path: 'test-results/zoom/C-full.png',
      clip: {
        x: Math.max(0, box.x - 5),
        y: Math.max(0, box.y - 5),
        width: box.width + 10,
        height: box.height + 10,
      },
    });
  });
});
