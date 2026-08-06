import { test, expect } from '@playwright/test';
import { openSession, step, teardown, MultiSession } from './helpers/session';

// Multi mode gives every connection its own clone of the application
// namespace. These tests hold two users side by side and try to make one leak
// into the other.

test.describe('Multi mode — session isolation', () => {
  const opened: MultiSession[] = [];

  const track = (s: MultiSession) => {
    opened.push(s);
    return s;
  };

  test.afterEach(async () => {
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
    // The WebSocket URL drops the query string, so this reaches APL only via
    // the Initialise frame and its per-session _EWC.QUERY.
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
      expect(await a.editText('TOKEN')).toBe(a.ns);
      expect(await b.editText('TOKEN')).toBe(b.ns);
    });
  });
});
