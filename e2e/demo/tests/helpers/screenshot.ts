import { expect, Page, Locator } from '@playwright/test';

// Default visual regression settings (can be overridden by playwright.config.ts)
const DEFAULT_MAX_DIFF_PIXELS = 100;
const DEFAULT_THRESHOLD = 0.2;

interface ScreenshotOptions {
  maxDiffPixels?: number;
  threshold?: number;
  fullPage?: boolean;
}

// Compare page screenshot against baseline using Playwright's built-in visual regression
export async function expectMatchesBaseline(
  page: Page,
  screenshotName: string,
  options: ScreenshotOptions = {}
): Promise<void> {
  const screenshots = process.env.SCREENSHOTS;

  // Skip screenshots if configured to never take them
  if (screenshots === 'never') {
    return;
  }

  // Use provided options or fall back to defaults
  // Note: playwright.config.ts sets global defaults for toHaveScreenshot
  const screenshotOptions = {
    maxDiffPixels: options.maxDiffPixels ?? DEFAULT_MAX_DIFF_PIXELS,
    threshold: options.threshold ?? DEFAULT_THRESHOLD,
    fullPage: options.fullPage ?? false,
  };

  await expect(page).toHaveScreenshot(screenshotName, screenshotOptions);
}

// Compare element screenshot against baseline
export async function expectElementMatchesBaseline(
  locator: Locator,
  screenshotName: string,
  options: ScreenshotOptions = {}
): Promise<void> {
  const screenshots = process.env.SCREENSHOTS;

  if (screenshots === 'never') {
    return;
  }

  const screenshotOptions = {
    maxDiffPixels: options.maxDiffPixels ?? DEFAULT_MAX_DIFF_PIXELS,
    threshold: options.threshold ?? DEFAULT_THRESHOLD,
  };

  await expect(locator).toHaveScreenshot(screenshotName, screenshotOptions);
}

// Take a screenshot for debugging (not for comparison)
export async function takeDebugScreenshot(
  page: Page,
  filename: string,
  options: ScreenshotOptions = {}
): Promise<Buffer> {
  return await page.screenshot({
    path: `test-results/${filename}`,
    fullPage: options.fullPage ?? true,
    ...options,
  });
}
