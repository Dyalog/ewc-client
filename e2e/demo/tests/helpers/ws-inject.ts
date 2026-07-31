import { Browser, BrowserContext, Page } from '@playwright/test';

// ── WebSocket frame injection ────────────────────────────────────────────────
//
// The EWC backend wires no demo callback that mutates a ribbon at runtime, so
// the ONLY way to exercise the client's WC(create) / EX(destroy) code path for
// a ribbon is to feed it the synthetic server frames ourselves — exactly the
// shape `eWC` / `eEX` send over the wire.
//
// To capture the app's live socket we must wrap `window.WebSocket` BEFORE any
// app script runs, i.e. before `page.goto(...)`. The shared page from
// connectAndFindEWCPage is already navigated, so injection tests open their own
// fresh page (off the shared browser) and drive it directly.
//
// Ported from ci/ribbon-harness/interact.mjs.

const BROWSER_URL = process.env.BROWSER_URL;

export interface InjectedPage {
  context: BrowserContext;
  page: Page;
  // Push one synthetic server frame through the live onmessage handler.
  send: (frame: unknown) => Promise<void>;
  dispose: () => Promise<void>;
}

// Open a new page that captures the first WebSocket the app opens, navigate it
// to `?Demo=<demoName>`, and wait for the indicator selector. Returns a `send`
// that pushes server frames at the captured socket.
export async function openInjectablePage(
  browser: Browser,
  demoName: string,
  indicatorSelector: string,
  timeout: number = 15000
): Promise<InjectedPage> {
  if (!BROWSER_URL) {
    throw new Error(
      'openInjectablePage requires BROWSER_URL (browser mode). ' +
        'WebSocket-capture injection is not supported in CDP/desktop mode.'
    );
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  // Wrap WebSocket before app scripts run so we grab the app's first socket.
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    (window as unknown as { __EWC_WS__: WebSocket | null }).__EWC_WS__ = null;
    // @ts-expect-error — replacing the global constructor on purpose.
    window.WebSocket = function (...args: ConstructorParameters<typeof WebSocket>) {
      const ws = new Native(...args);
      const w = window as unknown as { __EWC_WS__: WebSocket | null };
      if (!w.__EWC_WS__) w.__EWC_WS__ = ws;
      return ws;
    };
    window.WebSocket.prototype = Native.prototype;
    Object.assign(window.WebSocket, Native);
  });

  const base = BROWSER_URL.replace(/\/$/, '');
  await page.goto(`${base}/?Demo=${encodeURIComponent(demoName)}`, {
    waitUntil: 'domcontentloaded',
    timeout,
  });
  await page.locator(indicatorSelector).first().waitFor({ state: 'visible', timeout });
  // Let the WS-driven UI settle (the tree streams in after the indicator).
  await page.waitForTimeout(800);

  const send = (frame: unknown) =>
    page.evaluate((f) => {
      const ws = (window as unknown as { __EWC_WS__: WebSocket | null }).__EWC_WS__;
      if (!ws || !ws.onmessage) throw new Error('no live websocket captured');
      // Synthesize the server→client message through the live handler.
      (ws.onmessage as (ev: { data: string }) => void)({ data: JSON.stringify(f) });
    }, frame);

  const dispose = async () => {
    await context.close();
  };

  return { context, page, send, dispose };
}
