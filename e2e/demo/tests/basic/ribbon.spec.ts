import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';
import { openInjectablePage } from '../helpers/ws-inject';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);
const RIBBON = '#F1\\.Ribbon';
const GROUP_CAPTIONS = ['Locks', 'Macros', 'Dashboard', 'Application', 'Data Quality'];

// As we resize horizontally, different parts of the Ribbon should collapse in
// whatever way is appropriate.
const COLLAPSE_LADDER: { width: number; collapsed: boolean[] }[] = [
  { width: 1400, collapsed: [false, false, false, false, false] },
  { width: 1100, collapsed: [false, false, false, false, false] },
  { width: 900, collapsed: [false, false, false, false, true] },
  { width: 700, collapsed: [false, false, false, false, true] },
  { width: 520, collapsed: [false, false, false, false, true] },
  { width: 360, collapsed: [true, true, true, true, true] },
];

// Read each top-level group's id, caption, and whether it rendered collapsed.
async function readGroups(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.ewc-ribbon > .ewc-ribbon-group')].map((g) => ({
      id: (g as HTMLElement).id,
      caption:
        g.querySelector('.ewc-ribbon-group-caption-text')?.textContent?.trim() ?? '',
      collapsed: !!g.querySelector('.ewc-ribbon-collapsed'),
    }))
  );
}

