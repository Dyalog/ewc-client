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
});
