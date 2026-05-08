import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// Confirm or refute the reported bug:
//   "When clicking on an editable cell with long content (in a NuGrid
//    with a large dataset), the dark blue selection border only spans
//    half of the cell."
//
// Approach: select a cell, screenshot it, and measure the blue border
// width vs. the cell width. If the border is on a <td> with `border:
// 1px solid blue` and `border-collapse: collapse`, it should span the
// full cell width.
test.describe('NuGrid long-cell selection border', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'NuGridLongCell', '.nugrid-table', 15000);
  });

  test('Grid A: clicking a long-content cell selects it visibly', async () => {
    const grids = page.locator('.nugrid');
    await expect(grids.first()).toBeVisible({ timeout: 5000 });

    // Use Grid A (the first NuGrid). Click the cell at row 1, col 1
    // (long product description, ~300px wide cell).
    const gridA = grids.nth(0);
    const cell = gridA.locator('td.nugrid-cell[data-row="1"][data-col="1"]');
    await expect(cell).toBeVisible();

    await cell.click();
    await page.waitForTimeout(300);

    // Verify the cell now has the .selected class
    await expect(cell).toHaveClass(/\bselected\b/);

    // Capture the visual to inspect manually
    await page.screenshot({
      path: 'test-results/nugrid-longcell-A-row1col1.png',
      fullPage: false,
    });

    // Compare cell bounding box with the rendered border width.
    // Read the computed style + the cell's bounding rect; if the
    // visible blue border underspans the cell, getBoundingClientRect
    // will still report the full td width — but the rendered border
    // segment (a <td>'s top/bottom edge) will be cut where the cell
    // overflows its parent table or container.
    const measurements = await cell.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      const parent = el.closest('.nugrid-container') as HTMLElement | null;
      const pr = parent?.getBoundingClientRect();
      return {
        cellLeft: r.left,
        cellRight: r.right,
        cellWidth: r.width,
        borderColor: cs.borderColor,
        borderTopColor: cs.borderTopColor,
        borderRightColor: cs.borderRightColor,
        borderLeftColor: cs.borderLeftColor,
        borderBottomColor: cs.borderBottomColor,
        borderWidth: cs.borderWidth,
        containerLeft: pr?.left ?? null,
        containerRight: pr?.right ?? null,
        containerWidth: pr?.width ?? null,
        // Visible portion of the cell — clipped to the container
        visibleLeft: pr ? Math.max(r.left, pr.left) : r.left,
        visibleRight: pr ? Math.min(r.right, pr.right) : r.right,
      };
    });

    console.log('CELL MEASUREMENTS (Grid A row 1 col 1):', JSON.stringify(measurements, null, 2));
    const visibleSpan = measurements.visibleRight - measurements.visibleLeft;
    const cellWidth = measurements.cellWidth;
    const ratio = visibleSpan / cellWidth;
    console.log(`Visible portion: ${visibleSpan.toFixed(1)} of ${cellWidth.toFixed(1)} px (${(ratio * 100).toFixed(1)}%)`);
  });

  test('Grid A: scroll right then click — border on partially-visible cell', async () => {
    const grids = page.locator('.nugrid');
    const gridA = grids.nth(0);
    const container = gridA.locator('.nugrid-container');

    // Scroll horizontally so a wide cell is half-visible
    await container.evaluate((el) => { el.scrollLeft = 150; });
    await page.waitForTimeout(200);

    const cell = gridA.locator('td.nugrid-cell[data-row="1"][data-col="1"]');
    await cell.click();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'test-results/nugrid-longcell-A-row1col1-scrolled.png',
      fullPage: false,
    });

    const measurements = await cell.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const parent = el.closest('.nugrid-container') as HTMLElement | null;
      const pr = parent?.getBoundingClientRect();
      return {
        cellLeft: r.left,
        cellRight: r.right,
        cellWidth: r.width,
        containerLeft: pr?.left ?? null,
        containerRight: pr?.right ?? null,
        scrollLeft: parent?.scrollLeft ?? null,
        visibleLeft: pr ? Math.max(r.left, pr.left) : r.left,
        visibleRight: pr ? Math.min(r.right, pr.right) : r.right,
      };
    });

    console.log('CELL MEASUREMENTS scrolled (Grid A row 1 col 1):', JSON.stringify(measurements, null, 2));

    // Reset for next test
    await container.evaluate((el) => { el.scrollLeft = 0; });
  });

  test('Grid A: click an Edit cell after scrolling rows', async () => {
    const grids = page.locator('.nugrid');
    const gridA = grids.nth(0);
    const container = gridA.locator('.nugrid-container');

    // Scroll down to row ~30 then click a long cell
    await container.evaluate((el) => { el.scrollTop = 500; });
    await page.waitForTimeout(200);

    // Click on a visible cell
    const visibleCell = gridA.locator('td.nugrid-cell[data-col="1"]').first();
    await visibleCell.click();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'test-results/nugrid-longcell-A-vscrolled.png',
      fullPage: false,
    });

    const cls = await visibleCell.getAttribute('class');
    console.log('Vertically-scrolled clicked cell class:', cls);
  });

  test('Grid C: very wide column with long content', async () => {
    const grids = page.locator('.nugrid');
    // Grid C is the third grid
    const gridC = grids.nth(2);
    const cell = gridC.locator('td.nugrid-cell[data-row="1"][data-col="2"]'); // 350px col
    await expect(cell).toBeVisible();
    await cell.click();
    await page.waitForTimeout(300);
    await expect(cell).toHaveClass(/\bselected\b/);

    await page.screenshot({
      path: 'test-results/nugrid-longcell-C-wide.png',
      fullPage: false,
    });

    const m = await cell.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const parent = el.closest('.nugrid-container') as HTMLElement | null;
      const pr = parent?.getBoundingClientRect();
      return {
        cellWidth: r.width,
        containerWidth: pr?.width ?? null,
        visibleSpan: pr ? Math.min(r.right, pr.right) - Math.max(r.left, pr.left) : r.width,
      };
    });
    console.log('GRID C wide cell:', JSON.stringify(m));
  });
});
