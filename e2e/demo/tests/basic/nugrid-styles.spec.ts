import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// Helper to parse an rgb() or rgba() string into [r, g, b]
function parseRgb(color: string): [number, number, number] | null {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
}

test.describe('DemoNuGridStyles - Column Header Colours', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'NuGridStyles', '.nugrid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('ColTitleBCol sets column header background colour', async () => {
    // ColTitleBCol is (0 51 102) — dark blue
    // Non-selected column headers should have this background
    const colHeaders = page.locator('.nugrid-col-header');
    await expect(colHeaders).toHaveCount(4);

    // Move selection to col 1 so other headers are unselected
    const grid = page.locator('.nugrid');
    const cells = page.locator('.nugrid-cell');
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    // Check non-selected header (col 2, index 1)
    const bgColor = await colHeaders.nth(1).evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    const rgb = parseRgb(bgColor);
    expect(rgb).toEqual([0, 51, 102]);
  });

  test('ColTitleFCol sets column header text colour', async () => {
    // ColTitleFCol is (255 255 255) — white
    const colHeaders = page.locator('.nugrid-col-header');

    // Check non-selected header text colour
    const textColor = await colHeaders.nth(1).evaluate(
      el => getComputedStyle(el).color
    );
    const rgb = parseRgb(textColor);
    expect(rgb).toEqual([255, 255, 255]);
  });

  test('selected column header overrides ColTitleBCol with highlight', async () => {
    // Selected col should have #b8d4e8, not the custom ColTitleBCol
    const cells = page.locator('.nugrid-cell');
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    const selectedHeader = page.locator('.nugrid-col-header.selected-col');
    await expect(selectedHeader).toHaveCount(1);

    const bgColor = await selectedHeader.evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    const rgb = parseRgb(bgColor);
    // #b8d4e8 = rgb(184, 212, 232)
    expect(rgb).toEqual([184, 212, 232]);
  });
});

test.describe('DemoNuGridStyles - Row Header Colours', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'NuGridStyles', '.nugrid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('RowTitleBCol sets row header background colour', async () => {
    // RowTitleBCol is (0 102 51) — dark green
    const rowHeaders = page.locator('.nugrid-row-header');
    await expect(rowHeaders).toHaveCount(4);

    // Select row 1 so row 2+ are unselected
    const cells = page.locator('.nugrid-cell');
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    // Check non-selected row header (row 2, index 1)
    const bgColor = await rowHeaders.nth(1).evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    const rgb = parseRgb(bgColor);
    expect(rgb).toEqual([0, 102, 51]);
  });

  test('RowTitleFCol sets row header text colour', async () => {
    // RowTitleFCol is (255 255 255) — white
    const rowHeaders = page.locator('.nugrid-row-header');

    const textColor = await rowHeaders.nth(1).evaluate(
      el => getComputedStyle(el).color
    );
    const rgb = parseRgb(textColor);
    expect(rgb).toEqual([255, 255, 255]);
  });

  test('selected row header overrides RowTitleBCol with highlight', async () => {
    const cells = page.locator('.nugrid-cell');
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    const selectedHeader = page.locator('.nugrid-row-header.selected-row');
    await expect(selectedHeader).toHaveCount(1);

    const bgColor = await selectedHeader.evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    const rgb = parseRgb(bgColor);
    // #b8d4e8 = rgb(184, 212, 232)
    expect(rgb).toEqual([184, 212, 232]);
  });
});

test.describe('DemoNuGridStyles - FCol (grid-wide foreground)', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'NuGridStyles', '.nugrid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('FCol sets text colour on all data cells', async () => {
    // FCol is (0 0 128) — navy blue
    const cells = page.locator('.nugrid-cell');

    // Check several cells across different rows/columns
    for (const idx of [0, 1, 2, 3, 4, 7]) {
      const textColor = await cells.nth(idx).evaluate(
        el => getComputedStyle(el).color
      );
      const rgb = parseRgb(textColor);
      expect(rgb).toEqual([0, 0, 128]);
    }
  });
});

test.describe('DemoNuGridStyles - BCol (per-cellType background)', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'NuGridStyles', '.nugrid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('BCol Type1 (Edit column) has light yellow background', async () => {
    // BCol[0] = (255 255 220) — light yellow for cellType 1 (Edit)
    // Column 1 cells: indices 0, 4, 8, 12
    const cell = page.locator('.nugrid-cell[data-col="1"][data-row="2"]');
    const bgColor = await cell.evaluate(el => getComputedStyle(el).backgroundColor);
    const rgb = parseRgb(bgColor);
    expect(rgb).toEqual([255, 255, 220]);
  });

  test('BCol Type2 (Numeric column) has light blue background', async () => {
    // BCol[1] = (220 235 255) — light blue for cellType 2 (Numeric)
    const cell = page.locator('.nugrid-cell[data-col="2"][data-row="2"]');
    const bgColor = await cell.evaluate(el => getComputedStyle(el).backgroundColor);
    const rgb = parseRgb(bgColor);
    expect(rgb).toEqual([220, 235, 255]);
  });

  test('BCol Type3 (Checkbox column) has light green background', async () => {
    // BCol[2] = (220 255 220) — light green for cellType 3 (Checkbox)
    const cell = page.locator('.nugrid-cell[data-col="3"][data-row="2"]');
    const bgColor = await cell.evaluate(el => getComputedStyle(el).backgroundColor);
    const rgb = parseRgb(bgColor);
    expect(rgb).toEqual([220, 255, 220]);
  });

  test('BCol Type4 (Label column) has light grey background', async () => {
    // BCol[3] = (240 240 240) — light grey for cellType 4 (Label)
    const cell = page.locator('.nugrid-cell[data-col="4"][data-row="2"]');
    const bgColor = await cell.evaluate(el => getComputedStyle(el).backgroundColor);
    const rgb = parseRgb(bgColor);
    expect(rgb).toEqual([240, 240, 240]);
  });
});

