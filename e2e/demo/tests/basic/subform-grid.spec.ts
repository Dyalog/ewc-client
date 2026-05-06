import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// SubForm Grid Tests
// Targets: Bug 6 (localStorage race), Grid event coordination,
//          embedded components (Edit, Combo) inside Grid inside SubForm
//
// Known issue (suite-level fixme): navigateToDemo to 'SubFormGrid' is
// intermittent — beforeAll sometimes times out waiting for #F1.SF.G to
// become visible, and the cascade fails most/all tests in the file. The
// failure pattern is run-to-run inconsistent, so we mark the whole
// describe as fixme rather than per-test. Re-enable once the navigation
// flakiness is root-caused (likely related to demo dropdown selection
// timing or the EWC backend's state between specs).
test.describe.fixme('DemoSubFormGrid', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'SubFormGrid', '#F1\\.SF\\.G', 10000);
  });

  test.beforeEach(async () => {
    await page.waitForTimeout(100);
  });

  // ─────────────────────────────────────────────────────────────
  // SubForm Container
  // ─────────────────────────────────────────────────────────────

  test('SubForm container is visible with Ridge EdgeStyle', async () => {
    const sf = page.locator('#F1\\.SF');
    await expect(sf).toBeVisible();
    const border = await sf.evaluate(el => getComputedStyle(el).borderStyle);
    expect(border).toContain('ridge');
  });

  // ─────────────────────────────────────────────────────────────
  // Grid Renders Inside SubForm — Bug 6 (localStorage init)
  // ─────────────────────────────────────────────────────────────

  test('Grid renders inside SubForm', async () => {
    const grid = page.locator('#F1\\.SF\\.G');
    await expect(grid).toBeVisible({ timeout: 5000 });
  });

  test('Grid has correct column headers', async () => {
    const grid = page.locator('#F1\\.SF\\.G');
    await expect(grid).toContainText('Name');
    await expect(grid).toContainText('Score');
    await expect(grid).toContainText('Grade');
  });

  test('Grid displays cell values', async () => {
    const grid = page.locator('#F1\\.SF\\.G');
    await expect(grid).toContainText('Alice');
    await expect(grid).toContainText('Bob');
    await expect(grid).toContainText('Carol');
  });

  // ─────────────────────────────────────────────────────────────
  // Embedded Components in Grid in SubForm
  // ─────────────────────────────────────────────────────────────

  test('Grid Edit cells contain text inputs', async () => {
    // Name column cells should have input elements
    const inputs = page.locator('#F1\\.SF\\.G input[type="text"]');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Grid Edit cell accepts typing', async () => {
    // Click on a Name cell to activate it, then type
    const firstInput = page.locator('#F1\\.SF\\.G input[type="text"]').first();
    if (await firstInput.isVisible()) {
      await firstInput.click();
      const before = await firstInput.inputValue();
      await firstInput.fill('TestName');
      await expect(firstInput).toHaveValue('TestName');
    }
  });

  test('Grid Combo cells are visible', async () => {
    // Grade column uses Combo - look for combobox roles inside the grid
    const combos = page.locator('#F1\\.SF\\.G [role="combobox"]');
    const count = await combos.count();
    expect(count).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────────────────────
  // Second Grid (EdgeStyle not supported on Grid by EWC server)
  // ─────────────────────────────────────────────────────────────

  test('second Grid renders inside SubForm', async () => {
    const grid2 = page.locator('#F1\\.SF\\.G2');
    await expect(grid2).toBeVisible();
    // Verify it has content
    await expect(grid2).toContainText('X');
  });

  // ─────────────────────────────────────────────────────────────
  // Visual Regression
  // ─────────────────────────────────────────────────────────────

  test('visual regression - SubForm Grid demo', async () => {
    await expect(page).toHaveScreenshot('subform-grid-demo.png', {
      maxDiffPixels: 100
    });
  });
});
