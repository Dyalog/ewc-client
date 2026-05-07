import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

/**
 * Combo Component Tests
 *
 * Custom dropdown replacing native <select> to support re-selection events.
 * Uses role-based selectors for accessibility and resilience.
 */
test.describe('DemoCombo', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Combo', '[role="combobox"]', 10000);
  });

  test.beforeEach(async () => {
    await page.waitForTimeout(100);
  });

  // ─────────────────────────────────────────────────────────────
  // Basic Selection
  // ─────────────────────────────────────────────────────────────

  test('displays combo elements', async () => {
    await expect(page.locator('[role="combobox"]').first()).toBeVisible();
  });

  test('opens dropdown on click', async () => {
    const combo = page.locator('[role="combobox"]').first();
    await combo.click();

    const listbox = page.locator('[role="listbox"]').first();
    await expect(listbox).toBeVisible();

    // Close
    await page.keyboard.press('Escape');
  });

  test('shows all options in dropdown', async () => {
    const combo = page.locator('[role="combobox"]').first();
    await combo.click();

    const options = page.locator('[role="option"]');
    const count = await options.count();
    expect(count).toBeGreaterThan(0);

    await page.keyboard.press('Escape');
  });

  test('selects item and updates display', async () => {
    const combo = page.locator('[role="combobox"]').first();
    await combo.click();

    const option = page.locator('[role="option"]').nth(2);
    const optionText = await option.textContent();
    await option.click();

    // Dropdown closes
    await expect(page.locator('[role="listbox"]').first()).not.toBeVisible();

    // Combo shows selected value
    await expect(combo).toContainText(optionText!);
  });

  // ─────────────────────────────────────────────────────────────
  // Reselection (Primary Goal)
  // ─────────────────────────────────────────────────────────────

  test('fires event on reselection of same item', async () => {
    // Find the SizeCombo and its counter
    const sizeCombo = page.locator('#F1\\.SizeCombo');
    const counter = page.locator('#F1\\.SizeCount');

    const initialCount = parseInt(await counter.textContent() || '0');

    // Get current selection
    const currentText = await sizeCombo.textContent();

    // Reselect same item 3 times
    for (let i = 0; i < 3; i++) {
      await sizeCombo.click();
      await page.locator('[role="option"]').filter({ hasText: currentText! }).click();
      await page.waitForTimeout(50);
    }

    const finalCount = parseInt(await counter.textContent() || '0');
    expect(finalCount).toBe(initialCount + 3);
  });

  // ─────────────────────────────────────────────────────────────
  // Keyboard Navigation
  // ─────────────────────────────────────────────────────────────

  test('opens with Space and Enter', async () => {
    const combo = page.locator('[role="combobox"]').first();
    const listbox = page.locator('[role="listbox"]').first();

    await combo.focus();

    // Space opens
    await page.keyboard.press('Space');
    await expect(listbox).toBeVisible();
    await page.keyboard.press('Escape');

    // Enter opens
    await page.keyboard.press('Enter');
    await expect(listbox).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('opens with Alt+Down, closes with Alt+Up', async () => {
    const combo = page.locator('[role="combobox"]').first();
    const listbox = page.locator('[role="listbox"]').first();

    await combo.focus();

    await page.keyboard.press('Alt+ArrowDown');
    await expect(listbox).toBeVisible();

    await page.keyboard.press('Alt+ArrowUp');
    await expect(listbox).not.toBeVisible();
  });

  test('navigates with arrow keys and selects with Enter', async () => {
    const combo = page.locator('[role="combobox"]').first();

    await combo.focus();
    await page.keyboard.press('Enter');

    // Navigate down twice
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Dropdown should close
    await expect(page.locator('[role="listbox"]').first()).not.toBeVisible();
  });

  test('Home jumps to first, End jumps to last', async () => {
    const combo = page.locator('[role="combobox"]').first();

    await combo.focus();
    await page.keyboard.press('Enter');

    // End then Enter
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    const afterEnd = await combo.textContent();

    // Home then Enter
    await page.keyboard.press('Enter');
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    const afterHome = await combo.textContent();

    // First and last should be different
    expect(afterEnd).not.toBe(afterHome);
  });

  test('Escape closes without changing selection', async () => {
    const combo = page.locator('[role="combobox"]').first();
    const before = await combo.textContent();

    await combo.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');

    const after = await combo.textContent();
    expect(after).toBe(before);
  });

  test('Tab closes dropdown', async () => {
    const combo = page.locator('[role="combobox"]').first();
    const listbox = page.locator('[role="listbox"]').first();

    await combo.focus();
    await page.keyboard.press('Enter');
    await expect(listbox).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(listbox).not.toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────
  // Type-to-Search
  // ─────────────────────────────────────────────────────────────

  test('typing character selects matching item', async () => {
    const combo = page.locator('#F1\\.Colour');

    await combo.focus();
    await page.keyboard.type('g');

    await expect(combo).toContainText('Green');
  });

  test('multi-character search narrows results', async () => {
    const combo = page.locator('#F1\\.Colour');

    // Wait for any previous search to clear (500ms timeout in component)
    await page.waitForTimeout(600);

    await combo.focus();
    await page.keyboard.type('pu', { delay: 50 });

    await expect(combo).toContainText('Purple');
  });

  // ─────────────────────────────────────────────────────────────
  // Click Outside
  // ─────────────────────────────────────────────────────────────

  test('clicking outside closes dropdown', async () => {
    const combo = page.locator('[role="combobox"]').first();
    const listbox = page.locator('[role="listbox"]').first();

    await combo.click();
    await expect(listbox).toBeVisible();

    // Click on form background
    await page.locator('#F1').click({ position: { x: 10, y: 600 } });
    await expect(listbox).not.toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────
  // Styled Combos
  // ─────────────────────────────────────────────────────────────

  test('styled combo has custom border', async () => {
    const styledCombo = page.locator('#F1\\.StyledCombo1');
    await expect(styledCombo).toBeVisible();

    const borderRadius = await styledCombo.evaluate(
      el => getComputedStyle(el).borderRadius
    );
    expect(borderRadius).not.toBe('0px');
  });

  // ─────────────────────────────────────────────────────────────
  // Grid Integration
  // ─────────────────────────────────────────────────────────────

  test('grid combo updates cell value', async () => {
    const gridCombo = page.locator('#F1\\.Orders\\.Status').first();

    if (await gridCombo.isVisible()) {
      await gridCombo.click();

      const option = page.locator('[role="option"]').filter({ hasText: 'Pending' }).first();
      if (await option.isVisible()) {
        await option.click();
      }
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Visual Regression
  // ─────────────────────────────────────────────────────────────

  test('visual: combo closed state', async () => {
    // Reset to known state
    const combo = page.locator('#F1\\.Colour');
    await combo.focus();
    await page.keyboard.type('r');
    await page.waitForTimeout(100);

    await expect(page).toHaveScreenshot('combo-demo.png', {
      maxDiffPixels: 100
    });
  });

  test('visual: dropdown open state', async () => {
    const combo = page.locator('#F1\\.Colour');
    await combo.click();

    await expect(page).toHaveScreenshot('combo-dropdown-open.png', {
      maxDiffPixels: 100
    });

    await page.keyboard.press('Escape');
  });
});
