import { test, expect } from '@playwright/test';
import { openSessions, step, teardown, MultiSession } from './helpers/session';

// Several users acting at the same instant
test.describe('Multi mode — concurrent sessions', () => {
  let sessions: MultiSession[] = [];

  test.afterEach(async () => {
    await teardown(sessions);
  });

  test('simultaneous WG round-trips each return to the session that asked', async ({ browser }) => {
    sessions = await step('three users connect', async () => openSessions(browser, 3));

    await step('all three fire the WG probe at once', async () => {
      // Each probe reads its own F1.TOKEN eight times and checks what came back.
      await Promise.all(sessions.map((s) => s.click('RUNPROBE')));
    });

    await step('every reply came back to the session that asked', async () => {
      for (const s of sessions) {
        await expect
          .poll(() => s.caption('PROBE'), {
            timeout: 30000,
            message: `probe result for ${s.ns}`,
          })
          .not.toBe('-');

        // CROSSED → routed to the wrong session. ERROR → the round-trip timed out.
        expect(await s.caption('PROBE'), `${s.ns} probe`).toBe(`OK ${s.ns} x8`);
      }
    });
  });

  test('interleaved events keep each session count exactly its own', async ({ browser }) => {
    sessions = await step('three users connect', async () => openSessions(browser, 3));

    // Distinct counts, so a stray event shows up rather than cancelling out.
    const clicks = [4, 7, 5];

    await step(`all three click Increment at once (${clicks.join(' / ')} times)`, async () => {
      await Promise.all(
        sessions.map(async (s, i) => {
          for (let n = 0; n < clicks[i]; n++) {
            await s.click('INC');
          }
        })
      );
    });

    await step('each counter equals exactly its own click count', async () => {
      for (let i = 0; i < sessions.length; i++) {
        await expect
          .poll(() => sessions[i].caption('COUNTER'), {
            timeout: 20000,
            message: `counter for ${sessions[i].ns}`,
          })
          .toBe(String(clicks[i]));
      }
    });
  });

  test('concurrent sessions keep their own private state under load', async ({ browser }) => {
    sessions = await step('three users connect', async () => openSessions(browser, 3));

    const values = sessions.map((s) => `value-for-${s.shortNs}`);

    await step('all three write a distinct private value at once', async () => {
      await Promise.all(
        sessions.map(async (s, i) => {
          await s.fill('PRIVATEIN', values[i]);
          await s.click('SETPRIVATE');
        })
      );
    });

    await step('each read back its own value', async () => {
      for (let i = 0; i < sessions.length; i++) {
        await expect
          .poll(() => sessions[i].caption('PRIVATE'), { timeout: 20000 })
          .toBe(values[i]);
      }
    });
  });
});