test.describe('DemoNuGridStyles - CellFonts (per-cellType fonts)', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'NuGridStyles', '.nugrid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('CellFonts Type1 (Edit column) uses Courier New bold', async () => {
    // FontA: Courier New, 14px, weight 700
    const cell = page.locator('.nugrid-cell[data-col="1"][data-row="2"]');
    const fontFamily = await cell.evaluate(el => getComputedStyle(el).fontFamily);
    const fontWeight = await cell.evaluate(el => getComputedStyle(el).fontWeight);
    const fontSize = await cell.evaluate(el => getComputedStyle(el).fontSize);

    expect(fontFamily.toLowerCase()).toContain('courier');
    expect(fontWeight).toBe('700');
    expect(fontSize).toBe('14px');
  });

  test('CellFonts Type2 (Numeric column) uses Arial italic', async () => {
    // FontB: Arial, 12px, italic
    const cell = page.locator('.nugrid-cell[data-col="2"][data-row="2"]');
    const fontStyle = await cell.evaluate(el => getComputedStyle(el).fontStyle);
    const fontSize = await cell.evaluate(el => getComputedStyle(el).fontSize);

    expect(fontStyle).toBe('italic');
    expect(fontSize).toBe('12px');
  });

  test('CellFonts Type4 (Label column) uses underline', async () => {
    // FontD: Arial, 13px, underline
    const cell = page.locator('.nugrid-cell[data-col="4"][data-row="2"]');
    const textDecoration = await cell.evaluate(el => getComputedStyle(el).textDecorationLine);
    const fontSize = await cell.evaluate(el => getComputedStyle(el).fontSize);

    expect(textDecoration).toBe('underline');
    expect(fontSize).toBe('13px');
  });
});

test.describe('DemoNuGridStyles - ShowInput (vector)', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'NuGridStyles', '.nugrid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('ShowInput=1 columns show widgets in non-selected cells', async () => {
    // ShowInput=(1 0 1 0): Type1 (Edit) and Type3 (Checkbox) always show
    // Click a cell NOT in col 1 or col 3 to ensure those cols are non-selected
    const cells = page.locator('.nugrid-cell');
    await cells.nth(1).click(); // Click col 2, row 1
    await new Promise(r => setTimeout(r, 300));

    // Non-selected Edit cell (row 2, col 1) should still show input
    const editCell = page.locator('.nugrid-cell[data-row="2"][data-col="1"]');
    const editInput = editCell.locator('input');
    await expect(editInput).toBeVisible();

    // Non-selected Checkbox cell (row 2, col 3) should still show checkbox
    const checkCell = page.locator('.nugrid-cell[data-row="2"][data-col="3"]');
    const checkbox = checkCell.locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible();
  });

  test('ShowInput=0 columns show widgets only in selected cell', async () => {
    // ShowInput=(1 0 1 0): Type2 (Numeric) and Type4 (Label) only show on select
    // Click on col 1 row 1 so col 2 is deselected
    const cells = page.locator('.nugrid-cell');
    await cells.nth(0).click(); // Click col 1, row 1
    await new Promise(r => setTimeout(r, 300));

    // Non-selected Numeric cell (row 2, col 2) should NOT show input
    const numCell = page.locator('.nugrid-cell[data-row="2"][data-col="2"]');
    const numInput = numCell.locator('input');
    await expect(numInput).toHaveCount(0);

    // Label cells (Type4) never show widget (Labels are excluded from showWidget)
    const labelCell = page.locator('.nugrid-cell[data-row="2"][data-col="4"]');
    const labelWidget = labelCell.locator('.ewc-label, input, button, select');
    await expect(labelWidget).toHaveCount(0);
  });

  test('ShowInput=0 column shows widget when cell is selected', async () => {
    // Select a Numeric cell (col 2) — it should show input when selected
    const numCell = page.locator('.nugrid-cell[data-row="1"][data-col="2"]');
    await numCell.click();
    await new Promise(r => setTimeout(r, 300));

    const numInput = numCell.locator('input');
    await expect(numInput).toBeVisible();
  });
});

test.describe('DemoNuGridStyles - Visual Regression', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'NuGridStyles', '.nugrid-table', 10000);
  });

  test('visual regression - nugrid styles demo', async () => {
    await new Promise(r => setTimeout(r, 500));
    await expect(page).toHaveScreenshot('nugrid-styles-demo.png');
  });
});
