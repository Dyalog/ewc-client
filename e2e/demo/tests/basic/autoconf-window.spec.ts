import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// DemoAutoConfWin (../ewc/demo/DemoAutoConfWin.aplf) reproduces the WINDOW-resize
// (⎕WS form Size) reflow path a real desktop app hits — the one that broke on a
// customer form. A dock layout: fixed-height top BAR, fixed-width left SIDE,
// filling APP. The "Resize window" button ⎕WS the form 460x700 <-> 900x1320.
// F1.APP uses LOWERCASE Attach ('top left bottom right') on purpose: APL enum
// values are case-insensitive, and a case-sensitive client wrongly treated a
// mis-cased fill edge as 'None' (proportional), so the fill area scaled/drifted
// instead of filling. Geometry-only (no screenshots) -> cross-platform.
test.describe('DemoAutoConfWin — window-resize reflow', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'AutoConfWin', '#F1\\.APP', 12000);
    await page.waitForTimeout(500);
  });

  const box = async (id: string) => {
    const b = await page.locator(`#${id.replace(/\./g, '\\.')}`).boundingBox();
    if (!b) throw new Error(`no box for #${id}`);
    return b;
  };
  const near = (a: number, b: number, tol = 6) => Math.abs(a - b) <= tol;
  const resize = async () => {
    await page.locator('#F1\\.BAR\\.BTN').click();
    await page.waitForTimeout(700);
  };

  test('grow window: BAR keeps height, SIDE keeps width, APP fills the rest', async () => {
    const form0 = await box('F1');
    const bar0 = await box('F1.BAR');
    const side0 = await box('F1.SIDE');
    const app0 = await box('F1.APP');

    // Precondition: at the authored (small) size APP already fills to the edges.
    expect(near(app0.x + app0.width, form0.x + form0.width, 8)).toBeTruthy();

    await resize(); // ⎕WS the form larger

    const form1 = await box('F1');
    const bar1 = await box('F1.BAR');
    const side1 = await box('F1.SIDE');
    const app1 = await box('F1.APP');

    // The form actually grew (otherwise the rest is vacuous).
    expect(form1.width).toBeGreaterThan(form0.width + 100);
    expect(form1.height).toBeGreaterThan(form0.height + 100);

    // BAR: fixed height (Top..Top), stretches to the new width.
    expect(near(bar1.height, bar0.height)).toBeTruthy();
    expect(bar1.width).toBeGreaterThan(bar0.width + 100);

    // SIDE: fixed width (..Left), stretches to the new height.
    expect(near(side1.width, side0.width)).toBeTruthy();
    expect(side1.height).toBeGreaterThan(side0.height + 100);

    // APP (lowercase fill): grows in BOTH axes and stays flush to the form edges.
    expect(app1.width).toBeGreaterThan(app0.width + 100);
    expect(app1.height).toBeGreaterThan(app0.height + 100);
    expect(near(app1.x + app1.width, form1.x + form1.width, 8)).toBeTruthy();  // flush right
    expect(near(app1.y + app1.height, form1.y + form1.height, 8)).toBeTruthy(); // flush bottom

    await resize(); // restore
  });
});
