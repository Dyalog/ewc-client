import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// The Ticker demo (../ewc/demo/DemoTicker.aplf) starts PAUSED with fixed
// seed prices, so the idle grid/chart are deterministic. Running it
// random-walks the prices — tests assert change, never exact values.
// Read-only tests run first.
test.describe('DemoTicker', () => {
  let browser: Browser;
  let page: Page;

  const grid = () => page.locator('#F1\\.G');
  const up = () => page.locator('#F1\\.UP');
  const down = () => page.locator('#F1\\.DOWN');
  const statusField = () => page.locator('#F1\\.SB\\.S1');
  const runCheckbox = () => page.locator('#F1\\.RUN');

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Ticker', '#F1\\.G', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('idle dashboard renders grid, chart and status', async () => {
    await expect(grid()).toContainText('AAPL');
    await expect(grid()).toContainText('TSLA');
    await expect(grid()).toContainText('182.52'); // AAPL seed price
    await expect(grid()).toContainText('+0.00%');
    await expect(statusField()).toHaveText('Ticks: 0');
    // ApexChart has rendered
    await expect(page.locator('.apexcharts-canvas').first()).toBeVisible({ timeout: 5000 });
  });

  test('visual regression - ticker idle', async () => {
    await expect(page).toHaveScreenshot('ticker-idle.png');
  });

  test('run streams updates into grid, movers and status', async () => {
    const before = await grid().textContent();
    await runCheckbox().check();
    // 500ms ticks: prices should change within a couple of ticks
    await expect
      .poll(async () => await grid().textContent(), { timeout: 5000 })
      .not.toBe(before);
    await expect(statusField()).not.toHaveText('Ticks: 0');
    await expect(up()).toHaveText(/▲ [A-Z]{4}/, { timeout: 5000 });
    await expect(down()).toHaveText(/▼ [A-Z]{4}/, { timeout: 5000 });
    await runCheckbox().uncheck();
  });

  test('reset restores the seed state', async () => {
    await page.locator('#F1\\.RESET').click();
    await expect(grid()).toContainText('182.52');
    await expect(grid()).toContainText('+0.00%');
    await expect(statusField()).toHaveText('Ticks: 0');
    await expect(up()).toHaveText('▲ —');
    await expect(down()).toHaveText('▼ —');
  });
});
