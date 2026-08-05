import { test, expect } from '@playwright/test';
import { openSession, MultiSession } from './helpers/session';

// What Multi mode promises: every browser connection gets its own clone of the
// application namespace (newSession.aplf:14), so no two users can see or
// disturb each other's state. These tests hold two users side by side and try
// to make one leak into the other.

test.describe('Multi mode — session isolation', () => {
  const opened: MultiSession[] = [];

  const track = (s: MultiSession) => {
    opened.push(s);
    return s;
  };

  test.afterEach(async () => {
    // Always close gracefully. abandon() leaks the clone permanently (EWC does
    // not reap sockets that die without a Close signal — see lifecycle.spec.ts),
    // which would pollute the server-wide readouts of every later test.
    while (opened.length) await opened.pop()!.close();
  });

  test('two contexts get their own clone, session id and APL thread', async ({ browser }) => {
    const a = track(await openSession(browser));
    const b = track(await openSession(browser));

    expect(a.ns).toMatch(/^#\.mtest_\d+$/);
    expect(b.ns).toMatch(/^#\.mtest_\d+$/);

    expect(b.ns).not.toBe(a.ns);
    expect(b.id).not.toBe(a.id);
    // One APL thread per session (Handler.aplf:46 spawns Initialise with &).
    expect(b.tid).not.toBe(a.tid);

    // The clone name is derived from the session id, so they must agree.
    expect(a.ns).toBe(`#.mtest_${a.id}`);
    expect(b.ns).toBe(`#.mtest_${b.id}`);

    // Each session sees both clones alive.
    const seen = await a.refresh();
    expect(seen.clones).toContain(a.shortNs);
    expect(seen.clones).toContain(b.shortNs);
  });

  test('a variable set in one session is invisible to the other', async ({ browser }) => {
    const a = track(await openSession(browser));
    const b = track(await openSession(browser));

    await a.fill('PRIVATEIN', 'alpha');
    await a.click('SETPRIVATE');
    await expect.poll(() => a.caption('PRIVATE')).toBe('alpha');

    // B must be untouched — `private` is a variable of #.mtest_N, not shared.
    expect(await b.caption('PRIVATE')).toBe('-');

    await b.fill('PRIVATEIN', 'beta');
    await b.click('SETPRIVATE');
    await expect.poll(() => b.caption('PRIVATE')).toBe('beta');

    // And A must not have been overwritten by B's write.
    expect(await a.caption('PRIVATE')).toBe('alpha');
  });

  test('events are dispatched only to the session that raised them', async ({ browser }) => {
    const a = track(await openSession(browser));
    const b = track(await openSession(browser));

    for (let i = 0; i < 5; i++) await a.click('INC');
    await expect.poll(() => a.caption('COUNTER')).toBe('5');
    expect(await b.caption('COUNTER')).toBe('0');

    for (let i = 0; i < 3; i++) await b.click('INC');
    await expect.poll(() => b.caption('COUNTER')).toBe('3');

    // A's count must not have moved while B was clicking.
    expect(await a.caption('COUNTER')).toBe('5');
  });

  test('each session reads its own query string', async ({ browser }) => {
    // The WebSocket URL drops the query string (src/App.jsx:431-441), so this
    // reaches APL only via the Initialise frame's URL field, which Handler
    // parses into the per-session _EWC.QUERY (Handler.aplf:36).
    const a = track(await openSession(browser, { who: 'alice' }));
    const b = track(await openSession(browser, { who: 'bob' }));

    expect(await a.caption('QUERY')).toBe('alice');
    expect(await b.caption('QUERY')).toBe('bob');
  });

  test('the WG probe target holds each session own token', async ({ browser }) => {
    const a = track(await openSession(browser));
    const b = track(await openSession(browser));

    // F1.TOKEN is an Edit seeded with the clone name. Edit.Text is a dynamic
    // property, so reading it is a real browser round-trip — unlike a Label's
    // Caption, which dWG answers locally without asking the client at all.
    expect(await a.editText('TOKEN')).toBe(a.ns);
    expect(await b.editText('TOKEN')).toBe(b.ns);
  });
});
