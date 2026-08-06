// Interactive Multi-mode playground.
//
//   yarn ewc-multi:observe [n]      (default 3)
//
// Opens N real, tiled browser windows against a running Multi-mode server and
// leaves them open. Each is a separate EWC session with its own #.mtest_N
// clone, so you can type in one and watch the others stay untouched — and
// close one and watch the survivors' Clones/Closed lists update.
//
// Each window is its own browser process, purely so it can be given an explicit
// --window-position: contexts within one browser cascade wherever Chromium
// feels like putting them.
//
// ?live=1 makes each session poll the server-wide views on a 1s Timer (see
// Initialise.aplf). The specs never pass it — they drive F1.REFRESH explicitly
// so they control exactly when a snapshot is taken.
import { chromium } from '@playwright/test';

const BASE = process.env.MULTI_URL || 'http://localhost:22323';
const N = Math.max(1, Math.min(8, parseInt(process.argv[2] || '3', 10)));

const W = 640;
const H = 760;
const COLS = parseInt(process.env.OBSERVE_COLS || '3', 10);

const label = (i, ns) =>
  `window ${i + 1}${ns ? ` — ${ns}` : ''}`;

async function openWindow(i) {
  const x = (i % COLS) * (W + 12);
  const y = Math.floor(i / COLS) * (H + 40);

  const browser = await chromium.launch({
    headless: false,
    args: [`--window-position=${x},${y}`, `--window-size=${W},${H}`],
  });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  const who = ['alice', 'bob', 'carol', 'dave', 'erin', 'frank', 'grace', 'heidi'][i];
  await page.goto(`${BASE}/?live=1&who=${who}`, { waitUntil: 'domcontentloaded' });

  let ns = '(not initialised)';
  try {
    await page.locator('#F1\\.WHOAMI').waitFor({ state: 'visible', timeout: 20000 });
    ns = (await page.locator('#F1\\.WHOAMI').innerText()).trim();
  } catch {
    console.error(
      `${label(i)}: form never rendered. Is the Multi server up? ` +
        `(yarn ewc-multi:start) — check 'yarn ewc-multi:logs'.`
    );
  }

  console.log(`${label(i, ns)}  who=${who}`);
  return { browser, page, ns };
}

console.log(`Opening ${N} session${N === 1 ? '' : 's'} against ${BASE} …\n`);

const windows = [];
for (let i = 0; i < N; i++) {
  // Sequential so session ids are assigned in window order, which makes the
  // tiling correspond to #.mtest_1, _2, _3 left-to-right.
  windows.push(await openWindow(i));
}

console.log(`
Ready. Things worth trying:

  • Type in one window's Private box and hit Set — the others do not change.
  • Click Increment in one — only that window's Counter moves.
  • Close a window (the OS close button) — the survivors' Clones list drops it
    and Closed gains it, within about a second.
  • Click Run WG probe in several windows at once — each must report its own
    clone name.

Note: closing a window with the OS button is a GRACEFUL close, so EWC reaps it.
Killing the browser process instead leaves the session stranded unless the
onTimeout fix is present — see e2e/multi/README.md.

Press Ctrl-C to close everything.
`);

const shutdown = async () => {
  console.log('\nclosing…');
  await Promise.all(windows.map((w) => w.browser.close().catch(() => {})));
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Hold open until interrupted.
await new Promise(() => {});
