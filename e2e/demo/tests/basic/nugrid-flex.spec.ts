import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

test.describe('DemoNuGridFlex - Flex Row', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'NuGridFlex', '.nugrid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('row flex grids have relative positioning', async () => {
    const g1 = page.locator('#F1\\.ROW\\.G1');
    const g2 = page.locator('#F1\\.ROW\\.G2');

    const pos1 = await g1.evaluate(el => getComputedStyle(el).position);
    const pos2 = await g2.evaluate(el => getComputedStyle(el).position);

    expect(pos1).toBe('relative');
    expect(pos2).toBe('relative');
  });

  test('row flex grids are side by side', async () => {
    const g1 = page.locator('#F1\\.ROW\\.G1');
    const g2 = page.locator('#F1\\.ROW\\.G2');

    const box1 = await g1.boundingBox();
    const box2 = await g2.boundingBox();

    // Both grids should be at roughly the same vertical position (same row)
    expect(Math.abs(box1!.y - box2!.y)).toBeLessThan(5);

    // Second grid should be to the right of the first
    expect(box2!.x).toBeGreaterThan(box1!.x + box1!.width - 5);
  });

  test('row flex grids respect Size', async () => {
    const g1 = page.locator('#F1\\.ROW\\.G1');
    const box = await g1.boundingBox();

    expect(box!.width).toBe(253);
    expect(box!.height).toBe(70);
  });

  test('row flex grids render correct data', async () => {
    const g1 = page.locator('#F1\\.ROW\\.G1');
    const colHeaders = g1.locator('.nugrid-col-header');
    await expect(colHeaders).toHaveCount(3);

    const headerTexts = await colHeaders.allTextContents();
    expect(headerTexts).toEqual(['Name', 'Qty', 'Grade']);

    const cells = g1.locator('.nugrid-cell');
    await expect(cells).toHaveCount(9);
  });
});

test.describe('DemoNuGridFlex - Flex Column', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'NuGridFlex', '.nugrid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('column flex grid has relative positioning', async () => {
    const grid = page.locator('#F1\\.COL\\.G');
    const position = await grid.evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('relative');
  });

  test('column flex grid flows below the label', async () => {
    const label = page.locator('#F1\\.COL\\.L');
    const grid = page.locator('#F1\\.COL\\.G');

    const labelBox = await label.boundingBox();
    const gridBox = await grid.boundingBox();

    // Grid should be below the label in a column flex layout
    expect(gridBox!.y).toBeGreaterThan(labelBox!.y);
  });

  test('column flex grid respects Size', async () => {
    const grid = page.locator('#F1\\.COL\\.G');
    const box = await grid.boundingBox();

    expect(box!.width).toBe(253);
    expect(box!.height).toBe(70);
  });

  test('column flex grid renders correct data', async () => {
    const grid = page.locator('#F1\\.COL\\.G');
    const colHeaders = grid.locator('.nugrid-col-header');
    await expect(colHeaders).toHaveCount(3);

    const cells = grid.locator('.nugrid-cell');
    await expect(cells).toHaveCount(9);
  });
});

test.describe('DemoNuGridFlex - Fixed Positioning', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'NuGridFlex', '.nugrid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('fixed grid has absolute positioning', async () => {
    const grid = page.locator('#F1\\.FIXED\\.G');
    const position = await grid.evaluate(el => getComputedStyle(el).position);
    expect(position).toBe('absolute');
  });

  test('fixed grid respects Posn', async () => {
    const grid = page.locator('#F1\\.FIXED\\.G');

    const top = await grid.evaluate(el => getComputedStyle(el).top);
    const left = await grid.evaluate(el => getComputedStyle(el).left);

    expect(top).toBe('40px');
    expect(left).toBe('20px');
  });

  test('fixed grid respects Size', async () => {
    const grid = page.locator('#F1\\.FIXED\\.G');
    const box = await grid.boundingBox();

    expect(box!.width).toBe(253);
    expect(box!.height).toBe(70);
  });

  test('fixed grid renders correct data', async () => {
    const grid = page.locator('#F1\\.FIXED\\.G');
    const colHeaders = grid.locator('.nugrid-col-header');
    await expect(colHeaders).toHaveCount(3);

    const cells = grid.locator('.nugrid-cell');
    await expect(cells).toHaveCount(9);
  });
});

test.describe('DemoNuGridFlex - All Grids', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'NuGridFlex', '.nugrid-table', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('all four grids are visible', async () => {
    const grids = page.locator('.nugrid');
    await expect(grids).toHaveCount(4);

    for (let i = 0; i < 4; i++) {
      await expect(grids.nth(i)).toBeVisible();
    }
  });

  test('flex grids do not overlap the fixed section', async () => {
    const rowSubform = page.locator('#F1\\.ROW');
    const colSubform = page.locator('#F1\\.COL');
    const fixedSubform = page.locator('#F1\\.FIXED');

    const rowBox = await rowSubform.boundingBox();
    const colBox = await colSubform.boundingBox();
    const fixedBox = await fixedSubform.boundingBox();

    // Each section should be below the previous one (flex fill layout)
    expect(colBox!.y).toBeGreaterThanOrEqual(rowBox!.y + rowBox!.height - 1);
    expect(fixedBox!.y).toBeGreaterThanOrEqual(colBox!.y + colBox!.height - 1);
  });
});
