import { defineConfig } from '@playwright/test';

// Configuration with environment variable overrides
const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);
const TEST_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '60000', 10);
const NAVIGATION_TIMEOUT = parseInt(process.env.NAVIGATION_TIMEOUT || '5000', 10);
// Default pixel-diff tolerance for visual regression. We're a UI
// library — small layout shifts are real bugs that mess up
// downstream apps, so this is intentionally TIGHT. 100 px is
// enough headroom to absorb noise from test-parallelism timing or
// occasional anti-alias jitter, but anything larger (a button
// colour change, a misaligned input, a font swap) trips the test.
//
// This tightness depends on baselines and comparison runs sharing
// the same Chromium build + OS — both happen on the GitHub Linux
// runner: tests.yml runs `npx playwright test` natively, and
// update-baselines.yml regenerates baselines on the same runner.
// Don't commit baselines generated on a different OS (e.g. macOS
// host) — they'll diff against CI even with no real change.
const MAX_DIFF_PIXELS = parseInt(process.env.MAX_DIFF_PIXELS || '100', 10);
const THRESHOLD = parseFloat(process.env.THRESHOLD || '0.2');
const UPDATE_BASELINES = process.env.UPDATE_BASELINES === '1' || process.env.UPDATE_BASELINES === 'true';
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || 'e2e/demo/tests/baselines/screenshots';

// Map SCREENSHOTS env var to Playwright's screenshot option
type ScreenshotMode = 'off' | 'on' | 'only-on-failure';
function getScreenshotMode(): ScreenshotMode {
  const mode = process.env.SCREENSHOTS;
  if (mode === 'always') return 'on';
  if (mode === 'never') return 'off';
  return 'only-on-failure'; // default
}

export default defineConfig({
  testDir: './e2e/demo/tests',
  timeout: TEST_TIMEOUT,
  expect: {
    timeout: 10000,
    // Visual regression settings
    toHaveScreenshot: {
      maxDiffPixels: MAX_DIFF_PIXELS,
      threshold: THRESHOLD,
    },
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  // CI needs a STREAMING, NAMED reporter — that's what makes a run
  // legible. The old `html`-only setup was opaque on CI for two reasons:
  // html writes its report only at the very end (a job-timeout SIGKILL
  // left `playwright-report/` empty, so the upload silently uploaded
  // nothing), and Playwright's default CI progress reporter is `dot`,
  // which emits anonymous `·F T°` symbols and block-buffers — a killed
  // run showed one line of symbols and nothing else.
  //   - list   → prints `✓/✘ <test title> (Ns)` as each test finishes,
  //              flushed to the step log live. The last line before a
  //              stall NAMES the wedging test (which dot never could).
  //   - github → inline `::error::` annotations on the failing lines in
  //              the PR "Files changed" view and the run summary.
  //   - html   → keep the rich artifact (traces/screenshots) for runs
  //              that finish; `open: 'never'` stops it trying to spawn a
  //              browser on the headless runner.
  reporter: process.env.CI
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : 'html',
  use: {
    actionTimeout: 10000,
    // retries: 0, so `on-first-retry` captured a trace exactly never on
    // CI. Keep one for every failed test instead — it lands in the html
    // report for post-mortem (DOM snapshots, console, network log).
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: getScreenshotMode(),
  },
  // Screenshot storage configuration
  snapshotDir: SCREENSHOT_DIR,
  // OS-agnostic snapshot path: omit {platform} so baselines work on
  // any host as long as Playwright runs in the same environment.
  // Convention: visual-regression runs go through the Microsoft
  // Playwright Docker image (Linux + Chromium + fonts) so screenshots
  // are byte-identical across local-dev (macOS host) and CI (Linux
  // runner). Functional tests can still run natively on the host.
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',
  // Update snapshots when UPDATE_BASELINES=1
  updateSnapshots: UPDATE_BASELINES ? 'all' : 'missing',

  // Custom metadata available to tests
  metadata: {
    cdpPort: CDP_PORT,
    navigationTimeout: NAVIGATION_TIMEOUT,
  },
});
