import { test, expect, Browser } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { openInjectablePage } from '../helpers/ws-inject';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);
const INDICATOR = '#F1\\.SF\\.EDIT1';

// Regression: EX must remove an Edit, including one that overlaps a sibling.
//
// Background — a customer app created two Edits at the SAME Posn (an enabled
// field and a disabled "display" twin) and pruned whichever the dialog didn't
// need. It pruned with ⎕EX rather than the eEX cover, so no EX frame was sent
// and the client kept rendering the dead twin on top of the live field: the
// user saw a greyed, unusable box and the real value was hidden underneath.
//
// The client was never at fault there — it rendered what it was told. What this
// guards is the other half: when the EX frame IS sent, the object must actually
// go, and the sibling underneath must survive. Overlap is the interesting case
// because both Edits are absolutely positioned at identical coordinates, so a
// keying or z-order regression could plausibly drop the wrong one.
//
// Frames are injected directly (see ws-inject) because no demo callback creates
// overlapping twins at runtime.

test.describe('EX on overlapping Edits', () => {
  let browser: Browser;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
  });

  test('EX removes the disabled twin and leaves the live field intact', async () => {
    const injected = await openInjectablePage(browser, 'SubFormEdit', INDICATOR, 15000);
    const { page, send } = injected;
    try {
      // Same geometry as the customer case: identical Posn, twin 2px taller and
      // 1px narrower, created second so it stacks on top.
      const posn = [60, 120];
      await send({
        WC: {
          ID: 'F1.SF.LIVE',
          Properties: {
            Type: 'Edit', Posn: posn, Size: [16, 120],
            Style: 'Single', Border: 0, EdgeStyle: 'Ridge', MaxLength: 8,
          },
        },
      });
      await send({ WS: { ID: 'F1.SF.LIVE', Properties: { Text: 'SUPER' } } });
      await send({
        WC: {
          ID: 'F1.SF.DEAD',
          Properties: {
            Type: 'Edit', Posn: posn, Size: [18, 119],
            Style: 'Single', Border: 0, EdgeStyle: 'Ridge', MaxLength: 8,
            Active: 0, FCol: -18,
          },
        },
      });
      await page.waitForTimeout(400);

      const ids = () =>
        page.evaluate(() => ({
          live: !!document.getElementById('F1.SF.LIVE'),
          dead: !!document.getElementById('F1.SF.DEAD'),
          liveValue:
            (document.getElementById('F1.SF.LIVE') as HTMLInputElement | null)?.value ?? null,
          deadDisabled:
            (document.getElementById('F1.SF.DEAD') as HTMLInputElement | null)?.disabled ?? null,
        }));

      // Sanity: both rendered, the twin disabled, the live one holding the value.
      const before = await ids();
      expect(before.live).toBe(true);
      expect(before.dead).toBe(true);
      expect(before.deadDisabled).toBe(true);
      expect(before.liveValue).toBe('SUPER');

      // Expunge only the twin.
      await send({ EX: { ID: ['F1.SF.DEAD'] } });
      await page.waitForTimeout(500);

      const after = await ids();
      expect(after.dead).toBe(false); // the twin is gone, not merely hidden
      expect(after.live).toBe(true); // the overlapped sibling survived
      expect(after.liveValue).toBe('SUPER'); // and kept its value

      // The live field must now be the element at those coordinates, i.e. it is
      // reachable rather than buried under a ghost.
      const box = await page.locator('#F1\\.SF\\.LIVE').boundingBox();
      expect(box).not.toBeNull();
      const hitId = await page.evaluate(
        ([x, y]) => document.elementFromPoint(x, y)?.id ?? null,
        [box!.x + box!.width / 2, box!.y + box!.height / 2]
      );
      expect(hitId).toBe('F1.SF.LIVE');
    } finally {
      await injected.dispose();
    }
  });
});
