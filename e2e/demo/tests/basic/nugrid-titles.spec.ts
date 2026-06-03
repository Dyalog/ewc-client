import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// NuGrid TitleWidth / TitleHeight follow ⎕WC semantics:
//   unset / negative / empty → auto-size to fit content
//   0                         → hidden
//   positive                  → fixed pixels
test.describe('DemoNuGridTitles - Title auto-sizing', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'NuGridTitles', '.nugrid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  // Read the rendered row-title column width on a grid (the corner cell drives
  // the column under table-layout: fixed).
  const cornerWidth = async (gridId: string) => {
    const corner = page.locator(`#${gridId.replace(/\./g, '\\.')} .nugrid-corner-cell`);
    return await corner.evaluate((el) => el.getBoundingClientRect().width);
  };
  const headerRowHeight = async (gridId: string) => {
    const row = page.locator(`#${gridId.replace(/\./g, '\\.')} .nugrid-header-row`);
    return await row.evaluate((el) => el.getBoundingClientRect().height);
  };

  test('all four grids render', async () => {
    await expect(page.locator('#F1\\.G1')).toBeVisible();
    await expect(page.locator('#F1\\.G2')).toBeVisible();
    await expect(page.locator('#F1\\.G3')).toBeVisible();
    await expect(page.locator('#F1\\.G4')).toBeVisible();
  });

  // Guard against APL strand-of-single-chars trap: `'A' 'B' 'C'` collapses
  // to 'ABC' and would render as a single row title. We use `,¨'ABC'` in the
  // demo to keep the three titles separate.
  test('shortRows render as three separate row titles, not one', async () => {
    const headers = page.locator('#F1\\.G1 .nugrid-row-header');
    await expect(headers).toHaveCount(3);
    await expect(headers.nth(0)).toHaveText('A');
    await expect(headers.nth(1)).toHaveText('B');
    await expect(headers.nth(2)).toHaveText('C');
  });

  // Guard against under-measuring the column: with `table-layout: fixed`,
  // `width` includes padding/border, so the auto width must leave room for
  // them — otherwise CSS truncates "A" to "A…".
  test('short row titles are not truncated to an ellipsis', async () => {
    const headers = page.locator('#F1\\.G1 .nugrid-row-header');
    for (let i = 0; i < 3; i++) {
      const h = headers.nth(i);
      const truncated = await h.evaluate(
        (el) => el.scrollWidth > el.clientWidth + 1, // +1 for sub-pixel slop
      );
      expect(truncated).toBe(false);
    }
  });

  test('auto TitleWidth: longer row titles produce a wider title column', async () => {
    const shortW = await cornerWidth('F1.G1');
    const longW = await cornerWidth('F1.G2');
    // "Long row label three" is longer than "A"/"B"/"C". The 100px floor
    // pumps the short case up to 100, narrowing the natural gap — still
    // assert a meaningful (not sub-pixel) difference.
    expect(longW).toBeGreaterThan(shortW);
    expect(longW - shortW).toBeGreaterThan(20);
  });

  test('fixed TitleWidth: explicit pixel value is honored exactly', async () => {
    // G3 sets ('TitleWidth' 100) - corner AND row-title cells must match.
    const w = await cornerWidth('F1.G3');
    expect(Math.round(w)).toBe(100);
    // Also check a data-row's row-header cell — under table-layout: fixed
    // only the first row sets the column width, but the others should
    // visually be the same column width.
    const rowHeader = page.locator('#F1\\.G3 .nugrid-row-header').first();
    const rh = await rowHeader.evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.round(rh)).toBe(100);
  });

  test('fixed TitleHeight: explicit pixel value is honored exactly', async () => {
    // G3 sets ('TitleHeight' 24).
    const h = await headerRowHeight('F1.G3');
    expect(Math.round(h)).toBe(24);
  });

  test('auto TitleHeight: multi-line ColTitles produce a taller title row', async () => {
    const singleH = await headerRowHeight('F1.G1');    // single-line titles
    const multiH = await headerRowHeight('F1.G4');     // 2-line array titles
    expect(multiH).toBeGreaterThan(singleH);
  });

  test('auto TitleWidth produces a sane minimum (not zero, not absurdly large)', async () => {
    const w = await cornerWidth('F1.G1');
    expect(w).toBeGreaterThan(10);   // not collapsed
    expect(w).toBeLessThan(200);     // floored at 100; not blown out further
  });

  // Col titles themselves shouldn't truncate to "Col A…" — the column must
  // be wide enough for the title text plus padding/border.
  test('col titles are not truncated to an ellipsis', async () => {
    const headers = page.locator('#F1\\.G1 .nugrid-col-header');
    const count = await headers.count();
    for (let i = 0; i < count; i++) {
      const h = headers.nth(i);
      const truncated = await h.evaluate(
        (el) => el.scrollWidth > el.clientWidth + 1,
      );
      expect(truncated).toBe(false);
    }
  });

  // ─── G5: mixed-content sizing scenarios ─────────────────────────────────
  // Col 1 has a long col title and short cell data; columns 2/3 have short
  // titles and long cell data (column 3's long values are below the fold).

  test('G5: long col title drives column 1 wider than columns 2/3', async () => {
    const headers = page.locator('#F1\\.G5 .nugrid-col-header');
    const w1 = await headers.nth(0).evaluate((el) => el.getBoundingClientRect().width);
    const w2 = await headers.nth(1).evaluate((el) => el.getBoundingClientRect().width);
    const w3 = await headers.nth(2).evaluate((el) => el.getBoundingClientRect().width);
    expect(w1).toBeGreaterThan(w2 + 50);
    expect(w1).toBeGreaterThan(w3 + 50);
  });

  test('G5: long cell content overflows with ellipsis (cells are not measured)', async () => {
    // Row 1, column 2 has a long string. Since CellWidths auto-sizes from
    // col TITLES only (not cell content), the cell text should overflow.
    const cell = page.locator('#F1\\.G5 .nugrid-cell[data-row="1"][data-col="2"]');
    const truncated = await cell.evaluate(
      (el) => el.scrollWidth > el.clientWidth + 1,
    );
    expect(truncated).toBe(true);
  });

  test('G5: grid container is vertically scrollable (more rows than fit)', async () => {
    const container = page.locator('#F1\\.G5 .nugrid-container');
    const { client, scroll } = await container.evaluate((el) => ({
      client: el.clientHeight,
      scroll: el.scrollHeight,
    }));
    expect(scroll).toBeGreaterThan(client);
  });

  test('G5: long cell content in scrolled-out row exists in DOM', async () => {
    // Row 8 holds a long value in column 3 that's below the initial fold.
    // We don't need to actually scroll for the test — Playwright can read it.
    const cell = page.locator('#F1\\.G5 .nugrid-cell[data-row="8"][data-col="3"]');
    await expect(cell).toContainText('only appears after a scroll');
  });

  // Catches the strand-of-singles trap: `'c' 's' 'z'` would collapse to 'csz'
  // and put the 3-char string into a single cell. With (⊂'c')(⊂'s')(⊂'z')
  // each cell holds exactly one character.
  test('G5: single-char cells render one character per cell, not concatenated', async () => {
    const row3col1 = page.locator('#F1\\.G5 .nugrid-cell[data-row="3"][data-col="1"]');
    const row3col2 = page.locator('#F1\\.G5 .nugrid-cell[data-row="3"][data-col="2"]');
    const row3col3 = page.locator('#F1\\.G5 .nugrid-cell[data-row="3"][data-col="3"]');
    await expect(row3col1).toHaveText('c');
    await expect(row3col2).toHaveText('s');
    await expect(row3col3).toHaveText('z');
  });

  // ─── G6 / G7: TitleWidth/Height = 0 fully unmounts the title band ──────
  // ⎕WC behavior: 0 hides the band entirely (no DOM at all), unlike just
  // collapsing to zero height/width which would leave a 2px border ghost.

  test('G6: TitleHeight 0 unmounts the col-title row (no thead)', async () => {
    await expect(page.locator('#F1\\.G6')).toBeVisible();
    // ColTitles are set but TitleHeight 0 must suppress the thead entirely.
    const thead = page.locator('#F1\\.G6 thead');
    await expect(thead).toHaveCount(0);
    const colHeaders = page.locator('#F1\\.G6 .nugrid-col-header');
    await expect(colHeaders).toHaveCount(0);
  });

  test('G7: TitleWidth 0 unmounts the row-title column (no row headers)', async () => {
    await expect(page.locator('#F1\\.G7')).toBeVisible();
    // RowTitles are set but TitleWidth 0 must suppress all row-header cells
    // AND the corner cell.
    const rowHeaders = page.locator('#F1\\.G7 .nugrid-row-header');
    await expect(rowHeaders).toHaveCount(0);
    const corner = page.locator('#F1\\.G7 .nugrid-corner-cell');
    await expect(corner).toHaveCount(0);
  });

  // ─── G8 / G9 / G10: missing titles → Excel-style auto-labels ──────────
  // Matches legacy Grid: ColTitles missing → A, B, C…; RowTitles missing →
  // 1, 2, 3… Only TitleWidth/Height = 0 actually suppresses the band.

  test('G8: omitting ColTitles defaults to A, B', async () => {
    const colHeaders = page.locator('#F1\\.G8 .nugrid-col-header');
    await expect(colHeaders).toHaveCount(2);
    await expect(colHeaders.nth(0)).toHaveText('A');
    await expect(colHeaders.nth(1)).toHaveText('B');
  });

  test('G9: omitting RowTitles defaults to 1, 2, 3', async () => {
    const rowHeaders = page.locator('#F1\\.G9 .nugrid-row-header');
    await expect(rowHeaders).toHaveCount(3);
    await expect(rowHeaders.nth(0)).toHaveText('1');
    await expect(rowHeaders.nth(1)).toHaveText('2');
    await expect(rowHeaders.nth(2)).toHaveText('3');
  });

  test('G10: Values only — both bands get Excel-style defaults', async () => {
    await expect(page.locator('#F1\\.G10')).toBeVisible();
    // Data cells render.
    await expect(page.locator('#F1\\.G10 .nugrid-cell')).toHaveCount(6); // 3×2
    await expect(
      page.locator('#F1\\.G10 .nugrid-cell[data-row="1"][data-col="1"]'),
    ).toHaveText('Alpha');
    // Col headers: A, B
    const colHeaders = page.locator('#F1\\.G10 .nugrid-col-header');
    await expect(colHeaders).toHaveCount(2);
    await expect(colHeaders.nth(0)).toHaveText('A');
    await expect(colHeaders.nth(1)).toHaveText('B');
    // Row headers: 1, 2, 3
    const rowHeaders = page.locator('#F1\\.G10 .nugrid-row-header');
    await expect(rowHeaders).toHaveCount(3);
    await expect(rowHeaders.nth(0)).toHaveText('1');
    // Corner cell present (since both bands exist).
    await expect(page.locator('#F1\\.G10 .nugrid-corner-cell')).toHaveCount(1);
  });

  // ─── Auto-floor: short content shouldn't shrink below FALLBACK_* ──────

  test('auto TitleWidth never shrinks below the FALLBACK floor (100px)', async () => {
    // G1 has short titles A/B/C — measured text alone is ~26px. Floor lifts
    // it to 100 to match the legacy EWC Grid's hardcoded default.
    const w = await cornerWidth('F1.G1');
    expect(w).toBeGreaterThanOrEqual(100);
  });

  // Same floor applies to data column widths via auto CellWidths.
  test('auto CellWidths also never shrink below the FALLBACK floor (100px)', async () => {
    // G1 col headers "Col A" / "Col B" are ~38px text. Floor lifts them to 100.
    const colA = page.locator('#F1\\.G1 .nugrid-col-header').nth(0);
    const w = await colA.evaluate((el) => el.getBoundingClientRect().width);
    expect(w).toBeGreaterThanOrEqual(100);
  });
});
