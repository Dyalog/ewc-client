import { useRef } from "react";
import useResizeObserver from "./useResizeObserver";
import { acPropagates, acBaseline, acScale } from "../utils";

// Computes the AutoConfContext value a container publishes to its children.
//
//   contentEl   : the DOM element whose content box children are positioned in
//                 (measured live; null until mounted, which is fine)
//   designSize  : [height, width] the app authored for this container — the
//                 fixed reference the live size is compared against
//   ownAutoConf : the container's own AutoConf (bit 1 => it propagates resize)
//   inset       : { x, y } px subtracted from designSize to get the baseline
//                 content box (e.g. a Form's menu-bar offset, a border)
//
// The baseline is captured ONCE, from the first numeric designSize, and held
// fixed for the life of the layout. It deliberately does NOT reset when the
// container's own Size later changes (e.g. an app ⎕WS grow): that is exactly
// the signal that the container should reflow its children by
// currentSize/baseline. Because reflow is derived at render time from the
// unchanged design geometry, there is no compounding drift.
const useAutoConfProvider = (contentEl, designSize, ownAutoConf = 3, inset = { x: 0, y: 0 }) => {
  // Measure the CONTENT box (excludes border) so the scale is exactly 1 at rest
  // even for bordered containers — see useResizeObserver.
  const measured = useResizeObserver(contentEl, { box: "content" });
  const propagate = acPropagates(ownAutoConf);

  // Capture the baseline once, from the first valid design size, and hold it.
  const baselineRef = useRef(null);
  if (baselineRef.current === null) {
    const b = acBaseline(designSize, inset);
    if (b) baselineRef.current = b;
  }

  return acScale(measured, baselineRef.current, propagate);
};

export default useAutoConfProvider;
