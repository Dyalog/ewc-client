import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// The Bounce benchmark (../ewc/demo/DemoBounce.aplf) renders N balls as one
// vectorized Rect (one <svg id="F1.PF.BALLS-rN"> per ball). Positions and
// velocities are arithmetic formulas — no randomness — so the idle layout
// and +10/-10 rebuilds are fully deterministic. Read-only tests run first.
test.describe('DemoBounce', () => {
  let browser: Browser;
  let page: Page;

  const balls = () => page.locator('[id^="F1.PF.BALLS-r"]');
  const cnt = () => page.locator('#F1\\.CNT');
  const fps = () => page.locator('#F1\\.FPS');
  const runCheckbox = () => page.locator('#F1\\.RUN');

  const firstBallPos = async () =>
    page.locator('[id="F1.PF.BALLS-r1"]').evaluate(el => {
      const s = (el as HTMLElement).style;
      return `${s.left},${s.top}`;
    });

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Bounce', '#F1\\.PF', 10000);
  });

  test.beforeEach(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  test('idle renders 20 deterministic balls', async () => {
    await expect(balls()).toHaveCount(20);
    await expect(cnt()).toHaveText('Balls: 20');
    await expect(fps()).toHaveText('FPS: —');
  });

  test('visual regression - bounce idle', async () => {
    await expect(page).toHaveScreenshot('bounce-idle.png');
  });

  test('run animates the balls and reports FPS', async () => {
    const before = await firstBallPos();
    await runCheckbox().check();
    await expect
      .poll(async () => await firstBallPos(), { timeout: 3000 })
      .not.toBe(before);
    // Stats labels update every 15 ticks (~0.9s at 60ms)
    await expect(fps()).toHaveText(/FPS: \d/, { timeout: 5000 });
    await runCheckbox().uncheck();
    await page.waitForTimeout(400);
    const frozen = await firstBallPos();
    await page.waitForTimeout(500);
    expect(await firstBallPos()).toBe(frozen);
  });

  test('+10 and -10 scale the ball count', async () => {
    await page.locator('#F1\\.ADD').click();
    await expect(balls()).toHaveCount(30);
    await expect(cnt()).toHaveText('Balls: 30');
    await page.locator('#F1\\.SUB').click();
    await expect(balls()).toHaveCount(20);
    await expect(cnt()).toHaveText('Balls: 20');
  });

  test('reset restores 20 balls and clears stats', async () => {
    await page.locator('#F1\\.ADD').click();
    await expect(balls()).toHaveCount(30);
    await page.locator('#F1\\.RESET').click();
    await expect(balls()).toHaveCount(20);
    await expect(cnt()).toHaveText('Balls: 20');
    await expect(fps()).toHaveText('FPS: —');
  });
});
