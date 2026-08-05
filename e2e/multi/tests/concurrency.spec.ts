import { test, expect } from '@playwright/test';
import { openSessions, MultiSession } from './helpers/session';

// Several users doing things at the same instant.
//
// The mechanism under test is the WG rendezvous. eWG parks the session thread
// in `WG_TIMEOUT ⎕TGET token` (WaitForWG.aplf:7) while EWC's single Listen
// thread deposits the browser's reply with `⎕TPUT token` (Handler.aplf:75).
// Both sides compute:
//
//     token ← WG_TOKENBASE + TOKENSTEP × 1⌈ID×MODE=2
//
// Under Multi that is per-session and sound. Under Browser mode the `MODE=2`
// factor is 0, collapsing it to a constant shared by every waiter — the defect
// analysed in deliberanda/cbrundemo-wedge-fix.md. These tests pin the Multi
// behaviour so a future change to that token layout cannot silently break it.

test.describe('Multi mode — concurrent sessions', () => {
  let sessions: MultiSession[] = [];

  test.afterEach(async () => {
    while (sessions.length) await sessions.pop()!.close();
  });

  test('simultaneous WG round-trips each return to the session that asked', async ({ browser }) => {
    sessions = await openSessions(browser, 3);

    // Every session runs its probe at once. Each probe does 8 reads of its own
    // F1.TOKEN Edit (a dynamic property, so a real browser round-trip) and
    // compares what came back against its own clone name.
    await Promise.all(sessions.map((s) => s.click('RUNPROBE')));

    for (const s of sessions) {
      await expect
        .poll(() => s.caption('PROBE'), {
          timeout: 30000,
          message: `probe result for ${s.ns}`,
        })
        .not.toBe('-');

      const result = await s.caption('PROBE');

      // CROSSED → a reply was routed to the wrong session's ⎕TGET.
      // ERROR    → WaitForWG timed out and signalled 6.
      expect(result, `${s.ns} probe`).toBe(`OK ${s.ns} x8`);
    }
  });

  test('interleaved events keep each session count exactly its own', async ({ browser }) => {
    sessions = await openSessions(browser, 3);

    // Distinct click counts, so a stray event landing in the wrong session is
    // visible as an off-by-N rather than cancelling out.
    const clicks = [4, 7, 5];

    await Promise.all(
      sessions.map(async (s, i) => {
        for (let n = 0; n < clicks[i]; n++) {
          await s.click('INC');
        }
      })
    );

    for (let i = 0; i < sessions.length; i++) {
      await expect
        .poll(() => sessions[i].caption('COUNTER'), {
          timeout: 20000,
          message: `counter for ${sessions[i].ns}`,
        })
        .toBe(String(clicks[i]));
    }
  });

  test('concurrent sessions keep their own private state under load', async ({ browser }) => {
    sessions = await openSessions(browser, 3);

    const values = sessions.map((s) => `value-for-${s.shortNs}`);

    await Promise.all(
      sessions.map(async (s, i) => {
        await s.fill('PRIVATEIN', values[i]);
        await s.click('SETPRIVATE');
      })
    );

    for (let i = 0; i < sessions.length; i++) {
      await expect
        .poll(() => sessions[i].caption('PRIVATE'), { timeout: 20000 })
        .toBe(values[i]);
    }
  });
});
