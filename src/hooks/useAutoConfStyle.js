import { useContext } from "react";
import { AutoConfContext } from "../context";
import { setStyle, attachGeometry, acShouldReflow } from "../utils";

// Drop-in replacement for setStyle that applies AutoConf reflow.
//
// A component's geometry is scaled iff its nearest container PROPAGATES
// (AutoConf bit 1, published on AutoConfContext) AND the component itself
// ACCEPTS its parent's resize (its own AutoConf bit 0). In every other case
// this returns setStyle(Properties, position, Flex) unchanged, so it is a safe
// 1:1 swap for setStyle anywhere — components under the default (no-op) context
// behave exactly as before.
const useAutoConfStyle = (
  Properties,
  ownAutoConf = 3,
  position = "absolute",
  Flex = 0
) => {
  const ctx = useContext(AutoConfContext);
  if (!acShouldReflow(ctx.propagate, ownAutoConf, ctx.baseline)) {
    return setStyle(Properties, position, Flex);
  }
  // Per-edge Attach (from the component's own Properties); with no/None Attach
  // this is exactly the old proportional scaleGeometry.
  return setStyle(attachGeometry(Properties, ctx, Properties?.Attach), position, Flex);
};

export default useAutoConfStyle;
