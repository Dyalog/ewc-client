import { useEffect, useMemo, useRef } from "react";
import * as _ from "lodash";
import { posn, size } from "../utils/sizeposn";

// Debounced Configure(31) reporter (the AutoConf "report new size to the app"
// behaviour). When the object has a registered Configure event, this reports
// its *measured* geometry [top, left, height, width] (read from the live DOM via
// sizeposn — what ⎕WC would store after a reflow) once its size has settled.
//
// It is a no-op for objects without a Configure event, and never writes to the
// data model, so it cannot drive a resize→render→observe loop.
const useConfigureReport = (id, Event, socket, dimensions) => {
  const lastSent = useRef(null);
  const hasConfigure =
    Array.isArray(Event) && Event.some((e) => e && e[0] === "Configure");

  const report = useMemo(
    () =>
      _.debounce((oid) => {
        const p = posn(oid);
        const s = size(oid);
        if (!p || !s) return;
        const info = [p[0], p[1], s[0], s[1]];
        const key = info.join(",");
        if (lastSent.current === key) return;
        lastSent.current = key;
        socket?.send(
          JSON.stringify({ Event: { EventName: "Configure", ID: oid, Info: info } })
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
