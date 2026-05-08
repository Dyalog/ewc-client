import { test, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// Try a bunch of variations to reproduce CBRunDemo VALUE ERROR
test('navigate menu rapidly and many times', async () => {
  const result = await connectAndFindEWCPage(CDP_PORT);
  let page: Page = result.page;

  // First navigation - load NuGrid
  page = await navigateToDemo(page, 'NuGrid', '.nugrid-table', 15000);
  console.log('-- first demo (NuGrid) loaded');
  await page.waitForTimeout(500);

  page.on('console', msg => msg.type() === 'error' && console.log('PAGE-ERROR:', msg.text()));
  page.on('pageerror', err => console.log('PAGE-ERROR:', err.message));

  // Fire many rapid Selects
  const sequence = ['NuGridLongCell', 'NuGrid', 'NuGridLongCell', 'NuGridFormat', 'NuGridStyles', 'NuGrid'];
  for (const target of sequence) {
    console.log(`-- selecting ${target}...`);
    const menuCombo = page.locator('[role="combobox"]').first();
    await menuCombo.click();
    await page.waitForTimeout(80);
    await page.getByRole('option', { name: target, exact: true }).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(150); // intentionally short to provoke races
  }

  await page.waitForTimeout(1500);
  console.log('-- sequence done');
});

test('click menu, then immediately click an inner cell', async () => {
  const result = await connectAndFindEWCPage(CDP_PORT);
  let page: Page = result.page;
  page = await navigateToDemo(page, 'NuGrid', '.nugrid-table', 15000);

  // Quickly: click menu open, then click on a grid cell (race condition?)
  const menuCombo = page.locator('[role="combobox"]').first();
  await menuCombo.click();
  await page.waitForTimeout(50);
  // Click a cell while combo dropdown is still rendering
  const cell = page.locator('td.nugrid-cell').first();
  await cell.click({ force: true }).catch(() => {});
  await page.waitForTimeout(500);

  // Then properly select another demo
  await menuCombo.click();
  await page.waitForTimeout(200);
  await page.getByRole('option', { name: 'NuGridLongCell', exact: true }).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(2000);
});
