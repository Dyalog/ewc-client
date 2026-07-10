import { useEffect, useMemo } from 'react';
import debounce from 'lodash/debounce';
import { posn, size } from '../utils/sizeposn';

// Last-reported geometry per object id, so we never send an identical Configure
// twice (which could otherwise ping-pong with an APL callback that echoes the
// size back). Module-level to avoid touching a ref/render-scope var.
const lastReported = new Map();

// When the server itself sets an object's Size (via ⎕WS) it reflows that object;
// the client re-renders, ResizeObserver fires, and reporting THAT back as a
// Configure is the *echo* of a server-side decision, not a user action. ⎕WC never
// bounces a Configure back for an app-driven ⎕WS, so neither must we — and doing
// so re-enters the app's own Configure handler while it is still mid-reflow (a
// witnessed re-entrancy fault: the nested handler runs inside the app's own event
// pump, where the outer handler's working `Size` local is unset -> VALUE ERROR,
// which then cascades into an error dialog).
//
// We can't reliably recognise the echo by its *value*: an object that fills its
// parent (Attach) renders at a measured size that never equals the model Size the
// server set, so a value compare lets the echo through. Instead we recognise it
// by *causality* — a server ⎕WS that touched this object's Size/layout arms a
// short window during which the next Configure report for that object is the
// echo and is dropped. The window is re-armed on every such ⎕WS, so however long
// the app's nested event loop churns out reflows, none of them are echoed back;
// once the app settles and the window lapses, genuine user resizes report again.
const serverTouchedAt = new Map();
const ECHO_WINDOW_MS = 800;
// A monotonic-ish clock. performance.now() in the renderer; guarded so a headless
// or test context without it still loads (falls back to 0 -> window always open,
// which only ever *suppresses* an echo, never fabricates one).
const now = () =>
  typeof performance !== 'undefined' && performance.now ? performance.now() : 0;

// Props whose presence in a server ⎕WS means the server reflowed this object's
// geometry/content — any of them arms the echo window.
const LAYOUT_PROPS = ['Size', 'Values', 'ColTitles', 'CellWidths', 'CellHeights'];

export const noteServerSize = (id, properties) => {
  if (!id || !properties) return;
  if (LAYOUT_PROPS.some((p) => properties[p] !== undefined)) {
    serverTouchedAt.set(id, now());
  }
};

// Debounced Configure(31) reporter — the AutoConf "report new size back to the
// app" behaviour. When the object has a registered Configure event, this reports
// its MEASURED geometry [top, left, height, width] (read from the live DOM via
// sizeposn — what ⎕WC would store after a reflow) once its size has settled.
//
// It is a no-op for objects without a Configure event, dedupes identical
// reports, suppresses the echo of a server-driven size change, and NEVER writes
// to the data model — so it cannot drive a resize -> render -> observe loop. Call
// it with a `dimensions` value that changes when the object resizes (e.g. from
// useResizeObserver on its element).
const useConfigureReport = (id, Event, socket, dimensions) => {
  const hasConfigure =
    Array.isArray(Event) && Event.some((e) => e && e[0] === 'Configure');

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
        // opening ⎕WC set a Size.
        const touched = serverTouchedAt.get(oid);
        if (
          lastReported.has(oid) &&
          touched !== undefined &&
          now() - touched < ECHO_WINDOW_MS
        ) {
          return;
        }
        // posn() subtracts a 1px border fudge, so a child flush against its
        // parent's top/left edge measures to -1. ⎕WC never reports a negative
        // child Posn and some Configure handlers signal on one, so clamp the
        // reported top/left to 0.
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
    report(id);
    return () => report.cancel();
  }, [dimensions, hasConfigure, id, report]);
};

export default useConfigureReport;
