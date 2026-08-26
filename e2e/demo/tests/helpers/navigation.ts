import { expect, Page } from '@playwright/test';
import { connectToEWC, findEWCPage, isBrowserMode } from './cdp-helper';

// The demo menu combo. addDemoMenu names it <form>.MENU (or, when the Form
// reserves a slot for it, <form>.INPUT.DEMO.MENU), so match on the ID suffix
// rather than "first combobox on the page": the menu is added LAST, so in a
// demo that has combos of its own .first() picks one of those instead.
const menuCombo = (page: Page) =>
  page.locator('[role="combobox"][id$=".MENU"]').first();

// The menu's own dropdown list, so we never match another combo's options.
const menuListbox = (page: Page) =>
  page.locator('[role="listbox"][id$=".MENU-listbox"]').first();

// Navigate to a specific demo and wait for it to load
// Returns the page (same page in browser mode, new page in desktop mode)
export async function navigateToDemo(
  page: Page,
  demoName: string,
  indicatorSelector: string,
  timeout: number = 10000
): Promise<Page> {
  const combo = menuCombo(page);
  await expect(combo).toBeVisible({ timeout: 5000 });

  if (isBrowserMode()) {
    // Browser mode: click combo to open, then click option
    await combo.click();

    // Wait for listbox to appear
    await expect(menuListbox(page)).toBeVisible({ timeout: 2000 });

    // Click the option with exact matching text
    const option = menuListbox(page).getByRole('option', { name: demoName, exact: true });
    await option.click();

    // Wait for the demo to load
    await waitForDemoLoad(page, indicatorSelector, timeout);
    return page;
  }

  // Desktop/CDP mode: click combo and select, triggers new window
  await combo.click();
  await expect(menuListbox(page)).toBeVisible({ timeout: 2000 });

  // Click option - don't await fully since page may close
  menuListbox(page).getByRole('option', { name: demoName, exact: true }).click().catch(() => {
    // Expected - page closes when new window opens
  });

  // Wait for new window to open and connect to it
  await new Promise(r => setTimeout(r, 1500));

  // Reconnect to CDP and find the new page
  const browser = await connectToEWC(8080);
  const newPage = await findEWCPage(browser, 'EWC');

  // Wait for the demo to load
  await waitForDemoLoad(newPage, indicatorSelector, timeout);

  return newPage;
}

// The demo menu's first item. addDemoMenu prepends it to the demo list, and
// selecting it makes CBRunDemo rebuild the launcher form (i.e. go back home).
export const MENU_PLACEHOLDER = 'Pick a Demo';

// Go back to the demo home page by selecting the menu's placeholder item.
// Several demos also have an F1.L1 Label, so match on the launcher's caption
// too — otherwise the wait can be satisfied by the demo we're leaving.
export const HOME_INDICATOR = '#F1\\.L1:has-text("Welcome to EWC")';

export async function returnToDemoMenu(
  page: Page,
  timeout: number = 10000
): Promise<Page> {
  return navigateToDemo(page, MENU_PLACEHOLDER, HOME_INDICATOR, timeout);
}

// Wait for a demo to finish loading
export async function waitForDemoLoad(
  page: Page,
  indicatorSelector: string,
  timeout: number = 5000
): Promise<void> {
  // Wait for the indicator element to be visible
  await expect(page.locator(indicatorSelector).first()).toBeVisible({ timeout });

  // Small additional delay for WebSocket processing
  await page.waitForTimeout(200);
}

// Get the current selected demo from the menu combo
export async function getCurrentDemo(page: Page): Promise<string> {
  const text = await menuCombo(page).textContent();
  return (text || '').trim();
}
