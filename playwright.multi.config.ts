import { defineConfig } from '@playwright/test';

// Separate from playwright.config.ts because a Dyalog process runs EWC in one
// mode only: these tests need their own server on 22323, not the demo suite's
// Browser-mode one on 22322.
const MULTI_URL = process.env.MULTI_URL || 'http://localhost:22323';

// STEP_MODE=manual waits for a click before each step, and implies OBSERVE.
const MANUAL = process.env.STEP_MODE === 'manual';
const OBSERVE = process.env.OBSERVE === '1' || MANUAL;

const TEST_TIMEOUT = MANUAL
  ? 0
  : parseInt(process.env.TEST_TIMEOUT || (OBSERVE ? '600000' : '120000'), 10);

export default defineConfig({
  testDir: './e2e/multi/tests',
  timeout: TEST_TIMEOUT,

  // Checks the server is there before any browser opens, so a missing one
  // reports itself rather than showing as Chrome's "can't be reached" page.
  globalSetup: './e2e/multi/global-setup.ts',
  expect: {
    timeout: 15000,
  },

  // workers: 1 because the specs assert on server-wide state — which clones
  // exist, what the close log holds — and two workers would see each other's
  // sessions in those readouts. The concurrency under test is between contexts
  // inside a test, not between workers.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,

  // Streaming, named reporters keep a CI run legible. Distinct html folder so
  // this doesn't overwrite the demo suite's report.
  reporter: process.env.CI
    ? [['list'], ['github'], ['html', { open: 'never', outputFolder: 'playwright-report-multi' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-multi' }]],

  outputDir: 'test-results-multi',

  use: {
    baseURL: MULTI_URL,
    actionTimeout: 15000,

    // Kept bounded even in manual mode, where the test timeout is 0: a server
    // that accepts TCP but never answers would otherwise hang navigation with
    // an empty window and no error.
    navigationTimeout: 30000,

    // Watch-along mode: real windows, slowed actions, and the step banner drawn
    // by tests/helpers/session.ts. Off by default.
    headless: !OBSERVE && !process.env.HEADED,
    launchOptions: {
      slowMo: OBSERVE ? parseInt(process.env.SLOWMO || '350', 10) : 0,
    },

    // Room for the multitest form plus the banner, small enough to see several at
    // once. Ignored under OBSERVE, where session.ts sizes the windows itself.
    viewport: { width: 720, height: 780 },

    // Traces when observing: the same step-by-step replay, but rewindable.
    trace: OBSERVE ? 'on' : process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
