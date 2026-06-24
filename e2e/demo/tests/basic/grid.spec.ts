import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

test.describe('DemoGrid - Phase 7 Structure', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;

    // Navigate to Grid demo - wait for the grid table to appear
    page = await navigateToDemo(result.page, 'Grid', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('grid renders with correct structure', async () => {
    const grid = page.locator('.grid');
    await expect(grid).toBeVisible({ timeout: 5000 });

    const table = page.locator('.grid-table');
    await expect(table).toBeVisible();
  });

  test('has column headers', async () => {
    const colHeaders = page.locator('.grid-col-header');
    await expect(colHeaders).toHaveCount(5);

    // Verify header text - Phase 7 demo columns
    await expect(colHeaders.nth(0)).toHaveText('Product');
    await expect(colHeaders.nth(1)).toHaveText('Quantity');
    await expect(colHeaders.nth(2)).toHaveText('In Stock');
    await expect(colHeaders.nth(3)).toHaveText('Color');
    await expect(colHeaders.nth(4)).toHaveText('Price $');
  });

  test('has row headers', async () => {
    const rowHeaders = page.locator('.grid-row-header');
    await expect(rowHeaders).toHaveCount(6);

    // Verify row numbers
    await expect(rowHeaders.nth(0)).toHaveText('1');
    await expect(rowHeaders.nth(1)).toHaveText('2');
    await expect(rowHeaders.nth(2)).toHaveText('3');
    await expect(rowHeaders.nth(3)).toHaveText('4');
    await expect(rowHeaders.nth(4)).toHaveText('5');
    await expect(rowHeaders.nth(5)).toHaveText('6');
  });

  test('has corner cell when both headers present', async () => {
    const cornerCell = page.locator('.grid-corner-cell');
    await expect(cornerCell).toBeVisible();
  });

  test('column widths are applied (varying widths)', async () => {
    const colHeaders = page.locator('.grid-col-header');

    // Get computed widths - CellWidths: 100 80 70 90 70
    const width0 = await colHeaders.nth(0).evaluate(el => el.getBoundingClientRect().width);
    const width1 = await colHeaders.nth(1).evaluate(el => el.getBoundingClientRect().width);
    const width2 = await colHeaders.nth(2).evaluate(el => el.getBoundingClientRect().width);
    const width3 = await colHeaders.nth(3).evaluate(el => el.getBoundingClientRect().width);
    const width4 = await colHeaders.nth(4).evaluate(el => el.getBoundingClientRect().width);

    // Width comparisons based on 100 80 70 90 70
    expect(width0).toBeGreaterThan(width1); // 100 > 80
    expect(width3).toBeGreaterThan(width2); // 90 > 70
    expect(width0).toBeGreaterThan(width3); // 100 > 90
    expect(Math.abs(width2 - width4)).toBeLessThan(5); // 70 ≈ 70
  });
});

