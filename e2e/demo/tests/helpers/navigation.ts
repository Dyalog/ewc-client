import { expect, Page } from '@playwright/test';
import { connectToEWC, findEWCPage, isBrowserMode } from './cdp-helper';

// Navigate to a specific demo and wait for it to load
// Returns the page (same page in browser mode, new page in desktop mode)
export async function navigateToDemo(
  page: Page,
  demoName: string,
  indicatorSelector: string,
  timeout: number = 10000
): Promise<Page> {
  // Find the demo menu (first combobox on page)
  const menuCombo = page.locator('[role="combobox"]').first();
  await expect(menuCombo).toBeVisible({ timeout: 5000 });

  if (isBrowserMode()) {
    // Browser mode: click combo to open, then click option
    await menuCombo.click();

    // Wait for listbox to appear
    const listbox = page.locator('[role="listbox"]').first();
    await expect(listbox).toBeVisible({ timeout: 2000 });

    // Click the option with exact matching text
    const option = page.getByRole('option', { name: demoName, exact: true });
    await option.click();

    // Wait for the demo to load
    await waitForDemoLoad(page, indicatorSelector, timeout);
    return page;
  }

  // Desktop/CDP mode: click combo and select, triggers new window
  await menuCombo.click();
  const listbox = page.locator('[role="listbox"]').first();
  await expect(listbox).toBeVisible({ timeout: 2000 });

  // Click option - don't await fully since page may close
  page.getByRole('option', { name: demoName, exact: true }).click().catch(() => {
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
  const menuCombo = page.locator('[role="combobox"]').first();
  const text = await menuCombo.textContent();
  return text || '';
}
