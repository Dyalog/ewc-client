// Pure AutoConf helpers — no React, no DOM — so they can be unit-tested in
// isolation (see autoconf.test.js) and reused by the hooks/components.
//
// AutoConf is a Dyalog ⎕WC property, a 2-bit flag (default 3):
//   bit 0 (value & 1) — ACCEPT parent resize: the object physically reconfigures
//                       when its parent resizes, keeping its relative size and
//                       position within the parent.
//   bit 1 (value & 2) — PROPAGATE to children: when the object is itself resized
//                       it reconfigures its children proportionally.
// A nullish value is treated as the default 3 (accept + propagate).

export const acAccepts = (autoConf) => (Number(autoConf ?? 3) & 1) === 1;
export const acPropagates = (autoConf) => (Number(autoConf ?? 3) & 2) === 2;

// A child reflows iff its container propagates (bit 1) AND the child itself
// accepts its parent's resize (bit 0) AND the container has a known baseline.
export const acShouldReflow = (containerPropagates, ownAutoConf, baseline) =>
  !!containerPropagates && acAccepts(ownAutoConf) && !!baseline;

// A container's baseline content box: its authored design [height,width] minus
// an inset (e.g. a Form's menu-bar offset, a border). Returns null until a
// numeric design size is known, so callers can capture the first valid result.
export const acBaseline = (designSize, inset = { x: 0, y: 0 }) => {
  if (!Array.isArray(designSize)) return null;
  const [h, w] = designSize;
  if (typeof h !== "number" || typeof w !== "number") return null;
  return {
    height: Math.max(1, h - (inset.y || 0)),
    width: Math.max(1, w - (inset.x || 0)),
  };
};

// The AutoConfContext value a container publishes: the per-axis scale of its
// current measured content box vs its fixed baseline. Falls back to scale 1
// when it doesn't propagate, has no baseline, or hasn't been measured yet.
export const acScale = (measured, baseline, propagate) => {
  if (!propagate || !baseline || !measured?.width || !measured?.height) {
    return { scaleX: 1, scaleY: 1, propagate: !!propagate, baseline: baseline ?? null };
  }
  return {
    scaleX: measured.width / baseline.width,
    scaleY: measured.height / baseline.height,
    propagate: true,
    baseline,
  };
};

// AutoConf reflow: scale a component's stored Posn/Size by per-axis factors and
// return a NEW Properties object (the design geometry in dataRef is never
// mutated). Posn is [top,left] (y,x); Size is [height,width] (y,x). Mirrors
// setStyle's axis-omit convention — a []/⍬ slot in Size stays omitted — and
// leaves non-numeric values untouched. Rounds to whole px; Size never negative.
export const scaleGeometry = (Properties, scaleX = 1, scaleY = 1) => {
  if (!Properties || (scaleX === 1 && scaleY === 1)) return Properties;
  const out = { ...Properties };

  if (Array.isArray(Properties.Posn)) {
    const [top, left] = Properties.Posn;
    out.Posn = [
      typeof top === "number" ? Math.round(top * scaleY) : top,
      typeof left === "number" ? Math.round(left * scaleX) : left,
    ];
  }
  if (Array.isArray(Properties.Size)) {
    const [h, w] = Properties.Size;
    out.Size = [
      typeof h === "number" ? Math.max(0, Math.round(h * scaleY)) : h,
      typeof w === "number" ? Math.max(0, Math.round(w * scaleX)) : w,
    ];
  }
  return out;
};
