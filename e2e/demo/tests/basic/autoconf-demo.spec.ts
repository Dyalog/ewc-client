import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// The AutoConf demo (../ewc/demo/DemoAutoConf.aplf) lays out labelled boxes that
// each exercise a distinct Attach/AutoConf combination inside two splitter-
// resizable panes. Dragging the vertical splitter changes pane WIDTH; we assert
// each box reconfigures (or doesn't) per its settings. Geometry-only, so it runs
// cross-platform (no screenshots).
test.describe('DemoAutoConf', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'AutoConf', '#F1\\.RIGHT\\.C', 10000);
  });

  const box = async (id: string) => {
    const b = await page.locator(`#${id.replace(/\./g, '\\.')}`).boundingBox();
    if (!b) throw new Error(`no box for #${id}`);
    return b;
  };
  const dragSplitter = async (dx: number) => {
    const s = await box('F1.SPLIT');
    const cx = s.x + s.width / 2, cy = s.y + s.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + dx, cy, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  };
  const near = (a: number, b: number, tol = 4) => Math.abs(a - b) <= tol;

  test('all archetype boxes render with captions', async () => {
    for (const id of ['F1.LEFT.PIN', 'F1.LEFT.PROP', 'F1.LEFT.AC3', 'F1.LEFT.AC0',
                      'F1.RIGHT.TB', 'F1.RIGHT.LB', 'F1.RIGHT.C', 'F1.RIGHT.RB', 'F1.RIGHT.SB']) {
      await expect(page.locator(`#${id.replace(/\./g, '\\.')}`)).toBeVisible();
    }
    // caption Label is a child of each box
    await expect(page.locator('#F1\\.LEFT\\.AC0\\.CAP')).toContainText('AutoConf 0');
  });

  test('AutoConf 3 stretches but AutoConf 0 stays frozen (same Attach)', async () => {
    const pin0 = await box('F1.LEFT.PIN');
    const ac3a = await box('F1.LEFT.AC3');
    const ac0a = await box('F1.LEFT.AC0');

    await dragSplitter(120); // widen the LEFT pane

    const pin1 = await box('F1.LEFT.PIN');
    const ac3b = await box('F1.LEFT.AC3');
    const ac0b = await box('F1.LEFT.AC0');

    expect(near(pin1.width, pin0.width)).toBeTruthy();      // pinned: fixed size
    expect(ac3b.width).toBeGreaterThan(ac3a.width + 20);    // AutoConf 3: accepts resize
    expect(near(ac0b.width, ac0a.width)).toBeTruthy();      // AutoConf 0: ignores resize

    await dragSplitter(-120);
  });

  test('right sidebar stays anchored to the pane right edge (no overflow)', async () => {
    const form = await box('F1');
    const rb0 = await box('F1.RIGHT.RB');
    await dragSplitter(120); // narrow the RIGHT pane
    const rb1 = await box('F1.RIGHT.RB');

    expect(near(rb1.width, rb0.width)).toBeTruthy();               // fixed width
    expect(rb1.x + rb1.width).toBeLessThanOrEqual(form.x + form.width + 4); // no overflow
    await dragSplitter(-120);
  });
});
