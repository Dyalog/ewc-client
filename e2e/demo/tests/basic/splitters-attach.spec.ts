import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// Attach / AutoConf resize behaviour on the Splitters demo. We assert computed
// GEOMETRY (bounding-box gaps) before/after dragging the splitter — not
// screenshots — so the test is platform-independent (visual baselines are
// Linux-only). Objects and their Attach values come from
// ../ewc/demo/DemoSplitters.aplf:
//   F1.LEFT.COLORS  List     Top Left Top Right  -> fixed height, stretch wide
//   F1.LEFT.Months  TreeView Top Left Top Left   -> fully pinned, fixed size
//   F1.RIGHT        SubForm  Top Left Bottom Right-> fills parent
//   F1.SPLIT        vertical splitter dividing F1.LEFT | F1.RIGHT
test.describe('DemoSplitters — Attach', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Splitters', '#F1\\.LEFT\\.COLORS', 10000);
  });

  const box = async (id: string) => {
    const b = await page.locator(`#${id.replace(/\./g, '\\.')}`).boundingBox();
    if (!b) throw new Error(`no bounding box for #${id}`);
    return b;
  };

  // Drag the vertical splitter horizontally by dx (positive = to the right,
  // which widens the left pane). Uses the real mouse so the splitter's
  // mousedown/mousemove/mouseup handlers run.
  const dragSplitter = async (dx: number) => {
    const s = await box('F1.SPLIT');
    const cx = s.x + s.width / 2;
    const cy = s.y + s.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + dx, cy, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(400); // settle re-render + EndSplit round-trip
  };

  const near = (a: number, b: number, tol = 6) => Math.abs(a - b) <= tol;

  test('dragging the splitter resizes the left pane (precondition)', async () => {
    const before = await box('F1.LEFT');
    await dragSplitter(70);
    const after = await box('F1.LEFT');
    // The pane must actually change width, otherwise the Attach assertions
    // below would be vacuously true.
    expect(Math.abs(after.width - before.width)).toBeGreaterThan(20);
    // Restore
    await dragSplitter(-70);
  });

  test('List (Top Left Top Right): keeps right-edge gap + height, stretches', async () => {
    const leftBefore = await box('F1.LEFT');
    const colorsBefore = await box('F1.LEFT.COLORS');
    const gapBefore = (leftBefore.x + leftBefore.width) - (colorsBefore.x + colorsBefore.width);

    await dragSplitter(70);

    const leftAfter = await box('F1.LEFT');
    const colorsAfter = await box('F1.LEFT.COLORS');
    const gapAfter = (leftAfter.x + leftAfter.width) - (colorsAfter.x + colorsAfter.width);

    // Right edge stays a fixed distance from the pane's right edge...
    expect(near(gapAfter, gapBefore)).toBeTruthy();
    // ...so the List widens as the pane widens...
    expect(colorsAfter.width).toBeGreaterThan(colorsBefore.width + 20);
    // ...while its height (bottom edge attached to parent Top) stays fixed.
    expect(near(colorsAfter.height, colorsBefore.height)).toBeTruthy();

    await dragSplitter(-70);
  });

  test('TreeView (Top Left Top Left): fully pinned, size unchanged', async () => {
    const before = await box('F1.LEFT.Months');
    await dragSplitter(70);
    const after = await box('F1.LEFT.Months');

    expect(near(after.x, before.x)).toBeTruthy();
    expect(near(after.y, before.y)).toBeTruthy();
    expect(near(after.width, before.width)).toBeTruthy();
    expect(near(after.height, before.height)).toBeTruthy();

    await dragSplitter(-70);
  });

  test('Right SubForm (Top Left Bottom Right): tracks the splitter, fills', async () => {
    const before = await box('F1.RIGHT');
    await dragSplitter(70);
    const after = await box('F1.RIGHT');

    // Widening the left pane narrows the right pane by ~the same amount and
    // pushes its left edge right; top/bottom stay flush (fills vertically).
    expect(after.width).toBeLessThan(before.width - 20);
    expect(near(after.height, before.height)).toBeTruthy();

    await dragSplitter(-70);
  });

  // Dynamic ⎕WS: the "Toggle List AutoConf" button flips F1.LEFT.COLORS between
  // AutoConf 3 (attach on) and 0 (attach off) server-side. Exercises the new
  // AutoConf-in-Supported plumbing (AutoConf was in NO class's Supported before)
  // AND the client honoring a live AutoConf change.
  test('dynamic AutoConf via ⎕WS toggles attach on/off (server round-trip)', async () => {
    const toggle = page.locator('#F1\\.LEFT\\.TOGGLE');
    await expect(toggle).toBeVisible();

    // AutoConf=3 (default): the List stretches as the pane widens.
    const before1 = await box('F1.LEFT.COLORS');
    await dragSplitter(70);
    expect((await box('F1.LEFT.COLORS')).width).toBeGreaterThan(before1.width + 20);
    await dragSplitter(-70);

    // ⎕WS AutoConf 0 -> attach disabled -> fixed width on resize.
    await toggle.click();
    await page.waitForTimeout(500);
    const before2 = await box('F1.LEFT.COLORS');
    await dragSplitter(70);
    expect(Math.abs((await box('F1.LEFT.COLORS')).width - before2.width)).toBeLessThan(6);
    await dragSplitter(-70);

    // ⎕WS AutoConf 3 -> attach re-enabled -> stretches again.
    await toggle.click();
    await page.waitForTimeout(500);
    const before3 = await box('F1.LEFT.COLORS');
    await dragSplitter(70);
    expect((await box('F1.LEFT.COLORS')).width).toBeGreaterThan(before3.width + 20);
    await dragSplitter(-70);
  });
});
