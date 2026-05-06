import { defineConfig } from '@playwright/test';

// Configuration with environment variable overrides
const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);
const TEST_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '60000', 10);
const NAVIGATION_TIMEOUT = parseInt(process.env.NAVIGATION_TIMEOUT || '5000', 10);
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
  reporter: 'html',
  use: {
    actionTimeout: 10000,
    trace: 'on-first-retry',
    screenshot: getScreenshotMode(),
  },
  // Screenshot storage configuration
  snapshotDir: SCREENSHOT_DIR,
  // Update snapshots when UPDATE_BASELINES=1
  updateSnapshots: UPDATE_BASELINES ? 'all' : 'missing',

  // Custom metadata available to tests
  metadata: {
    cdpPort: CDP_PORT,
    navigationTimeout: NAVIGATION_TIMEOUT,
  },
});
