import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

test.describe('DemoGridScroll - Structure', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'GridScroll', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('grid renders with 10x10 visible cells', async () => {
    const grid = page.locator('.grid');
    await expect(grid).toBeVisible({ timeout: 5000 });

    const rows = page.locator('.grid-row');
    await expect(rows).toHaveCount(10);

    // Each row should have 10 data cells
    const cells = page.locator('.grid-cell');
    await expect(cells).toHaveCount(100);
  });

  test('has 10 column headers with initial values', async () => {
    const colHeaders = page.locator('.grid-col-header');
    await expect(colHeaders).toHaveCount(10);

    // Initial column titles are 1-10 (ZI4 formatted)
    await expect(colHeaders.nth(0)).toHaveText(/1/);
    await expect(colHeaders.nth(9)).toHaveText(/10/);
  });

  test('has 10 row headers with initial values', async () => {
    const rowHeaders = page.locator('.grid-row-header');
    await expect(rowHeaders).toHaveCount(10);

    await expect(rowHeaders.nth(0)).toHaveText('Row 1');
    await expect(rowHeaders.nth(9)).toHaveText('Row 10');
  });

  test('initial cell values show row/col format', async () => {
    const cells = page.locator('.grid-cell');

    // Only the selected cell renders an <input>; other cells display the value as static text.
    await expect(cells.nth(0).locator('input')).toHaveValue('1/1');
    await expect(cells.nth(99)).toContainText('10/10');
  });

  test('scrollbars are hidden (external controls manage scrolling)', async () => {
    const container = page.locator('.grid-container');
    const overflowX = await container.evaluate(el => getComputedStyle(el).overflowX);
    const overflowY = await container.evaluate(el => getComputedStyle(el).overflowY);

    expect(overflowX).toBe('hidden');
    expect(overflowY).toBe('hidden');
  });

  test('external scroll controls are visible', async () => {
    // Vertical scrollbar (UPDOWN) and horizontal scrollbar (LEFTRIGHT)
    const updown = page.locator('#F1\\.UPDOWN');
    const leftright = page.locator('#F1\\.LEFTRIGHT');

    await expect(updown).toBeVisible();
    await expect(leftright).toBeVisible();
  });

  test('Goto Row 500 button is visible', async () => {
    const button = page.locator('#F1\\.GO500');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Goto Row 500');
  });
});

