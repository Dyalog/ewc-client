// Pure AutoConf gate predicates. AutoConf is a Dyalog ⎕WC 2-bit flag (default 3):
//   bit 0 (value & 1) — ACCEPT: the object reconfigures when its PARENT resizes.
//   bit 1 (value & 2) — PROPAGATE: the object reconfigures its CHILDREN when it
//                       is itself resized.
// A nullish value is treated as the default 3 (accept + propagate).
//
// We keep ONLY these predicates (not Branch B's numeric scaleGeometry/context
// model) — Branch A reflows via CSS, so the gate is all we need in data. Pure
// and no-DOM so the 0/1/2/3 matrix can be unit-tested directly.

export const acAccepts = (autoConf) => (Number(autoConf ?? 3) & 1) === 1;
export const acPropagates = (autoConf) => (Number(autoConf ?? 3) & 2) === 2;

// A child reflows on a parent resize iff it accepts the resize (its own bit 0)
// AND its parent propagates the resize (the parent's bit 1).
export const acEffective = (ownAutoConf, parentAutoConf) =>
  acAccepts(ownAutoConf) && acPropagates(parentAutoConf);
