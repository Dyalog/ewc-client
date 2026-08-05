import { Browser, BrowserContext, Page, expect, test } from '@playwright/test';

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

// OBSERVE=1 turns on the watch-along layer: every session page grows a banner
// naming itself and the step currently running, and `step()` pauses between
// steps so a human can actually read the state change. Off by default, so a
// normal or CI run is completely unaffected.
// STEP_MODE=manual turns the banner into a driver: each step waits for you to
// click "Next" in any window before it runs. Implies OBSERVE — stepping by hand
// is meaningless without windows to look at.
const MANUAL = process.env.STEP_MODE === 'manual';
const OBSERVE = process.env.OBSERVE === '1' || MANUAL;
const STEP_PAUSE = parseInt(process.env.STEP_PAUSE || '900', 10);

// Set by the "Run to end" button: drops out of manual stepping for the rest of
// the run without having to kill and restart it.
let runToEnd = false;

// Live sessions, so a step announcement reaches every open window. Only
// populated when OBSERVE is on.
const live = new Set<MultiSession>();

const BANNER_ID = '__mtest_observe';

// ── Window tiling (OBSERVE only) ────────────────────────────────────────────
//
// Chromium stacks every new window in the same place, so without this the
// sessions sit exactly on top of each other and you can only see the last one.
// Note that config `use: { viewport }` does NOT apply here: those options are
// only used for contexts Playwright creates for the `page` fixture, and these
// contexts come from browser.newContext(). So the geometry is ours to set.
//
// OBSERVE_TILE=WxH overrides the per-window size. The default is big enough for
// the mtest form (which occupies x 50–570, y 50–450) plus the step banner.
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

// Slots are released on close and reused, so a long-lived observer keeps its
// position while short-lived sessions cycle through the one next to it.
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
    // Observation must never fail a test — an un-tiled window is still usable.
    return undefined;
  }
}

// Injected once per page. pointer-events:none so it can never swallow a click
// meant for the form, and pinned to the bottom because the EWC form occupies
// the top-left of the viewport.
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
        // The bar itself must not swallow clicks meant for the EWC form above
        // it; only the buttons opt back in.
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

// Turn the step control into the end-of-test control: the last step's body
// returns and teardown would otherwise close every window instantly, so the
// final state has to be held behind one more click.
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
      // "Run to end" has no meaning once we're at the end.
      const run = bar.querySelector('button[data-run]') as HTMLElement | null;
      if (run) run.style.display = 'none';
    }, BANNER_ID)
    .catch(() => {});
}

// Drop any clicks banked while gating was off (after "Run to end"), so a stale
// flag can't skip straight past the end-of-test hold.
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

// Poll every open window for a button press. Polling rather than
// waitForFunction across N pages, because pages come and go mid-step and a
// racing set of waiters leaves rejected promises behind when one closes.
async function waitForClick(): Promise<void> {
  for (;;) {
    for (const s of [...live]) {
      // Drop windows that have gone away. Closing one by hand while looking at
      // it is a perfectly reasonable thing to do, and without this the session
      // stays in `live` forever: its evaluate fails on every poll, live.size
      // never reaches 0, and the loop spins with nothing left to click. Manual
      // mode has no test timeout, so that is an unbreakable stall.
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
          // Also fails for a crashed or navigating page — treat it as gone
          // rather than polling it forever.
          live.delete(s);
          return null;
        });

      if (pressed?.run) {
        runToEnd = true;
        return;
      }
      if (pressed?.next) return;
    }

    // Nothing left to click in — either the first step of a test (no session
    // open yet) or every window has been closed. Carry on rather than wait for
    // a click that can never come.
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
    .catch(() => {
      /* page may have closed mid-step; observation must never fail a test */
    });
}

/**
 * Name a step. Always records it as a Playwright step (so it shows up in the
 * HTML report, traces and `--ui` time-travel); additionally, under OBSERVE=1,
 * writes it into every open session's banner and pauses so it can be read.
 *
 * Use it for the meaningful beats of a test — "user A types alpha", "close user
 * A" — not for every micro-action.
 */
