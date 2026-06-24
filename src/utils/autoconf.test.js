// Unit tests for the pure AutoConf helpers. Run with: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acAccepts,
  acPropagates,
  acShouldReflow,
  acBaseline,
  acScale,
  scaleGeometry,
} from "./autoconf.js";

// --- the 0/1/2/3 bit matrix ------------------------------------------------
// bit 0 = accept parent resize, bit 1 = propagate to children.
test("acAccepts decodes bit 0 across 0/1/2/3", () => {
  assert.equal(acAccepts(0), false);
  assert.equal(acAccepts(1), true);
  assert.equal(acAccepts(2), false);
  assert.equal(acAccepts(3), true);
});

test("acPropagates decodes bit 1 across 0/1/2/3", () => {
  assert.equal(acPropagates(0), false);
  assert.equal(acPropagates(1), false);
  assert.equal(acPropagates(2), true);
  assert.equal(acPropagates(3), true);
});

test("nullish AutoConf defaults to 3 (accept + propagate)", () => {
  assert.equal(acAccepts(undefined), true);
  assert.equal(acAccepts(null), true);
  assert.equal(acPropagates(undefined), true);
  assert.equal(acPropagates(null), true);
});

test("string AutoConf values are coerced", () => {
  assert.equal(acAccepts("1"), true);
  assert.equal(acPropagates("2"), true);
  assert.equal(acAccepts("0"), false);
});

// --- acShouldReflow (the child gate) ---------------------------------------
test("acShouldReflow requires propagate AND accept AND baseline", () => {
  const base = { width: 100, height: 100 };
  // Form (propagate) over the four child AutoConf values:
  assert.equal(acShouldReflow(true, 0, base), false); // ignore
  assert.equal(acShouldReflow(true, 1, base), true); // accept
  assert.equal(acShouldReflow(true, 2, base), false); // ignore
  assert.equal(acShouldReflow(true, 3, base), true); // accept
  // Non-propagating container never reflows its children:
  assert.equal(acShouldReflow(false, 1, base), false);
  assert.equal(acShouldReflow(false, 3, base), false);
  // No baseline yet -> no reflow:
  assert.equal(acShouldReflow(true, 3, null), false);
});

// --- acBaseline ------------------------------------------------------------
test("acBaseline derives content box from design size minus inset", () => {
  assert.deepEqual(acBaseline([600, 920]), { height: 600, width: 920 });
  assert.deepEqual(acBaseline([600, 920], { x: 0, y: 25 }), {
    height: 575,
    width: 920,
  });
});

test("acBaseline returns null for unknown/partial sizes", () => {
  assert.equal(acBaseline(undefined), null);
  assert.equal(acBaseline([]), null);
  assert.equal(acBaseline([100]), null);
  assert.equal(acBaseline(["x", "y"]), null);
});

test("acBaseline floors content box at 1px", () => {
  assert.deepEqual(acBaseline([10, 10], { x: 50, y: 50 }), {
    height: 1,
    width: 1,
  });
});

// --- acScale (the published context value) ---------------------------------
test("acScale returns measured/baseline per axis when propagating", () => {
  // The harness Grow case: a 170x340 box grown to 230x410.
  const v = acScale(
    { width: 410, height: 230 },
    { width: 340, height: 170 },
    true
  );
  assert.equal(v.scaleX, 410 / 340);
  assert.equal(v.scaleY, 230 / 170);
  assert.equal(v.propagate, true);
});

test("acScale is identity (scale 1) when not propagating", () => {
  const v = acScale({ width: 410, height: 230 }, { width: 340, height: 170 }, false);
  assert.equal(v.scaleX, 1);
  assert.equal(v.scaleY, 1);
  assert.equal(v.propagate, false);
});

test("acScale is identity until measured (no size yet)", () => {
  const v = acScale({ width: undefined, height: undefined }, { width: 340, height: 170 }, true);
  assert.equal(v.scaleX, 1);
  assert.equal(v.scaleY, 1);
});

test("acScale is exactly 1 at rest (measured == baseline -> no reflow)", () => {
  // Invariant: a container that hasn't actually changed size must not reflow its
  // children. This is why the provider measures the CONTENT box, not offsetWidth
  // (which would feed measured=342 vs baseline=340 for a 1px-bordered SubForm).
  const v = acScale({ width: 340, height: 170 }, { width: 340, height: 170 }, true);
  assert.equal(v.scaleX, 1);
  assert.equal(v.scaleY, 1);
});

test("acScale is identity with no baseline", () => {
  const v = acScale({ width: 410, height: 230 }, null, true);
  assert.equal(v.scaleX, 1);
  assert.equal(v.scaleY, 1);
  assert.equal(v.baseline, null);
});

// --- scaleGeometry ---------------------------------------------------------
test("scale 1,1 returns the same object reference (no work)", () => {
  const props = { Posn: [10, 20], Size: [30, 40] };
  assert.equal(scaleGeometry(props, 1, 1), props);
});

test("null/undefined Properties pass through", () => {
  assert.equal(scaleGeometry(null, 2, 2), null);
  assert.equal(scaleGeometry(undefined, 2, 2), undefined);
});

