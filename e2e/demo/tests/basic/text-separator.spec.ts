import { test, expect, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);
const BASE = process.env.BROWSER_URL || 'http://localhost:5173';

// Regression test for #440 — a Text caption split on the ⎕UCS 8743 (∧)
// separator renders as multiple lines. DemoTextSeparator mirrors the customer
// object FsCShSpec.∆3P1.Z1070: FCol is the GrayText system-colour index (¯18),
// which the client resolves to a length-1 colour list [[109,109,109]]. Every
// line must use that grey; before the fix the second line indexed past the end
// of the resolved colour list (FCol[1] === undefined) and fell back to black.
test.describe('DemoTextSeparator (#440)', () => {
  let page: Page;

  // GrayText system colour (¯18) → rgb(109,109,109)
  const GREY = 'rgb(109, 109, 109)';
  const BLACK = 'rgb(0, 0, 0)';

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    page = result.page;
    // Launch the demo directly via the ?Demo= query param (EWC.Initialise runs
    // it on connect) — more robust than driving the demo-picker combo.
    await page.goto(`${BASE}/?Demo=TextSeparator`);
    await page.waitForLoadState('networkidle');
    // A connect-time launch only flushes to the browser on the second connect,
    // once EWC's event loop is already pumping; reload if nothing rendered yet.
    if (!(await page.locator('#F1\\.SEP-t1').count())) {
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
    await page.locator('#F1\\.SEP-t1').waitFor({ state: 'attached', timeout: 15000 });
  });

  test('separator splits the caption into two line elements', async () => {
    // The Text renders one positioned div per line: <id>-t1, <id>-t2
    await expect(page.locator('#F1\\.SEP-t1')).toBeAttached();
    await expect(page.locator('#F1\\.SEP-t2')).toBeAttached();
  });

  test('first line resolves the GrayText system colour', async () => {
    const color = await page
      .locator('#F1\\.SEP-t1')
      .evaluate(el => getComputedStyle(el as HTMLElement).color);
    expect(color).toBe(GREY);
  });

  test('second line inherits the colour instead of falling back to black', async () => {
    const color = await page
      .locator('#F1\\.SEP-t2')
      .evaluate(el => getComputedStyle(el as HTMLElement).color);
    expect(color).not.toBe(BLACK); // the #440 regression
    expect(color).toBe(GREY);
  });
});
