import { useRef } from "react";
import { acPropagates, acScale } from "../utils";

// Computes the AutoConfContext value a container publishes to its children,
// driven by the container's authored Size — NOT by a measured DOM box.
//
//   currentSize : the container's current [height, width] from its Properties.
//   ownAutoConf : the container's AutoConf (bit 1 => it propagates resize).
//
// The baseline is the FIRST Size we see (the design size), captured once; the
// scale a bit-0 child reflows by is currentSize / baseline, per axis. Because
// BOTH values come from the data, the scale is EXACTLY 1 until the app actually
// changes the container's Size (a ⎕WS grow, or — for a viewport-sized form —
// the viewport changing). There is no border/inset/sub-pixel/timing noise, so
// NOTHING reflows at rest: a container that hasn't been resized leaves its
// children untouched.
const useAutoConfProvider = (currentSize, ownAutoConf = 3) => {
  const propagate = acPropagates(ownAutoConf);

  const valid =
    Array.isArray(currentSize) &&
    typeof currentSize[0] === "number" &&
    typeof currentSize[1] === "number";
  const size = valid ? { width: currentSize[1], height: currentSize[0] } : null;

  // Capture the design size once, from the first valid Size.
  const baselineRef = useRef(null);
  if (baselineRef.current === null && size) {
    baselineRef.current = size;
  }

  return acScale(size, baselineRef.current, propagate);
};

export default useAutoConfProvider;
