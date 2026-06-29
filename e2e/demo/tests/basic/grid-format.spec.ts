import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

test.describe('DemoGridFormat - FormatString support', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;

    // Navigate to GridFormat demo - wait for the grid table to appear
    page = await navigateToDemo(result.page, 'GridFormat', '.grid-table', 10000);
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

  test('has 6 column headers', async () => {
    const colHeaders = page.locator('.grid-col-header');
    await expect(colHeaders).toHaveCount(6);

    await expect(colHeaders.nth(0)).toHaveText('Company');
    await expect(colHeaders.nth(1)).toHaveText('Revenue ($)');
    await expect(colHeaders.nth(2)).toHaveText('Headcount');
    await expect(colHeaders.nth(3)).toHaveText('Status');
    await expect(colHeaders.nth(4)).toHaveText('Growth %');
    await expect(colHeaders.nth(5)).toHaveText('Sector');
  });

  test('has 7 data rows', async () => {
    const rows = page.locator('.grid-row');
    await expect(rows).toHaveCount(7);
  });

  test('revenue shows comma-separated currency (CF15.2)', async () => {
    // Row 1: Axiom revenue = 8500000 → "8,500,000.00"
    const cell = page.locator('.grid-cell[data-row="1"][data-col="2"]');
    await expect(cell).toBeVisible();

    // Non-selected Numeric cell shows the ⎕FMT-formatted text — ShowInput only
    // applies to Combo/Button, so Numeric cells aren't always-on editors.
    const value = await cell.textContent();
    expect(value).toContain('8,500,000.00');
  });

  test('large revenue has multiple comma separators', async () => {
    // Row 6: Fibonacci revenue = 97500000 → "97,500,000.00"
    const cell = page.locator('.grid-cell[data-row="6"][data-col="2"]');
    const value = await cell.textContent();
    expect(value).toContain('97,500,000.00');
  });

  test('headcount shows comma-separated integer (CI8)', async () => {
    // Row 2: Boltzmann headcount = 31000 → "31,000"
    const cell = page.locator('.grid-cell[data-row="2"][data-col="3"]');
    const value = await cell.textContent();
    expect(value).toContain('31,000');
  });

  test('status shows O-format text (PROFITABLE / LOSS-MAKING)', async () => {
    // Row 1: Status=1 → "PROFITABLE"
    const row1 = page.locator('.grid-cell[data-row="1"][data-col="4"]');
    await expect(row1).toContainText('PROFITABLE');

    // Row 3: Status=0 → "LOSS-MAKING"
    const row3 = page.locator('.grid-cell[data-row="3"][data-col="4"]');
    await expect(row3).toContainText('LOSS-MAKING');
  });

  test('sector column shows plain text', async () => {
    const cell = page.locator('.grid-cell[data-row="1"][data-col="6"]');
    await expect(cell).toBeVisible();
    const text = await cell.textContent();
    expect(text).toContain('Technology');
  });

  test('company name column shows plain text', async () => {
    const cell = page.locator('.grid-cell[data-row="1"][data-col="1"]');
    const input = cell.locator('input');
    await expect(input).toHaveValue('Axiom');
  });

  test('all 7 row headers present', async () => {
    const rowHeaders = page.locator('.grid-row-header');
    await expect(rowHeaders).toHaveCount(7);
  });

  // ⎕FMT right-pads numeric formats to the column width (e.g. CI8 turns
  // 8500 into "   8,500"). With CSS right-alignment those leading spaces
  // produce a visible gap. The client trims them on display.
  test('formatted values have no leading or trailing whitespace', async () => {
    // Headcount column (CI8) — original server value would be "   8,500".
    const headcount = (await page.locator('.grid-cell[data-row="1"][data-col="3"]').textContent()) ?? '';
    expect(headcount).toBe(headcount.trim());
    expect(headcount).toBe('8,500');

    // Revenue column (CF15.2) — original would be "       8,500,000.00".
    const revenue = (await page.locator('.grid-cell[data-row="1"][data-col="2"]').textContent()) ?? '';
    expect(revenue).toBe(revenue.trim());
    expect(revenue).toBe('8,500,000.00');

    // Growth column (F8.1) — negatives produce a leading space too.
    const negGrowth = (await page.locator('.grid-cell[data-row="3"][data-col="5"]').textContent()) ?? '';
    expect(negGrowth).toBe(negGrowth.trim());
    expect(negGrowth).toBe('-8.7');
  });

  // ⎕FMT emits the APL high minus (U+00AF, '¯') for negatives. The client
  // must convert it to ASCII '-' so users see a conventional negative sign.
  test('negative Growth % uses ASCII minus, not APL high minus', async () => {
    const HIGH_MINUS = '¯';

    // Row 3: Cantor — Growth = ¯8.7, formatted via F8.1
    const cantorVal = (await page.locator('.grid-cell[data-row="3"][data-col="5"]').textContent()) ?? '';
    expect(cantorVal).not.toContain(HIGH_MINUS);
    expect(cantorVal).toMatch(/-\s*8\.7|-8\.7/);

    // Row 7: Gauss — Growth = ¯4.2
    const gaussVal = (await page.locator('.grid-cell[data-row="7"][data-col="5"]').textContent()) ?? '';
    expect(gaussVal).not.toContain(HIGH_MINUS);
    expect(gaussVal).toMatch(/-\s*4\.2|-4\.2/);
  });

  // After editing a negative number and blurring, the server re-formats via
  // FormatCell and returns the high minus — that round-trip must also be
  // normalized in the client.
  test('FormatCell response after edit normalizes APL high minus', async () => {
    const HIGH_MINUS = '¯';

    // Edit row 3 Growth (Cantor, ¯8.7) → change to -1234, blur, expect ASCII minus.
    const cell = page.locator('.grid-cell[data-row="3"][data-col="5"]');

    // Two-step: click the cell to select it (so the input becomes editable),
    // then click the input to focus it.
    await cell.click();
    await new Promise(r => setTimeout(r, 200));

    const input = cell.locator('input');
    await input.click();
    await new Promise(r => setTimeout(r, 100));

    await input.fill('-1234');
    await input.blur();

    // Give the server a moment to send FormatCell response.
    await page.waitForTimeout(300);

    const after = await input.inputValue();
    expect(after).not.toContain(HIGH_MINUS);
    expect(after).toContain('-1234');
  });

  // When a Numeric cell has a server-formatted display like "8,500" (CI8),
  // entering edit mode must strip the thousand separators so the user is
  // editing a parseable number. Otherwise typing an extra digit produces
  // strings like "14,0000" and Number(...) → NaN on blur.
  test('comma-formatted Numeric cell drops commas in edit mode', async () => {
    // Row 1 Headcount: cellValue=8500, formatted via CI8 → "   8,500"
    const cell = page.locator('.grid-cell[data-row="1"][data-col="3"]');

    // Sanity: before focus, the cell shows the formatted (comma) text.
    const before = (await cell.textContent()) ?? '';
    expect(before).toContain(',');

    await cell.click();
    await new Promise(r => setTimeout(r, 200));

    const input = cell.locator('input');
    await input.click();
    await new Promise(r => setTimeout(r, 200));

    // Once focused, the input must show the raw number, not the formatted one.
    // This is the core of the fix: handleGotFocus swaps inputValue from
    // formattedValue to the raw cellValue.
    const editingVal = await input.inputValue();
    expect(editingVal).not.toContain(',');
    expect(editingVal.trim()).toBe('8500');
  });

  // End-to-end version: type an extra digit and confirm the committed value
  // is a real number (no NaN). Uses fill() to avoid the per-key APL round-trip
  // that handleKeyPress relies on, isolating the comma-stripping behavior.
  test('appending a digit to a comma-formatted cell does not produce NaN', async () => {
    const cell = page.locator('.grid-cell[data-row="1"][data-col="3"]');

    await cell.click();
    await new Promise(r => setTimeout(r, 200));

    const input = cell.locator('input');
    await input.click();
    await new Promise(r => setTimeout(r, 200));

    // fill() replaces the value atomically — bypasses per-key handlers
    // so we can directly assert the parse-on-blur path. The pre-fix bug
    // would have left commas in inputValue, but even with fill('85000')
    // (no comma), the bug surfaces because handleBlur runs Number(emitValue).
    // The new typed value "85000" parses to 85000, not NaN.
    await input.fill('85000');
    await input.blur();
    await page.waitForTimeout(400);

    const after = await input.inputValue();
    expect(after).not.toContain('NaN');
    // Server re-formats via CI8 → "  85,000" (with leading padding).
    expect(after).toContain('85,000');
  });

  // APL users habitually type the high minus (¯) as the negative-number
  // sentinel. During editing we preserve their keystroke — they see ¯
  // exactly as typed. Only at commit (blur) does the client convert ¯ → '-'
  // so EWC receives a parseable number (Number('¯1234') alone → NaN).
  test('typed high minus stays visible while editing, normalizes on blur', async () => {
    const HIGH_MINUS = '¯';

    const cell = page.locator('.grid-cell[data-row="7"][data-col="5"]');

    // Select the cell so its input becomes editable (matches the pattern
    // used in grid.spec.ts "Edit cell allows typing without reverting").
    await cell.click();
    await new Promise(r => setTimeout(r, 200));

    const input = cell.locator('input');
    await input.click();
    await new Promise(r => setTimeout(r, 100));

    await input.fill('');
    // insertText delivers the literal high minus character, mirroring what
    // an APL user would enter (no physical key produces U+00AF on a US layout).
    await page.keyboard.insertText('¯555');

    // While editing, the field should still show what the user typed —
    // including the APL high minus. Conversion happens only at commit.
    const duringEdit = await input.inputValue();
    expect(duringEdit).toContain(HIGH_MINUS);
    expect(duringEdit).toBe('¯555');

    await input.blur();
    await page.waitForTimeout(300);

    // After blur, handleBlur runs normalizeAplFormatted on emitValue before
    // Number() parsing and before sending to EWC. The server re-formats and
    // returns the value, which the display read sites also pass through
    // normalizeAplFormatted — any residual ¯ in the server response is
    // converted to '-' on the way to the cell.
    const after = await input.inputValue();
    expect(after).not.toContain(HIGH_MINUS);
    expect(after).not.toContain('NaN');
    expect(after).toMatch(/-\s*555/);
  });

  // While editing a Grid Edit cell, ArrowLeft/ArrowRight must move the
  // text cursor inside the <input>, not the grid's active cell. Regression
  // from commit a5b2adf which made the input editable (readOnly={!isEditing})
  // without updating keydown propagation — arrow keys bubbled to the grid's
  // container handleKeyDown and triggered cell navigation.
  test('InCell mode (F2): arrow keys move the text cursor inside Edit, not the grid cell', async () => {
    // Default InputMode is Scroll, where cursor keys navigate cells. Entering
    // InCell mode (via the InputModeKey, F2) makes them move within the text instead.
    // Use the Company column (plain text Edit, no ⎕FMT noise to interfere).
    const cell = page.locator('.grid-cell[data-row="2"][data-col="1"]');

    await cell.click();
    await new Promise(r => setTimeout(r, 200));

    const input = cell.locator('input');
    await input.click();
    await new Promise(r => setTimeout(r, 200));

    // Put a known value in and place cursor at the end.
    await input.fill('Boltzmann');
    await new Promise(r => setTimeout(r, 100));

    // Move cursor to the end so we can observe ArrowLeft moving it back.
    const cursorAtEnd: number = await input.evaluate((el: HTMLInputElement) => {
      el.setSelectionRange(el.value.length, el.value.length);
      return el.selectionStart ?? -1;
    });
    expect(cursorAtEnd).toBe('Boltzmann'.length);

    // Switch to InCell mode (InputModeKey) so the cursor keys stay in the editor.
    await input.press('F2');
    await new Promise(r => setTimeout(r, 100));

    // Press ArrowLeft — the cursor should move back by one; the grid's
    // active cell must NOT change.
    await input.press('ArrowLeft');
    await new Promise(r => setTimeout(r, 100));

    const cursorAfter: number = await input.evaluate((el: HTMLInputElement) => el.selectionStart ?? -1);
    expect(cursorAfter).toBe('Boltzmann'.length - 1);

    // The same cell should still be the focused/active one — the input
    // (and therefore the cell) must still be live. We assert focus
    // remains on the input we were typing in.
    const stillFocused = await input.evaluate((el) => document.activeElement === el);
    expect(stillFocused).toBe(true);

    // ArrowRight — cursor should move forward by one.
    await input.press('ArrowRight');
    await new Promise(r => setTimeout(r, 100));

    const cursorRight: number = await input.evaluate((el: HTMLInputElement) => el.selectionStart ?? -1);
    expect(cursorRight).toBe('Boltzmann'.length);
  });

  // App.css applies a global `input[type='text']:focus { border-bottom: 2px solid blue }`
  // — fine for standalone inputs, but inside Grid the cell already provides
  // a selection indicator. The Grid override must beat the global rule so
  // no blue underline appears on focused cells (string or numeric).
  test('focused Edit input shows no blue bottom border in any cell', async () => {
    const measureBottomBorder = async (rowCol: { row: number; col: number }) => {
      const cell = page.locator(`.grid-cell[data-row="${rowCol.row}"][data-col="${rowCol.col}"]`);
      await cell.click();
      await new Promise(r => setTimeout(r, 200));
      const input = cell.locator('input');
      await input.click();
      await new Promise(r => setTimeout(r, 200));
      return await input.evaluate((el) => {
        const cs = window.getComputedStyle(el);
        return { width: cs.borderBottomWidth, style: cs.borderBottomStyle };
      });
    };

    // String Edit (Company column, FieldType missing → text)
    const stringBorder = await measureBottomBorder({ row: 2, col: 1 });
    expect(stringBorder.width).toBe('0px');

    // Numeric Edit (Headcount column, FieldType=Numeric)
    const numericBorder = await measureBottomBorder({ row: 2, col: 3 });
    expect(numericBorder.width).toBe('0px');
  });

  // Grid now honors the APL Border property via getBorderStyles. The demo
  // doesn't set Border explicitly so it defaults — assert the inline border
  // declaration is present (which proves the prop pipeline is wired; a CSS
  // default could also produce a visible border, only inline-style presence
  // distinguishes the two).
  test('Grid applies inline border style from Border/EdgeStyle props', async () => {
    const grid = page.locator('.grid');
    const inlineStyle = await grid.getAttribute('style');
    expect(inlineStyle).toMatch(/border\s*:/);

    // Default (Border missing → treated as truthy by getBorderStyles): 1px solid.
    const computed = await grid.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { width: cs.borderTopWidth, style: cs.borderTopStyle };
    });
    expect(computed.width).toBe('1px');
    expect(computed.style).toBe('solid');
  });
});
