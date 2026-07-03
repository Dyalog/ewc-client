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

// --- Attach ----------------------------------------------------------------
// Attach refines AutoConf reflow per edge. It is a 4-vector of char vectors
// (top left bottom right); each element attaches that edge of the object to an
// edge of its parent — so its pixel distance from that parent edge stays FIXED —
// or is 'None', in which case that edge moves in proportion to the parent's size
// change (the default). Attach is only meaningful under the same reflow gate as
// scaleGeometry (parent propagates AND child accepts); callers apply that gate.
//
//   element [1] top    : 'Top'->parent top · 'Bottom'->parent bottom · 'None'
//   element [2] left   : 'Left'->parent left · 'Right'->parent right · 'None'
//   element [3] bottom : 'Top' · 'Bottom' · 'None'
//   element [4] right  : 'Left' · 'Right' · 'None'
//
// The default ('None' 'None' 'None' 'None') is pure proportional scaling, i.e.
// exactly scaleGeometry — so attachGeometry is a strict generalisation of it and
// reduces to it when Attach is absent, malformed, or all-'None'.

const isAttachVec = (a) => Array.isArray(a) && a.length === 4;
const allNone = (a) => a.every((e) => e !== "Top" && e !== "Bottom" && e !== "Left" && e !== "Right");

// One edge's new coordinate. c0 is its design coordinate (px from the parent's
// near origin), P0/P the parent's baseline/current extent on that axis.
//   'near' — attached to the near parent edge (top/left): fixed → c0
//   'far'  — attached to the far parent edge (bottom/right): fixed distance from
//            that edge → c0 shifted by the size change (P - P0)
//   'none' — not attached: proportional → c0 · P/P0
const edgeCoord = (c0, P0, P, kind) =>
  kind === "near" ? c0 : kind === "far" ? c0 + (P - P0) : (c0 * P) / P0;

const vKind = (a) => (a === "Top" ? "near" : a === "Bottom" ? "far" : "none");
const hKind = (a) => (a === "Left" ? "near" : a === "Right" ? "far" : "none");

// Attach-aware reflow. Like scaleGeometry, returns a NEW Properties (never
// mutates), rounds to whole px, keeps Size non-negative, and leaves non-numeric
// or omitted axis slots untouched. ctx carries the PARENT's published scale and
// baseline content box: { scaleX, scaleY, baseline:{width,height} }.
export const attachGeometry = (Properties, ctx = {}, attach) => {
  const { scaleX = 1, scaleY = 1, baseline } = ctx;
  // No usable Attach, no baseline, or nothing to scale → identical to the
  // proportional path (which itself no-ops when scaleX===scaleY===1).
  if (!isAttachVec(attach) || allNone(attach) || !baseline || (scaleX === 1 && scaleY === 1)) {
    return scaleGeometry(Properties, scaleX, scaleY);
  }
  if (!Properties) return Properties;

  const P0x = baseline.width;
  const P0y = baseline.height;
  const Px = P0x * scaleX;
  const Py = P0y * scaleY;

  const out = { ...Properties };
  const { Posn, Size } = Properties;
  if (Array.isArray(Posn)) out.Posn = [...Posn];
  if (Array.isArray(Size)) out.Size = [...Size];

  // vertical axis: Posn[0]=top, Size[0]=height, edges = attach[0]/attach[2]
  if (Array.isArray(Posn) && Array.isArray(Size) &&
      typeof Posn[0] === "number" && typeof Size[0] === "number") {
    const topN = edgeCoord(Posn[0], P0y, Py, vKind(attach[0]));
    const botN = edgeCoord(Posn[0] + Size[0], P0y, Py, vKind(attach[2]));
    out.Posn[0] = Math.round(topN);
    out.Size[0] = Math.max(0, Math.round(botN - topN));
  }
  // horizontal axis: Posn[1]=left, Size[1]=width, edges = attach[1]/attach[3]
  if (Array.isArray(Posn) && Array.isArray(Size) &&
      typeof Posn[1] === "number" && typeof Size[1] === "number") {
    const leftN = edgeCoord(Posn[1], P0x, Px, hKind(attach[1]));
    const rightN = edgeCoord(Posn[1] + Size[1], P0x, Px, hKind(attach[3]));
    out.Posn[1] = Math.round(leftN);
    out.Size[1] = Math.max(0, Math.round(rightN - leftN));
  }
  return out;
};