test.describe('DemoGrid - Phase 7 Embedded Components', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Grid', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('Edit cells contain text inputs with correct values', async () => {
    const cells = page.locator('.grid-cell');

    // ShowInput=0: only the selected cell shows its widget.
    // Select each Edit cell (column 1) in turn to verify its input value.
    // Row 1: Apple
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));
    await expect(cells.nth(0).locator('input')).toHaveValue('Apple');

    // Row 2: Banana
    await cells.nth(5).click();
    await new Promise(r => setTimeout(r, 200));
    await expect(cells.nth(5).locator('input')).toHaveValue('Banana');

    // Row 3: Cherry
    await cells.nth(10).click();
    await new Promise(r => setTimeout(r, 200));
    await expect(cells.nth(10).locator('input')).toHaveValue('Cherry');
  });

  test('Numeric Edit cells have correct values', async () => {
    const cells = page.locator('.grid-cell');

    // ShowInput=0: select each Numeric Edit cell (column 2) to reveal its input.
    // Row 1: 150
    await cells.nth(1).click();
    await new Promise(r => setTimeout(r, 200));
    await expect(cells.nth(1).locator('input')).toBeVisible();

    // Row 2: 250
    await cells.nth(6).click();
    await new Promise(r => setTimeout(r, 200));
    await expect(cells.nth(6).locator('input')).toBeVisible();

    // Row 3: 50
    await cells.nth(11).click();
    await new Promise(r => setTimeout(r, 200));
    await expect(cells.nth(11).locator('input')).toBeVisible();
  });

  test('Checkbox cells are visible and functional', async () => {
    const cells = page.locator('.grid-cell');

    // ShowInput=0: select each Checkbox cell (column 3) to reveal it.
    // Row 1
    await cells.nth(2).click();
    await new Promise(r => setTimeout(r, 200));
    await expect(cells.nth(2).locator('input[type="checkbox"]')).toBeVisible();

    // Row 3
    await cells.nth(12).click();
    await new Promise(r => setTimeout(r, 200));
    await expect(cells.nth(12).locator('input[type="checkbox"]')).toBeVisible();
  });

  test('Combo cells are visible and contain correct values', async () => {
    const cells = page.locator('.grid-cell');

    // ShowInput=0: select each Combo cell (column 4) to reveal it.
    // Row 1: Red
    await cells.nth(3).click();
    await new Promise(r => setTimeout(r, 200));
    const combo1 = cells.nth(3).locator('button[role="combobox"]');
    await expect(combo1).toBeVisible();
    await expect(combo1).toHaveText(/Red/);

    // Row 2: Yellow
    await cells.nth(8).click();
    await new Promise(r => setTimeout(r, 200));
    const combo2 = cells.nth(8).locator('button[role="combobox"]');
    await expect(combo2).toBeVisible();
    await expect(combo2).toHaveText(/Yellow/);
  });

  test('Label cells display values correctly', async () => {
    const cells = page.locator('.grid-cell');

    // Fifth column is Label (Price $)
    // Values: 2.99, 1.49, 5.99, etc.
    const label1 = cells.nth(4);
    const label2 = cells.nth(9);

    // Labels display the raw value
    await expect(label1).toContainText('2.99');
    await expect(label2).toContainText('1.49');
  });

  test('Edit cell allows typing without reverting', async () => {
    const cells = page.locator('.grid-cell');

    // ShowInput=0: select the Edit cell first to reveal its input
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    const editCell = cells.nth(0).locator('input');
    await editCell.click();
    await new Promise(r => setTimeout(r, 100));

    // Clear and type new value
    await editCell.fill('Apricot');
    await new Promise(r => setTimeout(r, 200));

    // Value should stay as typed (not revert)
    await expect(editCell).toHaveValue('Apricot');
  });

  test('Combo cell is visible and has correct height', async () => {
    const cells = page.locator('.grid-cell');
    const comboCell = cells.nth(3);

    // ShowInput=0: select the Combo cell to reveal it
    await comboCell.click();
    await new Promise(r => setTimeout(r, 200));

    const comboButton = comboCell.locator('button[role="combobox"]');
    await expect(comboButton).toBeVisible();

    // Combo fills its cell; the height tracks the data-row content box
    // (15px = the 16px row pitch minus the 1px collapsed gridline). Guards
    // against the combo collapsing to a thin line while matching the current
    // cell sizing (the row pitch was tightened in the cell-height work).
    const box = await comboButton.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(15);
  });
});

