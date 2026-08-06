import { Browser, BrowserContext, Page, expect, test } from '@playwright/test';

// One simulated user = one BrowserContext. Contexts are storage- and
// cookie-partitioned, so this models different people on different machines.
//
// NOTA BENE: Don't use e2e/demo/tests/helpers/cdp-helper.ts here — its
// connectAndFindEWCPage is a process-wide singleton, so every "user" would be
// the same user.

const BASE = process.env.MULTI_URL || 'http://localhost:22323';

// OBSERVE=1 draws a banner on each session page naming it and the running step,
// and pauses between steps. STEP_MODE=manual makes that banner a driver: each
// step waits for a click. Manual implies OBSERVE.
const MANUAL = process.env.STEP_MODE === 'manual';
const OBSERVE = process.env.OBSERVE === '1' || MANUAL;
const STEP_PAUSE = parseInt(process.env.STEP_PAUSE || '900', 10);

// Set by the "Run to end" button
let runToEnd = false;

const live = new Set<MultiSession>();

const BANNER_ID = '__mtest_observe';

// Window geometry has to be set here rather than via config `use: { viewport }`:
// those options only reach contexts Playwright creates for the `page` fixture,
// not browser.newContext(). Chromium otherwise stacks every window in one place.
const [TILE_W, TILE_H] = (process.env.OBSERVE_TILE || '600x660')
  .split('x')
  .map((n) => parseInt(n, 10));

let grid: { cols: number; rows: number } | null = null;
const takenSlots = new Set<number>();

function takeSlot(): number {
  let i = 0;
  while (takenSlots.has(i)) i++;
  takenSlots.add(i);
  return i;
}

// Reused on release, so a long-lived observer keeps its position while
// short-lived sessions cycle through the slot beside it.
function releaseSlot(slot: number | undefined): void {
  if (slot !== undefined) takenSlots.delete(slot);
}

async function tile(context: BrowserContext, page: Page): Promise<number | undefined> {
  try {
    const cdp = await context.newCDPSession(page);

    if (!grid) {
      const avail = await page.evaluate(() => ({
        w: window.screen.availWidth,
        h: window.screen.availHeight,
      }));
      grid = {
        cols: Math.max(1, Math.floor(avail.w / TILE_W)),
        rows: Math.max(1, Math.floor(avail.h / TILE_H)),
      };
    }

    const slot = takeSlot();
    const cell = slot % (grid.cols * grid.rows);
    const { windowId } = (await cdp.send('Browser.getWindowForTarget')) as {
      windowId: number;
    };
    await cdp.send('Browser.setWindowBounds', {
      windowId,
      bounds: {
        left: (cell % grid.cols) * TILE_W,
        top: Math.floor(cell / grid.cols) * TILE_H,
        width: TILE_W,
        height: TILE_H,
        windowState: 'normal',
      },
    });
    return slot;
  } catch {
    // An un-tiled window is still usable; tiling just failed somehow
    return undefined;
  }
}

async function installBanner(page: Page, ns: string, manual: boolean): Promise<void> {
  await page.evaluate(
    ([id, label, isManual]) => {
      if (document.getElementById(id)) return;
      const w = window as unknown as { __mtestNext?: boolean; __mtestRun?: boolean };
      w.__mtestNext = false;
      w.__mtestRun = false;

      const bar = document.createElement('div');
      bar.id = id;
      bar.style.cssText = [
        'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:2147483647',
        'pointer-events:none', 'font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace',
        'background:#101418', 'color:#e6edf3', 'padding:8px 12px',
        'border-top:2px solid #3fb950', 'box-shadow:0 -2px 12px rgba(0,0,0,.35)',
        'display:flex', 'align-items:center', 'gap:12px',
      ].join(';');

      const text = document.createElement('div');
      text.style.cssText = 'flex:1;min-width:0';
      text.innerHTML =
        `<div style="color:#3fb950;font-weight:600">${label}</div>` +
        `<div data-step style="color:#8b949e;white-space:pre-wrap">waiting…</div>`;
      bar.appendChild(text);

      if (isManual) {
        const mk = (caption: string, accent: string, flag: 'next' | 'run') => {
          const b = document.createElement('button');
          b.textContent = caption;
          b.setAttribute(`data-${flag}`, '');
          b.style.cssText = [
            'pointer-events:auto', 'cursor:pointer', 'white-space:nowrap',
            'font:inherit', 'font-weight:600', 'padding:7px 14px',
            'border-radius:6px', `border:1px solid ${accent}`,
            'background:transparent', `color:${accent}`,
          ].join(';');
          b.onclick = () => {
            if (flag === 'next') w.__mtestNext = true;
            else w.__mtestRun = true;
          };
          return b;
        };
        const controls = document.createElement('div');
        controls.style.cssText = 'display:flex;gap:8px';
        controls.appendChild(mk('Next ▶', '#3fb950', 'next'));
        controls.appendChild(mk('Run to end ⏭', '#8b949e', 'run'));
        bar.appendChild(controls);
      }

      document.body.appendChild(bar);
    },
    [BANNER_ID, ns, manual] as const
  );
}

