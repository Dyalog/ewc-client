import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// DemoEdgeStyle covers the rendering of two INDEPENDENT APL properties:
//   EdgeStyle = Ridge|Groove|Recess|Plinth|Shadow|None|Default
//   Border    = 0 | 1
// across all five supported components (Edit, Label, List, Group, SubForm).
//
// Grid: 10 columns × 5 component rows. The two trailing columns set BOTH
// properties — those rows pin down which property wins on appearance and
// which one decides whether a border is drawn at all.

type Row = 'E' | 'L' | 'LST' | 'G' | 'SF';

// Edit fields render an <input> that owns the visible border; every other
// component carries it on the outer element. Look inside for an input,
// otherwise read the element itself.
async function borderStyleOf(page: Page, id: string): Promise<string> {
  const escaped = id.replace(/\./g, '\\.');
  return page.locator(`#${escaped}`).evaluate((el) => {
    const target = el.querySelector('input') || el;
    return getComputedStyle(target as Element).borderStyle;
  });
}

test.describe('DemoEdgeStyle', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'EdgeStyle', '#F1\\.E_Ridge', 10000);
  });

  test.beforeEach(async () => {
    await page.waitForTimeout(100);
  });

  // ─── Form + scaffolding ────────────────────────────────────────────
  test('demo title is visible', async () => {
    await expect(page.locator('#F1\\.TITLE')).toBeVisible();
  });

  test('all five component rows render their first cell', async () => {
    await expect(page.locator('#F1\\.E_Ridge')).toBeVisible();
    await expect(page.locator('#F1\\.L_Ridge')).toBeVisible();
    await expect(page.locator('#F1\\.LST_Ridge')).toBeVisible();
    await expect(page.locator('#F1\\.G_Ridge')).toBeVisible();
    await expect(page.locator('#F1\\.SF_Ridge')).toBeVisible();
  });

  // ─── EdgeStyle → expected CSS borderStyle mapping ──────────────────
  // Built from src/styles/edgeStyles.js:
  //   Ridge  → ridge  | Groove → groove | Recess → inset
  //   Plinth → outset | Shadow → solid
  // EdgeStyle='None' is intentionally NOT in this map: per APL semantics,
  // 'None' means "no edge styling" — i.e. the property is treated as
  // absent, and the rendering falls back to whatever Border (or each
  // component's default) would produce. See the dedicated 'None' tests
  // below for the per-component expected fallback.
  const STYLE_MAP: Record<string, string> = {
    Ridge: 'ridge',
    Groove: 'groove',
    Recess: 'inset',
    Plinth: 'outset',
    Shadow: 'solid',
  };

  const COMPONENTS: { row: Row; name: string }[] = [
    { row: 'E', name: 'Edit' },
    { row: 'L', name: 'Label' },
    { row: 'LST', name: 'List' },
    { row: 'G', name: 'Group' },
    { row: 'SF', name: 'SubForm' },
  ];

  for (const { row, name } of COMPONENTS) {
    for (const [variant, expected] of Object.entries(STYLE_MAP)) {
      test(`${name} EdgeStyle="${variant}" renders ${expected}`, async () => {
        const id = `F1.${row}_${variant}`;
        const style = await borderStyleOf(page, id);
        expect(style).toContain(expected);
      });
    }
  }

  // ─── EdgeStyle='None' fallback per component ───────────────────────
  // 'None' is the explicit "no edge styling / no frame" opt-out:
  //   Edit / Label / SubForm — Border defaults to 0 → no border
  //   Group                  — 'None' overrides the etched default → no border (#445)
  //   List                   — no Border default, no EdgeStyle, falls back
  //                            to the focus-aware default (1px solid darkgrey)
  const NONE_FALLBACK: Record<Row, string> = {
    E: 'none',
    L: 'none',
    SF: 'none',
    G: 'none',
    LST: 'solid',
  };

  for (const { row, name } of COMPONENTS) {
    const expected = NONE_FALLBACK[row];
    test(`${name} EdgeStyle="None" falls back to ${expected}`, async () => {
      const style = await borderStyleOf(page, `F1.${row}_None`);
      expect(style).toContain(expected);
    });
  }

  // ─── EdgeStyle='Default' fallback per component (#445) ──────────────
  // Per ⎕WC, 'Default' means "no 3-D border on the object itself", so for
  // border rendering it behaves exactly like 'None' — fall through to Border.
  // Regression guard: 'Default' previously routed to getEdgeStyleBorder and
  // rendered NOTHING (the customer's groups using EdgeStyle='Default' came out
  // borderless). It must now match the per-component 'None' fallback.
  for (const { row, name } of COMPONENTS) {
    const expected = NONE_FALLBACK[row];
    test(`${name} EdgeStyle="Default" falls back to ${expected} (#445)`, async () => {
      const style = await borderStyleOf(page, `F1.${row}_Default`);
      expect(style).toContain(expected);
    });
  }

  // ─── Border-only behaviour ─────────────────────────────────────────
  // Border=0 → no border; Border=1 → a plain solid border — EXCEPT Group,
  // which always shows its etched frame (default EdgeStyle 'Groove') regardless
  // of Border, since these cells carry no explicit EdgeStyle. (#445)
  const B0_EXPECT: Record<Row, string> = { E: 'none', L: 'none', SF: 'none', LST: 'none', G: 'groove' };
  const B1_EXPECT: Record<Row, string> = { E: 'solid', L: 'solid', SF: 'solid', LST: 'solid', G: 'groove' };
  for (const { row, name } of COMPONENTS) {
    test(`${name} Border=0 → ${B0_EXPECT[row]}`, async () => {
      const style = await borderStyleOf(page, `F1.${row}_B0`);
      expect(style).toContain(B0_EXPECT[row]);
    });

    test(`${name} Border=1 → ${B1_EXPECT[row]}`, async () => {
      const style = await borderStyleOf(page, `F1.${row}_B1`);
      expect(style).toContain(B1_EXPECT[row]);
    });
  }

  // ─── Combined-property behaviour (the previously coupled cases) ────
  // B=1 + EdgeStyle='Ridge' must draw a Ridge (EdgeStyle wins on appearance).
  for (const { row, name } of COMPONENTS) {
    test(`${name} Border=1 + EdgeStyle=Ridge yields ridge (EdgeStyle wins)`, async () => {
      const style = await borderStyleOf(page, `F1.${row}_B1Ridge`);
      expect(style).toContain('ridge');
    });
  }

  // EdgeStyle='None' is treated as "no EdgeStyle", so the border (if any)
  // is decided by Border alone. With Border=1 every component draws a plain
  // solid frame.
  for (const { row, name } of COMPONENTS) {
    test(`${name} Border=1 + EdgeStyle=None still draws a plain border`, async () => {
      const style = await borderStyleOf(page, `F1.${row}_B1None`);
      expect(style).toContain('solid');
    });
  }

  // B=1 + EdgeStyle='Default' must draw a plain border for every component —
  // the core #445 fix (these were previously borderless).
  for (const { row, name } of COMPONENTS) {
    test(`${name} Border=1 + EdgeStyle=Default still draws a plain border (#445)`, async () => {
      const style = await borderStyleOf(page, `F1.${row}_B1Default`);
      expect(style).toContain('solid');
    });
  }

  // ─── Visual regression ─────────────────────────────────────────────
  // Baseline captured on Linux (Playwright Docker image). Mac runs will
  // produce ~1% font-rendering noise; update via demotests:visual:update.
  test('visual regression - edgestyle demo', async () => {
    await expect(page).toHaveScreenshot('edgestyle-demo.png', {
      maxDiffPixels: 100,
    });
  });
});
