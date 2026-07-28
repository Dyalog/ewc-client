import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// The Life demo (../ewc/demo/DemoLife.aplf) renders all alive cells as one
// vectorized Rect (F1.PF.CELLS) — each cell is an <svg id="F1.PF.CELLS-rN">.
// The initial pattern (glider + blinker + toad, 14 cells) is deterministic
// and the timer starts idle, so read-only tests MUST run before the
// mutating ones (there is no way back to the preset without reloading).
test.describe('DemoLife', () => {
  let browser: Browser;
  let page: Page;

  const cells = () => page.locator('[id^="F1.PF.CELLS-r"]');
  const gen = () => page.locator('#F1\\.GEN');
  const pop = () => page.locator('#F1\\.POP');
  const playfield = () => page.locator('#F1\\.PF');
  const runCheckbox = () => page.locator('#F1\\.RUN');

  // Order-independent position signature of all alive cells
  const cellSig = async () =>
    cells().evaluateAll(els =>
      els
        .map(el => `${(el as HTMLElement).style.left},${(el as HTMLElement).style.top}`)
        .sort()
        .join('|')
    );

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Life', '#F1\\.PF', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('initial pattern renders (glider + blinker + toad)', async () => {
    await expect(cells()).toHaveCount(14);
    await expect(gen()).toHaveText('Gen: 0');
    await expect(pop()).toHaveText('Pop: 14');
  });

  test('visual regression - life initial pattern', async () => {
    await expect(page).toHaveScreenshot('life-idle.png');
  });

  test('step advances one generation', async () => {
    const before = await cellSig();
    await page.locator('#F1\\.STEP').click();
    await expect(gen()).toHaveText('Gen: 1');
    // Glider, blinker and toad all conserve population across a step
    await expect(pop()).toHaveText('Pop: 14');
    expect(await cellSig()).not.toBe(before);
  });

  test('clicking a cell toggles it', async () => {
    // Far corner cell (row 30, col 40) — empty in the gen-1 pattern
    await playfield().click({ position: { x: 395, y: 295 } });
    await expect(pop()).toHaveText('Pop: 15');
    await expect(cells()).toHaveCount(15);
    await playfield().click({ position: { x: 395, y: 295 } });
    await expect(pop()).toHaveText('Pop: 14');
  });

  test('clear empties the board', async () => {
    await page.locator('#F1\\.CLEAR').click();
    await expect(pop()).toHaveText('Pop: 0');
    await expect(gen()).toHaveText('Gen: 0');
    // Only the zero-size guard rect remains
    await expect(cells()).toHaveCount(1);
  });

  test('random populates the board', async () => {
    await page.locator('#F1\\.RANDOM').click();
    await expect
      .poll(async () => await cells().count(), { timeout: 2000 })
      .toBeGreaterThan(10);
    await expect(gen()).toHaveText('Gen: 0');
  });

  test('run animates generations, un-checking stops', async () => {
    await runCheckbox().check();
    await expect
      .poll(async () => await gen().textContent(), { timeout: 3000 })
      .not.toBe('Gen: 0');
    await runCheckbox().uncheck();
    // Let any in-flight tick land, then the generation must hold still
    await page.waitForTimeout(400);
    const frozen = await gen().textContent();
    await page.waitForTimeout(500);
    expect(await gen().textContent()).toBe(frozen);
  });
});
