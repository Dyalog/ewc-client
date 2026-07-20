import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// The Flappy Bird demo (../ewc/demo/DemoFlappyBird.aplf) is a Timer-driven
// game: the bird is a SubForm (F1.PF.BIRD) whose inline style.top is pushed
// from APL each tick, all pipes are one vectorized Rect (F1.PF.PIPES), and
// the playfield SubForm (F1.PF) owns the tap-to-flap MouseDown. The timer is
// idle on load and after game over, so those states are stable to assert on.
const BIRD_START_TOP = 188; // FB_BY0 in DemoFlappyBird.aplf

test.describe('DemoFlappyBird', () => {
  let browser: Browser;
  let page: Page;

  const bird = () => page.locator('#F1\\.PF\\.BIRD');
  const playfield = () => page.locator('#F1\\.PF');
  const status = () => page.locator('#F1\\.STATUS');
  const score = () => page.locator('#F1\\.SCORE');
  const flapBtn = () => page.locator('#F1\\.FLAP');
  const resetBtn = () => page.locator('#F1\\.RESET');

  const birdTop = async () =>
    parseFloat((await bird().evaluate(el => (el as HTMLElement).style.top)) || 'NaN');

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'FlappyBird', '#F1\\.PF', 10000);
  });

  test.beforeEach(async () => {
    // Small delay before each test to let the EWC server settle
    await new Promise(r => setTimeout(r, 100));
  });

  // Tests share one EWC session (workers:1) — always start from idle.
  async function resetIdle() {
    await resetBtn().click();
    await expect(status()).toHaveText('Click to start');
    await expect(score()).toHaveText('Score: 0');
  }

  test('idle state renders and is static', async () => {
    await resetIdle();
    await expect(bird()).toBeVisible();
    expect(await birdTop()).toBe(BIRD_START_TOP);
    // Timer is idle: the bird must not move on its own
    await page.waitForTimeout(400);
    expect(await birdTop()).toBe(BIRD_START_TOP);
  });

  test('flap button starts the game and the bird moves', async () => {
    await resetIdle();
    await flapBtn().click();
    await expect(status()).toHaveText('Flap!');
    await expect
      .poll(async () => await birdTop(), { timeout: 2000 })
      .not.toBe(BIRD_START_TOP);
  });

  test('tapping the playfield also starts the game', async () => {
    await resetIdle();
    await playfield().click({ position: { x: 200, y: 90 } }); // empty sky
    await expect(status()).toHaveText('Flap!');
  });

  test('with no input the bird falls to game over', async () => {
    await resetIdle();
    await flapBtn().click();
    await expect(status()).toHaveText('Flap!');
    // One flap, then gravity: the bird hits the ground in about 2 seconds
    await expect(status()).toContainText('Game Over', { timeout: 6000 });
    // Timer stopped: the bird must hold its final position
    const finalTop = await birdTop();
    await page.waitForTimeout(400);
    expect(await birdTop()).toBe(finalTop);
  });

  test('clicking after game over restarts immediately', async () => {
    await resetIdle();
    await flapBtn().click();
    await expect(status()).toContainText('Game Over', { timeout: 6000 });
    await playfield().click({ position: { x: 200, y: 90 } });
    await expect(status()).toHaveText('Flap!');
    await expect(score()).toHaveText('Score: 0');
    await resetBtn().click(); // stop the timer for the next test
  });

  test('reset returns to the deterministic idle state', async () => {
    await resetIdle();
    await flapBtn().click();
    await expect(status()).toHaveText('Flap!');
    await resetBtn().click();
    await expect(status()).toHaveText('Click to start');
    await expect(score()).toHaveText('Score: 0');
    await expect
      .poll(async () => await birdTop(), { timeout: 2000 })
      .toBe(BIRD_START_TOP);
  });

  test('visual regression - flappybird idle', async () => {
    await resetIdle();
    await expect(page).toHaveScreenshot('flappybird-idle.png');
  });
});
