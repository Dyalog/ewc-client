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

test.describe('DemoGridStyles - Column Header Colours', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'GridStyles', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('ColTitleBCol sets column header background colour', async () => {
    // ColTitleBCol is (0 51 102) — dark blue
    // Non-selected column headers should have this background
    const colHeaders = page.locator('.grid-col-header');
    await expect(colHeaders).toHaveCount(4);

    // Move selection to col 1 so other headers are unselected
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');
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
    const colHeaders = page.locator('.grid-col-header');

    // Check non-selected header text colour
    const textColor = await colHeaders.nth(1).evaluate(
      el => getComputedStyle(el).color
    );
    const rgb = parseRgb(textColor);
    expect(rgb).toEqual([255, 255, 255]);
  });

  test('selected column header overrides ColTitleBCol with highlight', async () => {
    // Selected col should have #b8d4e8, not the custom ColTitleBCol
    const cells = page.locator('.grid-cell');
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    const selectedHeader = page.locator('.grid-col-header.selected-col');
    await expect(selectedHeader).toHaveCount(1);

    const bgColor = await selectedHeader.evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    const rgb = parseRgb(bgColor);
    // #b8d4e8 = rgb(184, 212, 232)
    expect(rgb).toEqual([184, 212, 232]);
  });
});

test.describe('DemoGridStyles - Row Header Colours', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'GridStyles', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('RowTitleBCol sets row header background colour', async () => {
    // RowTitleBCol is (0 102 51) — dark green
    const rowHeaders = page.locator('.grid-row-header');
    await expect(rowHeaders).toHaveCount(4);

    // Select row 1 so row 2+ are unselected
    const cells = page.locator('.grid-cell');
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
    const rowHeaders = page.locator('.grid-row-header');

    const textColor = await rowHeaders.nth(1).evaluate(
      el => getComputedStyle(el).color
    );
    const rgb = parseRgb(textColor);
    expect(rgb).toEqual([255, 255, 255]);
  });

  test('selected row header overrides RowTitleBCol with highlight', async () => {
    const cells = page.locator('.grid-cell');
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    const selectedHeader = page.locator('.grid-row-header.selected-row');
    await expect(selectedHeader).toHaveCount(1);

    const bgColor = await selectedHeader.evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    const rgb = parseRgb(bgColor);
    // #b8d4e8 = rgb(184, 212, 232)
    expect(rgb).toEqual([184, 212, 232]);
  });
});