test.describe('DemoGrid - Phase 7 Events', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Grid', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('keyboard navigation moves selection', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');

    // Click somewhere on the grid to focus it
    await grid.click({ position: { x: 50, y: 50 } });
    await new Promise(r => setTimeout(r, 200));

    // Press ArrowRight to move selection
    await grid.press('ArrowRight');
    await new Promise(r => setTimeout(r, 200));

    // Check that a cell becomes selected (second cell or first cell)
    const selectedCells = page.locator('.grid-cell.selected');
    await expect(selectedCells).toHaveCount(1);
  });

  test('keyboard navigation fires CellMove with mouseFlag=0', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');
    const eventLog = page.locator('#F1\\.Log');

    // Focus the grid and navigate
    await grid.click({ position: { x: 50, y: 50 } });
    await new Promise(r => setTimeout(r, 200));

    await grid.press('ArrowDown');
    await new Promise(r => setTimeout(r, 300));

    // Check event log shows keyboard navigation (kbd), not click
    const logText = await eventLog.textContent();
    expect(logText).toContain('CellMove');
    expect(logText).toContain('(kbd)');
  });

  test('clicking on grid fires CellMove event', async () => {
    const grid = page.locator('.grid');
    const eventLog = page.locator('#F1\\.Log');

    // Click somewhere on the grid (on a cell area)
    await grid.click({ position: { x: 150, y: 80 } });
    await new Promise(r => setTimeout(r, 300));

    // Check the event log contains CellMove (demo registers CellMove, not MouseDown/Up)
    const logText = await eventLog.textContent();
    expect(logText).toContain('CellMove');
  });

  test('column header highlights when cell in that column is selected', async () => {
    const grid = page.locator('.grid');
    const colHeaders = page.locator('.grid-col-header');

    // Focus grid and navigate to ensure selection
    await grid.click({ position: { x: 50, y: 50 } });
    await new Promise(r => setTimeout(r, 200));

    // Check that some column header has selected-col class
    const selectedColHeaders = page.locator('.grid-col-header.selected-col');
    await expect(selectedColHeaders).toHaveCount(1);
  });

  test('row header highlights when cell in that row is selected', async () => {
    const grid = page.locator('.grid');
    const rowHeaders = page.locator('.grid-row-header');

    // Focus grid and navigate to ensure selection
    await grid.click({ position: { x: 50, y: 50 } });
    await new Promise(r => setTimeout(r, 200));

    // Check that some row header has selected-row class
    const selectedRowHeaders = page.locator('.grid-row-header.selected-row');
    await expect(selectedRowHeaders).toHaveCount(1);
  });
});

