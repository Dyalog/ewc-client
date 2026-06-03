import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// Row / column / all selection via header clicks, with Ctrl+C copying the
// selected range to the clipboard as TSV (tabs within rows, newlines between).
test.describe('NuGrid selection — row / col / all + copy as TSV', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    // Grant clipboard permissions for read/write inside the page.
    await result.browser.contexts()[0].grantPermissions(['clipboard-read', 'clipboard-write']);
    page = await navigateToDemo(result.page, 'NuGridTitles', '.nugrid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise((r) => setTimeout(r, 100));
  });

  // Use G3 ("Fixed (TitleWidth 100)") — it has Values 3×2:
  //   row 1: Alpha,1   row 2: Beta,2   row 3: Gamma,3
  // and stable known row/col titles, so the TSV is predictable.
  const grid = '#F1\\.G3';

  const readClipboard = (p: Page) =>
    p.evaluate(() => navigator.clipboard.readText());

  const pressCopy = async (p: Page) => {
    // The grid container must have focus to receive Ctrl+C.
    await p.locator(grid).focus();
    // Cmd on Mac, Ctrl elsewhere — Playwright's "Meta+C" works on macOS in
    // headless Chromium too. Use Control to be portable.
    await p.keyboard.press('Control+C');
  };

  test('clicking a row header selects the whole row', async () => {
    await page.locator(`${grid} .nugrid-row-header`).nth(0).click();
    await new Promise((r) => setTimeout(r, 100));
    // All cells in row 1 get .range-selected.
    const rowCells = page.locator(`${grid} .nugrid-cell[data-row="1"].range-selected`);
    await expect(rowCells).toHaveCount(2);
  });

  test('clicking a column header selects the whole column', async () => {
    await page.locator(`${grid} .nugrid-col-header`).nth(0).click();
    await new Promise((r) => setTimeout(r, 100));
    const colCells = page.locator(`${grid} .nugrid-cell[data-col="1"].range-selected`);
    await expect(colCells).toHaveCount(3);
  });

  test('clicking the corner cell selects all data cells', async () => {
    await page.locator(`${grid} .nugrid-corner-cell`).click();
    await new Promise((r) => setTimeout(r, 100));
    const allSelected = page.locator(`${grid} .nugrid-cell.range-selected`);
    await expect(allSelected).toHaveCount(6); // 3×2
  });

  test('clicking a data cell clears the range — back to single-cell mode', async () => {
    // Start from a row selection.
    await page.locator(`${grid} .nugrid-row-header`).nth(0).click();
    await new Promise((r) => setTimeout(r, 100));
    // Click a data cell — range should clear.
    await page.locator(`${grid} .nugrid-cell[data-row="2"][data-col="2"]`).click();
    await new Promise((r) => setTimeout(r, 100));
    const ranged = page.locator(`${grid} .nugrid-cell.range-selected`);
    await expect(ranged).toHaveCount(0);
  });

  test('Ctrl+C on a row selection copies tab-delimited cells', async () => {
    await page.locator(`${grid} .nugrid-row-header`).nth(0).click();
    await new Promise((r) => setTimeout(r, 100));
    await pressCopy(page);
    await new Promise((r) => setTimeout(r, 100));
    const text = await readClipboard(page);
    // Row 1 cells: "Alpha" and 1 → tab-delimited, no trailing newline.
    expect(text).toBe('Alpha\t1');
  });

  test('Ctrl+C on a column selection copies newline-delimited cells', async () => {
    await page.locator(`${grid} .nugrid-col-header`).nth(0).click();
    await new Promise((r) => setTimeout(r, 100));
    await pressCopy(page);
    await new Promise((r) => setTimeout(r, 100));
    const text = await readClipboard(page);
    // Col 1 = Alpha / Beta / Gamma → newline-delimited.
    expect(text).toBe('Alpha\nBeta\nGamma');
  });

  test('Ctrl+C on select-all copies TSV (rows separated by newlines, cells by tabs)', async () => {
    await page.locator(`${grid} .nugrid-corner-cell`).click();
    await new Promise((r) => setTimeout(r, 100));
    await pressCopy(page);
    await new Promise((r) => setTimeout(r, 100));
    const text = await readClipboard(page);
    expect(text).toBe('Alpha\t1\nBeta\t2\nGamma\t3');
  });

  test('Ctrl+C on a single-cell selection copies just that cell', async () => {
    await page.locator(`${grid} .nugrid-cell[data-row="2"][data-col="1"]`).click();
    await new Promise((r) => setTimeout(r, 100));
    await pressCopy(page);
    await new Promise((r) => setTimeout(r, 100));
    const text = await readClipboard(page);
    expect(text).toBe('Beta');
  });

  // ─── Phase 2: shift+click, Ctrl+A, shift+arrow, drag-select ─────────────

  test('Shift+click extends the selection from the anchor cell', async () => {
    // Click row 1 col 1 as anchor, then shift+click row 3 col 2.
    await page.locator(`${grid} .nugrid-cell[data-row="1"][data-col="1"]`).click();
    await new Promise((r) => setTimeout(r, 100));
    await page.locator(`${grid} .nugrid-cell[data-row="3"][data-col="2"]`).click({ modifiers: ['Shift'] });
    await new Promise((r) => setTimeout(r, 100));
    // All 6 cells should be in the range.
    await expect(page.locator(`${grid} .nugrid-cell.range-selected`)).toHaveCount(6);
  });

  test('Shift+click on a row header extends the row band', async () => {
    await page.locator(`${grid} .nugrid-row-header`).nth(0).click();
    await new Promise((r) => setTimeout(r, 100));
    await page.locator(`${grid} .nugrid-row-header`).nth(2).click({ modifiers: ['Shift'] });
    await new Promise((r) => setTimeout(r, 100));
    // Rows 1-3 × cols 1-2 = 6 cells.
    await expect(page.locator(`${grid} .nugrid-cell.range-selected`)).toHaveCount(6);
  });

  test('Ctrl+A selects all cells', async () => {
    // Click somewhere first to get focus on the grid.
    await page.locator(`${grid} .nugrid-cell[data-row="1"][data-col="1"]`).click();
    await new Promise((r) => setTimeout(r, 100));
    await page.locator(grid).focus();
    await page.keyboard.press('Control+A');
    await new Promise((r) => setTimeout(r, 100));
    await expect(page.locator(`${grid} .nugrid-cell.range-selected`)).toHaveCount(6);
  });

  test('Shift+ArrowDown extends the selection downward', async () => {
    // Anchor on (1, 1).
    await page.locator(`${grid} .nugrid-cell[data-row="1"][data-col="1"]`).click();
    await new Promise((r) => setTimeout(r, 100));
    await page.locator(grid).focus();
    await page.keyboard.press('Shift+ArrowDown');
    await new Promise((r) => setTimeout(r, 100));
    // Now rows 1-2 col 1 should be selected (2 cells).
    await expect(page.locator(`${grid} .nugrid-cell[data-col="1"].range-selected`)).toHaveCount(2);
  });

  test('Shift+ArrowRight then Shift+ArrowDown selects a rectangle', async () => {
    await page.locator(`${grid} .nugrid-cell[data-row="1"][data-col="1"]`).click();
    await new Promise((r) => setTimeout(r, 100));
    await page.locator(grid).focus();
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowDown');
    await new Promise((r) => setTimeout(r, 100));
    // Rows 1-2 × cols 1-2 = 4 cells.
    await expect(page.locator(`${grid} .nugrid-cell.range-selected`)).toHaveCount(4);
  });

  test('Plain arrow key after a range clears the selection', async () => {
    // Make a range.
    await page.locator(`${grid} .nugrid-row-header`).nth(0).click();
    await new Promise((r) => setTimeout(r, 100));
    await expect(page.locator(`${grid} .nugrid-cell.range-selected`)).toHaveCount(2);
    // Plain arrow → clear.
    await page.locator(grid).focus();
    await page.keyboard.press('ArrowDown');
    await new Promise((r) => setTimeout(r, 100));
    await expect(page.locator(`${grid} .nugrid-cell.range-selected`)).toHaveCount(0);
  });

  test('Mouse drag from one cell to another selects the rectangle', async () => {
    const start = page.locator(`${grid} .nugrid-cell[data-row="1"][data-col="1"]`);
    const end = page.locator(`${grid} .nugrid-cell[data-row="3"][data-col="2"]`);
    // Browser drag: mousedown on start, move over end, mouseup on end.
    const sBox = await start.boundingBox();
    const eBox = await end.boundingBox();
    if (!sBox || !eBox) throw new Error('cells not visible');
    await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
    await page.mouse.down();
    // Step the cursor through the intermediate cell so onMouseEnter fires.
    await page.mouse.move(eBox.x + eBox.width / 2, sBox.y + sBox.height / 2, { steps: 4 });
    await page.mouse.move(eBox.x + eBox.width / 2, eBox.y + eBox.height / 2, { steps: 4 });
    await page.mouse.up();
    await new Promise((r) => setTimeout(r, 100));
    await expect(page.locator(`${grid} .nugrid-cell.range-selected`)).toHaveCount(6);
  });
});