test.describe('DemoGridStyles - FCol (grid-wide foreground)', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'GridStyles', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('FCol sets text colour on all data cells', async () => {
    // FCol is (0 0 128) — navy blue
    const cells = page.locator('.grid-cell');

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

test.describe('DemoGridStyles - BCol (per-cellType background)', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'GridStyles', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('BCol Type1 (Edit column) has light yellow background', async () => {
    // BCol[0] = (255 255 220) — light yellow for cellType 1 (Edit)
    // Column 1 cells: indices 0, 4, 8, 12
    const cell = page.locator('.grid-cell[data-col="1"][data-row="2"]');
    const bgColor = await cell.evaluate(el => getComputedStyle(el).backgroundColor);
    const rgb = parseRgb(bgColor);
    expect(rgb).toEqual([255, 255, 220]);
  });

  test('BCol Type2 (Numeric column) has light blue background', async () => {
    // BCol[1] = (220 235 255) — light blue for cellType 2 (Numeric)
    const cell = page.locator('.grid-cell[data-col="2"][data-row="2"]');
    const bgColor = await cell.evaluate(el => getComputedStyle(el).backgroundColor);
    const rgb = parseRgb(bgColor);
    expect(rgb).toEqual([220, 235, 255]);
  });

  test('BCol Type3 (Checkbox column) has light green background', async () => {
    // BCol[2] = (220 255 220) — light green for cellType 3 (Checkbox)
    const cell = page.locator('.grid-cell[data-col="3"][data-row="2"]');
    const bgColor = await cell.evaluate(el => getComputedStyle(el).backgroundColor);
    const rgb = parseRgb(bgColor);
    expect(rgb).toEqual([220, 255, 220]);
  });

  test('BCol Type4 (Label column) has light grey background', async () => {
    // BCol[3] = (240 240 240) — light grey for cellType 4 (Label)
    const cell = page.locator('.grid-cell[data-col="4"][data-row="2"]');
    const bgColor = await cell.evaluate(el => getComputedStyle(el).backgroundColor);
    const rgb = parseRgb(bgColor);
    expect(rgb).toEqual([240, 240, 240]);
  });
});

test.describe('DemoGridStyles - CellFonts (per-cellType fonts)', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'GridStyles', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('CellFonts Type1 (Edit column) uses Courier New bold', async () => {
    // FontA: Courier New, 11px, weight 700
    const cell = page.locator('.grid-cell[data-col="1"][data-row="2"]');
    const fontFamily = await cell.evaluate(el => getComputedStyle(el).fontFamily);
    const fontWeight = await cell.evaluate(el => getComputedStyle(el).fontWeight);
    const fontSize = await cell.evaluate(el => getComputedStyle(el).fontSize);

    expect(fontFamily.toLowerCase()).toMatch(/courier|mono/);
    expect(fontWeight).toBe('700');
    expect(fontSize).toBe('11px');
  });

  test('CellFonts Type2 (Numeric column) uses Arial italic', async () => {
    // FontB: Arial, 12px, italic
    const cell = page.locator('.grid-cell[data-col="2"][data-row="2"]');
    const fontStyle = await cell.evaluate(el => getComputedStyle(el).fontStyle);
    const fontSize = await cell.evaluate(el => getComputedStyle(el).fontSize);

    expect(fontStyle).toBe('italic');
    expect(fontSize).toBe('12px');
  });

  test('CellFonts Type4 (Label column) uses underline', async () => {
    // FontD: Arial, 13px, underline
    const cell = page.locator('.grid-cell[data-col="4"][data-row="2"]');
    const textDecoration = await cell.evaluate(el => getComputedStyle(el).textDecorationLine);
    const fontSize = await cell.evaluate(el => getComputedStyle(el).fontSize);

    expect(textDecoration).toBe('underline');
    expect(fontSize).toBe('13px');
  });
});

test.describe('DemoGridStyles - ShowInput (vector)', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'GridStyles', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('ShowInput=1 columns show widgets in non-selected cells', async () => {
    // ShowInput=(0 0 1 0): Type3 (Checkbox) always shows.
    // Click a cell NOT in col 3 to ensure that column is non-selected.
    const cells = page.locator('.grid-cell');
    await cells.nth(0).click(); // Click col 1, row 1
    await new Promise(r => setTimeout(r, 300));

    // Non-selected Checkbox cell (row 2, col 3) should still show checkbox
    const checkCell = page.locator('.grid-cell[data-row="2"][data-col="3"]');
    const checkbox = checkCell.locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible();
  });

  test('ShowInput=0 columns show widgets only in selected cell', async () => {
    // ShowInput=(0 0 1 0): Type1 (Edit), Type2 (Numeric), Type4 (Label) only show on select.
    // Select col 1 row 1 so the OTHER rows/cols stay non-selected.
    const cells = page.locator('.grid-cell');
    await cells.nth(0).click(); // Click col 1, row 1
    await new Promise(r => setTimeout(r, 300));

    // Non-selected Edit cell (row 2, col 1) should NOT show input — Edit is now
    // on-select (this is the column the demo change targets so it's selectable).
    const editCell = page.locator('.grid-cell[data-row="2"][data-col="1"]');
    await expect(editCell.locator('input')).toHaveCount(0);

    // Non-selected Numeric cell (row 2, col 2) should NOT show input
    const numCell = page.locator('.grid-cell[data-row="2"][data-col="2"]');
    await expect(numCell.locator('input')).toHaveCount(0);

    // Label cells (Type4) never show widget (Labels are excluded from showWidget)
    const labelCell = page.locator('.grid-cell[data-row="2"][data-col="4"]');
    await expect(labelCell.locator('.ewc-label, input, button, select')).toHaveCount(0);
  });

  test('ShowInput=0 column shows widget when cell is selected', async () => {
    // Select a Numeric cell (col 2) — it should show input when selected
    const numCell = page.locator('.grid-cell[data-row="1"][data-col="2"]');
    await numCell.click();
    await new Promise(r => setTimeout(r, 300));

    const numInput = numCell.locator('input');
    await expect(numInput).toBeVisible();
  });
});