async function setEndMode(page: Page): Promise<void> {
  await page
    .evaluate((id) => {
      const bar = document.getElementById(id);
      if (!bar) return;
      bar.style.borderTopColor = '#f85149';
      const next = bar.querySelector('button[data-next]') as HTMLElement | null;
      if (next) {
        next.textContent = 'End ⏹';
        next.style.borderColor = '#f85149';
        next.style.color = '#f85149';
      }
      const run = bar.querySelector('button[data-run]') as HTMLElement | null;
      if (run) run.style.display = 'none';
    }, BANNER_ID)
    .catch(() => {});
}

async function flushClicks(): Promise<void> {
  await Promise.all(
    [...live].map((s) =>
      s.page
        .evaluate(() => {
          const w = window as unknown as { __mtestNext?: boolean; __mtestRun?: boolean };
          w.__mtestNext = false;
          w.__mtestRun = false;
        })
        .catch(() => {})
    )
  );
}

// Messy, but polling for knowing when the click has happened and avoid spinning
async function waitForClick(): Promise<void> {
  for (;;) {
    for (const s of [...live]) {
      if (s.page.isClosed()) {
        live.delete(s);
        continue;
      }

      const pressed = await s.page
        .evaluate(() => {
          const w = window as unknown as { __mtestNext?: boolean; __mtestRun?: boolean };
          const hit = { next: !!w.__mtestNext, run: !!w.__mtestRun };
          w.__mtestNext = false;
          w.__mtestRun = false;
          return hit;
        })
        .catch(() => {
          live.delete(s);
          return null;
        });

      if (pressed?.run) {
        runToEnd = true;
        return;
      }
      if (pressed?.next) return;
    }

    if (live.size === 0) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function announce(page: Page, text: string): Promise<void> {
  await page
    .evaluate(
      ([id, txt]) => {
        const el = document.getElementById(id)?.querySelector('[data-step]');
        if (el) el.textContent = txt;
      },
      [BANNER_ID, text] as const
    )
    .catch(() => {});
}

/**
 * Name one meaningful beat of a test — "user A types alpha", not every action.
 * Recorded as a Playwright step, so it drives the HTML report, traces and
 * `--ui`; under observe mode it also shows in the on-page banner.
 */
export async function step<T>(label: string, body: () => Promise<T>): Promise<T> {
  return test.step(label, async () => {
    if (OBSERVE) {
      const waiting = MANUAL && !runToEnd;
      await Promise.all(
        [...live].map((s) => announce(s.page, waiting ? `${label}\n⟵ click Next to run this` : label))
      );

      if (waiting) {
        if (live.size > 0) console.log(`  ⏸  ${label}   [Next ▶]`);
        await waitForClick();
        await Promise.all([...live].map((s) => announce(s.page, label)));
      } else {
        await new Promise((r) => setTimeout(r, STEP_PAUSE));
      }
    }
    return body();
  });
}

export function isObserving(): boolean {
  return OBSERVE;
}

// Close every session, holding the windows open behind one last click in manual
// mode so the final state can be inspected. 
export async function teardown(sessions: MultiSession[]): Promise<void> {
  if (MANUAL && live.size > 0) {
    await flushClicks();
    await Promise.all([...live].map((s) => setEndMode(s.page)));
    await Promise.all(
      [...live].map((s) =>
        announce(s.page, 'test complete — inspect the final state, then click End')
      )
    );
    console.log('  ⏹  test complete — click End to tear down');
    await waitForClick();
  }

  while (sessions.length) {
    await sessions.pop()!.close().catch(() => {});
  }

  for (const s of [...live]) {
    await s.close().catch(() => {});
  }
  live.clear();

  // Per test, not per run: "Run to end" means this test, so the next one gates
  // again.
  runToEnd = false;
}

export interface MultiSession {
  context: BrowserContext;
  page: Page;
  /** Clone namespace, e.g. `#.mtest_2`. */
  ns: string;
  /** Short form, e.g. `mtest_2`, as it appears in the clones list. */
  shortNs: string;
  /** EWC session id (`_EWC.ID`). Recycled on disconnect. */
  id: string;
  /** APL thread running this session's Initialise. */
  tid: string;

  caption(element: string): Promise<string>;
  editText(element: string): Promise<string>;
  click(element: string): Promise<void>;
  fill(element: string, value: string): Promise<void>;

  refresh(): Promise<{ clones: string[]; closed: string[] }>;
  clones(): Promise<string[]>;
  closed(): Promise<string[]>;

  /** Graceful: the page unloads, so the client sends its Close signal. */
  close(): Promise<void>;
  /** Ungraceful: no Close signal — lid shut, wifi dropped, browser crashed. */
  abandon(): Promise<void>;
}

// The dots in `F1.WHOAMI` are part of the APL id
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
  const context = await browser.newContext(
    OBSERVE ? { viewport: null } : { viewport: { width: 720, height: 780 } }
  );
  const page = await context.newPage();

  const query = opts.who ? `/?who=${encodeURIComponent(opts.who)}` : '/';
  try {
    await page.goto(BASE + query, { waitUntil: 'domcontentloaded' });
  } catch (err) {
    throw new Error(
      `Lost the EWC Multi server at ${BASE} part-way through the run ` +
        `(${err instanceof Error ? err.message.split('\n')[0] : String(err)}). ` +
        `It answered at start-up, so check 'yarn ewc-multi:logs'.`
    );
  }

  // No reload-retry: a reload would end this session and start another,
  // shifting the session ids the lifecycle specs assert on.
  try {
    await page.locator(sel('WHOAMI')).waitFor({ state: 'visible', timeout });
  } catch {
    throw new Error(
      `mtest form never rendered at ${BASE + query} within ${timeout}ms. ` +
        `Initialise runs in a detached thread, so an APL error there surfaces ` +
        `as this timeout — check 'yarn ewc-multi:logs'.`
    );
  }

  const caption = async (element: string) =>
    (await page.locator(sel(element)).first().innerText()).trim();
  const editText = async (element: string) =>
    (await page.locator(sel(element)).first().inputValue()).trim();

  let slot: number | undefined;
  const ns = await caption('WHOAMI');
  if (!ns.startsWith('#.mtest_')) {
    throw new Error(`Session did not initialise cleanly; WHOAMI reads: ${ns}`);
  }

  // WHOAMI is the first widget Initialise creates and TOKEN the last, so this
  // is what proves the whole form exists
  try {
    await page.locator(sel('TOKEN')).waitFor({ state: 'attached', timeout });
  } catch {
    throw new Error(
      `${ns} rendered only part of its form within ${timeout}ms ` +
        `(F1.WHOAMI arrived, F1.TOKEN did not) — check 'yarn ewc-multi:logs'.`
    );
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
      // Wait on the sequence number
      // writes REFRESHN last and frames apply in order, so a changed counter
      // means the captions are current.
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
      // page.close() runs the page's pagehide handler, which is what sends the
      // Close signal EWC needs. Closing the context alone does not.
      live.delete(session);
      releaseSlot(slot);
      await page.close();
      await context.close();
    },
    abandon: async () => {
      live.delete(session);
      releaseSlot(slot);
      await context.close();
    },
  };

  if (OBSERVE) {
    slot = await tile(context, page);
    live.add(session);
    // Buttons on every window even after "Run to end", or there would be
    // nothing to click in the End state
    await installBanner(page, ns, MANUAL);
  }

  return session;
}

export async function openSessions(
  browser: Browser,
  n: number,
  opts: { who?: (i: number) => string } = {}
): Promise<MultiSession[]> {
  const sessions: MultiSession[] = [];
  for (let i = 0; i < n; i++) {
    // Sequential: EWC assigns session ids by arrival order and the lifecycle
    // specs assert on that ordering.
    sessions.push(await openSession(browser, { who: opts.who?.(i) }));
  }
  return sessions;
}

/**
 * Poll an observer session until the server-wide view satisfies `pred`. EWC
 * handles teardown on its Listen thread, so these assertions have to wait for a
 * state rather than read once.
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
