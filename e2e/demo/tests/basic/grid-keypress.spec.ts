import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// Regression guard for review finding #14 ("typing in an embedded Edit fires
// duplicate/spurious grid-level KeyPress events").
//
// The DemoGridKeyPress demo registers KeyPress on BOTH the grid (F1.G) and the
// embedded text Edit template (F1.G.E1), and CBGridKey logs one line per fire
// tagged with its source ("GRID" or "EDIT"). When a printable character is typed
// into an Edit cell:
//   - FIXED behaviour: the grid suppresses its own KeyPress because the keydown
//     originates inside an embedded editor (src/components/Grid/index.jsx, the
//     `if (!inEditor) fireKeyPress(event)` guard) — so exactly ONE "EDIT" line.
//   - BUGGY behaviour (before the fix): the keydown bubbles to the grid root and
//     it ALSO fires KeyPress with the grid id — a "GRID" line in addition to the
//     "EDIT" line: the duplicate.
//
// So this test types one char and asserts the log gained exactly one KeyPress
// line, attributed to the Edit, with zero grid-sourced KeyPress lines.
test.describe('DemoGridKeyPress - embedded Edit KeyPress fires once (finding #14)', () => {
  let browser: Browser;
  let page: Page;

  const EDIT_ID = 'F1.G.E1';

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'GridKeyPress', '.grid-table', 10000);
  });

  // Lines of the F1.Log Caption that record a KeyPress fire. CBGridKey prepends
  // (newest first) and tags each with GRID/EDIT, so we can both count and attribute.
  const keyPressLines = (logText: string) =>
    logText.split('\n').filter((l) => l.includes('KeyPress'));

  test('typing one char in an Edit cell logs exactly ONE KeyPress, from the Edit (not the grid)', async () => {
    const cells = page.locator('.grid-cell');
    const eventLog = page.locator('#F1\\.Log');

    // Snapshot the KeyPress lines already present (the log accumulates).
    const beforeText = (await eventLog.textContent()) ?? '';
    const beforeCount = keyPressLines(beforeText).length;

    // Cell (1,1) is the initially-selected Product/Edit cell, so its <input> is
    // already rendered (ShowInput=0 shows the widget on the selected cell).
    await cells.nth(0).click();
    const editInput = cells.nth(0).locator('input');
    await expect(editInput).toBeVisible({ timeout: 2000 });

    // Focus the input itself so the keystroke originates inside the editor (this
    // is what makes Grid treat it as `inEditor` and suppress its own KeyPress).
    await editInput.click();
    await expect(editInput).toBeFocused();

    // A real keystroke — fill() would not dispatch keydown, so KeyPress wouldn't
    // fire. One printable char => the Edit emits exactly one KeyPress.
    await editInput.press('a');

    // Web-first wait for the websocket round-trip: poll until one new KeyPress
    // line appears (instead of a fixed sleep).
    await expect
      .poll(async () => keyPressLines((await eventLog.textContent()) ?? '').length, { timeout: 4000 })
      .toBe(beforeCount + 1);

    const afterText = (await eventLog.textContent()) ?? '';
    const afterLines = keyPressLines(afterText);

    // Exactly one new KeyPress line...
    expect(afterLines.length).toBe(beforeCount + 1);

    // ...and it is the Edit's (newest is first because CBGridKey prepends).
    const newest = afterLines[0];
    expect(newest).toContain('EDIT');
    expect(newest).toContain(`id=${EDIT_ID}`);
    expect(newest).toContain('key="a"');

    // The grid stayed silent: no KeyPress line is tagged GRID. This is the crux
    // of #14 — pre-fix there would be a second, grid-sourced line here.
    const gridSourced = afterLines.filter((l) => l.includes('GRID'));
    expect(gridSourced.length).toBe(0);
  });
});
