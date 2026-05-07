import { chromium, Browser, Page } from '@playwright/test';

// BROWSER_URL selects how tests reach EWC:
//   - http://localhost:22322  → EWC's WSS serves both the React client
//                                (HTTP) and the WebSocket on the same
//                                port (this is what CI uses).
//   - http://localhost:5173   → Vite serves the React client; the
//                                bundled JS uses VITE_APL_URL to know
//                                to WS-connect to :22322 separately.
// If BROWSER_URL is unset we fall through to legacy CDP mode, where
// EWC runs in CEF/Desktop with --remote-debugging-port=8080 and we
// attach to an already-open browser.
const BROWSER_URL = process.env.BROWSER_URL;

// HEADED=1 to launch a visible browser (for local debugging). Default
// is headless so CI runs cleanly. Note: --headed at the Playwright
// CLI is NOT enough — chromium.launch() called directly here ignores
// the --headed flag, so we plumb it through this env var.
export async function connectToEWC(cdpPort: number = 8080): Promise<Browser> {
  // Browser mode: launch a fresh chromium and the caller will navigate
  // to BROWSER_URL via findEWCPage below.
  if (BROWSER_URL) {
    const browser = await chromium.launch({ headless: !process.env.HEADED });
    return browser;
  }

  // CDP mode: connect to a Dyalog CEF window that's already running
  // with --remote-debugging-port=cdpPort.
  const cdpEndpoint = `http://127.0.0.1:${cdpPort}`;
  try {
    const browser = await chromium.connectOverCDP(cdpEndpoint);
    return browser;
  } catch (error) {
    throw new Error(
      `Failed to connect to EWC via CDP on port ${cdpPort}. ` +
      `Either start EWC in CEF mode with --remote-debugging-port=${cdpPort}, ` +
      `or set BROWSER_URL=http://localhost:22322 (production-style, EWC-served) ` +
      `or BROWSER_URL=http://localhost:5173 (Vite-served, hot-reload-friendly). ` +
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
