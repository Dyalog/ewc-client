import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// Regression guard for issue #471 ("Edit cursor keeps jumping").
//
// An Edit that registers a KeyPress callback used to cancel the browser's own
// insertion (e.preventDefault) and inject the character itself once APL replied
// EC{Proceed:1}. Injecting it that late put it in React's hands, and React
// re-applies the selection it captured *before* it mutates a controlled input —
// so the caret landed behind the character just typed: "12|" + "2" => "12|2".
//
// The fix lets the browser type: the caret is never ours to manage, and a
// Proceed:0 veto rewinds a snapshot taken at keydown. These tests pin the
// caret, so a return to any inject-after-the-round-trip scheme fails here.
//
// DemoInput is the vehicle: F1.C1 is a standalone text Edit registering
// ('Change' 'KeyPress' 'Select') on CBInput, whose callback only refreshes a
// small summary grid — no side effects that could mask a caret bug.
test.describe('Edit KeyPress - caret stays with the typed character (#471)', () => {
  let browser: Browser;
  let page: Page;

  const TEXT_EDIT = '#F1\\.C1';      // Edit '' — plain text, KeyPress registered
  const NUMERIC_EDIT = '#F1\\.C2';   // Edit '3.14' — FieldType Numeric, same events

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Input', '#F1\\.C1', 10000);
  });

  // value + caret in one read, so the two can never be sampled a keystroke apart
  const readField = (page: Page, selector: string) =>
    page.locator(selector).evaluate((el: HTMLInputElement) => ({
      value: el.value,
      start: el.selectionStart,
      end: el.selectionEnd,
    }));

  // Put the field into a known state without generating KeyPress events:
  // fill() sets the value through an input event only, no keydown.
  const seed = async (selector: string, value: string, caret: number) => {
    const field = page.locator(selector);
    await field.fill(value);
    await field.evaluate((el: HTMLInputElement, at: number) => {
      el.focus();
      el.setSelectionRange(at, at);
    }, caret);
  };

  // The mechanism guard. Everything below asserts the caret, but whether a
  // misplaced caret actually shows up depends on whether our fix-up wins a race
  // against React's commit — against a server on the same machine it usually
  // does, so those tests can pass even on the broken build. This one cannot: it
  // asserts that a printable keystroke reaches the browser's default action at
  // all. Reintroduce the preventDefault-and-inject-later scheme and it fails
  // immediately, wherever it runs.
  //
  // The listener goes on `document`: React attaches its handlers at the root
  // container, so a listener on the input itself would run first and always see
  // defaultPrevented === false.
  test('a printable keystroke is not cancelled - the browser types it, not us', async () => {
    await seed(TEXT_EDIT, 'ab', 2);
    await page.evaluate(() => {
      (window as Window & { __cancelled?: boolean | null }).__cancelled = null;
      document.addEventListener('keydown', (e) => {
        if ((e.target as HTMLElement)?.id === 'F1.C1' && e.key.length === 1) {
          (window as Window & { __cancelled?: boolean | null }).__cancelled = e.defaultPrevented;
        }
      });
    });

    await page.locator(TEXT_EDIT).press('c');

    expect(await page.evaluate(() =>
      (window as Window & { __cancelled?: boolean | null }).__cancelled)).toBe(false);
  });

  test('typing at the end leaves the caret after the character', async () => {
    await seed(TEXT_EDIT, 'ab', 2);
    await page.locator(TEXT_EDIT).press('c');

    // Poll rather than sleep: a late EC must not be able to drag the caret back.
    await expect
      .poll(async () => JSON.stringify(await readField(page, TEXT_EDIT)), { timeout: 4000 })
      .toBe(JSON.stringify({ value: 'abc', start: 3, end: 3 }));
  });

  test('typing mid-string inserts at the caret and leaves it after the character', async () => {
    await seed(TEXT_EDIT, 'ac', 1);
    await page.locator(TEXT_EDIT).press('b');

    await expect
      .poll(async () => JSON.stringify(await readField(page, TEXT_EDIT)), { timeout: 4000 })
      .toBe(JSON.stringify({ value: 'abc', start: 2, end: 2 }));
  });

  test('typing over a selection replaces it', async () => {
    await seed(TEXT_EDIT, 'axc', 0);
    await page.locator(TEXT_EDIT).evaluate((el: HTMLInputElement) => el.setSelectionRange(1, 2));
    await page.locator(TEXT_EDIT).press('b');

    await expect
      .poll(async () => JSON.stringify(await readField(page, TEXT_EDIT)), { timeout: 4000 })
      .toBe(JSON.stringify({ value: 'abc', start: 2, end: 2 }));
  });

  // The old mechanism parked the outstanding keystroke in a single ref, so a
  // second keydown before the first EC overwrote it and the first character was
  // silently dropped. Typing with no delay reliably beats the round-trip.
  test('typing faster than the server round-trip drops no characters', async () => {
    await seed(TEXT_EDIT, '', 0);
    await page.locator(TEXT_EDIT).pressSequentially('abcdefgh', { delay: 0 });

    await expect
      .poll(async () => JSON.stringify(await readField(page, TEXT_EDIT)), { timeout: 5000 })
      .toBe(JSON.stringify({ value: 'abcdefgh', start: 8, end: 8 }));
  });

  test('Backspace deletes one character and leaves the caret in its place', async () => {
    await seed(TEXT_EDIT, 'abc', 3);
    await page.locator(TEXT_EDIT).press('Backspace');

    await expect
      .poll(async () => JSON.stringify(await readField(page, TEXT_EDIT)), { timeout: 4000 })
      .toBe(JSON.stringify({ value: 'ab', start: 2, end: 2 }));
  });

  test('Delete removes the character to the right, caret unmoved', async () => {
    await seed(TEXT_EDIT, 'abc', 1);
    await page.locator(TEXT_EDIT).press('Delete');

    await expect
      .poll(async () => JSON.stringify(await readField(page, TEXT_EDIT)), { timeout: 4000 })
      .toBe(JSON.stringify({ value: 'ac', start: 1, end: 1 }));
  });

  // Arrow keys only: Home/End are OS-dependent in a text input (Chromium on
  // macOS leaves the caret where it is for End), so they cannot be asserted the
  // same way on a dev machine and on the Linux CI.
  test('arrow keys move the caret without changing the text', async () => {
    await seed(TEXT_EDIT, 'abc', 3);
    const field = page.locator(TEXT_EDIT);

    await field.press('ArrowLeft');
    await expect.poll(async () => (await readField(page, TEXT_EDIT)).start, { timeout: 4000 }).toBe(2);

    await field.press('ArrowLeft');
    await expect.poll(async () => (await readField(page, TEXT_EDIT)).start, { timeout: 4000 }).toBe(1);

    await field.press('ArrowRight');
    await expect.poll(async () => (await readField(page, TEXT_EDIT)).start, { timeout: 4000 }).toBe(2);

    expect((await readField(page, TEXT_EDIT)).value).toBe('abc');
  });

  test('a Numeric Edit keeps the caret with the typed digit', async () => {
    await seed(NUMERIC_EDIT, '31', 2);
    await page.locator(NUMERIC_EDIT).press('4');

    await expect
      .poll(async () => JSON.stringify(await readField(page, NUMERIC_EDIT)), { timeout: 4000 })
      .toBe(JSON.stringify({ value: '314', start: 3, end: 3 }));
  });

  // CBInput reads Text/Value back with ⎕WG and writes them into F1.GRID, so the
  // summary row is proof the data model tracked the DOM rather than diverging
  // from it. The model write is deliberately held back while a keystroke awaits
  // its verdict, so poll for it to catch up.
  test('the typed text reaches the data model that ⎕WG reads', async () => {
    await seed(TEXT_EDIT, 'zz', 2);
    await page.locator(TEXT_EDIT).press('q');

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const el = document.getElementById('F1.C1') as HTMLInputElement | null;
          return el ? el.value : null;
        }), { timeout: 4000 })
      .toBe('zzq');

    // The first grid row summarises the Text control: Value, Text, Last.
    const firstRow = page.locator('.grid-row').first();
    await expect.poll(async () => (await firstRow.textContent()) ?? '', { timeout: 5000 })
      .toContain('zzq');
  });
});

