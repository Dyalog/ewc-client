import { createContext } from 'react';

export const AppDataContext = createContext();

// Published by every container (Form, SubForm, Group, …) so its descendants can
// reflow their geometry for AutoConf. A child reflows iff its container
// propagates (AutoConf bit 1) AND the child itself accepts parent resize
// (AutoConf bit 0). See useAutoConfProvider (producer) and useAutoConfStyle
// (consumer). The default value is a no-op: scale 1, propagate false, so any
// component not under a real provider behaves exactly as before.
//   scaleX/scaleY : measuredContentSize / baselineContentSize for the container
//   propagate     : does this container have AutoConf bit 1 set?
//   baseline      : { width, height } content box the scale is measured against
//                   (null until the container's design size is known)
export const AutoConfContext = createContext({
  scaleX: 1,
  scaleY: 1,
  propagate: false,
  baseline: null,
});
