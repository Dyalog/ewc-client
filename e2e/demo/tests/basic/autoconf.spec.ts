import { test, expect, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// AutoConf (⎕WC resize-propagation) — integration test of the live reflow.
//
// Prerequisite: the backend must expose an "AutoConf" demo that builds the
// harness form (autoconf/BuildAutoConf.aplf): a Form with four SubForms
// AutoConf 0/1/2/3, each holding a `.cap` Label and `.tl`/`.br` corner Buttons,
// plus the "Grow boxes (WS-on-Size)" button (id F1.grow) wired to CBGrow.
//
// This codifies the behaviour verified by hand via chrome-devtools:
//   bit-1 (propagate): clicking "Grow boxes" WS-grows every box; the children of
//   AutoConf 2/3 reflow proportionally while AutoConf 0/1 keep theirs pinned.
// (bit-0 / accept is exercised by resizing the FORM — see the note at the end.)

// Read [x, y, w, h] of an element by id, or null if absent.
async function rect(page: Page, id: string): Promise<number[] | null> {
  return page.evaluate((elId) => {
    const el = document.getElementById(elId);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
  }, id);
}

const moved = (a: number[], b: number[]) =>
  Math.abs(a[0] - b[0]) > 2 || Math.abs(a[1] - b[1]) > 2 ||
  Math.abs(a[2] - b[2]) > 2 || Math.abs(a[3] - b[3]) > 2;

test.describe('DemoAutoConf', () => {
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    page = await navigateToDemo(result.page, 'AutoConf', '#F1', 10000);
  });

  test('form and all four AutoConf boxes render', async () => {
    await expect(page.locator('#F1')).toBeVisible();
    for (const s of ['S0', 'S1', 'S2', 'S3']) {
      await expect(page.locator(`#F1\\.${s}`)).toBeVisible();
      await expect(page.locator(`#F1\\.${s}\\.br`)).toBeVisible();
    }
  });

  test('Grow boxes: AutoConf 2/3 reflow their children, 0/1 keep them pinned', async () => {
    // Baseline corner positions before growing.
    const before: Record<string, number[]> = {};
    for (const s of ['S0', 'S1', 'S2', 'S3']) before[s] = (await rect(page, `F1.${s}.br`))!;

    // Trigger CBGrow (WS-on-Size grows every box to 230×410).
    await page.locator('#F1\\.grow').click();
    await page.waitForTimeout(300); // let the WS updates apply + reflow settle

    // Every box should have grown.
    for (const s of ['S0', 'S1', 'S2', 'S3']) {
      const box = (await rect(page, `F1.${s}`))!;
      expect(box[2]).toBeGreaterThan(380); // width grew toward 410
    }

    // AutoConf 0/1: child pinned in pixels (unchanged). 2/3: child reflowed.
    const after: Record<string, number[]> = {};
    for (const s of ['S0', 'S1', 'S2', 'S3']) after[s] = (await rect(page, `F1.${s}.br`))!;

    expect(moved(before.S0, after.S0), 'AutoConf 0 child should stay pinned').toBe(false);
    expect(moved(before.S1, after.S1), 'AutoConf 1 child should stay pinned').toBe(false);
    expect(moved(before.S2, after.S2), 'AutoConf 2 child should reflow').toBe(true);
    expect(moved(before.S3, after.S3), 'AutoConf 3 child should reflow').toBe(true);
  });

  // NOTE: bit-0 (accept parent resize) needs the FORM to change size — either a
  // window/viewport resize once the form tracks its window, or an app-driven WS
  // Size on F1. When a "Grow form" path exists, assert here that S1/S3 boxes
  // reflow while S0/S2 stay pinned (mirror of the test above, one level up).
});
