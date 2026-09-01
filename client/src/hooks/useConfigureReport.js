import { useEffect, useMemo, useRef } from 'react';
import debounce from 'lodash/debounce';
import { posn, size } from '../utils/sizeposn';

// Avoid ping pong with the server by ignoring duplicates
const lastReported = new Map();

// Avoid an echo/reentrancy loop:
// * server eWS sets a Size
// * client rerenders
// * ResizeObserver fires
// Reporting THAT back as a Configure re-enters the app's own Configure handler
// while it's still mid-reflow from the eWS it just sent — the client's echo, not
// a user action.
//
// We can't spot the echo by *value*: an Attach object renders at a measured size
// that never equals the model Size the server set, so a value compare lets it
// through. Recognise it by *timing* instead — a server eWS touching this object's
// Size/layout arms a short window (ECHO_WINDOW_MS) during which the next Configure
// report for it is treated as the echo and dropped. Every such eWS re-arms the
// window, so however long the app's reflows churn none echo back; once it settles
// and the window lapses, genuine user resizes report again.
const serverTouchedAt = new Map();
const ECHO_WINDOW_MS = 800;
// Slight hack for a monotonic-ish clock. performance.now() is available for >10
// years at time of writing. The 0 fallback is just defensive.
const now = () =>
  typeof performance !== 'undefined' && performance.now ? performance.now() : 0;

const LAYOUT_PROPS = ['Size', 'Values', 'ColTitles', 'CellWidths', 'CellHeights'];

export const noteServerSize = (id, properties) => {
  if (!id || !properties) return;
  if (LAYOUT_PROPS.some((p) => properties[p] !== undefined)) {
    serverTouchedAt.set(id, now());
  }
};

// Configure reporting that tries very hard to not send duplicates or spurious
// echos, and also debounces given we are over a network and dealing with
// browser delays.
const useConfigureReport = (id, Event, socket, dimensions) => {
  const hasConfigure =
    Array.isArray(Event) && Event.some((e) => e && e[0] === 'Configure');

  // Skip the object's initial (mount-time) sizing. ⎕WC lays an object out itself
  // when it is first created; native never fires a Configure back for that server
  // layout, so neither must we. Reporting it re-enters the app's Configure handler
  // out of the layout function's dynamic scope (witnessed: a grid Configure at
  // open re-entering the reflow path with its working state unset -> error dialog).
  // Only genuine post-mount resizes are reported.
  const seededRef = useRef(false);

  const report = useMemo(
    () =>
      debounce((oid) => {
        const p = posn(oid);
        const s = size(oid);
        if (!p || !s) return;
        // Suppress the echo of a server-driven reflow: if the server touched this
        // object's Size/layout within the echo window, this resize is the app's
        // own reflow, not a user action — don't report it back. The very first
        // report (nothing yet in lastReported) always goes through, so the app's
        // Configure handler still runs once to seed its baseline even though the
        // opening eWC set a Size.
        const touched = serverTouchedAt.get(oid);
        if (
          lastReported.has(oid) &&
          touched !== undefined &&
          now() - touched < ECHO_WINDOW_MS
        ) {
          return;
        }
        // Some clamping for being defensive
        const info = [Math.max(0, p[0]), Math.max(0, p[1]), s[0], s[1]];
        const key = info.join(',');
        if (lastReported.get(oid) === key) return; // dedupe identical reports
        lastReported.set(oid, key);
        socket?.send(
          JSON.stringify({ Event: { EventName: 'Configure', ID: oid, Info: info } })
        );
      }, 120),
    [socket]
  );

  useEffect(() => {
    if (!hasConfigure) return;
    // First run is the initial mount/layout — record and skip (see seededRef).
    if (!seededRef.current) {
      seededRef.current = true;
      return;
    }
    report(id);
    return () => report.cancel();
  }, [dimensions, hasConfigure, id, report]);
};

export default useConfigureReport;
