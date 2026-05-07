import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

test.describe('DemoNuGrid - Phase 7 Component Embedding Debug', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;

    // Navigate to NuGrid demo - wait for the grid table to appear
    page = await navigateToDemo(result.page, 'NuGrid', '.nugrid-table', 10000);
  });

  test('debug: check if Input and CellTypes are received', async () => {
    // Check console logs for debug output
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('NuGrid Debug')) {
        logs.push(msg.text());
      }
    });

    // Force a re-render by clicking
    const cells = page.locator('.nugrid-cell');
    await cells.first().click();
    await new Promise(r => setTimeout(r, 500));

    // Print any debug logs we captured
    console.log('=== Debug logs from browser ===');
    logs.forEach(log => console.log(log));

    // Check if cells have the has-component class (meaning embedded components were detected)
    const cellsWithComponents = page.locator('.nugrid-cell.has-component');
    const countWithComponents = await cellsWithComponents.count();
    console.log(`Cells with embedded components: ${countWithComponents}`);

    // Check headers to understand the demo structure
    const headers = page.locator('.nugrid-col-header');
    const headerTexts = await headers.allTextContents();
    console.log('Column headers:', headerTexts);

    // Check if we have 5 columns (Phase 7 demo) or 4 columns (Phase 6 demo)
    const colCount = await headers.count();
    console.log('Number of columns:', colCount);

    // If 5 columns, it's the Phase 7 demo
    if (colCount === 5) {
      expect(headerTexts).toContain('In Stock'); // Phase 7 has checkbox column
    }
  });

  test('debug: check cell content types', async () => {
    const cells = page.locator('.nugrid-cell');

    // Check if any cells contain input elements
    const cellsWithInputs = page.locator('.nugrid-cell input');
    const inputCount = await cellsWithInputs.count();
    console.log(`Cells with <input> elements: ${inputCount}`);

    // Check if any cells contain buttons
    const cellsWithButtons = page.locator('.nugrid-cell button');
    const buttonCount = await cellsWithButtons.count();
    console.log(`Cells with <button> elements: ${buttonCount}`);

    // Check if any cells contain checkboxes
    const checkboxes = page.locator('.nugrid-cell input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`Cells with checkboxes: ${checkboxCount}`);

    // Get the text content of the first few cells
    const firstRowCells = await Promise.all([
      cells.nth(0).textContent(),
      cells.nth(1).textContent(),
      cells.nth(2).textContent(),
      cells.nth(3).textContent(),
      cells.nth(4).textContent(),
    ]);
    console.log('First row cell contents:', firstRowCells);
  });

  test('debug: evaluate NuGrid state from React', async () => {
    // Access the React component state through window (if exposed) or DOM inspection
    const gridData = await page.evaluate(() => {
      // Try to find the grid element and check its dataset
      const grid = document.querySelector('.nugrid');
      if (!grid) return { error: 'Grid not found' };

      // Check data attributes
      const cells = document.querySelectorAll('.nugrid-cell');
      return {
        gridId: grid.id,
        cellCount: cells.length,
        cellClasses: Array.from(cells).slice(0, 5).map(c => c.className),
        cellContents: Array.from(cells).slice(0, 5).map(c => ({
          text: c.textContent?.trim(),
          hasChildren: c.children.length,
          childTypes: Array.from(c.children).map(ch => ch.tagName),
        })),
      };
    });

    console.log('Grid state:', JSON.stringify(gridData, null, 2));
  });
});
