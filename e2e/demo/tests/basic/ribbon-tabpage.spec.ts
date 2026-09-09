import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';
import { openInjectablePage } from '../helpers/ws-inject';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);
const TAB_CONTROL = '#F1\\.TC';

// A ribbon lives inside a tab page: TabControl > SubForm(TabObj) > Ribbon. Apps
// create that page with a TabObj and a BCol and no Size, so SubForm's
// "no Size of my own" fallback hands it the whole form's Size — and the ribbon
// TabControl is anchored top-to-bottom, so nothing clips it either. The page
// then paints its ribbon-coloured background over everything below the band.
// SubForm gates this on `hostsRibbon` and hugs the ribbon instead.
//
// That guard has been lost once already: 3c69d64 folded the height into a
// `heightStyle` for flex containers and dropped the `hostsRibbon` branch,
// leaving GAMA's entire navigation tree under a solid #86ABDC rectangle. The
// TabControl's own `height: max-content` does NOT cover for it — it just hugs a
// form-tall page. These tests are the tripwire for both halves.
//
// DemoRibbonTabs ends with `eNQ 'F1.TC.T1' 'Select'`, so F1.TC.SF1 is the
// active page, and F1.Average is a Label at Posn (210,10) — created BEFORE the
// TabControl, and squarely inside the area a flooded page would cover.
const WITNESS = 'F1.Average';

type Layout = {
  form: number;
  pageIds: string[];
  pageHeight: number;
  bandHeight: number;
  witnessCovered: boolean;
  coveredBy: string;
  order: string[];
};

// One evaluate for the whole picture: the page's height against the band it is
// supposed to hug, and whether anything is sitting on top of the witness.
async function readLayout(page: Page, witness: string = WITNESS): Promise<Layout> {
  return page.evaluate((witnessId) => {
    const h = (el: Element | null) => (el ? el.getBoundingClientRect().height : -1);
    const tabPages = [...document.querySelectorAll('[id^="F1.TC.SF"]')].filter((el) =>
      /^F1\.TC\.SF\d+$/.test((el as HTMLElement).id)
    ) as HTMLElement[];

    const witness = document.getElementById(witnessId);
    let covered = false;
    let coveredBy = '';
    if (witness) {
      const r = witness.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      let node: Element | null = hit;
      while (node && node.id !== witnessId) node = node.parentElement;
      covered = node === null;
      coveredBy = (hit as HTMLElement | null)?.id || hit?.className || hit?.tagName || '';
    }

    return {
      form: h(document.getElementById('F1')),
      pageIds: tabPages.map((el) => el.id),
      pageHeight: h(tabPages[0] ?? null),
      bandHeight: h(tabPages[0]?.querySelector('.ewc-ribbon') ?? null),
      witnessCovered: covered,
      coveredBy,
      // Document order of the form's own children. The rebuild below moves the
      // TabControl behind the witness in this list, which is exactly what turns
      // a flooded page from harmless (painted underneath) into a cover.
      order: [...document.querySelectorAll('[id^="F1."]')]
        .map((el) => (el as HTMLElement).id)
        .filter((id) => id.split('.').length === 2),
    };
  }, witness);
}

