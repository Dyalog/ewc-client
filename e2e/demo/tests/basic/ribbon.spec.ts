import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';
import { openInjectablePage } from '../helpers/ws-inject';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// ─────────────────────────────────────────────────────────────────────────────
// Ribbon — regression coverage for the Office-Fluent ribbon rewrite.
//
// The ribbon (src/components/Ribbon/*) had NO automated coverage. This spec
// folds in the verification logic from ci/ribbon-harness/{snapshot,interact}.mjs
// as a real Playwright spec:
//
//   1. Render            — groups + captions + separators + caption row.
//   2. Collapse ladder   — responsive priority-reduction across a width sweep,
//                          with the no-horizontal-clip "scroll net".
//   3. Insert / delete   — the KEY regression: drive the client's real WC/EX
//                          code path by injecting synthetic server frames over
//                          the captured WebSocket (no demo wires this), then
//                          assert a clean delete (no ghost) + correct insert.
//   4. Collapsed flyout  — click a collapsed group, assert the flyout popup
//                          shows the group's content; outside-click closes it.
//   5. Visual regression — width-sweep toHaveScreenshot (CI generates baselines).
//
// DOM contract this spec relies on (from src/components/Ribbon/*):
//   .ewc-ribbon                     band     (id "F1.Ribbon")
//   .ewc-ribbon > .ewc-ribbon-group group    (id "F1.Ribbon.ItemN")
//   .ewc-ribbon-group-caption-text  group caption text (bottom caption row)
//   .ewc-ribbon-collapsed           collapsed-group button
//   .ewc-ribbon-flyout              collapsed-group flyout popup
//   group separators are a border-right on each non-last group (no separate
//   element), per RibbonStyles.css.
//
// Ribbon0's groups (observed, left→right): Item1 Locks, Item2 Macros,
// Item3 Dashboard, Item4 Application, Item5 Data Quality.
// ─────────────────────────────────────────────────────────────────────────────

const RIBBON = '#F1\\.Ribbon';
const GROUP_CAPTIONS = ['Locks', 'Macros', 'Dashboard', 'Application', 'Data Quality'];

// The spec §7 collapse ladder, as observed against the live backend at h=760.
// Rightmost-first: Data Quality (Item5) collapses first; everything collapses
// by 360. `false` = full group, `true` = a single .ewc-ribbon-collapsed button.
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

  // Each test starts from a known viewport so the responsive state is
  // deterministic regardless of what the previous test left behind.
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
    // (RibbonStyles.css). Assert the structural rule, not a separate element.
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
  // 2. Responsive collapse ladder (spec §7)
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
      // The ladder is supposed to keep content within the band; the overflow-x
      // scroller is the safety net. Either way content is never silently
      // chopped: scrollWidth must fit the client box (1px rounding tolerance).
      expect(
        fit.scrollW,
        `band scrollWidth ${fit.scrollW} must fit clientWidth ${fit.clientW} at ${width}px`
      ).toBeLessThanOrEqual(fit.clientW + 1);
    }
  });

  // ───────────────────────────────────────────────────────────────
  // 4. Collapsed-group flyout
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
    // The flyout reuses the group renderer at full Large layout — its content
    // is the Data Quality group's buttons.
    await expect(flyout.locator('.ewc-ribbon-group')).toBeVisible();
    await expect(flyout).toContainText('Data Quality');

    // Outside-click closes it.
    await page.mouse.click(5, 400);
    await expect(flyout).toHaveCount(0);
  });

  // ───────────────────────────────────────────────────────────────
  // 5. Visual regression (CI generates the baselines)
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
//
// This is the key regression guard. It runs on its OWN page so we can wrap
// window.WebSocket before the app loads (the shared page is already navigated).
// We then push the same WC/EX frames the EWC backend's eWC/eEX emit and assert
// the client's create/destroy paths behave: a deleted group leaves NO ghost
// (the original bug: App.jsx's EX handler choked on a bare-string ID, so the
// node — and its DOM — was never removed), and an inserted group lands in the
// right place with the right caption.
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

      // ── DELETE the middle group "Macros" (Item2) ─────────────────────────
      // Real wire shape: EWC's dEX.aplf does `names←,⊆names`, so EX.ID is ALWAYS
      // a JSON array — even for a single delete (verified: ⎕JSON → ["F1.Ribbon.Item2"]).
      await send({ EX: { ID: ['F1.Ribbon.Item2'] } });
      await page.waitForTimeout(500);

      const afterDelete = await read();
      // The Item2 group element is gone — and crucially the survivors keep
      // their correct identity/order (no stale/duplicated/mispositioned group).
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

      // No-ghost guard: the Item2 group node and ALL its descendants are gone
      // from the DOM. (A naive "Macros" text check would be a false positive —
      // the Dashboard group also has a button captioned "Macros" — so we assert
      // on ids, which uniquely identify the deleted subtree.)
      const item2Survivors = await page.evaluate(
        () => document.querySelectorAll('[id^="F1.Ribbon.Item2"]').length
      );
      expect(item2Survivors).toBe(0);

      // ── DELETE a middle column inside Application (Item4.GroupItem2) ──────
      // Bare-string form: the backend never emits this (dEX always arrays), but the
      // EX handler defensively normalizes a string ID — exercise that path too.
      await send({ EX: { ID: 'F1.Ribbon.Item4.GroupItem2' } });
      await page.waitForTimeout(500);
      // The Application group survives; its GroupItem2 subtree is gone.
      expect(await page.evaluate(() => !!document.getElementById('F1.Ribbon.Item4'))).toBe(true);
      expect(
        await page.evaluate(
          () => document.querySelectorAll('[id^="F1.Ribbon.Item4.GroupItem2"]').length
        )
      ).toBe(0);

      // ── INSERT a brand-new group at the end (Item6 "Inserted") ───────────
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
      // The new group appears LAST (server order), with its caption, and the
      // survivors keep their order — no reshuffle, no duplication.
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
