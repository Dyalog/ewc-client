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

## State in the client

- **Backend forwards `Attach`.** `~/dev/ewc/EWC/classes/*/{PropList,Supported,Defaults}.apla`
  list `Attach` for ~all classes, so it arrives in `data.Properties.Attach`.
- **`attachGeometry` is now implemented and wired** (source; a client build is
  Neil's). See below.
- **One ad-hoc precursor remains.** `src/components/ScrollBar/index.jsx`
  (~`calculateAttachStyle`) re-pins to `defaultPosn` via CSS and is not tied to
  the AutoConf scale. It should be folded into / replaced by the centralised
  mechanism so there is one `Attach` path, not two. *(Not yet done.)*

## Implementation — done / remaining

**Done:**
1. **`attachGeometry(Properties, ctx, attach)`** in `src/utils/autoconf.js` —
   pure, generalises `scaleGeometry`, reduces to it exactly for absent / malformed
   / all-`None` `Attach`. Uses the `baseline` + `scaleX/scaleY` already on
   `AutoConfContext` (no context change). 8 unit tests in `autoconf.test.js`
   (exact px for all five canonical cases + the reduction/no-mutation properties).
2. **Wired** into `SubForm/index.jsx` (its bespoke reflow) and the shared
   `useAutoConfStyle` hook (reads the component's own `Properties.Attach`). Both
   are behaviour-preserving when `Attach` is absent/`None`.

**Remaining:**
- `Align` → `Attach` expansion (docs: `Align 'Top'` ≡ `Top Left Top Right`) —
  the helper should expand `Align`; not yet added.
- Migrate the rest of the positioned components to `useAutoConfStyle` (Phase 5)
  so every class honours `Attach`. The ones already on the hook (Button, Label,
  List, Combo, Treeview, ListView, Edit, TabControl, Splitters, …) get it now.
- Fold in / remove the ScrollBar ad-hoc path.
- Non-`Pixel` `Coord` (see Scope).

## Tests

- **Unit** (`src/utils/autoconf.test.js`, `yarn test` = `node --test`): the
  Windows-correct px for each canonical case. **Pass.**
- **Visual e2e** (`~/dev/ewcdemotest/tests/basic/attach.spec.ts`): drives
  `DemoAttach`, measures each box relative to the form before/after Resize, and
  asserts the per-edge invariants below. Numeric geometry, **not** a pixel
  snapshot (a snapshot would freeze whatever renders today). These assert
  *expected* behaviour, so they fail on a proportional-only client and pass with
  `attachGeometry`. **Verified green** against live vite source
  (`BROWSER_URL=http://localhost:5273`, backend `demo.Run 'Browser'` on 22322);
  all five cases match native ⎕WC exactly (Pinned-TL pixel-exact, Toolbar width
  800→1120, Fills 470×150→790×350, Pinned-TR x680→1000 fixed-size, Proportional
  ×scale). A deployed-dist run still needs a client build.

  The spec loads the demo via **`?Demo=Attach`**, NOT the picker combo — see the
  baseline bug below.

## ⚠ Separate pre-existing bug: stale AutoConf baseline across the demo picker

Selecting a demo through the picker combo leaves the previous form's AutoConf
**baseline** on the reused `F1`: the menu form is ~400×300, so a subsequently
selected 840×520 demo form reports scale ≈ 2.1×1.73 **at rest** and every
reflowing child is wrong before any resize (Toolbar width 800→1240, Pinned-TR
flung to x1121, etc.). Loading the same demo directly with `?Demo=Attach` mounts
`F1` fresh and everything is pixel-exact. This is **not** an Attach bug
(`attachGeometry` is correct; Pinned-TL is exact either way) — it is the Form
provider's `baselineRef` not resetting when the form's Size/identity changes.
`attachGeometry` just makes it glaring because attached edges diverge visibly
where uniform proportional scaling hid it. Worth fixing in the AutoConf provider
(reset the captured baseline when the authored Size changes).

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
- **Native `⎕WC` self-checking test** (Windows), `autoconf/AttachWC*.aplf`:
  `]LINK.Create #.autoconf <dir>` then `#.autoconf.AttachWCRun`. Builds the same
  five boxes under real `⎕WC`; drag the form edge (or click **Grow** = `⎕WS`
  Size), then **Check** prints a PASS/FAIL table comparing each box's live `⎕WG`
  Posn/Size to the Attach-correct geometry for the *current* form size (so it
  validates any resize). `AttachWCExpect` is the same edge math as
  `attachGeometry`; verified to emit the same numbers as the browser test
  (B2 800→1120, B4 x650→970 fixed-size, …). Comparing a drag vs Grow also settles
  whether `⎕WS`-on-Size reconfigures Attach children like a user drag.

  **Coord 'Pixel' caveat:** the docs say an *attached* edge's Posn/Size "remains
  unaffected" by a resize, while a *None* edge's changes. So `⎕WG` on a fully
  pinned box may return its *design* numbers after a resize — that is Attach
  *working* (the box stayed put), not a no-op. The Check prints `exp` vs `act`
  side by side so whatever native reports is visible rather than assumed.

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
