# Attach + AutoConf — investigation and comparison demo

Investigation of GH **#97** ("Support the Attach property") and **#495** ("Attach
Property is not implemented with autoconf"), and the dual-render demo built to
check whether our `Attach` behaviour mirrors native Windows `⎕WC`.

## TL;DR

- **#97 and #495 are the same feature.** Both ask for the `Attach` property.
  #97 is the older, richer one (demo, video, full class list, a concrete
  reproducible bug); #495 is a bare restatement in AutoConf terms. The
  maintainer marked #97 a **duplicate of #495** on 2026-07-01.
- **`Attach` is not a separate system — it is the per-edge refinement of
  AutoConf.** Its own docs say it is only effective when the parent's AutoConf
  is 2 or 3 **and** the object's own AutoConf is 1 or 3 — i.e. exactly when a
  reflow already happens.
- **Our engine already implements the `Attach` *default*** (`None None None
  None` = pure proportional scaling) and nothing else. Every non-default
  `Attach` vector is currently ignored by the client, so those edges render
  *wrong* vs Windows.
- The demo in this directory (`RunAttach`, plus the `demo.Run` twin
  `DemoAttach`) renders the four canonical cases from #97 under **both** native
  `⎕WC` and EWC, so the divergence is visible and, once fixed, verifiable.

## The two issues

| | #97 "Support the Attach property" | #495 "…not implemented with autoconf" |
|---|---|---|
| Opened | 2024-01 (originally the old jswc-web repo) | 2026-06-29 |
| Content | `DemoSplitters` sets `Attach` on Grid/List/TreeView; a video shows per-edge resize response; ~35 classes listed as needing it; a concrete bug ("combo/button 100px too far from the right at [800,900]") | one line + a link to the `Attach` docs |
| Status | labelled *needs reinvestigation*; **marked "Duplicate of #495" 2026-07-01** | "connected to a lot of different issues… want someone experienced" |

They are one work item. #97 carries the useful detail; #495 is the AutoConf-era
restatement.

## Why `Attach` is entangled with AutoConf

From the property docs:

> This property is only effective if the value of AutoConf on the parent is 2 or
> 3 and AutoConf for the object itself is 1 or 3.

That gate — parent propagates (bit 1) **and** child accepts (bit 0) — is exactly
the reflow gate the engine already has:

```js
// src/utils/autoconf.js
acShouldReflow(containerPropagates, ownAutoConf, baseline)   // parent&2 ∧ child&1 ∧ baseline
```

So `Attach` never fires outside the AutoConf reflow path. And:

> The default value of Attach is ('None' 'None' 'None' 'None'). This causes the
> object to reposition and resize itself in proportion to its parent.

Proportional-to-parent is precisely what `scaleGeometry` already does. **The
all-`None` case is the special case the engine already implements.** `Attach` is
the generalisation: individual edges opt out of proportional scaling and instead
stay a fixed pixel distance from a parent edge.

## The per-edge model

