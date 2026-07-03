// getAttachStyle — CSS edge-anchoring for the APL `Attach` property.
//
// Attach is a 4-element vector [TopEdge, LeftEdge, BottomEdge, RightEdge], each
// 'Top' | 'Bottom' | 'Left' | 'Right' | 'None'. An *attached* edge keeps a fixed
// pixel distance from the named parent edge when the parent is resized; a 'None'
// edge moves proportionally. We express both purely in CSS so the browser
// re-anchors/stretches the object for free as the live parent box changes:
//   - attached edge  -> fixed px offset (top/left/right/bottom)
//   - 'None' edge     -> percentage of the *base* (authored) parent box
//
// Posn=[y,x], Size=[h,w] are the object's authored pixel geometry (immutable).
// baseParentSize=[Ph,Pw] is the parent size the object was authored against,
// frozen once by the caller (the live parent size is supplied by CSS at layout).

const isPair = (a) =>
  Array.isArray(a) && a.length === 2 && Number.isFinite(a[0]) && Number.isFinite(a[1]);

// Percentage string, trimmed of float noise.
const pct = (frac) => `${Math.round(frac * 1e4) / 1e2}%`;

// Resolve one child edge to a single CSS declaration { prop, value } where prop
// is a CSS side and value is px (number) or a percentage (string).
const resolveEdge = (value, decls) => decls[value] || decls.None;

// Merge the two edges of one axis into CSS. start is the top/left edge, end is
// the bottom/right edge; startProp/endProp name the CSS sides they naturally
// own ('top'/'bottom' or 'left'/'right'). Always emits BOTH sides plus the size
// so the result fully overrides whatever inline top/left/width/height a
// component already set when this is spread last — the unpinned side is 'auto'
// (CSS default), which is what clears a stale inline left/top on a
// right/bottom-anchored box.
const mergeAxis = (start, end, sizeKey, sizeValue, startProp, endProp) => {
  // Opposing edges anchored -> stretch between them (size derives from both).
  if (start.prop !== end.prop) {
    return { [start.prop]: start.value, [end.prop]: end.value, [sizeKey]: 'auto' };
  }
  // Collision (both edges resolved to the same CSS side, e.g. Top+Top or the
  // scrollbar's Right+Right): keep the edge that naturally owns that side, free
  // the opposite side, and pin the size. This keeps a right-docked object flush
  // to the right edge rather than shifting it inward.
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