export async function step<T>(label: string, body: () => Promise<T>): Promise<T> {
  return test.step(label, async () => {
    if (OBSERVE) {
      const waiting = MANUAL && !runToEnd;
      await Promise.all(
        [...live].map((s) => announce(s.page, waiting ? `${label}\n⟵ click Next to run this` : label))
      );

      if (waiting) {
        // Echo to the terminal too, so you can follow along without reading the
        // windows — and so a run left waiting explains itself. Only when there
        // is actually a window to click in; the first step of a test opens the
        // first session and so runs straight through.
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

/**
 * Close every session in `sessions`, but in manual mode hold the windows open
 * behind one last click first.
 *
 * Without this the final step's body returns and teardown closes everything
 * immediately, so the very state the last step produced — the one you stepped
 * all the way through to see — is on screen for a few milliseconds.
 *
 * Applies even after "Run to end", which means *run to the end*, i.e. get me to
 * the final state; and even when the test failed, where inspecting what it
 * actually left behind is the whole point.
 */
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

  // Close anything still registered but not in `sessions`, then clear the
  // registry outright.
  //
  // These can diverge: a spec that does `sessions = await openSessions(...)`
  // still holds the OLD array if that call throws part-way, so the
  // half-opened sessions never reach teardown's argument. Any survivor is
  // poison for the next test — its window is gone, but the manual-mode gate
  // still polls it, `live.size` never reaches zero, and the run stalls before
  // opening a single window. That is unbreakable, because manual mode has no
  // test timeout.
  for (const s of [...live]) {
    await s.close().catch(() => {});
  }
  live.clear();
}

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
  // viewport: null under OBSERVE so the page fills whatever size the window is
  // tiled to; a fixed viewport would leave the page a different size from its
  // own window. Headless runs keep an explicit, deterministic viewport.
  const context = await browser.newContext(
    OBSERVE ? { viewport: null } : { viewport: { width: 720, height: 780 } }
  );
  const page = await context.newPage();

  const query = opts.who ? `/?who=${encodeURIComponent(opts.who)}` : '/';
  try {
    await page.goto(BASE + query, { waitUntil: 'domcontentloaded' });
  } catch (err) {
    // globalSetup proves the server was up when the run started, so reaching
    // here means it went away mid-run — most often the churn test wedging it
    // (see e2e/multi/README.md). Say so, rather than leaving a raw
    // ERR_CONNECTION_REFUSED for the reader to interpret.
    throw new Error(
      `Lost the EWC Multi server at ${BASE} part-way through the run ` +
        `(${err instanceof Error ? err.message.split('\n')[0] : String(err)}). ` +
        `It was reachable at start-up, so it has died or wedged since — check ` +
        `'yarn ewc-multi:logs' for a SYNTAX ERROR on the Listen thread.`
    );
  }

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

  let slot: number | undefined;
  const ns = await caption('WHOAMI');
  if (!ns.startsWith('#.mtest_')) {
    // Initialise's trap rewrites WHOAMI with the error, so this reports the
    // actual APL failure rather than a bare assertion mismatch.
    throw new Error(`Session did not initialise cleanly; WHOAMI reads: ${ns}`);
  }

  // WHOAMI is only the FIRST widget — Initialise.aplf creates it before its
  // :Trap block, and everything else streams in afterwards over the WebSocket.
  // Returning here would hand back a session whose form is still arriving, and
  // a test that clicks straight away gets "waiting for locator('#F1.INC')" on a
  // control that does not exist yet. F1.TOKEN is the LAST widget created, so
  // waiting for it proves the whole form landed.
  try {
    await page.locator(sel('TOKEN')).waitFor({ state: 'attached', timeout });
  } catch {
    throw new Error(
      `${ns} rendered only part of its form within ${timeout}ms ` +
        `(F1.WHOAMI arrived, F1.TOKEN did not). Initialise runs in a detached ` +
        `thread, so an APL error mid-way through it looks like this — check ` +
        `'yarn ewc-multi:logs'.`
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
    // Buttons whenever MANUAL, even after "Run to end": per-step gating is
    // controlled separately by runToEnd, but the End button must exist on every
    // window or there'd be nothing to click at the final hold.
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
