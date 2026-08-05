import { test, expect } from '@playwright/test';
import { openSession, waitForServerState, MultiSession } from './helpers/session';

// Session teardown. When a browser goes away, endSession.aplf must call the
// app's onClose hook, ⎕TKILL the session thread, and ⎕EX the clone. None of
// that is visible from the departing browser — so every test here keeps an
// `observer` session open and reads the server's view through it.

test.describe('Multi mode — session lifecycle', () => {
  const opened: MultiSession[] = [];

  const track = (s: MultiSession) => {
    opened.push(s);
    return s;
  };

  test.afterEach(async () => {
    while (opened.length) {
      const s = opened.pop()!;
      await s.close().catch(() => {});
    }
  });

  test('closing a browser expunges its clone and fires onClose', async ({ browser }) => {
    const observer = track(await openSession(browser));
    const victim = await openSession(browser);

    const before = await observer.refresh();
    expect(before.clones).toContain(victim.shortNs);

    await victim.close();

    const after = await waitForServerState(
      observer,
      (s) => !s.clones.includes(victim.shortNs),
      { label: `${victim.ns} to be expunged` }
    );

    // ⎕EX ran (endSession.aplf:24) …
    expect(after.clones).not.toContain(victim.shortNs);
    // … and the app's onClose hook was invoked before it (endSession.aplf:15).
    expect(after.closed).toContain(victim.ns);
    // The observer is untouched by its neighbour's teardown.
    expect(after.clones).toContain(observer.shortNs);
    expect(await observer.caption('WHOAMI')).toBe(observer.ns);
  });

  test('a recycled session id gets a clean clone, not the old one', async ({ browser }) => {
    // newSession.aplf:7 assigns `⊃(⍳1+≢s)~s` — the lowest free integer — so
    // ids are reused. A new user landing on a recycled id must not inherit any
    // of the previous occupant's state.
    const a = await openSession(browser);
    const observer = track(await openSession(browser));

    // Leave a distinctive mark on A before it goes.
    await a.fill('PRIVATEIN', 'ghost-of-the-previous-user');
    await a.click('SETPRIVATE');
    await expect.poll(() => a.caption('PRIVATE')).toBe('ghost-of-the-previous-user');
    for (let i = 0; i < 4; i++) await a.click('INC');
    await expect.poll(() => a.caption('COUNTER')).toBe('4');

    const recycledId = a.id;
    const recycledNs = a.ns;
    await a.close();
    await waitForServerState(observer, (s) => !s.clones.includes(a.shortNs), {
      label: `${a.ns} to be expunged`,
    });

    const c = track(await openSession(browser));

    // C should reclaim A's id — and therefore A's clone name.
    expect(c.id).toBe(recycledId);
    expect(c.ns).toBe(recycledNs);

    // …but must see none of A's state.
    expect(await c.caption('PRIVATE')).toBe('-');
    expect(await c.caption('COUNTER')).toBe('0');
  });

  test('repeated connect/disconnect leaves no clones behind', async ({ browser }) => {
    const observer = track(await openSession(browser));
    const baseline = (await observer.refresh()).clones;

    const CYCLES = 15;
    for (let i = 0; i < CYCLES; i++) {
      const s = await openSession(browser);
      await s.close();

      const after = await waitForServerState(
        observer,
        (st) => !st.clones.includes(s.shortNs),
        { label: `cycle ${i + 1}/${CYCLES}: ${s.ns} to be expunged` }
      );

      // Every cycle must return to exactly the starting set. A slow leak would
      // show up here as growth long before it hit MAXSESSIONS in production.
      expect(after.clones.sort()).toEqual([...baseline].sort());
    }
  });

  test('a session whose socket dies without a Close signal is still reaped', async ({ browser }) => {
    // The graceful path works: the page's pagehide handler
    // (src/App.jsx:103-126) sends {Signal:{Name:"Close"}} and EWC tears the
    // session down in ~300ms. This test covers the UNGRACEFUL path — laptop
    // lid shut, wifi dropped, browser crashed — where the socket simply dies.
    //
    // EWC has a reaper for exactly this: onTimeout.aplf sweeps WSS.Conx with
    // LDRC.Exists and calls endSession for connections Conga has lost. So a
    // session abandoned this way is expected to be cleaned up too, just less
    // promptly.
    const observer = track(await openSession(browser));
    const victim = await openSession(browser);

    expect((await observer.refresh()).clones).toContain(victim.shortNs);

    await victim.abandon(); // context closed without letting the page unload

    const after = await waitForServerState(
      observer,
      (s) => !s.clones.includes(victim.shortNs),
      { timeout: 60000, label: `abandoned ${victim.ns} to be reaped` }
    );

    expect(after.clones).not.toContain(victim.shortNs);
    expect(after.closed).toContain(victim.ns);
  });
});
