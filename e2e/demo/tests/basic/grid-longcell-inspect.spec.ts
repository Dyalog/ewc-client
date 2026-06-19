import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

test.describe('Grid bug DOM inspection', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    await result.page.setViewportSize({ width: 1600, height: 1000 });
    page = await navigateToDemo(result.page, 'GridLongCell', '.grid-table', 15000);
    await page.setViewportSize({ width: 1600, height: 1000 });
  });

  test('inspect every blue-bordered/blue-bg element near selected cell', async () => {
    const grid = page.locator('.grid').nth(0); // Grid A
    const cell = grid.locator('td.grid-cell[data-row="1"][data-col="1"]');
    await cell.click();
    await page.waitForTimeout(500);

    // Walk the DOM inside the cell and report every element + computed
    // border / background / outline style.
    const inspection = await cell.evaluate((cellEl) => {
      const out: any[] = [];
      const walk = (el: Element, depth: number) => {
        const cs = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        out.push({
          depth,
          tag: el.tagName.toLowerCase(),
          className: el.className,
          rect: { x: r.left, y: r.top, w: r.width, h: r.height },
          border: cs.border,
          borderTop: cs.borderTop,
          borderBottom: cs.borderBottom,
          borderLeft: cs.borderLeft,
          borderRight: cs.borderRight,
          outline: cs.outline,
          background: cs.background.includes('blue') ? cs.background : '(skipped)',
          textDecoration: cs.textDecoration,
          boxShadow: cs.boxShadow,
        });
        Array.from(el.children).forEach((c) => walk(c, depth + 1));
      };
      walk(cellEl, 0);
      return out;
    });

    console.log('\n=== DOM INSPECTION for selected cell ===');
    inspection.forEach((n) => {
      const indent = '  '.repeat(n.depth);
      console.log(`${indent}${n.tag}.${n.className} [${n.rect.w.toFixed(0)}x${n.rect.h.toFixed(0)} @ ${n.rect.x.toFixed(0)},${n.rect.y.toFixed(0)}]`);
      if (!n.border.startsWith('0px') && n.border !== '') console.log(`${indent}  border: ${n.border}`);
      if (!n.borderTop.startsWith('0px') && n.borderTop !== '') console.log(`${indent}  borderTop: ${n.borderTop}`);
      if (!n.borderBottom.startsWith('0px') && n.borderBottom !== '') console.log(`${indent}  borderBottom: ${n.borderBottom}`);
      if (!n.borderLeft.startsWith('0px') && n.borderLeft !== '') console.log(`${indent}  borderLeft: ${n.borderLeft}`);
      if (!n.borderRight.startsWith('0px') && n.borderRight !== '') console.log(`${indent}  borderRight: ${n.borderRight}`);
      if (!n.outline.startsWith('rgb(0, 0, 0) none 0px') && !n.outline.startsWith('0px')) console.log(`${indent}  outline: ${n.outline}`);
      if (n.boxShadow !== 'none') console.log(`${indent}  boxShadow: ${n.boxShadow}`);
      if (n.textDecoration !== 'none solid rgb(0, 0, 0)') console.log(`${indent}  textDecoration: ${n.textDecoration}`);
    });

    // Also check the children of the cell positioning
    const childRects = await cell.evaluate((cellEl) => {
      const cellRect = cellEl.getBoundingClientRect();
      const result: any[] = [];
      // Find anything with blue color anywhere
      cellEl.querySelectorAll('*').forEach((el) => {
        const cs = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        result.push({
          tag: el.tagName.toLowerCase(),
          className: (el as HTMLElement).className,
          relX: r.left - cellRect.left,
          relY: r.top - cellRect.top,
          w: r.width,
          h: r.height,
          parentW: cellRect.width,
          colorBlue: cs.color === 'rgb(0, 0, 255)' || cs.borderColor === 'rgb(0, 0, 255)',
        });
      });
      return result;
    });

    console.log('\n=== Child relative rects (cellWidth shown for ratio) ===');
    childRects.forEach((c) => {
      console.log(`${c.tag}.${c.className} -> ${c.w.toFixed(0)}x${c.h.toFixed(0)} at (${c.relX.toFixed(0)},${c.relY.toFixed(0)}) [parent ${c.parentW.toFixed(0)}px wide] blue=${c.colorBlue}`);
    });
  });
});