// The reported reproduction, on the demo named in the issue. F1.TableSize is a
// Numeric Edit whose KeyPress/Change callback rebuilds F1.Table as an n x n
// outer product, so keep the typed number small — a stray extra digit would ask
// APL to build a grid with millions of cells.
test.describe('Edit demo - F1.TableSize caret (#471 reproduction)', () => {
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    page = await navigateToDemo(result.page, 'Edit', '#F1\\.TableSize', 15000);
  });

  test('typing a digit at the end leaves the caret after it', async () => {
    const field = page.locator('#F1\\.TableSize');
    await field.fill('1');
    await field.evaluate((el: HTMLInputElement) => {
      el.focus();
      el.setSelectionRange(1, 1);
    });

    await field.press('2');

    await expect
      .poll(async () =>
        field.evaluate((el: HTMLInputElement) => `${el.value}|${el.selectionStart}`),
        { timeout: 4000 })
      .toBe('12|2');

    // Leave the field settled before this spec ends. Blurring fires Change, and
    // EWCUpdate answers it by reading F1.TableSize back with ⎕WG; if that is
    // still in flight when the next spec switches demos, the ⎕WG has nothing
    // left to read and the interpreter suspends on a VALUE ERROR. Nothing
    // observable marks "the round-trip finished" — Change delivery here goes
    // through the legacy prevFocused path and does not always fire at all — so
    // this is a bounded wait for quiescence, the same tactic waitForDemoLoad
    // uses after a demo switch.
    await field.press('Tab');
    await expect.poll(async () =>
      page.evaluate(() => document.activeElement?.id), { timeout: 4000 }).not.toBe('F1.TableSize');
    await page.waitForTimeout(800);
  });
});

