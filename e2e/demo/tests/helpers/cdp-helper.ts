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

// Wait for the demo menu (first combobox) to populate after a navigation.
// Combo uses role="combobox" (custom dropdown, not native select). Known
// bug: the page sometimes needs a reload for the WebSocket to connect, so
// retry a few times before giving up. Shared by the initial page load and
// the per-describe refresh in connectAndFindEWCPage.
async function waitForMenu(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.waitForSelector('[role="combobox"]', { timeout: 5000 });
      return;
    } catch {
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
  }
  await page.waitForSelector('[role="combobox"]', { timeout: 10000 });
}

// Find the EWC page among HTMLRenderer windows
export async function findEWCPage(browser: Browser, pageTitle: string = 'EWC'): Promise<Page> {
  // Browser mode: create new page and navigate
  if (BROWSER_URL) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(BROWSER_URL);
    await waitForMenu(page);
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

// One browser + page reused for the whole run. With workers: 1 this module
// is loaded once, so the singleton persists across every spec; running a
// single spec in isolation still works because the first beforeAll launches
// it on demand. This replaces the old launch-per-beforeAll, which leaked a
// browser (and a WebSocket into the single-session EWC backend) per describe
// — ~45 per full run — and wedged the constrained CI runner into a cascade
// of 60s beforeAll timeouts. Collapsing to one browser/one session removes
// both the process leak and the backend session contention.
let shared: { browser: Browser; page: Page } | null = null;

// Connect to EWC and find the EWC page (convenience function)
export async function connectAndFindEWCPage(
  cdpPort: number = 8080,
  pageTitle: string = 'EWC'
): Promise<{ browser: Browser; page: Page }> {
  // Reuse the live browser+page if we have one. The guards self-heal: if the
  // browser crashed or the page closed mid-run, fall through and relaunch so
  // a single failure doesn't cascade into every subsequent beforeAll.
  if (shared && shared.browser.isConnected() && !shared.page.isClosed()) {
    // Browser mode: refresh back to the menu so each describe starts from a
    // clean client state ("just reload the page"). CDP/desktop mode leaves
    // its externally-owned page untouched, as before.
    if (BROWSER_URL) {
      await shared.page.goto(BROWSER_URL);
      await waitForMenu(shared.page);
    }
    return shared;
  }

  const browser = await connectToEWC(cdpPort);
  const page = await findEWCPage(browser, pageTitle);
  shared = { browser, page };
  return shared;
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
