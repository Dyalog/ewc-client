import { test, expect, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import {
  navigateToDemo,
  returnToDemoMenu,
  getCurrentDemo,
  MENU_PLACEHOLDER,
  HOME_INDICATOR,
} from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);
const BASE = process.env.BROWSER_URL || 'http://localhost:5173';

// The demo menu's first item ("Pick a Demo") is a placeholder, not a demo.
// Selecting it used to do nothing at all: CBRunDemo built the function name
// 'Demo','Pick a Demo', found no such function and fell through its :If
// silently — so once you were in a demo there was no way back to the launcher.
// It now recognises item 1 and rebuilds the menu form.
test.describe('Demo menu placeholder', () => {
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    page = result.page;
  });

  test('home page starts with the placeholder selected', async () => {
    await expect(page.locator(HOME_INDICATOR)).toBeVisible({ timeout: 15000 });
    expect(await getCurrentDemo(page)).toBe(MENU_PLACEHOLDER);
  });

  test('returns to the home page from a demo', async () => {
    page = await navigateToDemo(page, 'Buttons', 'input[type="radio"]', 15000);
    await expect(page.locator(HOME_INDICATOR)).toHaveCount(0);

    page = await returnToDemoMenu(page, 15000);
    await expect(page.locator(HOME_INDICATOR)).toBeVisible();
    // The demo's own widgets are gone, not just overlaid
    await expect(page.locator('input[type="radio"]')).toHaveCount(0);
  });

  test('menu shows the placeholder again, not the demo we left', async () => {
    expect(await getCurrentDemo(page)).toBe(MENU_PLACEHOLDER);
  });

  test('a demo still launches after returning home', async () => {
    page = await navigateToDemo(page, 'Buttons', 'input[type="radio"]', 15000);
    expect(await getCurrentDemo(page)).toBe('Buttons');
    await expect(page.locator(HOME_INDICATOR)).toHaveCount(0);
  });

  test('returns home from a demo that has combos of its own', async () => {
    // Exercises the menu locator: the menu is added last, so "first combobox
    // on the page" would resolve to one of DemoCombo's own combos here.
    page = await navigateToDemo(page, 'Combo', '#F1\\.SizeCombo', 15000);
    page = await returnToDemoMenu(page, 15000);
    await expect(page.locator(HOME_INDICATOR)).toBeVisible();
    expect(await getCurrentDemo(page)).toBe(MENU_PLACEHOLDER);
  });
});

// A ?Demo= launch reaches CBRunDemo through its `presel` left argument, which
// jumps straight to RUN without setting `f` — so `:If 0=⎕NC f` raised
// VALUE ERROR and the callback died right after building the demo. The demo
// itself rendered (it was built before the error) but the menu was never
// added, leaving a deep-linked demo with no way back to the launcher.
test.describe('Demo menu on a ?Demo= deep link', () => {
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    page = result.page;
    await page.goto(`${BASE}/?Demo=Buttons`);
    await page.waitForLoadState('networkidle');
    // A connect-time launch only flushes on the second connect, once EWC's
    // event loop is pumping; reload if nothing rendered yet.
    if (!(await page.locator('input[type="radio"]').count())) {
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
    await page.locator('input[type="radio"]').first().waitFor({ timeout: 15000 });
  });

  test('the demo menu is added, showing the deep-linked demo', async () => {
    expect(await getCurrentDemo(page)).toBe('Buttons');
  });

  test('the placeholder returns to the home page', async () => {
    page = await returnToDemoMenu(page, 15000);
    await expect(page.locator(HOME_INDICATOR)).toBeVisible();
    await expect(page.locator('input[type="radio"]')).toHaveCount(0);
    expect(await getCurrentDemo(page)).toBe(MENU_PLACEHOLDER);
  });
});