test.describe('DemoGridStyles - Visual Regression', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'GridStyles', '.grid-table', 10000);
  });

  test('visual regression - grid styles demo', async () => {
    await new Promise(r => setTimeout(r, 500));
    await expect(page).toHaveScreenshot('grid-styles-demo.png');
  });
});

// Selection must stay visible in cells that have a BCol fill. BCol is applied
// as an inline background-color (which beats any class background rule), so the
// selection is drawn on a separate ::after overlay layered ON TOP of the cell —
// a translucent wash for the range plus a border (Excel-style). These tests
// pin that behaviour against the coloured cells in the Styles demo.
test.describe('DemoGridStyles - Selection visible over coloured cells', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'GridStyles', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  const grid = '.grid';

  // Select a 3×3 block over the coloured (BCol) cells: click (1,1), shift-click
  // (3,3). Active cell ends on (3,3); the block spans rows 1-3 × cols 1-3.
  async function selectBlock() {
    await page.locator(`${grid} .grid-cell[data-row="1"][data-col="1"]`).click();
    await new Promise(r => setTimeout(r, 120));
    await page.locator(`${grid} .grid-cell[data-row="3"][data-col="3"]`).click({ modifiers: ['Shift'] });
    await new Promise(r => setTimeout(r, 150));
  }

  test('a range cell keeps its own BCol fill — selection does not overwrite the colour', async () => {
    await selectBlock();
    const cell = page.locator(`${grid} .grid-cell[data-row="2"][data-col="2"]`);
    await expect(cell).toHaveClass(/range-selected/);
    const own = await cell.evaluate(el => getComputedStyle(el).backgroundColor);
    const rgb = parseRgb(own);
    expect(rgb).not.toBeNull();
    expect(own).not.toBe('rgba(0, 0, 0, 0)');      // not transparent
    expect(rgb).not.toEqual([255, 255, 255]);      // not the old white selection fill
  });

  test('a range cell paints a translucent selection overlay on top (::after)', async () => {
    await selectBlock();
    const cell = page.locator(`${grid} .grid-cell[data-row="2"][data-col="2"]`);
    const bg = await cell.evaluate(el => getComputedStyle(el, '::after').backgroundColor);
    const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    expect(m).not.toBeNull();
    expect([+m![1], +m![2], +m![3]]).toEqual([0, 120, 215]); // selection blue
    const alpha = m![4] ? parseFloat(m![4]) : 1;
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(1);                  // translucent → shows the BCol through it
  });

  test('a single focused cell highlights its right + bottom borders over a coloured fill', async () => {
    // Single-cell focus on a coloured cell (Score, col 2) — no range, so only
    // the .selected overlay applies. ⎕WC-style: right + bottom edges only.
    await page.locator(`${grid} .grid-cell[data-row="2"][data-col="2"]`).click();
    await new Promise(r => setTimeout(r, 200));
    const active = page.locator(`${grid} .grid-cell[data-row="2"][data-col="2"]`);
    await expect(active).toHaveClass(/\bselected\b/);
    const after = await active.evaluate(el => {
      const cs = getComputedStyle(el, '::after');
      return {
        right: cs.borderRightWidth, bottom: cs.borderBottomWidth,
        top: cs.borderTopWidth, left: cs.borderLeftWidth,
      };
    });
    expect(after.right).toBe('1px');
    expect(after.bottom).toBe('1px');
    expect(after.top).toBe('0px');     // not a full box — two borders only
    expect(after.left).toBe('0px');
  });

  test('a multi-cell selection draws a perimeter border via edge classes', async () => {
    await selectBlock();
    const corner = page.locator(`${grid} .grid-cell[data-row="1"][data-col="1"]`);
    await expect(corner).toHaveClass(/sel-top/);
    await expect(corner).toHaveClass(/sel-left/);
    // Interior cell carries no edge classes (single outline around the block).
    await expect(page.locator(`${grid} .grid-cell[data-row="2"][data-col="2"]`))
      .not.toHaveClass(/sel-(top|bottom|left|right)/);
    const borderTop = await corner.evaluate(el => getComputedStyle(el, '::after').borderTopWidth);
    expect(borderTop).toBe('1px');
  });
});
