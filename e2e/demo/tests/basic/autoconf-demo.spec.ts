import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// The AutoConf demo (../ewc/demo/DemoAutoConf.aplf) puts a CENTER test pane
// (F1.RIGHT.BOT) bordered by a splitter on two orthogonal sides:
//   F1.SPLIT        vertical    — LEFT strip | RIGHT   (drag = test-pane WIDTH)
//   F1.RIGHT.SPLIT  horizontal  — top strip  | BOT     (drag = test-pane HEIGHT)
// so it resizes in both axes. Width exercises the Left/Right Attach edges,
// height exercises Top/Bottom. The CENTER holds a dock frame
// (toolbar/sidebars/fill/status); the LEFT strip holds pinned / proportional /
// AutoConf-3-vs-0 boxes. Geometry-only assertions (no screenshots), so it runs
// cross-platform.
test.describe('DemoAutoConf', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    // A left-strip box is the load indicator: unaffected by any transient
    // test-pane sizing during the menu->demo form-size transition.
    page = await navigateToDemo(result.page, 'AutoConf', '#F1\\.LEFT\\.PIN', 12000);
    await page.waitForTimeout(500); // let the splitters settle before asserting
  });

  const box = async (id: string) => {
    const b = await page.locator(`#${id.replace(/\./g, '\\.')}`).boundingBox();
    if (!b) throw new Error(`no box for #${id}`);
    return b;
  };
  // Drag a splitter by (dx, dy) with the real mouse so its handlers run.
  const drag = async (id: string, dx: number, dy: number) => {
    const s = await box(id);
    const cx = s.x + s.width / 2, cy = s.y + s.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + dx, cy + dy, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  };
  const near = (a: number, b: number, tol = 5) => Math.abs(a - b) <= tol;

  test('all archetype boxes render with captions', async () => {
    for (const id of ['F1.LEFT.PIN', 'F1.LEFT.PROP', 'F1.LEFT.AC3', 'F1.LEFT.AC0',
                      'F1.RIGHT.BOT.TB', 'F1.RIGHT.BOT.LB', 'F1.RIGHT.BOT.CF',
                      'F1.RIGHT.BOT.RB', 'F1.RIGHT.BOT.SB']) {
      await expect(page.locator(`#${id.replace(/\./g, '\\.')}`)).toBeVisible();
    }
    await expect(page.locator('#F1\\.LEFT\\.AC0\\.CAP')).toContainText('AutoConf 0');
  });

  test('both splitters exist (width + height)', async () => {
    await expect(page.locator('#F1\\.SPLIT')).toBeVisible();        // vertical
    await expect(page.locator('#F1\\.RIGHT\\.SPLIT')).toBeVisible(); // horizontal
  });

  test('WIDTH (vertical splitter): AutoConf 3 stretches but AutoConf 0 stays frozen', async () => {
    const pin0 = await box('F1.LEFT.PIN');
    const ac3a = await box('F1.LEFT.AC3');
    const ac0a = await box('F1.LEFT.AC0');

    await drag('F1.SPLIT', 120, 0); // widen the LEFT strip

    const pin1 = await box('F1.LEFT.PIN');
    const ac3b = await box('F1.LEFT.AC3');
    const ac0b = await box('F1.LEFT.AC0');

    expect(near(pin1.width, pin0.width)).toBeTruthy();   // pinned: fixed size
    expect(ac3b.width).toBeGreaterThan(ac3a.width + 20);  // AutoConf 3: accepts resize
    expect(near(ac0b.width, ac0a.width)).toBeTruthy();    // AutoConf 0: ignores resize

    await drag('F1.SPLIT', -120, 0);
  });

  test('WIDTH (vertical splitter): test pane narrows, right sidebar stays anchored', async () => {
    const bot0 = await box('F1.RIGHT.BOT');
    const rb0 = await box('F1.RIGHT.BOT.RB');

    await drag('F1.SPLIT', 120, 0); // widen LEFT -> narrow RIGHT/test pane

    const bot1 = await box('F1.RIGHT.BOT');
    const rb1 = await box('F1.RIGHT.BOT.RB');

    expect(bot1.width).toBeLessThan(bot0.width - 20);                // test pane narrowed
    expect(near(rb1.width, rb0.width)).toBeTruthy();                 // sidebar fixed width
    expect(rb1.x + rb1.width).toBeLessThanOrEqual(bot1.x + bot1.width + 4); // stays inside

    await drag('F1.SPLIT', -120, 0);
  });

  test('HEIGHT (horizontal splitter): pane shortens, toolbar fixed, center-fill shrinks', async () => {
    const bot0 = await box('F1.RIGHT.BOT');
    const tb0 = await box('F1.RIGHT.BOT.TB');
    const cf0 = await box('F1.RIGHT.BOT.CF');

    await drag('F1.RIGHT.SPLIT', 0, 120); // drag top splitter down -> pane shorter

    const bot1 = await box('F1.RIGHT.BOT');
    const tb1 = await box('F1.RIGHT.BOT.TB');
    const cf1 = await box('F1.RIGHT.BOT.CF');

    expect(bot1.height).toBeLessThan(bot0.height - 20);  // test pane got shorter
    expect(near(tb1.height, tb0.height)).toBeTruthy();    // toolbar: fixed height (Top..Top)
    expect(cf1.height).toBeLessThan(cf0.height - 20);     // center-fill stretches (Top..Bottom)

    await drag('F1.RIGHT.SPLIT', 0, -120);
  });

  test('HEIGHT (horizontal splitter): status bar stays glued to the pane bottom', async () => {
    const bot0 = await box('F1.RIGHT.BOT');
    const sb0 = await box('F1.RIGHT.BOT.SB');
    const gap0 = (bot0.y + bot0.height) - (sb0.y + sb0.height); // status -> pane-bottom gap

    await drag('F1.RIGHT.SPLIT', 0, 120);

    const bot1 = await box('F1.RIGHT.BOT');
    const sb1 = await box('F1.RIGHT.BOT.SB');
    const gap1 = (bot1.y + bot1.height) - (sb1.y + sb1.height);

    expect(near(sb1.height, sb0.height)).toBeTruthy();  // status: fixed height (Bottom..Bottom)
    expect(near(gap1, gap0)).toBeTruthy();              // still glued to the pane bottom

    await drag('F1.RIGHT.SPLIT', 0, -120);
  });
});
