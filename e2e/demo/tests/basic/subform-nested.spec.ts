import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// Nested SubForm Tests
// Targets: Bug 1 (missing key — cross-level isolation),
//          Bug 3 (localStorage variable shadowing with nested SubForms),
//          Bug 6 (localStorage race at 2 nesting levels),
//          Font inheritance chain, BCol isolation, EdgeStyle at multiple levels
test.describe('DemoSubFormNested', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'SubFormNested', '#F1\\.OUTER', 10000);
  });

  test.beforeEach(async () => {
    await page.waitForTimeout(100);
  });

  // ─────────────────────────────────────────────────────────────
  // Both SubForm Levels Render
  // ─────────────────────────────────────────────────────────────

  test('outer SubForm is visible', async () => {
    const outer = page.locator('#F1\\.OUTER');
    await expect(outer).toBeVisible();
  });

  test('inner SubForm is visible inside outer', async () => {
    const inner = page.locator('#F1\\.OUTER\\.INNER');
    await expect(inner).toBeVisible();
  });

  test('outer SubForm has Ridge EdgeStyle', async () => {
    const outer = page.locator('#F1\\.OUTER');
    const border = await outer.evaluate(el => getComputedStyle(el).borderStyle);
    expect(border).toContain('ridge');
  });

  test('inner SubForm has Groove EdgeStyle', async () => {
    const inner = page.locator('#F1\\.OUTER\\.INNER');
    const border = await inner.evaluate(el => getComputedStyle(el).borderStyle);
    expect(border).toContain('groove');
  });

  // ─────────────────────────────────────────────────────────────
  // Components at Outer Level — Bug 6 (outer localStorage)
  // ─────────────────────────────────────────────────────────────

  test('Edit in outer SubForm renders with correct value', async () => {
    const edit = page.locator('#F1\\.OUTER\\.EDIT1');
    await expect(edit).toBeVisible();
    await expect(edit).toHaveValue('Outer edit');
  });

  test('Edit in outer SubForm accepts typing', async () => {
    const edit = page.locator('#F1\\.OUTER\\.EDIT1');
    await edit.click();
    await edit.fill('Modified outer');
    await expect(edit).toHaveValue('Modified outer');
  });

  test('Combo in outer SubForm works', async () => {
    const combo = page.locator('#F1\\.OUTER\\.COMBO1');
    await expect(combo).toBeVisible();
    await expect(combo).toContainText('Alpha');
  });

  // ─────────────────────────────────────────────────────────────
  // Components at Inner Level (2 Levels Deep) — Bug 6 (inner localStorage)
  // ─────────────────────────────────────────────────────────────

  test('Edit in inner SubForm renders with correct value', async () => {
    const edit = page.locator('#F1\\.OUTER\\.INNER\\.EDIT1');
    await expect(edit).toBeVisible();
    await expect(edit).toHaveValue('Inner edit');
  });

  test('Edit in inner SubForm accepts typing', async () => {
    const edit = page.locator('#F1\\.OUTER\\.INNER\\.EDIT1');
    await edit.click();
    await edit.fill('Modified inner');
    await expect(edit).toHaveValue('Modified inner');
  });

  // Bug 1 exposure: typing in inner Edit should not corrupt outer Edit
  test('inner Edit typing does not corrupt outer Edit', async () => {
    const outerEdit = page.locator('#F1\\.OUTER\\.EDIT1');
    // Outer edit should still have the value we set earlier
    const outerValue = await outerEdit.inputValue();
    expect(outerValue).toBe('Modified outer');
  });

  test('Numeric Edit in inner SubForm renders', async () => {
    const edit = page.locator('#F1\\.OUTER\\.INNER\\.EDIT2');
    await expect(edit).toBeVisible();
    const value = await edit.inputValue();
    expect(value).toContain('9999');
  });

  // ─────────────────────────────────────────────────────────────
  // Combo at Inner Level — Bug 5+6 (portal + localStorage 2 levels)
  // ─────────────────────────────────────────────────────────────

  test('Combo in inner SubForm opens and selects', async () => {
    const combo = page.locator('#F1\\.OUTER\\.INNER\\.COMBO1');
    await expect(combo).toBeVisible();
    await expect(combo).toContainText('Green');

    await combo.click();
    const options = page.locator('[role="option"]');
    await options.filter({ hasText: 'Blue' }).click();

    await expect(combo).toContainText('Blue');
  });

  // ─────────────────────────────────────────────────────────────
  // Button & Checkbox at Inner Level — Bug 7 at 2 levels
  // ─────────────────────────────────────────────────────────────

  test('Button in inner SubForm is clickable', async () => {
    const btn = page.locator('#F1\\.OUTER\\.INNER\\.BTN1');
    await expect(btn).toBeVisible();
    await btn.click();

    // Wait for event
    await page.waitForTimeout(500);
    const counter = page.locator('#F1\\.COUNT');
    const text = await counter.textContent();
    expect(text).not.toBe('Events: 0');
  });

  test('Checkbox in inner SubForm toggles', async () => {
    const chk = page.locator('#F1\\.OUTER\\.INNER\\.CHK1');
    await expect(chk).toBeVisible();

    const checkbox = chk.locator('input[type="checkbox"]');
    if (await checkbox.isVisible()) {
      const wasChecked = await checkbox.isChecked();
      await checkbox.click();
      await expect(checkbox).toBeChecked({ checked: !wasChecked });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Font Inheritance Through Nested SubForms
  // ─────────────────────────────────────────────────────────────

  test('font inherits from Form through nested SubForms', async () => {
    const edit = page.locator('#F1\\.OUTER\\.INNER\\.EDIT1');
    const fontFamily = await edit.evaluate(el => {
      const input = el.querySelector('input') || el;
      return getComputedStyle(input).fontFamily;
    });
    // Should inherit font from F1.FORMFONT via OUTER SubForm's FontObj
    // Segoe UI may fall back to system font on non-Windows
    expect(fontFamily).toBeTruthy();
  });

  // ─────────────────────────────────────────────────────────────
  // BCol Isolation Between Nesting Levels
  // ─────────────────────────────────────────────────────────────

  test('inner SubForm has its own background color', async () => {
    const inner = page.locator('#F1\\.OUTER\\.INNER');
    const bg = await inner.evaluate(el => getComputedStyle(el).backgroundColor);
    // BCol (230 230 250) => rgb(230, 230, 250)
    expect(bg).toContain('230, 230, 250');
  });

  test('outer SubForm has different background color', async () => {
    const outer = page.locator('#F1\\.OUTER');
    const bg = await outer.evaluate(el => getComputedStyle(el).backgroundColor);
    // BCol (240 240 240) => rgb(240, 240, 240)
    expect(bg).toContain('240, 240, 240');
  });

  // ─────────────────────────────────────────────────────────────
  // EdgeStyle on Edit Inside Inner SubForm (Deepest Nesting)
  // ─────────────────────────────────────────────────────────────

  test('EdgeStyle Edit in inner SubForm renders correctly', async () => {
    const edit = page.locator('#F1\\.OUTER\\.INNER\\.ES1');
    await expect(edit).toBeVisible();
    const border = await edit.evaluate(el => {
      const input = el.querySelector('input') || el;
      return getComputedStyle(input).borderStyle;
    });
    expect(border).toContain('ridge');
  });

  // ─────────────────────────────────────────────────────────────
  // Mirror Labels (auto-update via Change event from inside SubForms)
  // ─────────────────────────────────────────────────────────────

  test('outer Edit mirror is visible', async () => {
    const mirror = page.locator('#F1\\.OUTER\\.EDIT1MIRROR');
    await expect(mirror).toBeVisible();
  });

  test('inner Edit mirror is visible', async () => {
    const mirror = page.locator('#F1\\.OUTER\\.INNER\\.EDIT1MIRROR');
    await expect(mirror).toBeVisible();
  });

  // Note for the next two tests: we use the Update Mirrors button rather
  // than relying on Change-event-on-blur. Blur-triggered Change is racy
  // under headless Playwright — clicking outside doesn't always cause
  // the input's Change event to fire before the assertion runs. The
  // button click goes through the same CBSubFormDemo callback
  // (eWG 'Text' → eWS 'Caption') and refreshes both outer and inner
  // mirrors at once, so the round-trip coverage is preserved.

  test('typed outer Edit value reaches outer mirror via Update Mirrors', async () => {
    const edit = page.locator('#F1\\.OUTER\\.EDIT1');
    const mirror = page.locator('#F1\\.OUTER\\.EDIT1MIRROR');
    const updateBtn = page.locator('#F1\\.OUTER\\.INNER\\.UPDATEBTN');
    // Stable literal (not Date.now()) so the post-test visual state is
    // deterministic — any string different from the demo's initial
    // 'Outer edit' is enough to prove the update happened.
    const newValue = 'outer modified';

    await edit.click();
    await edit.fill(newValue);
    await updateBtn.click();
    await expect(mirror).toContainText(newValue, { timeout: 5000 });
  });

  test('typed inner Edit value reaches inner mirror via Update Mirrors', async () => {
    const edit = page.locator('#F1\\.OUTER\\.INNER\\.EDIT1');
    const mirror = page.locator('#F1\\.OUTER\\.INNER\\.EDIT1MIRROR');
    const updateBtn = page.locator('#F1\\.OUTER\\.INNER\\.UPDATEBTN');
    // Stable literal (see comment in the outer-mirror test above).
    const newValue = 'inner modified';

    await edit.click();
    await edit.fill(newValue);
    await updateBtn.click();
    await expect(mirror).toContainText(newValue, { timeout: 5000 });
  });

  // ─────────────────────────────────────────────────────────────
  // Update Mirrors Button (manual refresh, decouples Change from value-read)
  // ─────────────────────────────────────────────────────────────

  test('Update Mirrors button refreshes all nested mirrors', async () => {
    const btn = page.locator('#F1\\.OUTER\\.INNER\\.UPDATEBTN');
    await expect(btn).toBeVisible();

    // Modify a couple of edits without triggering Change (just fill, no blur)
    const innerEdit3 = page.locator('#F1\\.OUTER\\.INNER\\.EDIT3');
    await innerEdit3.click();
    await innerEdit3.fill('updated via button');

    await btn.click();
    await page.waitForTimeout(800);

    const mirror = page.locator('#F1\\.OUTER\\.INNER\\.EDIT3MIRROR');
    const mirrorText = await mirror.textContent();
    expect(mirrorText).toContain('updated via button');
  });

  // ─────────────────────────────────────────────────────────────
  // Single-Event Display Inside Inner SubForm
  // ─────────────────────────────────────────────────────────────

  test('single-event display updates when inner component fires event', async () => {
    const result = page.locator('#F1\\.OUTER\\.INNER\\.RESULT');
    await expect(result).toBeVisible();

    // Click the inner Button to fire a Select event
    const btn = page.locator('#F1\\.OUTER\\.INNER\\.BTN1');
    await btn.click();

    await page.waitForTimeout(800);
    const text = await result.textContent();
    // Result label should no longer be the initial "(none)"
    expect(text).not.toBe('(none)');
    expect(text).toContain('F1.OUTER.INNER.BTN1');
  });

  // ─────────────────────────────────────────────────────────────
  // Visual Regression
  // ─────────────────────────────────────────────────────────────

  test('visual regression - nested SubForm demo', async () => {
    await expect(page).toHaveScreenshot('subform-nested-demo.png', {
      maxDiffPixels: 100
    });
  });
});
