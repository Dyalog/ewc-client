import { test, expect, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo, returnToDemoMenu, HOME_INDICATOR } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// A SubForm with no Size of its own falls back to its nearest Form/SubForm
// ancestor's Size so it doesn't collapse to nothing. Inside a flex parent that
// was wrong: every child was handed the CONTAINER's own width, so no two could
// share a flex line, each wrapped onto its own, and the container (fixed height
// + overflow:clip) swallowed all but the first. In DemoFlexLogin that hid the
// demo menu, the Data field and both buttons; in DemoFlexBoxes, Cols and the
// three buttons. Regression guard for both.
const FLEX_DEMOS = [
  { demo: 'FlexLogin', indicator: '#F1\\.INPUT\\.CREDS\\.USERID\\.C', minChildren: 4 },
  { demo: 'FlexBoxes', indicator: '#F1\\.INPUT\\.ROWS\\.EDIT', minChildren: 6 },
];

for (const { demo, indicator, minChildren } of FLEX_DEMOS) {
  test.describe(`Demo${demo} flex row`, () => {
    let page: Page;

    test.beforeAll(async () => {
      const result = await connectAndFindEWCPage(CDP_PORT);
      page = await navigateToDemo(result.page, demo, indicator, 15000);
    });

    test('children are content-sized and none is clipped out of the row', async () => {
      const { parent, children } = await page.locator('#F1\\.INPUT').evaluate((el) => {
        const box = (n: Element) => {
          const { right, bottom, width } = n.getBoundingClientRect();
          return { right, bottom, width };
        };
        return {
          parent: box(el),
          children: [...el.children].map((c) => ({ id: (c as HTMLElement).id, ...box(c) })),
        };
      });
      expect(children.length).toBeGreaterThanOrEqual(minChildren);

      // The bug: every child was handed the CONTAINER's own width, so no two
      // could ever share a flex line.
      const fullWidth = children.filter((c) => c.width >= parent.width - 12);
      expect(fullWidth, `children as wide as the row: ${fullWidth.map(c => c.id).join(', ')}`)
        .toHaveLength(0);

      // ...so each wrapped onto its own line, past the row's fixed height,
      // where overflow:clip ate it. Don't assert they now fit on one line:
      // content widths follow font metrics, which differ between macOS and the
      // Linux CI runner, so wrapping is legitimate. What must hold everywhere is
      // that the row grew to contain every child instead of clipping it away.
      const clipped = children.filter(
        (c) => c.bottom > parent.bottom + 1 || c.right > parent.right + 1
      );
      expect(clipped, `children clipped out of the row: ${clipped.map(c => c.id).join(', ')}`)
        .toHaveLength(0);
    });

    test('the demo menu is visible and clickable', async () => {
      const combo = page.locator('[role="combobox"][id$=".MENU"]').first();
      await expect(combo).toBeVisible();
      // A real click, not just a visibility check: when the row clipped its
      // wrapped content the combo was still "visible" to Playwright but nothing
      // was there to hit, so .click() timed out on an intercepting element.
      await combo.click({ timeout: 5000 });
      await expect(page.locator('[role="listbox"][id$=".MENU-listbox"]').first()).toBeVisible();

      // Close it by toggling the trigger, and wait for that to land. Tests in
      // this describe share one page, so an open dropdown left behind would be
      // toggled SHUT by the next test's click and its options never appear.
      await combo.click();
      await expect(combo).toHaveAttribute('aria-expanded', 'false');
    });

    test('the placeholder returns to the home page', async () => {
      page = await returnToDemoMenu(page, 15000);
      await expect(page.locator(HOME_INDICATOR)).toBeVisible();
    });
  });
}
