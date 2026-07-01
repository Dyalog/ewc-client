import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// DemoGridInputMode specifies a CUSTOM InputModeKey via the Accelerator form
// (65 3) = Ctrl+Shift+A (65 = key number for "a", 3 = Shift(1)+Ctrl(2)),
// overriding the F2 default. 2 cols x 5 rows of text/numeric Edits;
// cells.nth(N) => row ⌊N/2⌋, col N%2.  [2,1]=nth(2) "Banana", [3,1]=nth(4) "Cherry".
test.describe('Grid custom InputModeKey (Accelerator [keyNumber, shiftState])', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'GridInputMode', '.grid-table', 10000);
  });

  // Land on [1,1] first so the click on [2,1] is always a real move (resets to Scroll).
  test.beforeEach(async () => {
    await page.locator('.grid-cell').nth(0).click();
    await new Promise(r => setTimeout(r, 150));
  });

  test('the configured key Ctrl+Shift+A switches Scroll -> InCell', async () => {
    const cells = page.locator('.grid-cell');
    await cells.nth(2).click(); // [2,1] "Banana"
    await new Promise(r => setTimeout(r, 200));
    await expect(cells.nth(2).locator('input')).toBeFocused();

    await page.keyboard.press('Control+Shift+A'); // the InputModeKey -> InCell
    await new Promise(r => setTimeout(r, 100));
    await page.keyboard.press('ArrowDown');         // InCell: cursor stays in the cell
    await new Promise(r => setTimeout(r, 200));

    await expect(cells.nth(2).locator('input')).toBeFocused();
    await expect(cells.nth(4).locator('input')).toHaveCount(0); // did NOT move to [3,1]
  });

  test('F2 no longer toggles once InputModeKey is overridden', async () => {
    const cells = page.locator('.grid-cell');
    await cells.nth(2).click(); // [2,1]
    await new Promise(r => setTimeout(r, 200));

    await page.keyboard.press('F2');        // not the InputModeKey here -> no effect
    await new Promise(r => setTimeout(r, 100));
    await page.keyboard.press('ArrowDown');  // still Scroll -> navigates to [3,1]
    await new Promise(r => setTimeout(r, 200));

    await expect(cells.nth(4).locator('input')).toBeFocused(); // moved to [3,1] "Cherry"
    await expect(cells.nth(2).locator('input')).toHaveCount(0);
  });
});
