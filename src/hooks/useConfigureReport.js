import { useEffect, useMemo } from 'react';
import debounce from 'lodash/debounce';
import { posn, size } from '../utils/sizeposn';

// Last-reported geometry per object id, so we never send an identical Configure
// twice (which could otherwise ping-pong with an APL callback that echoes the
// size back). Module-level to avoid touching a ref/render-scope var.
const lastReported = new Map();

// Debounced Configure(31) reporter — the AutoConf "report new size back to the
// app" behaviour. When the object has a registered Configure event, this reports
// its MEASURED geometry [top, left, height, width] (read from the live DOM via
// sizeposn — what ⎕WC would store after a reflow) once its size has settled.
//
// It is a no-op for objects without a Configure event, dedupes identical
// reports, and NEVER writes to the data model — so it cannot drive a
// resize -> render -> observe loop. Call it with a `dimensions` value that
// changes when the object resizes (e.g. from useResizeObserver on its element).
const useConfigureReport = (id, Event, socket, dimensions) => {
  const hasConfigure =
    Array.isArray(Event) && Event.some((e) => e && e[0] === 'Configure');

  const report = useMemo(
    () =>
      debounce((oid) => {
        const p = posn(oid);
        const s = size(oid);
        if (!p || !s) return;
        const info = [p[0], p[1], s[0], s[1]];
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
