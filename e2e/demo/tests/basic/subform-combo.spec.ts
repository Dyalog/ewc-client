import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// SubForm Combo Tests
// Targets: Bug 5 (overflow:clip clipping dropdowns),
//          Bug 6 (Combo localStorage race on parentSize),
//          Bug 7 (Button getElementById race on SubForm element)
test.describe('DemoSubFormCombo', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'SubFormCombo', '#F1\\.SF\\.COMBO1', 10000);
  });

  test.beforeEach(async () => {
    await page.waitForTimeout(100);
  });

  // ─────────────────────────────────────────────────────────────
  // Combo Inside SubForm — Bug 6 (parentSize race)
  // ─────────────────────────────────────────────────────────────

  test('Combo is visible inside SubForm', async () => {
    const combo = page.locator('#F1\\.SF\\.COMBO1');
    await expect(combo).toBeVisible();
  });

  test('Combo shows initial selection', async () => {
    const combo = page.locator('#F1\\.SF\\.COMBO1');
    await expect(combo).toContainText('Apple');
  });

  // ─────────────────────────────────────────────────────────────
  // Dropdown Escapes overflow:clip — Bug 5
  // ─────────────────────────────────────────────────────────────

  test('Combo dropdown opens despite SubForm overflow:clip', async () => {
    const combo = page.locator('#F1\\.SF\\.COMBO1');
    await combo.click();

    // Dropdown is portalled to document.body, not clipped by SubForm
    const listbox = page.locator('[role="listbox"]').first();
    await expect(listbox).toBeVisible();

    // All 5 options should be visible
    const options = page.locator('[role="option"]');
    const count = await options.count();
    expect(count).toBe(5);

    await page.keyboard.press('Escape');
  });

  // ─────────────────────────────────────────────────────────────
  // Selection + Event Propagation
  // ─────────────────────────────────────────────────────────────

  test('Combo selection works and fires event', async () => {
    const combo = page.locator('#F1\\.SF\\.COMBO1');
    const counter = page.locator('#F1\\.COUNT');
    const result = page.locator('#F1\\.SF\\.RESULT');

    const before = await counter.textContent();

    await combo.click();
    await page.locator('[role="option"]').filter({ hasText: 'Cherry' }).click();

    await expect(combo).toContainText('Cherry');

    // Wait for WebSocket round-trip
    await page.waitForTimeout(500);

    // Counter should have incremented
    const after = await counter.textContent();
    expect(after).not.toBe(before);

    // Single-event display should also reflect the selection
    const resultText = await result.textContent();
    expect(resultText).toContain('Cherry');
  });

  // ─────────────────────────────────────────────────────────────
  // Keyboard Navigation — events not swallowed by SubForm
  // ─────────────────────────────────────────────────────────────

  test('Combo keyboard navigation works in SubForm', async () => {
    const combo = page.locator('#F1\\.SF\\.COMBO1');
    await combo.focus();

    // Open with Enter
    await page.keyboard.press('Enter');
    const listbox = page.locator('[role="listbox"]').first();
    await expect(listbox).toBeVisible();

    // Navigate and select
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Dropdown should close
    await expect(listbox).not.toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────
  // Custom Font Combo
  // ─────────────────────────────────────────────────────────────

  test('Combo with custom font is visible', async () => {
    const combo2 = page.locator('#F1\\.SF\\.COMBO2');
    await expect(combo2).toBeVisible();
    await expect(combo2).toContainText('Medium');
  });

  // ─────────────────────────────────────────────────────────────
  // Button Inside SubForm — Bug 7 (getElementById race)
  // ─────────────────────────────────────────────────────────────

  test('Reset button click fires event and resets counter', async () => {
    const btn = page.locator('#F1\\.SF\\.BTN1');
    const counter = page.locator('#F1\\.COUNT');

    await expect(btn).toBeVisible();

    // First, fire some events via Combo to increment counter
    const combo = page.locator('#F1\\.SF\\.COMBO1');
    await combo.click();
    await page.locator('[role="option"]').filter({ hasText: 'Banana' }).click();
    await page.waitForTimeout(500);

    const beforeReset = await counter.textContent();
    // Counter should be > 0 if events fire from inside SubForm
    expect(beforeReset).not.toBe('Events: 0');

    // Click Reset button
    await btn.click();
    await page.waitForTimeout(500);

    // Counter should be back to 0 after Reset
    const afterReset = await counter.textContent();
    expect(afterReset).toBe('Events: 0');
  });

  // ─────────────────────────────────────────────────────────────
  // Checkbox Inside SubForm
  // ─────────────────────────────────────────────────────────────

  test('Checkbox toggles inside SubForm', async () => {
    const chk = page.locator('#F1\\.SF\\.CHK1');
    await expect(chk).toBeVisible();

    const checkbox = chk.locator('input[type="checkbox"]');
    if (await checkbox.isVisible()) {
      const wasChecked = await checkbox.isChecked();
      await checkbox.click();
      await expect(checkbox).toBeChecked({ checked: !wasChecked });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Radio Buttons in Group Inside SubForm
  // ─────────────────────────────────────────────────────────────

  test('Radio buttons are visible in Group inside SubForm', async () => {
    const radios = page.locator('#F1\\.SF\\.GRP input[type="radio"]');
    const count = await radios.count();
    expect(count).toBe(3);
  });

  test('Radio buttons are mutually exclusive', async () => {
    const radio1 = page.locator('#F1\\.SF\\.GRP input[type="radio"]').nth(0);
    const radio2 = page.locator('#F1\\.SF\\.GRP input[type="radio"]').nth(1);

    await radio2.click();
    await expect(radio2).toBeChecked();
    await expect(radio1).not.toBeChecked();

    await radio1.click();
    await expect(radio1).toBeChecked();
    await expect(radio2).not.toBeChecked();
  });

  // ─────────────────────────────────────────────────────────────
  // Visual Regression
  // ─────────────────────────────────────────────────────────────

  test('visual regression - SubForm Combo demo', async () => {
    await expect(page).toHaveScreenshot('subform-combo-demo.png', {
      maxDiffPixels: 100
    });
  });
});