// The EditKeyPress demo (../ewc/demo/DemoEditKeyPress.aplf + CBEditKeyPress.aplf)
// exists for the paths no other demo reaches. Its callback vetoes non-digits in
// one field, reports what ⎕WG saw from inside the callback, and drives ⎕WS
// 'SelText' / ⎕NQ 'KeyPress' at the other field from buttons.
test.describe('EditKeyPress demo - veto, WG timing, WS SelText, NQ', () => {
  let page: Page;

  const DIGITS = '#F1\\.DIGITS';   // vetoes anything that is not a digit
  const FREE = '#F1\\.FREE';       // accepts everything; target of the buttons

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    page = await navigateToDemo(result.page, 'EditKeyPress', DIGITS, 15000);
  });

  const field = (selector: string) =>
    page.locator(selector).evaluate((el: HTMLInputElement) =>
      ({ value: el.value, start: el.selectionStart, end: el.selectionEnd }));

  // Newest line first — CBEditKeyPress prepends.
  const newestLogLine = async () =>
    ((await page.locator('#F1\\.LOG').textContent()) ?? '').split('\n')[0] ?? '';

  const seed = async (selector: string, value: string, caret: number) => {
    await page.locator(selector).fill(value);
    await page.locator(selector).evaluate((el: HTMLInputElement, at: number) => {
      el.focus();
      el.setSelectionRange(at, at);
    }, caret);
  };

  test('an accepted key lands, with the caret after it', async () => {
    await seed(DIGITS, '12', 2);
    await page.locator(DIGITS).press('3');

    await expect.poll(async () => JSON.stringify(await field(DIGITS)), { timeout: 4000 })
      .toBe(JSON.stringify({ value: '123', start: 3, end: 3 }));
    await expect.poll(newestLogLine, { timeout: 4000 }).toContain('ok');
  });

  // The point of the whole snapshot/rewind mechanism: APL can still refuse a key.
  test('a vetoed key never sticks', async () => {
    await seed(DIGITS, '12', 2);
    await page.locator(DIGITS).press('a');

    await expect.poll(newestLogLine, { timeout: 4000 }).toContain('VETO');
    // Poll for the log first so the round-trip is definitely over, then assert
    // the field is untouched — value and caret both.
    expect(await field(DIGITS)).toEqual({ value: '12', start: 2, end: 2 });
  });

  test('the veto is not applied to input codes - Backspace still deletes', async () => {
    await seed(DIGITS, '123', 3);
    await page.locator(DIGITS).press('Backspace');

    await expect.poll(async () => JSON.stringify(await field(DIGITS)), { timeout: 4000 })
      .toBe(JSON.stringify({ value: '12', start: 2, end: 2 }));
    // The field updates natively and instantly now, so the round-trip is still
    // in the air at this point — poll the log rather than reading it once.
    await expect.poll(newestLogLine, { timeout: 4000 }).toContain('KeyPress DB');
  });

  // ⎕WC has not applied the keystroke when the callback runs, so a ⎕WG inside it
  // must report the field as it was before the key. The client keeps that true by
  // holding the model write back until the verdict lands.
  test('WG inside the callback reports the pre-keystroke Text', async () => {
    await seed(DIGITS, '45', 2);
    await page.locator(DIGITS).press('6');

    await expect.poll(newestLogLine, { timeout: 4000 }).toContain('KeyPress 6');
    expect(await newestLogLine()).toContain('WG Text="45"');
    // ...and the model catches up once the verdict has landed.
    await page.locator('#F1\\.SHOW').click();
    await expect.poll(newestLogLine, { timeout: 4000 }).toContain('DIGITS Text="456"');
  });

  test('WS SelText moves the caret of a standalone Edit', async () => {
    await seed(FREE, 'abcdef', 0);
    await page.locator('#F1\\.SETSEL').click();

    // SelText is 1-indexed in APL, so (3 5) is offsets 2..4 in the DOM.
    await expect.poll(async () => JSON.stringify(await field(FREE)), { timeout: 4000 })
      .toBe(JSON.stringify({ value: 'abcdef', start: 2, end: 4 }));
  });

  test('NQ of a printable KeyPress inserts the character', async () => {
    await seed(FREE, 'abcdef', 6);
    await page.locator('#F1\\.NQCHAR').click();

    await expect.poll(async () => JSON.stringify(await field(FREE)), { timeout: 4000 })
      .toBe(JSON.stringify({ value: 'abcdefZ', start: 7, end: 7 }));
  });

  test('NQ of an input code runs its handler - DB deletes backwards', async () => {
    await seed(FREE, 'abcdefZ', 7);
    await page.locator('#F1\\.NQBS').click();

    await expect.poll(async () => (await field(FREE)).value, { timeout: 4000 }).toBe('abcdef');
  });
});