`Attach` is a 4-element vector `(topEdge leftEdge bottomEdge rightEdge)`. Each
element attaches that edge of the object to an edge of the parent (so its pixel
distance from that parent edge stays fixed under Pixel coords), or `None` (that
edge moves in proportion to the parent's size change):

| Element | Edge of object | Values |
|---|---|---|
| [1] | top | `Top` (fix to parent top) · `Bottom` (fix to parent bottom) · `None` |
| [2] | left | `Left` · `Right` · `None` |
| [3] | bottom | `Top` · `Bottom` · `None` |
| [4] | right | `Left` · `Right` · `None` |

The maths generalises `scaleGeometry` cleanly, using data the context already
carries. For the horizontal axis, with parent baseline width `Wp0 =
ctx.baseline.width`, current `Wp = Wp0 · ctx.scaleX`, child baseline left `L0` /
right `R0`:

- edge `None` → `L0 · scaleX` (today's behaviour)
- left attached `Left` → `L0` (fixed to parent left)
- left attached `Right` → `L0 + Wp0·(scaleX − 1)` (fixed distance from parent right)
- right edges symmetric; then `Posn[1] = L`, `Size[1] = R − L`

When both edges of an axis are `None` this reduces exactly to `scaleGeometry`, so
it is a strict, non-breaking extension. The vertical axis is identical with
`height`/`scaleY`.

`Align` is a shorthand that expands to `Attach` (e.g. `Align 'Top'` ≡ `Attach
('Top' 'Left' 'Top' 'Right')`), so the same helper should expand `Align`.

## Current state in the client

- **Backend forwards `Attach`.** `~/dev/ewc/EWC/classes/*/{PropList,Supported,Defaults}.apla`
  list `Attach` for ~all classes, so it arrives in `data.Properties.Attach`.
- **Client ignores it.** The AutoConf engine (`src/utils/autoconf.js`,
  `useAutoConfStyle`, `AutoConfContext`, `useAutoConfProvider`) only does uniform
  proportional scaling — i.e. the `Attach` default — and never reads the
  `Attach` vector.
- **One ad-hoc precursor.** `src/components/ScrollBar/index.jsx` (~`calculateAttachStyle`)
  is the only component that reads `Attach`; it re-pins to `defaultPosn` via CSS
  and is not tied to the AutoConf scale. It should be folded into / replaced by
  the centralised mechanism so there is one `Attach` path, not two.

## Implementation path

1. **Generalise** `scaleGeometry` → `attachGeometry(Properties, ctx, attach)` in
   `autoconf.js` (pure, unit-testable). The enabling data (`baseline` +
   `scaleX/scaleY`) is **already** on `AutoConfContext` — no context change
   needed. Default/absent `Attach` must reduce to the current behaviour.
2. **`useAutoConfStyle`** reads the child's own `Attach` (and expands `Align` →
   `Attach`) and calls the new function.
3. Because `Attach` lives in the **shared hook**, it applies to all ~35 classes
   automatically once they are migrated to `useAutoConfStyle` — which is already
   **Phase 5** of the AutoConf plan. So #97/#495 largely *fold into* Phase 5.
4. **Cleanup** the ScrollBar ad-hoc path.

## The comparison demo

Two renderings of the *same* layout, so `Attach` can be compared edge for edge:

- **Dual-render harness** (this directory): `RunAttach 'WC'` / `RunAttach 'EWC'`,
  built on the same `xWC`/`xWS` switch as the AutoConf-values demo. Runs under
  native `⎕WC` **and** EWC. Files: `BuildAttach`, `MkAttachBox`, `CBResize`,
  `RunAttach`, `GoAttach`. (See the harness [README](./README.md) for run
  details.)
- **`demo.Run` twin** (`~/dev/ewc/demo/DemoAttach.aplf` + `AtMkBox`,
  `CBResizeDemo`): EWC-only, reachable via the demo picker or `?Demo=Attach`, so
  it can go through the existing Playwright/verify path.

Five boxes that differ **only** in `Attach` (AutoConf is the default 3 on all),
covering #97's canonical cases plus the default:

| Box | Attach | Mirrors (#97) | On grow, the box… |
|---|---|---|---|
| Proportional | `None None None None` | — (the default) | moves **and** grows proportionally |
| Pinned-TL | `Top Left Top Left` | TreeView | stays put, fixed size |
| Toolbar | `Top Left Top Right` | List / `Align 'Top'` | fixed height/top-left; right edge tracks parent right (widens) |
| Fills | `Top Left Bottom Right` | Grid | top-left fixed; bottom+right track parent (fills the corner) |
| Pinned-TR | `Top Right Top Right` | combo/button panel | fixed size, glued to the parent's top-right corner |

Design size `520×840`; the **Resize** button WS-toggles to `720×1160`
(Δ = 200 high, 320 wide; so sx ≈ 1.381, sy ≈ 1.385).

### What EWC must match (once `Attach` is implemented)

- **Pinned-TL** must not move or resize at all — a proportional-only client
  wrongly drifts and grows it.
- **Toolbar**'s right edge must reach the parent's right edge at both sizes
  (fixed height), not scale its height.
- **Fills** must keep equal margins to all four parent edges.
- **Pinned-TR** must keep a constant offset from the top-right corner at a
  constant size — the #97 "combo/button 100px too far from the right" bug is
  exactly this box rendered proportionally.

### The one semantic the demo is designed to resolve

The docs say `Attach` responds to the parent being resized **by the user**. On
native `⎕WC`, check whether the **Resize** button (a `⎕WS` on the form's `Size`)
reconfigures the `Attach` children *identically to dragging the form edge*. If
`⎕WS` does **not** trigger `Attach` reconfiguration on native `⎕WC`, then on the
`⎕WC` side you must **drag** to the target size — because EWC has no form-drag
yet, so WS-on-Size is EWC's *only* way to resize the parent. This is a genuine
unknown; the demo exists partly to settle it against ground truth.

## Scope

**Pixel coords only**, consistent with the rest of the AutoConf work. The docs
note `Attach` reports `Posn`/`Size` differently under `Prop`/`User` coords (the
*values* stay constant while the pixels change — the inverse of Pixel); that is
deferred with the rest of non-Pixel `Coord` support.