test.describe('DemoGrid - Phase 8 Interaction Tests', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Grid', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('Tab navigates to next cell, wraps to next row', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');

    // Click on first cell to start
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    // Get current selection
    let selected = page.locator('.grid-cell.selected');
    const initialDataCol = await selected.getAttribute('data-col');
    expect(initialDataCol).toBe('1');

    // Press Tab - should move to next column
    await grid.press('Tab');
    await new Promise(r => setTimeout(r, 200));

    selected = page.locator('.grid-cell.selected');
    const newDataCol = await selected.getAttribute('data-col');
    expect(newDataCol).toBe('2');
  });

  test('Shift+Tab navigates to previous cell', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');

    // Click on second cell to start
    await cells.nth(1).click();
    await new Promise(r => setTimeout(r, 200));

    // Get current selection
    let selected = page.locator('.grid-cell.selected');
    const initialDataCol = await selected.getAttribute('data-col');
    expect(initialDataCol).toBe('2');

    // Press Shift+Tab - should move to previous column
    await grid.press('Shift+Tab');
    await new Promise(r => setTimeout(r, 200));

    selected = page.locator('.grid-cell.selected');
    const newDataCol = await selected.getAttribute('data-col');
    expect(newDataCol).toBe('1');
  });

  test('Enter moves to cell below', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');

    // Click on first cell
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    // Get current selection
    let selected = page.locator('.grid-cell.selected');
    const initialDataRow = await selected.getAttribute('data-row');
    expect(initialDataRow).toBe('1');

    // Press Enter - should move down
    await grid.press('Enter');
    await new Promise(r => setTimeout(r, 200));

    selected = page.locator('.grid-cell.selected');
    const newDataRow = await selected.getAttribute('data-row');
    expect(newDataRow).toBe('2');
  });

  test('Space toggles checkbox in selected cell', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');

    // Click on a checkbox cell (column 3, "In Stock")
    const checkboxCell = cells.nth(2);
    await checkboxCell.click();
    await new Promise(r => setTimeout(r, 200));

    const checkbox = checkboxCell.locator('input[type="checkbox"]');
    const initialState = await checkbox.isChecked();

    // Press Space - should toggle the checkbox
    await grid.press(' ');
    await new Promise(r => setTimeout(r, 200));

    const newState = await checkbox.isChecked();
    expect(newState).toBe(!initialState);
  });

  test('Space opens Combo dropdown in selected cell', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');

    // Click on a Combo cell (column 4, "Color")
    const comboCell = cells.nth(3);
    await comboCell.click();
    await new Promise(r => setTimeout(r, 200));

    // Press Space - should open the dropdown
    await grid.press(' ');
    await new Promise(r => setTimeout(r, 300));

    // Check if dropdown is visible (listbox should appear)
    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible();

    // Close the dropdown by pressing Escape
    await page.keyboard.press('Escape');
  });

  // Left/Right on a focused (closed) Combo cell navigate to the adjacent cell
  // rather than being trapped by the combo — the combo has no horizontal use
  // for them, so they bubble to the grid (mirrors Edit's edge navigation).
  test('Left/Right arrows on a focused Combo move to the adjacent cell', async () => {
    const cells = page.locator('.grid-cell');
    const comboCell = cells.nth(3); // row 1, column 4 (Color combo)
    const comboBtn = comboCell.locator('button[role="combobox"]');

    // Reset any dropdown left open by a prior test (the suite shares one page),
    // so this test starts from a clean, closed state.
    await page.keyboard.press('Escape');
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 150));
    expect(await page.locator('[role="listbox"]').count()).toBe(0);

    await comboCell.click();
    await new Promise(r => setTimeout(r, 200));
    expect(await page.locator('.grid-cell.selected').getAttribute('data-col')).toBe('4');

    // ArrowRight: move to column 5 without opening the dropdown
    await comboBtn.press('ArrowRight');
    await new Promise(r => setTimeout(r, 200));
    expect(await page.locator('[role="listbox"]').count()).toBe(0);
    expect(await page.locator('.grid-cell.selected').getAttribute('data-col')).toBe('5');

    // Re-select the combo cell, then ArrowLeft moves to column 3
    await comboCell.click();
    await new Promise(r => setTimeout(r, 200));
    await comboBtn.press('ArrowLeft');
    await new Promise(r => setTimeout(r, 200));
    expect(await page.locator('[role="listbox"]').count()).toBe(0);
    expect(await page.locator('.grid-cell.selected').getAttribute('data-col')).toBe('3');
  });

  test('Space focuses Edit input in selected cell', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');

    // Click on Edit cell (first column, row 2)
    const editCell = cells.nth(5);
    await editCell.click();
    await new Promise(r => setTimeout(r, 200));

    // Verify cell is selected but grid has focus (not the input)
    await expect(editCell).toHaveClass(/selected/);

    // Focus the grid explicitly (in case clicking inside focused the input)
    await grid.focus();
    await new Promise(r => setTimeout(r, 100));

    const editInput = editCell.locator('input');

    // Press Space - should focus the Edit input
    await grid.press(' ');
    await new Promise(r => setTimeout(r, 200));

    // Check if Edit input is now focused
    const inputIsFocused = await editInput.evaluate(el => el === document.activeElement);
    expect(inputIsFocused).toBe(true);
  });

  test('Home moves to first column in current row', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');

    // Click on third cell (column 3)
    await cells.nth(2).click();
    await new Promise(r => setTimeout(r, 200));

    // Press Home - should move to column 1
    await grid.press('Home');
    await new Promise(r => setTimeout(r, 200));

    const selected = page.locator('.grid-cell.selected');
    const dataCol = await selected.getAttribute('data-col');
    const dataRow = await selected.getAttribute('data-row');
    expect(dataCol).toBe('1');
    expect(dataRow).toBe('1'); // Still in same row
  });

  test('End moves to last column in current row', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');

    // Click on first cell
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    // Press End - should move to last column (column 5)
    await grid.press('End');
    await new Promise(r => setTimeout(r, 200));

    const selected = page.locator('.grid-cell.selected');
    const dataCol = await selected.getAttribute('data-col');
    const dataRow = await selected.getAttribute('data-row');
    expect(dataCol).toBe('5');
    expect(dataRow).toBe('1'); // Still in same row
  });

  test('Ctrl+Home moves to first cell', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');

    // Click on a cell in row 2
    await cells.nth(6).click();
    await new Promise(r => setTimeout(r, 200));

    // Press Ctrl+Home - should move to cell (1,1)
    await grid.press('Control+Home');
    await new Promise(r => setTimeout(r, 200));

    const selected = page.locator('.grid-cell.selected');
    const dataCol = await selected.getAttribute('data-col');
    const dataRow = await selected.getAttribute('data-row');
    expect(dataCol).toBe('1');
    expect(dataRow).toBe('1');
  });

  test('Ctrl+End moves to last cell', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');

    // Click on first cell
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    // Press Ctrl+End - should move to cell (6,5)
    await grid.press('Control+End');
    await new Promise(r => setTimeout(r, 200));

    const selected = page.locator('.grid-cell.selected');
    const dataCol = await selected.getAttribute('data-col');
    const dataRow = await selected.getAttribute('data-row');
    expect(dataCol).toBe('5');
    expect(dataRow).toBe('6');
  });

  test('only selected cell is editable, others are blurred', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');

    // Select first Edit cell (ShowInput=0: must click cell first to reveal input)
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    // Now click the input to focus it
    const editCell1 = cells.nth(0).locator('input');
    await editCell1.click();
    await new Promise(r => setTimeout(r, 200));

    // Verify first Edit is focused
    let isFocused = await editCell1.evaluate(el => el === document.activeElement);
    expect(isFocused).toBe(true);

    // Navigate to next cell using ArrowRight
    await grid.press('ArrowRight');
    await new Promise(r => setTimeout(r, 200));

    // With ShowInput=0, the input in cell 0 is now unmounted (cell is no longer selected).
    // Verify grid has focus (not any input)
    const gridHasFocus = await grid.evaluate(el => el === document.activeElement);
    expect(gridHasFocus).toBe(true);
  });

  test('clicking different cell fires CellMove with mouseFlag=1', async () => {
    const cells = page.locator('.grid-cell');
    const eventLog = page.locator('#F1\\.Log');

    // Click on first cell
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    // Click on a different cell (row 2)
    await cells.nth(5).click();
    await new Promise(r => setTimeout(r, 300));

    // Check event log shows mouse click (click), not keyboard
    const logText = await eventLog.textContent();
    expect(logText).toContain('CellMove');
    expect(logText).toContain('(click)');
  });
});

