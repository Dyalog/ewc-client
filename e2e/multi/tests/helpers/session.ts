import { Browser, BrowserContext, Page, expect } from '@playwright/test';

// One simulated user = one Playwright BrowserContext.
//
// Contexts are storage- and cookie-partitioned, so this models "different
// people on different machines" — the scenario Multi mode exists for. Tabs
// within ONE context share a localStorage jar and currently break on
// src/App.jsx:218-221 (localStorage.clear() on every Form create); that is a
// separate, known problem and deliberately not what this suite covers.
//
// Do NOT reach for e2e/demo/tests/helpers/cdp-helper.ts here: its
// connectAndFindEWCPage is a process-wide singleton and hands back the same
// page every time, which would make every "user" the same user.

const BASE = process.env.MULTI_URL || 'http://localhost:22323';

export interface MultiSession {
  context: BrowserContext;
  page: Page;
  /** Clone namespace, e.g. `#.mtest_2` — read from the server, not assumed. */
  ns: string;
  /** Short form, e.g. `mtest_2`, as it appears in the clones list. */
  shortNs: string;
  /** EWC session id (`_EWC.ID`). Recycled on disconnect — see lifecycle.spec.ts. */
  id: string;
  /** APL thread id running this session's Initialise. */
  tid: string;

  caption(element: string): Promise<string>;
  editText(element: string): Promise<string>;
  click(element: string): Promise<void>;
  fill(element: string, value: string): Promise<void>;

  /** Re-read the server-wide views, then return them. */
  refresh(): Promise<{ clones: string[]; closed: string[] }>;
  clones(): Promise<string[]>;
  closed(): Promise<string[]>;

  /** Graceful close: the page unloads, so the client sends {Signal:{Name:"Close"}}. */
  close(): Promise<void>;
  /**
   * Ungraceful close: drop the context without letting the page unload, so no
   * Close signal is ever sent — the "laptop lid shut / wifi dropped / browser
   * crashed" case.
   */
  abandon(): Promise<void>;
}

// CSS id selector for an APL object id. The dots in `F1.WHOAMI` are part of
// the id, not descendant combinators, so they must be escaped.
function sel(element: string): string {
  return '#' + `F1.${element}`.replace(/\./g, '\\.');
}

function splitList(caption: string): string[] {
  const t = caption.trim();
  return t === '(none)' || t === '' ? [] : t.split(/\s+/);
}

export async function openSession(
  browser: Browser,
  opts: { who?: string; timeout?: number } = {}
): Promise<MultiSession> {
  const timeout = opts.timeout ?? 20000;
  const context = await browser.newContext();
  const page = await context.newPage();

  const query = opts.who ? `/?who=${encodeURIComponent(opts.who)}` : '/';
  await page.goto(BASE + query, { waitUntil: 'domcontentloaded' });

  // Deliberately no reload-retry. Multi mode renders on the FIRST connect
  // (unlike Browser mode's connect-time launch), and a reload would tear this
  // session down and create another — shifting the session-id sequence that
  // the lifecycle assertions depend on. A missing form here is a real failure.
  try {
    await page.locator(sel('WHOAMI')).waitFor({ state: 'visible', timeout });
  } catch {
    throw new Error(
      `mtest form never rendered at ${BASE + query} within ${timeout}ms. ` +
        `Is the Multi-mode server up (yarn ewc-multi:start)? ` +
        `Initialise runs in a detached thread, so an APL error there shows up ` +
        `as this timeout — check 'docker logs ewc-multi'.`
    );
  }

  const caption = async (element: string) =>
    (await page.locator(sel(element)).first().innerText()).trim();
  const editText = async (element: string) =>
    (await page.locator(sel(element)).first().inputValue()).trim();

  const ns = await caption('WHOAMI');
  if (!ns.startsWith('#.mtest_')) {
    // Initialise's trap rewrites WHOAMI with the error, so this reports the
    // actual APL failure rather than a bare assertion mismatch.
    throw new Error(`Session did not initialise cleanly; WHOAMI reads: ${ns}`);
  }

  const session: MultiSession = {
    context,
    page,
    ns,
    shortNs: ns.replace('#.', ''),
    id: await caption('SESSIONID'),
    tid: await caption('TID'),

    caption,
    editText,
    click: async (element) => {
      await page.locator(sel(element)).first().click();
    },
    fill: async (element, value) => {
      await page.locator(sel(element)).first().fill(value);
    },

    refresh: async () => {
      // Watch the sequence number, not the captions themselves: a stale
      // CLONES value is indistinguishable from a freshly-written one, so
      // asserting "not empty" would pass instantly against the OLD value and
      // hand the caller a pre-refresh snapshot. CBRefresh writes REFRESHN
      // last, and WebSocket frames apply in order, so a changed counter
      // guarantees the captions beneath it are current.
      const before = await caption('REFRESHN');
      await page.locator(sel('REFRESH')).first().click();
      await expect(page.locator(sel('REFRESHN'))).not.toHaveText(before, { timeout: 15000 });
      return {
        clones: splitList(await caption('CLONES')),
        closed: splitList(await caption('CLOSELOG')),
      };
    },
    clones: async () => splitList(await caption('CLONES')),
    closed: async () => splitList(await caption('CLOSELOG')),

    close: async () => {
      // page.close() lets the page run its pagehide handler
      // (src/App.jsx:103-126), which sends the Close signal EWC needs to tear
      // the session down. Closing the context alone does NOT — see abandon().
      await page.close();
      await context.close();
    },
    abandon: async () => {
      await context.close();
    },
  };

  return session;
}

export async function openSessions(
  browser: Browser,
  n: number,
  opts: { who?: (i: number) => string } = {}
): Promise<MultiSession[]> {
  const sessions: MultiSession[] = [];
  for (let i = 0; i < n; i++) {
    // Sequential, not Promise.all: session ids are assigned by arrival order
    // (newSession.aplf:7 takes the lowest free integer), and the lifecycle
    // specs assert on that ordering.
    sessions.push(await openSession(browser, { who: opts.who?.(i) }));
  }
  return sessions;
}

/**
 * Poll an observer session until the server-wide view satisfies `pred`.
 *
 * Teardown is asynchronous — EWC processes the client's Close signal on its
 * Listen thread — so lifecycle assertions have to wait for a state, not read
 * once. Measured at ~320ms locally; the default budget is generous for CI.
 */
export async function waitForServerState(
  observer: MultiSession,
  pred: (s: { clones: string[]; closed: string[] }) => boolean,
  opts: { timeout?: number; label?: string } = {}
): Promise<{ clones: string[]; closed: string[] }> {
  const timeout = opts.timeout ?? 20000;
  const started = Date.now();
  let last = await observer.refresh();

  while (!pred(last)) {
    if (Date.now() - started > timeout) {
      throw new Error(
        `Timed out after ${timeout}ms waiting for ${opts.label ?? 'server state'}. ` +
          `Last seen: clones=[${last.clones.join(' ')}] closed=[${last.closed.join(' ')}]`
      );
    }
    await observer.page.waitForTimeout(400);
    last = await observer.refresh();
  }

  return last;
}
