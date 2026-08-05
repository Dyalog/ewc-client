import { defineConfig } from '@playwright/test';

// Multi-mode suite. Separate from playwright.config.ts on purpose: a Dyalog
// process runs EWC in exactly ONE mode, so these tests need their own server
// (ci/ewc-multi-start.sh, port 22323) and cannot share the Browser-mode one
// the demo suite uses on 22322.
//
// Overridable so a hand-started local server on another port still works.
const MULTI_URL = process.env.MULTI_URL || 'http://localhost:22323';

// The churn and concurrency specs open and tear down sessions in a loop and
// deliberately wait on server-side state, so they need more headroom than the
// demo suite's 60s.
const TEST_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '120000', 10);

export default defineConfig({
  testDir: './e2e/multi/tests',
  timeout: TEST_TIMEOUT,
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
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // No visual regression here — this suite asserts behaviour, not pixels, so
  // it carries no baselines and is safe to run on any OS.
});