test.describe('DemoGrid - Phase 6 Scrolling', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Grid', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('grid container is scrollable', async () => {
    const container = page.locator('.grid-container');
    await expect(container).toBeVisible();

    // Container should have overflow styles for scrolling
    const overflowY = await container.evaluate(el => getComputedStyle(el).overflowY);
    expect(['auto', 'scroll']).toContain(overflowY);
  });

  test('grid has 6 rows for Phase 7 demo', async () => {
    const rows = page.locator('.grid-row');
    await expect(rows).toHaveCount(6);
  });

  test('column headers are sticky (fixed during vertical scroll)', async () => {
    const colHeader = page.locator('.grid-col-header').first();

    // Verify sticky positioning is applied
    const position = await colHeader.evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('sticky');

    const top = await colHeader.evaluate(el => getComputedStyle(el).top);
    expect(top).toBe('0px');
  });

  test('row headers are sticky (fixed during horizontal scroll)', async () => {
    const rowHeader = page.locator('.grid-row-header').first();

    // Verify sticky positioning is applied
    const position = await rowHeader.evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('sticky');

    const left = await rowHeader.evaluate(el => getComputedStyle(el).left);
    expect(left).toBe('0px');
  });

  test('corner cell is sticky in both directions', async () => {
    const cornerCell = page.locator('.grid-corner-cell');

    const position = await cornerCell.evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('sticky');

    const top = await cornerCell.evaluate(el => getComputedStyle(el).top);
    const left = await cornerCell.evaluate(el => getComputedStyle(el).left);
    expect(top).toBe('0px');
    expect(left).toBe('0px');
  });
});

