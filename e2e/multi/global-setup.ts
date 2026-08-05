// Fail fast, and legibly, when there is no Multi-mode server to talk to.
//
// Without this the first page.goto lands on Chrome's "This site can't be
// reached" page and Playwright reports ERR_CONNECTION_REFUSED — which says
// nothing about EWC, the port, or how to fix it. In headed/watch mode you just
// see an error page in a browser window and have to go digging.

const MULTI_URL = process.env.MULTI_URL || 'http://localhost:22323';

// Retry rather than probe once: the CI job only waits for a TCP listener
// (`wait-on tcp:22323`), and the WSS finishes binding a moment before it can
// answer a request — so a single GET can arrive just too early.
const BUDGET_MS = parseInt(process.env.MULTI_WAIT_MS || '30000', 10);

async function reachableWithin(budgetMs: number): Promise<boolean> {
  const deadline = Date.now() + budgetMs;
  for (;;) {
    try {
      // EWC's WSS only handles GET (it logs "Unhandled HTTP method" for HEAD).
      const res = await fetch(MULTI_URL, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    if (Date.now() >= deadline) return false;
    await new Promise((r) => setTimeout(r, 1000));
  }
}

// Watch mode's knobs are env vars, which are undiscoverable unless something
// says so. Print what's in force at the top of every observed run.
function announceObserveSettings(): void {
  const manual = process.env.STEP_MODE === 'manual';
  if (process.env.OBSERVE !== '1' && !manual) return;

  const tile = process.env.OBSERVE_TILE || '600x660';

  if (manual) {
    console.log(
      [
        '',
        `Manual step mode — window=${tile}, no test timeout.`,
        'Each step waits for you to click "Next ▶" in any session window.',
        '"Run to end ⏭" drops back to running normally for the rest of the run.',
        'At the finish the control becomes "End ⏹" and the windows stay open',
        'until you click it, so the final state can be inspected.',
        'The first step of a test runs straight away: there is no window to click in yet.',
        '',
        '    OBSERVE_TILE=520x600 yarn multitests:step   # smaller screens',
        '    yarn multitests:step --grep recycled        # one test only',
        '',
      ].join('\n')
    );
    return;
  }

  const slowMo = process.env.SLOWMO || '350';
  const pause = process.env.STEP_PAUSE || '900';
  console.log(
    [
      '',
      `Watch mode: slowMo=${slowMo}ms  step pause=${pause}ms  window=${tile}`,
      'Override per run, e.g.:',
      '    SLOWMO=800 STEP_PAUSE=2000 yarn multitests:watch',
      '    OBSERVE_TILE=520x600 yarn multitests:watch     # smaller screens',
      '    yarn multitests:watch --grep recycled          # one test only',
      '    yarn multitests:step                           # click through by hand',
      '',
    ].join('\n')
  );
}

export default async function globalSetup(): Promise<void> {
  announceObserveSettings();
  if (await reachableWithin(BUDGET_MS)) return;

  throw new Error(
    [
      '',
      `No EWC Multi-mode server answered at ${MULTI_URL} within ${Math.round(
        BUDGET_MS / 1000
      )}s.`,
      '',
      'This suite needs its own server: EWC runs in exactly one mode per Dyalog',
      'process, so the Browser-mode demo server on :22322 cannot serve it.',
      '',
      'Start one with:',
      '',
      '    yarn ewc-multi:start',
      '',
      'Then re-run. (yarn multitests:watch and yarn ewc-multi:observe start one',
      'for you if it is missing; plain `yarn multitests` deliberately does not,',
      'so CI never silently launches containers.)',
      '',
      'Useful when it will not come up:',
      '    yarn ewc-multi:logs        # what Dyalog said',
      '    EWC_SRC=/path/to/ewc ...   # point at a different Dyalog/ewc checkout',
      '',
      'See e2e/multi/README.md.',
      '',
    ].join('\n')
  );
}