test.describe('DemoRibbon0', () => {
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    page = await navigateToDemo(result.page, 'Ribbon0', RIBBON, 12000);
  });

  // Each test starts from a known viewport
  test.beforeEach(async () => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await page.waitForTimeout(150);
  });

  // ───────────────────────────────────────────────────────────────
  // 1. Render
  // ───────────────────────────────────────────────────────────────

  test('ribbon band renders', async () => {
    await expect(page.locator(RIBBON)).toBeVisible();
  });

  test('all five groups render with their captions, left-to-right', async () => {
    const groups = await readGroups(page);
    expect(groups.map((g) => g.caption)).toEqual(GROUP_CAPTIONS);
    expect(groups.map((g) => g.id)).toEqual([
      'F1.Ribbon.Item1',
      'F1.Ribbon.Item2',
      'F1.Ribbon.Item3',
      'F1.Ribbon.Item4',
      'F1.Ribbon.Item5',
    ]);
  });

  test('each group has a bottom caption row', async () => {
    const captions = page.locator('.ewc-ribbon > .ewc-ribbon-group .ewc-ribbon-group-caption');
    await expect(captions).toHaveCount(GROUP_CAPTIONS.length);
  });

  test('groups are divided by vertical separators (border between, none after last)', async () => {
    // Separators are a 1px border-right on every group except the last
    const borders = await page.evaluate(() =>
      [...document.querySelectorAll('.ewc-ribbon > .ewc-ribbon-group')].map((g) => {
        const cs = getComputedStyle(g);
        return `${cs.borderRightStyle} ${cs.borderRightWidth}`;
      })
    );
    expect(borders.slice(0, -1).every((b) => b === 'solid 1px')).toBe(true);
    expect(borders[borders.length - 1]).toBe('none 0px');
  });

  // ───────────────────────────────────────────────────────────────
  // 2. Responsive collapsing
  // ───────────────────────────────────────────────────────────────

  test('collapse ladder: groups collapse rightmost-first as width shrinks', async () => {
    for (const { width, collapsed } of COLLAPSE_LADDER) {
      await page.setViewportSize({ width, height: 760 });
      await page.waitForTimeout(350);
      const groups = await readGroups(page);
      expect(
        groups.map((g) => g.collapsed),
        `collapse state at width ${width}`
      ).toEqual(collapsed);
    }
  });

  test('at 360px every group is collapsed', async () => {
    await page.setViewportSize({ width: 360, height: 760 });
    await page.waitForTimeout(350);
    const collapsedCount = await page.locator('.ewc-ribbon-collapsed').count();
    expect(collapsedCount).toBe(GROUP_CAPTIONS.length);
  });

  test('ribbon never clips horizontally (scroll net holds at every width)', async () => {
    for (const { width } of COLLAPSE_LADDER) {
      await page.setViewportSize({ width, height: 760 });
      await page.waitForTimeout(350);
      const fit = await page.evaluate(() => {
        const band = document.querySelector('.ewc-ribbon') as HTMLElement;
        return { scrollW: band.scrollWidth, clientW: band.clientWidth };
      });
      expect(
        fit.scrollW,
        `band scrollWidth ${fit.scrollW} must fit clientWidth ${fit.clientW} at ${width}px`
      ).toBeLessThanOrEqual(fit.clientW + 1);
    }
  });

  // ───────────────────────────────────────────────────────────────
  // 4. Collapsed-group 'flyout' - like a dropdown when collapsed
  // ───────────────────────────────────────────────────────────────

  test('clicking a collapsed group opens a flyout with its content; outside-click closes', async () => {
    // At 520, only the rightmost group (Data Quality) is collapsed.
    await page.setViewportSize({ width: 520, height: 760 });
    await page.waitForTimeout(350);

    const collapsed = page.locator('.ewc-ribbon-collapsed');
    await expect(collapsed).toHaveCount(1);

    await collapsed.first().click();
    const flyout = page.locator('.ewc-ribbon-flyout');
    await expect(flyout).toBeVisible();
    // The flyout reuses the group renderer
    await expect(flyout.locator('.ewc-ribbon-group')).toBeVisible();
    await expect(flyout).toContainText('Data Quality');

    // Outside-click closes
    await page.mouse.click(5, 400);
    await expect(flyout).toHaveCount(0);
  });

  // ───────────────────────────────────────────────────────────────
  // 5. Visual regression
  // ───────────────────────────────────────────────────────────────

  for (const width of [1400, 900, 520, 360]) {
    test(`visual regression - Ribbon0 at ${width}px`, async () => {
      await page.setViewportSize({ width, height: 760 });
      await page.waitForTimeout(350);
      await expect(page).toHaveScreenshot(`ribbon0-${width}.png`, {
        maxDiffPixels: 100,
      });
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Runtime insert / delete via WebSocket frame injection.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('DemoRibbon0 — runtime insert/delete (frame injection)', () => {
  let browser: Browser;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
  });

  test('EX deletes a middle group cleanly (no ghost) and WC inserts a new group in place', async () => {
    const injected = await openInjectablePage(browser, 'Ribbon0', RIBBON, 15000);
    const { page, send } = injected;
    try {
      const read = () =>
        page.evaluate(() =>
          [...document.querySelectorAll('.ewc-ribbon > .ewc-ribbon-group')].map((g) => ({
            id: (g as HTMLElement).id,
            caption:
              g.querySelector('.ewc-ribbon-group-caption-text')?.textContent?.trim() ?? '',
          }))
        );

      // Sanity: full ribbon present before mutation.
      expect((await read()).map((g) => g.caption)).toEqual(GROUP_CAPTIONS);

      // Expunge
      await send({ EX: { ID: ['F1.Ribbon.Item2'] } });
      await page.waitForTimeout(500);

      const afterDelete = await read();
      // The Item2 group element is gone and the rest keep their identity/order
      expect(afterDelete.map((g) => g.id)).toEqual([
        'F1.Ribbon.Item1',
        'F1.Ribbon.Item3',
        'F1.Ribbon.Item4',
        'F1.Ribbon.Item5',
      ]);
      expect(afterDelete.map((g) => g.caption)).toEqual([
        'Locks',
        'Dashboard',
        'Application',
        'Data Quality',
      ]);

      const item2Survivors = await page.evaluate(
        () => document.querySelectorAll('[id^="F1.Ribbon.Item2"]').length
      );
      expect(item2Survivors).toBe(0);

      await send({ EX: { ID: 'F1.Ribbon.Item4.GroupItem2' } });
      await page.waitForTimeout(500);
      // The Application group survives; its GroupItem2 subtree is gone.
      expect(await page.evaluate(() => !!document.getElementById('F1.Ribbon.Item4'))).toBe(true);
      expect(
        await page.evaluate(
          () => document.querySelectorAll('[id^="F1.Ribbon.Item4.GroupItem2"]').length
        )
      ).toBe(0);

      // Insert at the end
      await send({
        WC: {
          ID: 'F1.Ribbon.Item6',
          Properties: { Type: 'RibbonGroup', Title: 'Inserted', Size: 2, BorderCol: [192, 192, 192] },
        },
      });
      await send({
        WC: { ID: 'F1.Ribbon.Item6.GroupItem1', Properties: { Type: 'RibbonGroupItem', Size: 12 } },
      });
      await send({
        WC: {
          ID: 'F1.Ribbon.Item6.GroupItem1.NewBtn',
          Properties: { Type: 'RibbonButton', Caption: 'Inserted', Icon: 'FcSearch', Event: [['Select', '']] },
        },
      });
      await page.waitForTimeout(700);

      const afterInsert = await read();
      expect(afterInsert.map((g) => g.id)).toEqual([
        'F1.Ribbon.Item1',
        'F1.Ribbon.Item3',
        'F1.Ribbon.Item4',
        'F1.Ribbon.Item5',
        'F1.Ribbon.Item6',
      ]);
      expect(afterInsert[afterInsert.length - 1].caption).toBe('Inserted');
      // The inserted button rendered inside the new group.
      expect(
        await page.evaluate(() => !!document.getElementById('F1.Ribbon.Item6.GroupItem1.NewBtn'))
      ).toBe(true);
    } finally {
      await injected.dispose();
    }
  });
});
