import { useContext } from "react";
import { AutoConfContext } from "../context";
import { setStyle, scaleGeometry, acShouldReflow } from "../utils";

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
  return setStyle(scaleGeometry(Properties, ctx.scaleX, ctx.scaleY), position, Flex);
};

export default useAutoConfStyle;
