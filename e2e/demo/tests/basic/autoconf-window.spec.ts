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
  // The button round-trips to the server (⎕WS the form Size), which then
  // reflows every Attach child and, for the grid, provokes a Configure ->
  // re-deploy exchange. A fixed delay races that: at 700ms the *restore* at the
  // end of the first test had not landed before the next test sampled its
  // baseline, so the grid comparison started from the grown size and could
  // never see "more rows". Wait for the form to actually change instead, then
  // give the downstream reflow a moment to settle.
  const formBox = () =>
    page.evaluate(() => {
      const f = document.getElementById('F1');
      return f ? `${f.clientWidth}x${f.clientHeight}` : '';
    });
  // The button toggles the form between two sizes by first READING its current
  // Size, so clicking again while the previous reflow is still in flight can
  // have it read a size that is already stale and re-apply the one it is on.
  // Quiesce before clicking: wait until the grid's deployed row count has
  // stopped moving, which is the last thing to settle after a resize.
  const gridRows = () =>
    page.evaluate(() => {
      const g = document.getElementById('F1.APP.GRID');
      return g ? g.querySelectorAll('.grid-row').length : -1;
    });
  // Require SUSTAINED stability, not two equal ticks: the re-deploy takes a
  // few hundred ms to land, so a two-sample check taken right after a resize
  // sees the old count twice and declares victory before anything has moved.
  const STABLE_SAMPLES = 5; // 5 x 250ms = ~1s of no change
  const quiesce = async () => {
    let prev = await gridRows();
    let stable = 0;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(250);
      const current = await gridRows();
      stable = current === prev ? stable + 1 : 0;
      prev = current;
      if (stable >= STABLE_SAMPLES) return;
    }
  };
  const resize = async () => {
    await quiesce();
    const before = await formBox();
    await page.locator('#F1\\.BAR\\.BTN').click();
    await page.waitForFunction(
      (prev) => {
        const f = document.getElementById('F1');
        return !!f && `${f.clientWidth}x${f.clientHeight}` !== prev;
      },
      before,
      { timeout: 10000 },
    );
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

  // The APP holds a "virtual" grid (VScroll/HScroll 0) with a Configure event.
  // When it reflows on resize it must report its new size so the app can
  // re-deploy more/fewer cells to fit — the space-based deployment a real
  // desktop grid uses. Before the Grid emitted Configure(31) this only happened
  // on a fresh open, never on a live resize.
  test('virtual grid re-deploys more cells when the window grows', async () => {
    const rows = () => page.locator('#F1\\.APP\\.GRID .grid-row').count();
    const cols = () => page.locator('#F1\\.APP\\.GRID .grid-col-header').count();

    // The previous test ends with a restore whose re-deploy may still be in
    // flight, so settle before sampling the baseline — otherwise rows0 is the
    // PREVIOUS deployment and every comparison below is against the wrong number.
    await quiesce();
    const rows0 = await rows();
    const cols0 = await cols();

    await resize(); // grow the window -> grid reflows -> Configure -> re-deploy

    // The re-deploy is a server round-trip (Configure -> ⎕WS Values/RowTitles)
    // that lands some time AFTER the form itself has resized, so read these
    // with a retrying assertion rather than a one-shot count — a plain read
    // races the round-trip and sees the previous deployment.
    await expect.poll(rows, { timeout: 15000 }).toBeGreaterThan(rows0 + 3);
    await expect.poll(cols, { timeout: 15000 }).toBeGreaterThan(cols0);

    const rows1 = await rows();

    await resize(); // shrink back -> fewer cells again
    await expect.poll(rows, { timeout: 15000 }).toBeLessThan(rows1);
  });

  // The grid uses VScroll ¯2 = "scrollable but no native scrollbar" (the
  // external Scroll object F1.APP.VS is the bar). If the client rendered its own
  // bar too you'd get the "double scrollbars" bug — so the grid's scroll
  // container must be overflow:hidden vertically, not auto.
  test('VScroll -2 grid shows NO native scrollbar (no double bars)', async () => {
    const overflowY = await page.locator('#F1\\.APP\\.GRID .grid-container')
      .evaluate((el: HTMLElement) => getComputedStyle(el).overflowY);
    expect(overflowY).toBe('hidden');
    // The external Scroll widget is present as the single vertical bar.
    await expect(page.locator('#F1\\.APP\\.VS')).toBeVisible();
  });

  // The external Scroll bar must actually page the virtual grid (Scroll event ->
  // CBAutoConfWin re-slices the visible window). Dragging its thumb to the bottom
  // should move the first visible row deep into the 200-row dataset.
  test('external Scroll bar pages the virtual grid', async () => {
    const firstRow = async () =>
      Number((await page.locator('#F1\\.APP\\.GRID .grid-row-header').first().textContent())?.trim());
    const dragThumbTo = async (frac: number) => {
      const track = await page.locator('#F1\\.APP\\.VS .scroll-bar').boundingBox();
      const thumb = await page.locator('#F1\\.APP\\.VS .thumb').boundingBox();
      if (!track || !thumb) throw new Error('scrollbar track/thumb not found');
      await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
      await page.mouse.down();
      await page.mouse.move(thumb.x + thumb.width / 2, track.y + track.height * frac, { steps: 15 });
      await page.mouse.up();
      await page.waitForTimeout(600);
    };

    const start = await firstRow();
    await dragThumbTo(0.95);            // drag thumb near the bottom
    const down = await firstRow();
    expect(down).toBeGreaterThan(start + 50); // scrolled deep into the 200-row dataset

    await dragThumbTo(0);               // drag thumb back toward the top
    expect(await firstRow()).toBeLessThan(down); // scrolled back up
  });
});
