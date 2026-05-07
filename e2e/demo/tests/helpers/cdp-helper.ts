import { chromium, Browser, Page } from '@playwright/test';

// Environment variables
const BROWSER_URL = process.env.BROWSER_URL; // e.g., 'http://localhost:5173'

// Connect to EWC - either via CDP (desktop) or direct browser (web)
export async function connectToEWC(cdpPort: number = 8080): Promise<Browser> {
  // Browser mode: launch chromium and navigate to URL
  if (BROWSER_URL) {
    const browser = await chromium.launch({ headless: !process.env.HEADED });
    return browser;
  }

  // CDP mode: connect to existing CEF instance
  const cdpEndpoint = `http://127.0.0.1:${cdpPort}`;
  try {
    const browser = await chromium.connectOverCDP(cdpEndpoint);
    return browser;
  } catch (error) {
    throw new Error(
      `Failed to connect to EWC via CDP on port ${cdpPort}. ` +
      `Is the EWC Demo running with --remote-debugging-port=${cdpPort}? ` +
      `Or set BROWSER_URL=http://localhost:5173 for browser mode. ` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Find the EWC page among HTMLRenderer windows
export async function findEWCPage(browser: Browser, pageTitle: string = 'EWC'): Promise<Page> {
  // Browser mode: create new page and navigate
  if (BROWSER_URL) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(BROWSER_URL);
    await page.waitForLoadState('networkidle');
    // Wait for WebSocket connection and menu to populate
    // Combo uses role="combobox" (custom dropdown, not native select)
    // Known bug: page may need a reload for WebSocket to connect
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.waitForSelector('[role="combobox"]', { timeout: 5000 });
        return page;
      } catch {
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
    }
    await page.waitForSelector('[role="combobox"]', { timeout: 10000 });
    return page;
  }

  // CDP mode: find existing page
  const contexts = browser.contexts();

  // Search all contexts for the EWC page
  for (const context of contexts) {
    for (const page of context.pages()) {
      const title = await page.title();
      if (title === pageTitle) {
        return page;
      }
    }
  }

  // If not found, list available pages for debugging
  const availablePages: string[] = [];
  for (const context of contexts) {
    for (const page of context.pages()) {
      const title = await page.title();
      const url = page.url();
      availablePages.push(`"${title}" (${url})`);
    }
  }

  throw new Error(
    `Could not find EWC page with title "${pageTitle}". ` +
    `Available pages: ${availablePages.length > 0 ? availablePages.join(', ') : 'none'}. ` +
    `Is the EWC Demo running?`
  );
}

// Connect to EWC and find the EWC page (convenience function)
export async function connectAndFindEWCPage(
  cdpPort: number = 8080,
  pageTitle: string = 'EWC'
): Promise<{ browser: Browser; page: Page }> {
  const browser = await connectToEWC(cdpPort);
  const page = await findEWCPage(browser, pageTitle);
  return { browser, page };
}

// Reload the current page to reset state
export async function reloadPage(page: Page): Promise<void> {
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
}

// Check if running in browser mode
export function isBrowserMode(): boolean {
  return !!BROWSER_URL;
}
