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

    test('children of the flex row share lines instead of stacking', async () => {
      const rows = await page.locator('#F1\\.INPUT').evaluate((el) => {
        const parent = el.getBoundingClientRect();
        return [...el.children].map((c) => {
          const r = c.getBoundingClientRect();
          return { id: (c as HTMLElement).id, left: Math.round(r.left), width: Math.round(r.width) };
        }).concat([{ id: '#parent', left: Math.round(parent.left), width: Math.round(parent.width) }]);
      });
      const parent = rows.pop()!;
      expect(rows.length).toBeGreaterThanOrEqual(minChildren);

      // The bug: every child was exactly as wide as its container.
      const fullWidth = rows.filter(c => c.width >= parent.width - 12);
      expect(fullWidth, `children as wide as the row: ${fullWidth.map(c => c.id).join(', ')}`)
        .toHaveLength(0);

      // ...so every one started a new flex line, all flush to the same left
      // edge — a column, in a flex-direction:row container. Compare lefts, not
      // tops: align-items:end gives same-line children different tops.
      const lefts = new Set(rows.map(c => c.left));
      expect(lefts.size, `all children flush left at ${[...lefts]}`).toBeGreaterThan(1);
    });

    test('the demo menu is visible and clickable', async () => {
      const combo = page.locator('[role="combobox"][id$=".MENU"]').first();
      await expect(combo).toBeVisible();
      // A real click, not just a visibility check: when the row clipped its
      // wrapped content the combo was still "visible" to Playwright but nothing
      // was there to hit, so .click() timed out on an intercepting element.
      await combo.click({ timeout: 5000 });
      await expect(page.locator('[role="listbox"][id$=".MENU-listbox"]').first()).toBeVisible();
      await page.keyboard.press('Escape');
    });

    test('the placeholder returns to the home page', async () => {
      page = await returnToDemoMenu(page, 15000);
      await expect(page.locator(HOME_INDICATOR)).toBeVisible();
    });
  });
}