test("Posn [top,left] scales by [scaleY, scaleX]", () => {
  const out = scaleGeometry({ Posn: [100, 200] }, 0.5, 2);
  // top (y) *= scaleY=2 -> 200 ; left (x) *= scaleX=0.5 -> 100
  assert.deepEqual(out.Posn, [200, 100]);
});

test("Size [height,width] scales by [scaleY, scaleX]", () => {
  const out = scaleGeometry({ Size: [170, 340] }, 410 / 340, 230 / 170);
  // height *= 230/170 -> 230 ; width *= 410/340 -> 410  (the harness Grow case)
  assert.deepEqual(out.Size, [230, 410]);
});

test("results are rounded to whole pixels", () => {
  const out = scaleGeometry({ Posn: [10, 10], Size: [10, 10] }, 1.333, 1.333);
  assert.deepEqual(out.Posn, [13, 13]);
  assert.deepEqual(out.Size, [13, 13]);
});

test("axis-omit convention preserved: [] slots stay omitted", () => {
  const out = scaleGeometry({ Size: [100, []] }, 2, 2);
  assert.equal(out.Size[0], 200);
  assert.deepEqual(out.Size[1], []); // width omitted, untouched
});

test("non-numeric slots are left untouched", () => {
  const out = scaleGeometry({ Posn: [50, undefined] }, 2, 2);
  assert.equal(out.Posn[0], 100);
  assert.equal(out.Posn[1], undefined);
});

test("Size is clamped to >= 0 (never negative)", () => {
  const out = scaleGeometry({ Size: [10, 10] }, -1, -1);
  assert.deepEqual(out.Size, [0, 0]);
});

test("the input Properties object is not mutated", () => {
  const props = { Posn: [10, 20], Size: [30, 40], Other: "keep" };
  const snapshot = JSON.parse(JSON.stringify(props));
  const out = scaleGeometry(props, 2, 2);
  assert.deepEqual(props, snapshot); // original unchanged
  assert.notEqual(out, props); // new object
  assert.equal(out.Other, "keep"); // other props carried through
});

test("missing Posn/Size are simply absent in the result", () => {
  const out = scaleGeometry({ Other: 1 }, 2, 2);
  assert.equal("Posn" in out, false);
  assert.equal("Size" in out, false);
  assert.equal(out.Other, 1);
});

// --- harness composition: model the full provider->gate->scale pipeline -----
// Mirrors exactly what a consumer component does, using the real geometry from
// autoconf/BuildAutoConf.aplf + MkArea.aplf. Proves the 0/1/2/3 matrix end to
// end (the DOM wiring still needs the browser/Playwright run).
const child = (ctx, ownAutoConf, Posn, Size) =>
  acShouldReflow(ctx.propagate, ownAutoConf, ctx.baseline)
    ? scaleGeometry({ Posn, Size }, ctx.scaleX, ctx.scaleY)
    : { Posn, Size };

// The four boxes from BuildAutoConf: all design Posn/Size [.. ,170x340].
const BOXES = [
  { ac: 0, posn: [44, 20] },
  { ac: 1, posn: [44, 470] },
  { ac: 2, posn: [290, 20] },
  { ac: 3, posn: [290, 470] },
];

test("interaction 1 (drag form): 1/3 boxes reflow, 0/2 stay fixed", () => {
  // Form: AutoConf 3 (propagates), Size 600x920, dragged to 1.5x (900x1380).
  const formCtx = acScale(
    { width: 1380, height: 900 },
    acBaseline([600, 920]),
    acPropagates(3)
  );
  for (const box of BOXES) {
    const g = child(formCtx, box.ac, box.posn, [170, 340]);
    if (acAccepts(box.ac)) {
      // 1 and 3: reflow proportionally (1.5x)
      assert.deepEqual(g.Posn, [box.posn[0] * 1.5, box.posn[1] * 1.5]);
      assert.deepEqual(g.Size, [255, 510]);
    } else {
      // 0 and 2: stay pinned in px
      assert.deepEqual(g.Posn, box.posn);
      assert.deepEqual(g.Size, [170, 340]);
    }
  }
});

test("interaction 2 (Grow boxes): 2/3 reflow their children, 0/1 pin them", () => {
  // CBGrow WS-grows each box from 170x340 to 230x410. Each box is a provider;
  // its baseline stays the original 170x340 (captured once).
  for (const box of BOXES) {
    const boxCtx = acScale(
      { width: 410, height: 230 },
      acBaseline([170, 340]),
      acPropagates(box.ac)
    );
    // The .br child: design Posn [140,278] Size [22,56], AutoConf default 3.
    const br = child(boxCtx, 3, [140, 278], [22, 56]);
    if (acPropagates(box.ac)) {
      // 2 and 3: child reflows with the grown box
      const sx = 410 / 340;
      const sy = 230 / 170;
      assert.deepEqual(br.Posn, [Math.round(140 * sy), Math.round(278 * sx)]);
      assert.deepEqual(br.Size, [Math.round(22 * sy), Math.round(56 * sx)]);
    } else {
      // 0 and 1: child stays pinned in px
      assert.deepEqual(br.Posn, [140, 278]);
      assert.deepEqual(br.Size, [22, 56]);
    }
  }
});