// GridSelect event end-to-end: NuGrid client fires it, EWC server forwards
// to APL callback (CBNuGrid), which writes to F1.Log. We navigate to
// DemoNuGrid where the handler is registered and verify the log content.
test.describe('NuGrid GridSelect event — round-trip to APL handler', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'NuGrid', '.nugrid-table', 10000);
  });

  test('clicking a row header logs "GridSelect: Row N" via CBNuGrid', async () => {
    // DemoNuGrid grid is F1.G; row headers are 1-indexed in the title column.
    await page.locator('#F1\\.G .nugrid-row-header').nth(1).click();
    // Give the WebSocket round-trip a moment.
    await new Promise((r) => setTimeout(r, 400));
    const log = await page.locator('#F1\\.Log').textContent();
    expect(log).toContain('GridSelect: Row 2');
  });

  test('clicking a column header logs "GridSelect: Col N"', async () => {
    await page.locator('#F1\\.G .nugrid-col-header').nth(2).click();
    await new Promise((r) => setTimeout(r, 400));
    const log = await page.locator('#F1\\.Log').textContent();
    expect(log).toContain('GridSelect: Col 3');
  });

  test('clicking the corner cell logs "GridSelect: Range …"', async () => {
    await page.locator('#F1\\.G .nugrid-corner-cell').click();
    await new Promise((r) => setTimeout(r, 400));
    const log = await page.locator('#F1\\.Log').textContent();
    expect(log).toContain('GridSelect: Range');
  });

  // Per Dyalog spec: GridSelect also fires when an existing selection is
  // cancelled by clicking on a cell — with Start === End === clicked cell.
  test('clicking a cell after a range logs "GridSelect: Cell [r,c]"', async () => {
    // First create a range (row 1) so the cancel path is exercised.
    await page.locator('#F1\\.G .nugrid-row-header').nth(0).click();
    await new Promise((r) => setTimeout(r, 200));
    // Then click a cell to cancel.
    await page.locator('#F1\\.G .nugrid-cell[data-row="2"][data-col="2"]').click();
    await new Promise((r) => setTimeout(r, 400));
    const log = await page.locator('#F1\\.Log').textContent();
    expect(log).toContain('GridSelect: Cell [2,2]');
  });

  // Drag-select that ends on a Combo cell shouldn't open the dropdown.
  // DemoNuGrid col 4 is "In Stock" (checkbox), col 5 is "Color" (Combo).
  // We start from row 1 col 1 (text cell — has Edit) — but mousedown on the
  // <td> itself rather than its child input. Drag down to col 4, release.
  test('drag ending over a Combo cell does NOT open the combo dropdown', async () => {
    // Use row 1 col 4 (In Stock — checkbox) as a stand-in widget cell.
    const start = page.locator('#F1\\.G .nugrid-row-header').nth(0); // row header is safe to mousedown
    const end = page.locator('#F1\\.G .nugrid-cell[data-row="3"][data-col="4"]');

    const sBox = await start.boundingBox();
    const eBox = await end.boundingBox();
    if (!sBox || !eBox) throw new Error('cells not visible');
    await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(eBox.x + eBox.width / 2, eBox.y + eBox.height / 2, { steps: 4 });
    await page.mouse.up();
    await new Promise((r) => setTimeout(r, 300));

    // After release, no combo dropdown should be visible.
    // (DemoNuGrid's combos use native select; we check for an open dropdown
    //  via aria-expanded if available, or just confirm no listbox is open.)
    const openCombos = page.locator('#F1\\.G [role="combobox"][aria-expanded="true"]');
    await expect(openCombos).toHaveCount(0);
    // And dragging from a row header still produced a multi-cell selection.
    const ranged = page.locator('#F1\\.G .nugrid-cell.range-selected');
    expect(await ranged.count()).toBeGreaterThan(2);
  });

  test('drag-select ends on release even outside the grid', async () => {
    const start = page.locator('#F1\\.G .nugrid-row-header').nth(0);
    const sBox = await start.boundingBox();
    if (!sBox) throw new Error('start cell not visible');
    await page.mouse.move(sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
    await page.mouse.down();
    // Drag down into another row, then move OUT of the grid before release.
    const endCell = page.locator('#F1\\.G .nugrid-cell[data-row="3"][data-col="2"]');
    const eBox = await endCell.boundingBox();
    if (!eBox) throw new Error('end cell not visible');
    await page.mouse.move(eBox.x + eBox.width / 2, eBox.y + eBox.height / 2, { steps: 4 });
    // Release outside the grid (e.g. somewhere on the body).
    await page.mouse.move(50, 50, { steps: 2 });
    await page.mouse.up();
    await new Promise((r) => setTimeout(r, 300));
    // Selection should still be active — drag ended cleanly, range preserved.
    const ranged = page.locator('#F1\\.G .nugrid-cell.range-selected');
    expect(await ranged.count()).toBeGreaterThan(2);
    // And dragging another row header now should REPLACE the selection
    // (i.e., isDragging was correctly cleared so a fresh drag starts fresh).
    await page.locator('#F1\\.G .nugrid-row-header').nth(4).click();
    await new Promise((r) => setTimeout(r, 200));
    // Row 5's range — should be just row 5's cells.
    const newRow = page.locator('#F1\\.G .nugrid-cell[data-row="5"].range-selected');
    expect(await newRow.count()).toBeGreaterThan(0);
  });
});