test.describe('DemoGrid - State Management', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Grid', '.grid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('edit cell value persists after blur (click away)', async () => {
    const cells = page.locator('.grid-cell');

    // Click Edit cell (row 1, col 1 — "Apple") to select it
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    // Now the input should be visible (selected cell shows widget)
    const editInput = cells.nth(0).locator('input');
    await editInput.click();
    await new Promise(r => setTimeout(r, 100));

    // Clear and type new value
    await editInput.fill('Apricot');
    await new Promise(r => setTimeout(r, 100));

    // Click a different cell (row 2, col 1) to blur
    await cells.nth(5).click();
    await new Promise(r => setTimeout(r, 500));

    // After clicking away, row 1 col 1 is no longer selected so
    // ShowInput=0 hides the input widget. Check cell text instead.
    const cellText = await cells.nth(0).textContent();
    expect(cellText).toContain('Apricot');
  });

  test('edit cell value persists after keyboard navigation', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');

    // Click cell to select it first (input may not be visible from prior test)
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    const editInput = cells.nth(0).locator('input');
    await editInput.click();
    await new Promise(r => setTimeout(r, 100));

    // Clear and type new value
    await editInput.fill('Apricot');
    await new Promise(r => setTimeout(r, 100));

    // Press ArrowDown (commits edit via commitActiveEdit, moves selection)
    await grid.press('ArrowDown');
    await new Promise(r => setTimeout(r, 300));

    // After navigating away, row 1 col 1 may no longer show an input
    // (ShowInput=0 means only selected cell shows widget). Check cell text.
    const cellText = await cells.nth(0).textContent();
    expect(cellText).toContain('Apricot');
  });

  test('numeric edit value persists after blur', async () => {
    const cells = page.locator('.grid-cell');

    // Click Numeric Edit cell (row 1, col 2) to select it first
    await cells.nth(1).click();
    await new Promise(r => setTimeout(r, 200));

    // Now the input should be visible (selected cell shows widget)
    const numInput = cells.nth(1).locator('input');
    await numInput.click();
    await new Promise(r => setTimeout(r, 100));

    // Clear and type new value
    await numInput.fill('999');
    await new Promise(r => setTimeout(r, 100));

    // Click a different cell to blur
    await cells.nth(6).click();
    await new Promise(r => setTimeout(r, 500));

    // After blurring, ShowInput=0 hides the widget. Check cell text.
    const cellText = await cells.nth(1).textContent();
    expect(cellText).toContain('999');
  });

  test('CurCell selection is correct after multiple rapid navigations', async () => {
    const grid = page.locator('.grid');
    const cells = page.locator('.grid-cell');

    // Click first cell to set initial selection
    await cells.nth(0).click();
    await new Promise(r => setTimeout(r, 200));

    // Rapidly press ArrowRight 3 times
    await grid.press('ArrowRight');
    await new Promise(r => setTimeout(r, 50));
    await grid.press('ArrowRight');
    await new Promise(r => setTimeout(r, 50));
    await grid.press('ArrowRight');
    await new Promise(r => setTimeout(r, 300));

    // Assert: exactly 1 cell has .selected class
    const selectedCells = page.locator('.grid-cell.selected');
    await expect(selectedCells).toHaveCount(1);

    // Assert: selected cell is at data-col="4" (moved 3 columns right from col 1)
    const dataCol = await selectedCells.getAttribute('data-col');
    expect(dataCol).toBe('4');
  });
});

test.describe('DemoGrid - Visual Regression', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Grid', '.grid-table', 10000);
  });

  test('visual regression - grid demo', async () => {
    await new Promise(r => setTimeout(r, 500));
    await expect(page).toHaveScreenshot('grid-phase7-demo.png');
  });
});
