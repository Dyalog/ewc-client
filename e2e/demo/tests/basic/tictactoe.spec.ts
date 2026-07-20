import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// The Tic-Tac-Toe demo (../ewc/demo/DemoTicTacToe.aplf) builds a 3x3 board of
// clickable Labels F1.C1..F1.C9, a status Label F1.STATUS, a Reset push button
// F1.RESET, and a "Play vs Computer" checkbox F1.MODEPC. All wire to the single
// CBTicTacToe callback, which owns the game state and repaints the cells.
test.describe('DemoTicTacToe', () => {
  let browser: Browser;
  let page: Page;

  // Controls are located by their APL id (the '.' is CSS-escaped as '\\.')
  const cell = (n: number) => page.locator(`#F1\\.C${n}`);
  const status = () => page.locator('#F1\\.STATUS');
  const resetBtn = () => page.locator('#F1\\.RESET');
  const modeCheckbox = () => page.locator('#F1\\.MODEPC');
  const boardCells = () => page.locator('div[id^="F1.C"]');

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    // 'TicTacToe' must match the DEMOS.apla entry exactly; wait for the first cell
    page = await navigateToDemo(result.page, 'TicTacToe', '#F1\\.C1', 10000);
  });

  test.beforeEach(async () => {
    // Small delay before each test to let the EWC server settle
    await new Promise(r => setTimeout(r, 100));
  });

  // Tests share one EWC session (workers:1), so start each from a known state:
  // two-player mode, empty board, X to move.
  async function resetTwoPlayer() {
    await modeCheckbox().uncheck();  // ensure two-player (a mode change also resets)
    await resetBtn().click();        // guarantee an empty board
    await expect(status()).toHaveText('X to move');
  }

  test('board renders nine cells', async () => {
    await expect(boardCells()).toHaveCount(9);
  });

  test('two-player: X wins on the top row', async () => {
    await resetTwoPlayer();
    await cell(1).click();                       // X
    await expect(cell(1)).toHaveText('X');
    await cell(4).click();                       // O
    await expect(cell(4)).toHaveText('O');
    await cell(2).click();                       // X
    await cell(5).click();                       // O
    await cell(3).click();                       // X completes the 1-2-3 line
    await expect(cell(2)).toHaveText('X');
    await expect(cell(3)).toHaveText('X');
    await expect(status()).toHaveText('X wins!');
  });

  test('reset clears the board', async () => {
    await resetTwoPlayer();
    await cell(1).click();
    await expect(cell(1)).toHaveText('X');
    await resetBtn().click();
    await expect(cell(1)).toHaveText('');
    await expect(status()).toHaveText('X to move');
  });

  test('occupied cell is not overwritten', async () => {
    await resetTwoPlayer();
    await cell(1).click();                       // X
    await expect(cell(1)).toHaveText('X');
    await cell(1).click();                       // ignored — cell already taken
    await expect(cell(1)).toHaveText('X');
  });

  test('vs computer: O replies to the human move', async () => {
    await modeCheckbox().check();                // ensure vs-computer (a mode change also resets)
    await resetBtn().click();
    await expect(status()).toHaveText('X to move');
    await cell(1).click();                       // human plays X; computer answers with O
    await expect(cell(1)).toHaveText('X');
    await expect(boardCells().filter({ hasText: /^X$/ })).toHaveCount(1);
    await expect(boardCells().filter({ hasText: /^O$/ })).toHaveCount(1);
  });

  test('visual regression - tictactoe demo', async () => {
    await resetTwoPlayer();
    await expect(page).toHaveScreenshot('tictactoe-demo.png');
  });
});
