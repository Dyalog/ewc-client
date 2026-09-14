// getAttachStyle — CSS edge-anchoring for the APL `Attach` property.
//
// Attach is a 4-element vector [TopEdge, LeftEdge, BottomEdge, RightEdge], each
// 'Top' | 'Bottom' | 'Left' | 'Right' | 'None'. An *attached* edge keeps a fixed
// pixel distance from the named parent edge when the parent is resized; a 'None'
// edge moves proportionally. We express both purely in CSS so the browser
// re-anchors/stretches the object for free as the live parent box changes:
//   - attached edge  -> fixed px offset (top/left/right/bottom)
//   - 'None' edge    -> percentage of the *base* (authored) parent box

const isPair = (a) =>
  Array.isArray(a) && a.length === 2 && Number.isFinite(a[0]) && Number.isFinite(a[1]);

// Percentage string at ~6dp. The browser resolves '%' against the live parent in
// px, so coarse rounding is multiplied by the parent width and shows as visible
// drift on an anchored edge — 6dp keeps the error well below a pixel.
const pct = (frac) => `${Math.round(frac * 1e8) / 1e6}%`;

const canon = (s) =>
  typeof s === 'string' && s.length ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;

// Pick a CSS declaration for an edge
const resolveEdge = (value, decls) => decls[canon(value)] || decls.None;

// Turn one axis's two edges into CSS, always emitting both sides + the size key
// (so a last-spread result fully overrides any inline top/left/width/height):
//   - edges on different sides -> pin both, size:auto (stretch between them)
//   - edges collide on one side -> keep the side it naturally owns, free the other
const mergeAxis = (start, end, sizeKey, sizeValue, startProp, endProp) => {
  // Opposing edges anchored -> stretch between them (size derives from both).
  if (start.prop !== end.prop) {
    return { [start.prop]: start.value, [end.prop]: end.value, [sizeKey]: 'auto' };
  }
  // Observed some issues with two Attach edges fighting with each other, use a
  // simple heuristic to choose the one we keep: the one that owns that side.
  const keep = start.prop === startProp ? start : end;
  const freeProp = keep.prop === startProp ? endProp : startProp;
  return { [keep.prop]: keep.value, [freeProp]: 'auto', [sizeKey]: sizeValue };
};

export const getAttachStyle = (Posn, Size, baseParentSize, Attach) => {
  if (!isPair(Posn) || !isPair(Size) || !isPair(baseParentSize)) return {};
  if (!Array.isArray(Attach) || Attach.length !== 4) return {};

  const [y, x] = Posn;
  const [h, w] = Size;
  const [Ph, Pw] = baseParentSize;
  const [topEdge, leftEdge, bottomEdge, rightEdge] = Attach;

  // Fixed pixel distances from each parent edge to the matching child edge.
  const dTop = y;
  const dBottom = Ph - (y + h);
  const dLeft = x;
  const dRight = Pw - (x + w);

  // Vertical axis: child top edge (Attach[0]) and bottom edge (Attach[2]).
  const top = resolveEdge(topEdge, {
    Top: { prop: 'top', value: dTop },
    Bottom: { prop: 'bottom', value: Ph - y }, // cross: top edge -> parent bottom
    None: { prop: 'top', value: pct(y / Ph) },
  });
  const bottom = resolveEdge(bottomEdge, {
    Bottom: { prop: 'bottom', value: dBottom },
    Top: { prop: 'top', value: y + h }, // cross: bottom edge -> parent top
    None: { prop: 'bottom', value: pct(1 - (y + h) / Ph) },
  });

  // Horizontal axis: child left edge (Attach[1]) and right edge (Attach[3]).
  const left = resolveEdge(leftEdge, {
    Left: { prop: 'left', value: dLeft },
    Right: { prop: 'right', value: Pw - x }, // cross: left edge -> parent right
    None: { prop: 'left', value: pct(x / Pw) },
  });
  const right = resolveEdge(rightEdge, {
    Right: { prop: 'right', value: dRight },
    Left: { prop: 'left', value: x + w }, // cross: right edge -> parent left
    None: { prop: 'right', value: pct(1 - (x + w) / Pw) },
  });

  return {
    position: 'absolute',
    ...mergeAxis(top, bottom, 'height', h, 'top', 'bottom'),
    ...mergeAxis(left, right, 'width', w, 'left', 'right'),
  };
};
