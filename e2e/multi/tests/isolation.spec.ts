import { test, expect } from '@playwright/test';
import { openSession, step, teardown, MultiSession } from './helpers/session';

// What Multi mode promises: every browser connection gets its own clone of the
// application namespace (newSession.aplf:14), so no two users can see or
// disturb each other's state. These tests hold two users side by side and try
// to make one leak into the other.
//
// Steps are named with step() so the run is watchable — OBSERVE=1 paints the
// current step into every open window (yarn multitests:watch), and the same
// labels drive the HTML report, traces and `--ui` time travel.

test.describe('Multi mode — session isolation', () => {
  const opened: MultiSession[] = [];

  const track = (s: MultiSession) => {
    opened.push(s);
    return s;
  };

  test.afterEach(async () => {
    // teardown() closes gracefully — abandon() would leak the clone unless the
    // EWC onTimeout fix is present (see e2e/multi/README.md), polluting the
    // server-wide readouts of every later test. In manual mode it also holds
    // the windows open for a final look before closing them.
    await teardown(opened);
  });

  test('two contexts get their own clone, session id and APL thread', async ({ browser }) => {
    const a = await step('user A connects', async () => track(await openSession(browser)));
    const b = await step('user B connects', async () => track(await openSession(browser)));

    await step('each got a distinct clone, session id and thread', async () => {
      expect(a.ns).toMatch(/^#\.mtest_\d+$/);
      expect(b.ns).toMatch(/^#\.mtest_\d+$/);

      expect(b.ns).not.toBe(a.ns);
      expect(b.id).not.toBe(a.id);
      // One APL thread per session (Handler.aplf:46 spawns Initialise with &).
      expect(b.tid).not.toBe(a.tid);

      // The clone name is derived from the session id, so they must agree.
      expect(a.ns).toBe(`#.mtest_${a.id}`);
      expect(b.ns).toBe(`#.mtest_${b.id}`);
    });

    await step('A refreshes and sees both clones alive', async () => {
      const seen = await a.refresh();
      expect(seen.clones).toContain(a.shortNs);
      expect(seen.clones).toContain(b.shortNs);
    });
  });

  test('a variable set in one session is invisible to the other', async ({ browser }) => {
    const a = await step('user A connects', async () => track(await openSession(browser)));
    const b = await step('user B connects', async () => track(await openSession(browser)));

    await step("A sets its private value to 'alpha'", async () => {
      await a.fill('PRIVATEIN', 'alpha');
      await a.click('SETPRIVATE');
      await expect.poll(() => a.caption('PRIVATE')).toBe('alpha');
    });

    await step('B is untouched by it', async () => {
      // `private` is a variable of #.mtest_N, not shared.
      expect(await b.caption('PRIVATE')).toBe('-');
    });

    await step("B sets its own value to 'beta'", async () => {
      await b.fill('PRIVATEIN', 'beta');
      await b.click('SETPRIVATE');
      await expect.poll(() => b.caption('PRIVATE')).toBe('beta');
    });

    await step("A still reads 'alpha'", async () => {
      expect(await a.caption('PRIVATE')).toBe('alpha');
    });
  });

  test('events are dispatched only to the session that raised them', async ({ browser }) => {
    const a = await step('user A connects', async () => track(await openSession(browser)));
    const b = await step('user B connects', async () => track(await openSession(browser)));

    await step('A increments 5 times', async () => {
      for (let i = 0; i < 5; i++) await a.click('INC');
      await expect.poll(() => a.caption('COUNTER')).toBe('5');
    });

    await step("B's counter is still 0", async () => {
      expect(await b.caption('COUNTER')).toBe('0');
    });

    await step('B increments 3 times', async () => {
      for (let i = 0; i < 3; i++) await b.click('INC');
      await expect.poll(() => b.caption('COUNTER')).toBe('3');
    });

    await step("A's counter did not move", async () => {
      expect(await a.caption('COUNTER')).toBe('5');
    });
  });

  test('each session reads its own query string', async ({ browser }) => {
    // The WebSocket URL drops the query string (src/App.jsx:431-441), so this
    // reaches APL only via the Initialise frame's URL field, which Handler
    // parses into the per-session _EWC.QUERY (Handler.aplf:36).
    const a = await step('user A connects as ?who=alice', async () =>
      track(await openSession(browser, { who: 'alice' }))
    );
    const b = await step('user B connects as ?who=bob', async () =>
      track(await openSession(browser, { who: 'bob' }))
    );

    await step('each read its own who= value', async () => {
      expect(await a.caption('QUERY')).toBe('alice');
      expect(await b.caption('QUERY')).toBe('bob');
    });
  });

  test('the WG probe target holds each session own token', async ({ browser }) => {
    const a = await step('user A connects', async () => track(await openSession(browser)));
    const b = await step('user B connects', async () => track(await openSession(browser)));

    await step('each token Edit holds its own clone name', async () => {
      // F1.TOKEN is an Edit seeded with the clone name. Edit.Text is a dynamic
      // property, so reading it is a real browser round-trip — unlike a Label's
      // Caption, which dWG answers locally without asking the client at all.
      expect(await a.editText('TOKEN')).toBe(a.ns);
      expect(await b.editText('TOKEN')).toBe(b.ns);
    });
  });
});
