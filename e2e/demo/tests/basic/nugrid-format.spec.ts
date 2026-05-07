import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

test.describe('DemoNuGridFormat - FormatString support', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;

    // Navigate to NuGridFormat demo - wait for the grid table to appear
    page = await navigateToDemo(result.page, 'NuGridFormat', '.nugrid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('grid renders with correct structure', async () => {
    const grid = page.locator('.nugrid');
    await expect(grid).toBeVisible({ timeout: 5000 });

    const table = page.locator('.nugrid-table');
    await expect(table).toBeVisible();
  });

  test('has 6 column headers', async () => {
    const colHeaders = page.locator('.nugrid-col-header');
    await expect(colHeaders).toHaveCount(6);

    await expect(colHeaders.nth(0)).toHaveText('Company');
    await expect(colHeaders.nth(1)).toHaveText('Revenue ($)');
    await expect(colHeaders.nth(2)).toHaveText('Headcount');
    await expect(colHeaders.nth(3)).toHaveText('Status');
    await expect(colHeaders.nth(4)).toHaveText('Growth %');
    await expect(colHeaders.nth(5)).toHaveText('Sector');
  });

  test('has 7 data rows', async () => {
    const rows = page.locator('.nugrid-row');
    await expect(rows).toHaveCount(7);
  });

  test('revenue shows comma-separated currency (CF15.2)', async () => {
    // Row 1: Axiom revenue = 8500000 → "8,500,000.00"
    const cell = page.locator('.nugrid-cell[data-row="1"][data-col="2"]');
    await expect(cell).toBeVisible();

    const input = cell.locator('input');
    const value = await input.inputValue();
    expect(value).toContain('8,500,000.00');
  });

  test('large revenue has multiple comma separators', async () => {
    // Row 6: Fibonacci revenue = 97500000 → "97,500,000.00"
    const cell = page.locator('.nugrid-cell[data-row="6"][data-col="2"]');
    const input = cell.locator('input');
    const value = await input.inputValue();
    expect(value).toContain('97,500,000.00');
  });

  test('headcount shows comma-separated integer (CI8)', async () => {
    // Row 2: Boltzmann headcount = 31000 → "31,000"
    const cell = page.locator('.nugrid-cell[data-row="2"][data-col="3"]');
    const input = cell.locator('input');
    const value = await input.inputValue();
    expect(value).toContain('31,000');
  });

  test('status shows O-format text (PROFITABLE / LOSS-MAKING)', async () => {
    // Row 1: Status=1 → "PROFITABLE"
    const row1 = page.locator('.nugrid-cell[data-row="1"][data-col="4"]');
    await expect(row1).toContainText('PROFITABLE');

    // Row 3: Status=0 → "LOSS-MAKING"
    const row3 = page.locator('.nugrid-cell[data-row="3"][data-col="4"]');
    await expect(row3).toContainText('LOSS-MAKING');
  });

  test('sector column shows plain text', async () => {
    const cell = page.locator('.nugrid-cell[data-row="1"][data-col="6"]');
    await expect(cell).toBeVisible();
    const text = await cell.textContent();
    expect(text).toContain('Technology');
  });

  test('company name column shows plain text', async () => {
    const cell = page.locator('.nugrid-cell[data-row="1"][data-col="1"]');
    const input = cell.locator('input');
    await expect(input).toHaveValue('Axiom');
  });

  test('all 7 row headers present', async () => {
    const rowHeaders = page.locator('.nugrid-row-header');
    await expect(rowHeaders).toHaveCount(7);
  });
});