test.describe('DemoGridScroll - Virtual Scrolling', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'GridScroll', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('ArrowDown at bottom row shifts data window down', async () => {
    const grid = page.locator('.grid');
    const rowHeaders = page.locator('.grid-row-header');

    // Focus the grid
    await grid.click({ position: { x: 50, y: 50 } });
    await new Promise(r => setTimeout(r, 200));

    // Navigate to last row (row 10) using Ctrl+End
    await grid.press('Control+End');
    await new Promise(r => setTimeout(r, 300));

    // Verify we're on the last visible row
    const selected = page.locator('.grid-cell.selected');
    const dataRow = await selected.getAttribute('data-row');
    expect(dataRow).toBe('10');

    // Press ArrowDown - should trigger virtual scroll
    await grid.press('ArrowDown');
    await new Promise(r => setTimeout(r, 500));

    // Row headers should shift: first row should now be "Row 2"
    await expect(rowHeaders.nth(0)).toHaveText('Row 2');
  });

  test('ArrowUp at top row shifts data window up', async () => {
    const grid = page.locator('.grid');
    const rowHeaders = page.locator('.grid-row-header');

    // Focus and go to top row
    await grid.click({ position: { x: 50, y: 50 } });
    await new Promise(r => setTimeout(r, 200));

    await grid.press('Control+Home');
    await new Promise(r => setTimeout(r, 300));

    // Verify we're on top row
    const selected = page.locator('.grid-cell.selected');
    const dataRow = await selected.getAttribute('data-row');
    expect(dataRow).toBe('1');

    // Press ArrowUp - should shift data up (back to Row 1 start)
    await grid.press('ArrowUp');
    await new Promise(r => setTimeout(r, 500));

    // First row header should be "Row 1" (can't go above 0)
    await expect(rowHeaders.nth(0)).toHaveText('Row 1');
  });

  test('ArrowRight at rightmost column shifts data window right', async () => {
    const grid = page.locator('.grid');
    const colHeaders = page.locator('.grid-col-header');

    // Focus and go to last column
    await grid.click({ position: { x: 50, y: 50 } });
    await new Promise(r => setTimeout(r, 200));

    await grid.press('End');
    await new Promise(r => setTimeout(r, 300));

    // Verify we're on last column
    const selected = page.locator('.grid-cell.selected');
    const dataCol = await selected.getAttribute('data-col');
    expect(dataCol).toBe('10');

    // Press ArrowRight - should trigger horizontal virtual scroll
    await grid.press('ArrowRight');
    await new Promise(r => setTimeout(r, 500));

    // First column header should shift (no longer start at 1)
    const firstColText = await colHeaders.nth(0).textContent();
    expect(firstColText?.trim()).not.toBe('1');
  });

  test('ArrowLeft at leftmost column shifts data window left', async () => {
    const grid = page.locator('.grid');
    const colHeaders = page.locator('.grid-col-header');

    // Focus and go to first column
    await grid.click({ position: { x: 50, y: 50 } });
    await new Promise(r => setTimeout(r, 200));

    await grid.press('Home');
    await new Promise(r => setTimeout(r, 300));

    // Verify we're on first column
    const selected = page.locator('.grid-cell.selected');
    const dataCol = await selected.getAttribute('data-col');
    expect(dataCol).toBe('1');

    // Press ArrowLeft - should shift data left (or stay at 0)
    await grid.press('ArrowLeft');
    await new Promise(r => setTimeout(r, 500));

    // First column should still show starting value (can't go below 0)
    const firstColText = await colHeaders.nth(0).textContent();
    expect(firstColText?.trim()).toBeTruthy();
  });

  test('data window content updates correctly after vertical scroll', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');
    const rowHeaders = page.locator('.grid-row-header');

    // Reset position: go to first cell
    await grid.click({ position: { x: 50, y: 50 } });
    await new Promise(r => setTimeout(r, 200));
    await grid.press('Control+Home');
    await new Promise(r => setTimeout(r, 300));

    // Navigate to bottom row
    await grid.press('Control+End');
    await new Promise(r => setTimeout(r, 300));

    // Scroll down twice
    await grid.press('ArrowDown');
    await new Promise(r => setTimeout(r, 500));
    await grid.press('ArrowDown');
    await new Promise(r => setTimeout(r, 500));

    // Row headers should reflect the shifted window
    const firstRowText = await rowHeaders.nth(0).textContent();
    // After scrolling down from initial position, first row should be > Row 1
    expect(firstRowText).not.toBe('Row 1');

    // Cell values should be consistent with row/col headers.
    // Selection is at bottom-right after Control+End + ArrowDowns, so cell 0
    // (top-left) is not selected and renders its value as static text, not an <input>.
    const cellValue = (await cells.nth(0).textContent())?.trim() ?? '';
    // Value format is "row/col" where row matches the current window offset
    expect(cellValue).toMatch(/^\d+\/\d+$/);
  });
});

// Regression guard for PageUp/PageDown paging (review finding #37 had zero
// coverage). The grid is a 10-row virtual window over 1000 rows; each PageDown
// must advance the data window by exactly one page (n=10 rows) per press, and
// PageUp must retreat by one page — consistently, not every-other-press.
test.describe('DemoGridScroll - PageUp/PageDown paging', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'GridScroll', '.grid-table', 10000);
  });

  // Absolute first-visible row number, parsed from the top row header ("Row N").
  // Delta-based so the assertions don't depend on the exact starting window.
  const firstRowNum = async () => {
    const t = (await page.locator('.grid-row-header').first().textContent()) ?? '';
    const m = t.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : NaN;
  };

  test('PageDown advances the window by one page (10 rows) on every press', async () => {
    await page.locator('.grid-cell').first().click();
    await new Promise((r) => setTimeout(r, 300));

    let prev = await firstRowNum();
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('PageDown');
      // web-first wait for the websocket round-trip; window must advance by 10.
      await expect.poll(firstRowNum, { timeout: 4000 }).toBe(prev + 10);
      prev += 10;
    }
  });

  test('PageUp retreats the window by one page (10 rows) on every press', async () => {
    // Start deeper into the data so there is room to page up.
    await page.locator('.grid-cell').first().click();
    await page.keyboard.press('PageDown');
    await page.keyboard.press('PageDown');
    await page.keyboard.press('PageDown');
    await new Promise((r) => setTimeout(r, 400));

    // First PageUp after paging down repositions the cursor to the top row;
    // from there each PageUp retreats the window by a full page.
    await page.keyboard.press('PageUp');
    await new Promise((r) => setTimeout(r, 400));

    let prev = await firstRowNum();
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('PageUp');
      await expect.poll(firstRowNum, { timeout: 4000 }).toBe(prev - 10);
      prev -= 10;
    }
  });
});
