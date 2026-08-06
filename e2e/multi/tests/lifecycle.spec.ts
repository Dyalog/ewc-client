import { test, expect } from '@playwright/test';
import {
  openSession,
  waitForServerState,
  step,
  teardown,
  MultiSession,
} from './helpers/session';

// Session teardown: EWC must call the app's onClose, kill the session thread
// and expunge the clone. None of that is visible from the departing browser, so
// every test keeps an `observer` session and reads the server's view through it.

test.describe('Multi mode — session lifecycle', () => {
  const opened: MultiSession[] = [];

  const track = (s: MultiSession) => {
    opened.push(s);
    return s;
  };

  test.afterEach(async () => {
    await teardown(opened);
  });

  test('closing a browser expunges its clone and fires onClose', async ({ browser }) => {
    const observer = await step('observer connects', async () =>
      track(await openSession(browser))
    );
    const victim = await step('a second user connects', async () => openSession(browser));

    await step('observer sees both clones', async () => {
      const before = await observer.refresh();
      expect(before.clones).toContain(victim.shortNs);
    });

    await step(`close ${victim.ns}`, async () => {
      await victim.close();
    });

    await step('observer sees it expunged, and onClose recorded', async () => {
      const after = await waitForServerState(
        observer,
        (s) => !s.clones.includes(victim.shortNs),
        { label: `${victim.ns} to be expunged` }
      );

      expect(after.clones).not.toContain(victim.shortNs);
      expect(after.closed).toContain(victim.ns);
      expect(after.clones).toContain(observer.shortNs);
      expect(await observer.caption('WHOAMI')).toBe(observer.ns);
    });
  });

  test('a recycled session id gets a clean clone, not the old one', async ({ browser }) => {
    // EWC reuses the lowest free session id, so a new user can land on one a
    // previous user had.
    const a = await step('user A connects', async () => openSession(browser));
    const observer = await step('observer connects', async () =>
      track(await openSession(browser))
    );

    await step('A leaves a distinctive mark on its own clone', async () => {
      await a.fill('PRIVATEIN', 'ghost-of-the-previous-user');
      await a.click('SETPRIVATE');
      await expect.poll(() => a.caption('PRIVATE')).toBe('ghost-of-the-previous-user');
      for (let i = 0; i < 4; i++) await a.click('INC');
      await expect.poll(() => a.caption('COUNTER')).toBe('4');
    });

    const recycledId = a.id;
    const recycledNs = a.ns;

    await step(`close ${a.ns}, freeing session id ${recycledId}`, async () => {
      await a.close();
      await waitForServerState(observer, (s) => !s.clones.includes(a.shortNs), {
        label: `${a.ns} to be expunged`,
      });
    });

    const c = await step('a new user connects and reclaims that id', async () =>
      track(await openSession(browser))
    );

    await step('same clone name, but none of the old state', async () => {
      expect(c.id).toBe(recycledId);
      expect(c.ns).toBe(recycledNs);
      expect(await c.caption('PRIVATE')).toBe('-');
      expect(await c.caption('COUNTER')).toBe('0');
    });
  });

  test('repeated connect/disconnect leaves no clones behind', async ({ browser }) => {
    const observer = await step('observer connects', async () =>
      track(await openSession(browser))
    );
    const baseline = (await observer.refresh()).clones;

    const CYCLES = 15;
    for (let i = 0; i < CYCLES; i++) {
      await step(`cycle ${i + 1}/${CYCLES}: connect, disconnect, verify no residue`, async () => {
        const s = await openSession(browser);
        await s.close();

        const after = await waitForServerState(
          observer,
          (st) => !st.clones.includes(s.shortNs),
          { label: `cycle ${i + 1}/${CYCLES}: ${s.ns} to be expunged` }
        );

        // A slow leak shows up here... but not been an issue
        expect(after.clones.sort()).toEqual([...baseline].sort());
      });
    }
  });

  test('a session whose socket dies without a Close signal is still reaped', async ({ browser }) => {
    // The ungraceful path, where no Close signal is sent
    // EWC's onTimeout has to deal with it
    const observer = await step('observer connects', async () =>
      track(await openSession(browser))
    );
    const victim = await step('a second user connects', async () => openSession(browser));

    await step('observer sees both clones', async () => {
      expect((await observer.refresh()).clones).toContain(victim.shortNs);
    });

    await step(`kill ${victim.ns}'s socket with no Close signal`, async () => {
      await victim.abandon();
    });

    await step('the reaper still collects it', async () => {
      const after = await waitForServerState(
        observer,
        (s) => !s.clones.includes(victim.shortNs),
        { timeout: 60000, label: `abandoned ${victim.ns} to be reaped` }
      );

      expect(after.clones).not.toContain(victim.shortNs);
      expect(after.closed).toContain(victim.ns);
    });
  });
});
