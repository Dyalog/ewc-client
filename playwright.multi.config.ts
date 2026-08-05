import { defineConfig } from '@playwright/test';

// Multi-mode suite. Separate from playwright.config.ts on purpose: a Dyalog
// process runs EWC in exactly ONE mode, so these tests need their own server
// (ci/ewc-multi-start.sh, port 22323) and cannot share the Browser-mode one
// the demo suite uses on 22322.
//
// Overridable so a hand-started local server on another port still works.
const MULTI_URL = process.env.MULTI_URL || 'http://localhost:22323';

// STEP_MODE=manual waits for a click in the browser before each step, so the
// clock must not be running while a human thinks. It implies OBSERVE.
const MANUAL = process.env.STEP_MODE === 'manual';
const OBSERVE = process.env.OBSERVE === '1' || MANUAL;

// The churn and concurrency specs open and tear down sessions in a loop and
// deliberately wait on server-side state, so they need more headroom than the
// demo suite's 60s. Watch-along mode adds a pause per step, so it needs more
// still.
// 0 disables the timeout entirely — required for manual stepping, where the
// gap between steps is however long you take.
const TEST_TIMEOUT = MANUAL
  ? 0
  : parseInt(process.env.TEST_TIMEOUT || (OBSERVE ? '600000' : '120000'), 10);

export default defineConfig({
  testDir: './e2e/multi/tests',
  timeout: TEST_TIMEOUT,

  // Checks the Multi server is actually there before any browser opens, so a
  // missing server reports itself instead of showing up as Chrome's "can't be
  // reached" page.
  globalSetup: './e2e/multi/global-setup.ts',
  expect: {
    timeout: 15000,
  },

  // workers: 1 for a different reason than the demo suite. There, it's because
  // one Browser-mode backend is one session. Here the backend handles many
  // sessions happily — but the specs assert on SERVER-WIDE state (which clones
  // exist, what the close log holds, which session ids are free). Two workers
  // would see each other's sessions in those readouts. The concurrency this
  // suite is actually testing lives BETWEEN CONTEXTS INSIDE a test, not
  // between workers.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,

  // Same rationale as the demo suite: a streaming, named reporter is what makes
  // a CI run legible when something wedges. Distinct html folder so this report
  // doesn't overwrite the demo suite's.
  reporter: process.env.CI
    ? [['list'], ['github'], ['html', { open: 'never', outputFolder: 'playwright-report-multi' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-multi' }]],

  outputDir: 'test-results-multi',

  use: {
    baseURL: MULTI_URL,
    actionTimeout: 15000,

    // Explicit, and deliberately NOT disabled in manual mode. Manual sets the
    // test timeout to 0 so the clock isn't running while you think — but a
    // wedged EWC (Listen thread suspended: still accepting TCP, never
    // answering) would then hang navigation forever, showing an empty window
    // and no error. This bounds that to something diagnosable.
    navigationTimeout: 30000,

    // OBSERVE=1 (yarn multitests:watch) is the watch-along mode: real windows,
    // slowed-down actions, and a step banner painted into each session page by
    // e2e/multi/tests/helpers/session.ts. Everything here is off by default, so
    // a normal or CI run behaves exactly as before.
    headless: !OBSERVE && !process.env.HEADED,
    launchOptions: {
      slowMo: OBSERVE ? parseInt(process.env.SLOWMO || '350', 10) : 0,
    },

    // Fixed and modest: the mtest form is 400×520 logical, so this leaves room
    // for the step banner along the bottom and keeps several windows on screen
    // at once when watching. No visual baselines here, so it costs nothing.
    viewport: { width: 720, height: 780 },

    // Always keep a trace when observing — the trace viewer replays the run
    // step by step with a DOM snapshot at each one, which is the same thing
    // OBSERVE gives you live, but after the fact and rewindable.
    trace: OBSERVE ? 'on' : process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // No visual regression here — this suite asserts behaviour, not pixels, so
  // it carries no baselines and is safe to run on any OS.
});
