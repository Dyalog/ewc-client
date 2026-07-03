import { useRef } from "react";
import { acPropagates, acScale } from "../utils";

// Computes the AutoConfContext value a container publishes to its children,
// driven by the container's authored Size — NOT by a measured DOM box.
//
//   currentSize : the container's current [height, width] from its Properties.
//   ownAutoConf : the container's AutoConf (bit 1 => it propagates resize).
//   identity    : a value that changes when the container is RE-AUTHORED (e.g.
//                 the demo picker reusing the same Form id for a different
//                 layout). When it changes, the baseline is recaptured.
//
// The baseline is the design size, captured from the first valid Size and held
// across resizes; the scale a bit-0 child reflows by is currentSize / baseline,
// per axis. Because both come from the data, the scale is EXACTLY 1 until the
// app actually changes the container's Size (a ⎕WS grow, or a viewport-sized
// form's viewport changing) — no border/inset/sub-pixel/timing noise, so nothing
// reflows at rest.
//
// The identity reset is what keeps this honest when a container is REUSED rather
// than resized: the demo picker keeps the same `F1` Form mounted across demos,
// so without it the baseline would stay stuck at the previous layout's size and
// every child would scale at rest. A plain resize keeps the same identity → its
// baseline is preserved → its children reflow as intended.
const useAutoConfProvider = (currentSize, ownAutoConf = 3, identity) => {
  const propagate = acPropagates(ownAutoConf);

  const valid =
    Array.isArray(currentSize) &&
    typeof currentSize[0] === "number" &&
    typeof currentSize[1] === "number";
  const size = valid ? { width: currentSize[1], height: currentSize[0] } : null;

  const baselineRef = useRef(null);
  const identityRef = useRef(identity);
  if (identity !== identityRef.current) {
    identityRef.current = identity;
    baselineRef.current = null; // re-authored → recapture the design size
  }
  if (baselineRef.current === null && size) {
    baselineRef.current = size;
  }

  return acScale(size, baselineRef.current, propagate);
};

export default useAutoConfProvider;
