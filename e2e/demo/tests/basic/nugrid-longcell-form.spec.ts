import { test, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

test('full-form layout snapshot', async () => {
  const result = await connectAndFindEWCPage(CDP_PORT);
  await result.page.setViewportSize({ width: 1700, height: 1100 });
  const page: Page = await navigateToDemo(result.page, 'NuGridLongCell', '.nugrid-table', 15000);
  await page.setViewportSize({ width: 1700, height: 1100 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/zoom/full-form.png', fullPage: false });
});