test.describe('DemoRibbonTabs — the ribbon tab page must hug its ribbon', () => {
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    page = await navigateToDemo(result.page, 'RibbonTabs', TAB_CONTROL, 15000);
  });

  test('the active tab page is band-tall, not form-tall', async () => {
    const l = await readLayout(page);

    // Only the active page renders, so there is exactly one to measure.
    expect(l.pageIds).toHaveLength(1);
    expect(l.bandHeight).toBeGreaterThan(0);

    // The page must hug its ribbon. Allow a little slack for the group captions'
    // own margins, but nothing like a second row of content.
    expect(
      l.pageHeight,
      `tab page ${l.pageIds[0]} is ${l.pageHeight}px against a ${l.bandHeight}px band`
    ).toBeLessThanOrEqual(l.bandHeight + 8);

    // The regression made it exactly the form's height. Assert the shape of the
    // failure too, so a future near-miss still reads as a near-miss.
    expect(
      l.pageHeight,
      `tab page is ${l.pageHeight}px of a ${l.form}px form — it has flooded`
    ).toBeLessThan(l.form / 2);
  });

  test('the tab page does not paint over the rest of the form', async () => {
    const l = await readLayout(page);
    expect(
      l.witnessCovered,
      `${WITNESS} is covered by ${l.coveredBy}`
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The same thing after the app rebuilds its ribbon, which is how GAMA hits it:
// opening a screen expunges and re-creates the ribbon TabControl, so its key is
// re-inserted at the END of the parent's children. Both SubForms sit at
// z-index 0, so document order decides, and a flooded page that used to paint
// harmlessly underneath now lands on top.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('DemoRibbonTabs — ribbon rebuilt at runtime (frame injection)', () => {
  let browser: Browser;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
  });

  test('a rebuilt ribbon TabControl moves last but still does not cover the form', async () => {
    const injected = await openInjectablePage(browser, 'RibbonTabs', TAB_CONTROL, 15000);
    const { page, send } = injected;
    try {
      // A sibling created AFTER the TabControl, which is how the app's own
      // navigation panel sits: later in document order, so it paints on top of
      // the tab page however tall that page is. It is the rebuild that takes
      // that protection away.
      await send({
        WC: {
          ID: 'F1.NAV',
          Properties: {
            BCol: [240, 240, 240],
            Posn: [200, 10],
            Size: [300, 200],
            Type: 'SubForm',
          },
        },
      });
      await page.waitForTimeout(500);

      const before = await readLayout(page, 'F1.NAV');
      expect(before.witnessCovered).toBe(false);
      expect(before.order.indexOf('F1.TC')).toBeLessThan(before.order.indexOf('F1.NAV'));

      // Expunge and re-create, the way the app does when it swaps screens.
      await send({ EX: { ID: ['F1.TC'] } });
      await send({
        WC: {
          ID: 'F1.TC',
          Properties: {
            ActiveBCol: [134, 171, 220],
            Attach: ['Top', 'Left', 'Bottom', 'Right'],
            BCol: [67, 85, 110],
            FCol: [255, 255, 255],
            MultiLine: 1,
            Posn: [0, 0],
            Size: [200, 800],
            Type: 'TabControl',
          },
        },
      });
      await send({
        WC: { ID: 'F1.TC.T9', Properties: { Caption: 'Rebuilt', Type: 'TabButton' } },
      });
      await send({
        WC: {
          ID: 'F1.TC.SF9',
          Properties: { BCol: [134, 171, 220], TabObj: 'F1.TC.T9', Type: 'SubForm' },
        },
      });
      await send({
        WC: {
          ID: 'F1.TC.SF9.Ribbon',
          Properties: {
            BCol: [134, 171, 220],
            FCol: [255, 255, 255],
            TitleBCol: [0, 0, 0],
            Type: 'Ribbon',
          },
        },
      });
      await send({
        WC: {
          ID: 'F1.TC.SF9.Ribbon.Item1',
          Properties: { BorderCol: [192, 192, 192], Size: 2, Title: 'Rebuilt', Type: 'RibbonGroup' },
        },
      });
      await send({
        WC: { ID: 'F1.TC.SF9.Ribbon.Item1.GroupItem1', Properties: { Size: [12], Type: 'RibbonGroupItem' } },
      });
      await send({
        WC: {
          ID: 'F1.TC.SF9.Ribbon.Item1.GroupItem1.B1',
          Properties: { Caption: 'Ping', Size: 12, Type: 'RibbonButton' },
        },
      });
      await page.waitForTimeout(800);

      const after = await readLayout(page, 'F1.NAV');
      expect(after.pageIds).toEqual(['F1.TC.SF9']);
      expect(after.bandHeight).toBeGreaterThan(0);

      // The rebuild does put the TabControl last — that part is expected, and
      // asserting it keeps the test honest about what it is guarding against.
      expect(after.order.indexOf('F1.TC')).toBeGreaterThan(after.order.indexOf('F1.NAV'));

      // ...and precisely because it is now last, the page must not have flooded.
      expect(
        after.pageHeight,
        `rebuilt tab page is ${after.pageHeight}px of a ${after.form}px form`
      ).toBeLessThanOrEqual(after.bandHeight + 8);
      expect(
        after.witnessCovered,
        `F1.NAV is covered by ${after.coveredBy} after the ribbon was rebuilt`
      ).toBe(false);
    } finally {
      await injected.dispose();
    }
  });
});
