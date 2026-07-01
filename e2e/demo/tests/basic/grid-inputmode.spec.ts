import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// InputMode is a Grid property (default 'Scroll'); InputModeKey (default F2)
// toggles Scroll<->InCell. These tests run against the static Phase 7 "Grid" demo
// (5 cols x 6 rows): col 1 = text Edit (Apple/Banana/Cherry...), col 2 = numeric
// Edit, col 3 = checkbox, col 4 = combo, col 5 = Label. cells.nth(N) => row ⌊N/5⌋,
// col N%5. We use the col-1 text Edits; cell [2,1] = nth(5) ("Banana"),
// [3,1] = nth(10) ("Cherry"), and the [1,5] Label = nth(4) as a neutral reset cell.
test.describe('Grid InputMode - Scroll (default) / InCell', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Grid', '.grid-table', 10000);
  });

  // Land on a neutral (Label) cell so the next click on the target cell is always
  // a genuine move — handleCellClick early-returns on the already-selected cell,
  // which would otherwise leak a prior test's InCell mode. The move also resets
  // the effective mode back to the base (Scroll).
  test.beforeEach(async () => {
    await page.locator('.grid-cell').nth(4).click();
    await new Promise(r => setTimeout(r, 150));
  });

  test('Scroll: selecting a cell focuses its input and selects all text', async () => {
    const cells = page.locator('.grid-cell');
    await cells.nth(5).click(); // [2,1] "Banana"
    await new Promise(r => setTimeout(r, 200));

    const input = cells.nth(5).locator('input');
    await expect(input).toBeFocused();

    // Whole field selected => "SelText selects all" and the first keystroke replaces.
    const sel = await input.evaluate((el: HTMLInputElement) => ({
      start: el.selectionStart, end: el.selectionEnd, len: el.value.length, value: el.value,
    }));
    expect(sel.value).toBe('Banana');
    expect(sel.start).toBe(0);
    expect(sel.end).toBe(sel.len);
  });

  test('Scroll: cursor keys end editing and move the cell', async () => {
    const cells = page.locator('.grid-cell');
    await cells.nth(5).click(); // [2,1] "Banana"
    await new Promise(r => setTimeout(r, 200));
    await expect(cells.nth(5).locator('input')).toBeFocused();

    await page.keyboard.press('ArrowDown'); // bubbles to grid -> navigate to [3,1]
    await new Promise(r => setTimeout(r, 200));

    // The new cell ([3,1] "Cherry") is now the active editor...
    await expect(cells.nth(10).locator('input')).toHaveValue('Cherry');
    await expect(cells.nth(10).locator('input')).toBeFocused();
    // ...and the previous cell reverted to static text (no input).
    await expect(cells.nth(5).locator('input')).toHaveCount(0);
  });

  test('InCell (via F2): cursor keys stay in the cell, no navigation', async () => {
    const cells = page.locator('.grid-cell');
    await cells.nth(5).click(); // [2,1] "Banana"
    await new Promise(r => setTimeout(r, 200));

    await page.keyboard.press('F2'); // Scroll -> InCell (intercepted at capture phase)
    await new Promise(r => setTimeout(r, 100));
    await page.keyboard.press('ArrowDown'); // InCell: stays in the input, does NOT move cells
    await new Promise(r => setTimeout(r, 200));

    // Same key as the Scroll test, opposite outcome: the cell did not change.
    await expect(cells.nth(5).locator('input')).toBeFocused();
    await expect(cells.nth(10).locator('input')).toHaveCount(0);
  });

  test('InCell (via double-click): cursor keys stay in the cell', async () => {
    const cells = page.locator('.grid-cell');
    await cells.nth(5).dblclick(); // enters InCell
    await new Promise(r => setTimeout(r, 200));

    await page.keyboard.press('ArrowDown');
    await new Promise(r => setTimeout(r, 200));

    await expect(cells.nth(5).locator('input')).toBeFocused();
    await expect(cells.nth(10).locator('input')).toHaveCount(0);
  });

  test('InputModeKey (F2) toggles back to Scroll', async () => {
    const cells = page.locator('.grid-cell');
    await cells.nth(5).click(); // [2,1]
    await new Promise(r => setTimeout(r, 200));

    await page.keyboard.press('F2'); // -> InCell
    await new Promise(r => setTimeout(r, 100));
    await page.keyboard.press('F2'); // -> back to Scroll
    await new Promise(r => setTimeout(r, 100));
    await page.keyboard.press('ArrowDown'); // Scroll again: navigates
    await new Promise(r => setTimeout(r, 200));

    await expect(cells.nth(10).locator('input')).toBeFocused();
    await expect(cells.nth(5).locator('input')).toHaveCount(0);
  });
});
