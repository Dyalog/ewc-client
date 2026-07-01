# AutoConf / WS-on-Size comparison harness

A tiny harness to demonstrate **AutoConf (0–3)**, the **WS-on-Size** path, and
the **Attach** property, and to render the *same* APL layout via **native ⎕WC**
or **EWC** so they can be compared side by side.

Two demos share the same dual-render switch:
- **AutoConf values** — `Run` / `BuildAutoConf` (the 0/1/2/3 matrix; see below).
- **Attach** — `RunAttach` / `BuildAttach` (the per-edge property; jump to
  [The Attach demo](#the-attach-demo)).

## How it works
The layout-building code (`BuildAutoConf`, `MkArea`) never calls `⎕WC`/`eWC`
directly — it calls **`xWC`** / **`xWS`**, which dispatch to `⎕WC`/`⎕WS` or
`eWC`/`eWS` based on the global `AC_RENDER`. `eWC` mirrors `⎕WC`'s calling
convention, so one switch is enough.

## Files
- `Run.aplf` — AutoConf-values entry point + the switch (`Run 'WC'` / `Run 'EWC'`).
- `xWC.aplf`, `xWS.aplf` — the ⎕WC-vs-EWC dispatchers (shared by both demos).
- `BuildAutoConf.aplf` — the AutoConf-values layout (a resizable form + 4 AutoConf SubForms).
- `MkArea.aplf` — builds one labelled SubForm with corner children.
- `CBGrow.aplf` — "Grow boxes" button callback: WS-grows all four SubForms.
- `RunAttach.aplf` — **Attach** entry point (`RunAttach 'WC'` / `RunAttach 'EWC'`).
- `BuildAttach.aplf` — the Attach layout (a resizable form + 5 boxes, one Attach case each).
- `MkAttachBox.aplf` — builds one labelled box for a single Attach vector.
- `CBResize.aplf` — "Resize" button callback: WS-toggles the form 520×840 ⟷ 720×1160.
- `GoAttach.aplf` — EWC driver that pumps events from within `#.autoconf` (see below).

## Run it
**Native ⎕WC (Windows):**
```apl
]LINK.Create #.autoconf /path/to/ewc/autoconf
'WC' #.autoconf.Run
```
**EWC (browser):**
```apl
]LINK.Create #.EWC      /path/to/ewc/EWC
]LINK.Create #.autoconf /path/to/ewc/autoconf
'EWC' #.autoconf.Run        ⍝ then open a browser to :22322
```

## What to look at — the full matrix

You need **two** interactions to separate all four AutoConf values; neither
alone is enough.

**1. Drag the form's edge** — tests *accept vs ignore the parent resize*:

| AutoConf | on parent (form) resize |
|---|---|
| 0 | ignore — stays fixed in px (drifts toward top-left) |
| 1 | accept — reflows to keep relative geometry |
| 2 | ignore — stays fixed in px |
| 3 | accept — reflows to keep relative geometry |

This separates **{0,2} from {1,3}** — but 0 looks identical to 2 here, and 1
to 3, because the *propagate* half hasn't fired (0/2 never resize, so they have
nothing to propagate).

**2. Click "Grow boxes"** (WS-on-Size on all four) — tests *propagate vs not to
children*:

| AutoConf | box resized directly | its TL/BR children |
|---|---|---|
| 0 | grows | stay pinned in px |
| 1 | grows | stay pinned in px |
| 2 | grows | reflow with the box (Configure propagated) |
| 3 | grows | reflow with the box (Configure propagated) |

This separates **{0,1} from {2,3}**. Between the two interactions every cell of
the 0/1/2/3 matrix is exercised. (On native ⎕WC the boxes are also `Sizeable`,
so you can drag one box's edge instead of clicking the button — does EWC support
that, or only the WS path?)

## What EWC must match
- **Drag form** → do 1/3 reflow proportionally while 0/2 stay put?
- **Grow boxes** (WS-on-Size) → does EWC apply each new `Size`, and do 2/3 reflow
  their children while 0/1 keep them pinned?
- This is the **SubForm-bigger-than-its-Form** case from PR #482 — watch whether a
  grown box overflows its parent the same way (or differently) in each renderer.

## The Attach demo

`Attach` refines AutoConf: it is only effective when the parent's AutoConf is
2 or 3 **and** the object's own AutoConf is 1 or 3 — i.e. exactly when a reflow
would already happen. It then controls, per edge, whether that edge stays a fixed
pixel distance from the corresponding parent edge (*attached*) or moves in
proportion to the parent's size change (*not attached*). The all-`None` default
is pure proportional scaling — which is all the current EWC engine does — so this
demo exists to check the **attached-edge** cases, where a proportional-only
implementation diverges from Windows.

The 4 elements are `(topEdge leftEdge bottomEdge rightEdge)`. This demo covers
the four canonical cases from issue #97 plus the default:

| Box | Attach | Mirrors (#97) | On grow, the box… |
|---|---|---|---|
| Proportional | `None None None None` | — (the default) | moves **and** grows proportionally |
| Pinned-TL | `Top Left Top Left` | TreeView | stays put, fixed size |
| Toolbar | `Top Left Top Right` | List / `Align 'Top'` | fixed height/top-left; right edge tracks parent right (widens) |
| Fills | `Top Left Bottom Right` | Grid | top-left fixed; bottom+right track parent (fills the corner) |
| Pinned-TR | `Top Right Top Right` | combo/button panel | fixed size, glued to the parent's top-right corner |

Every box uses the **default AutoConf 3**, so *only* `Attach` differs between
them — any divergence you see is attributable to `Attach` alone.

### Run it
**Native ⎕WC (Windows) — the ground truth:**
```apl
]LINK.Create #.autoconf /path/to/ewc/autoconf
#.autoconf.RunAttach 'WC'
```
Then either **drag the form edge**, or click **Resize** (WS-on-Size), or both.

**EWC (browser):**
```apl
]LINK.Create #.EWC      /path/to/ewc/EWC
]LINK.Create #.autoconf /path/to/ewc/autoconf
#.autoconf.RunAttach 'EWC'      ⍝ then open a browser to :22322
#.autoconf.GoAttach '.'         ⍝ pump events from within #.autoconf
```
Then click **Resize** (EWC can't drag the form yet). Compare the box geometry at
each size against the native ⎕WC window.

### The one semantic this demo is designed to resolve
The docs say Attach responds to the parent being resized **by the user**. On
native ⎕WC, therefore, **check whether the Resize button (a `⎕WS` on the form's
`Size`) reconfigures the Attach children identically to dragging the form edge.**
If ⎕WS does *not* trigger Attach reconfiguration on native ⎕WC, then on the ⎕WC
side you must **drag** to the printed target size (520×840 ⟷ 720×1160) — the
button is only guaranteed to be a valid driver on EWC (which treats a `Size`
change as a resize). This distinction matters because EWC has no form-drag yet,
so WS-on-Size is currently EWC's *only* way to resize the parent.

### What EWC must match (once Attach is implemented)
- **Pinned-TL** must not move or resize at all — a proportional-only client wrongly
  drifts and grows it.
- **Toolbar**'s right edge must reach the parent's right edge at both sizes (fixed
  height), not scale its height.
- **Fills** must keep equal margins to all four parent edges.
- **Pinned-TR** must keep a constant offset from the top-right corner at a constant
  size — the #97 "combo/button 100px too far from the right" bug is exactly this box
  rendered proportionally.

## Not yet covered — Coord (Pixel vs Prop)
This harness is **Pixel** coords only. The docs note AutoConf reports `Posn`/`Size`
differently under `'Prop'`/`'User'` coords (the *values* stay constant while the
pixels change — the inverse of Pixel). If GAMA's forms use Prop/User, that's worth
a second variant; say the word and I'll add an `AC_COORD` switch alongside
`AC_RENDER`.

## Caveats (please review — APL/EWC isn't my home turf)
- The **EWC-init block in `Run.aplf`** is modelled on `demo.Run` but the client-dist
  auto-location is install-specific; if `Init` can't find it, set `EWC.JSClientFolder`
  (or `EWC.FOLDER`) first, as `demo.Run` does. Alternatively, drop `BuildAutoConf`
  into a `Demo*` function and run it through the existing `demo.Run 'Browser'`
  framework (which already handles all the setup).
- `⎕WC` positional/property names used (`AutoConf`, `Sizeable`, `EdgeStyle`,
  `BCol`, `Coord`) are standard, but worth a sanity check on your Dyalog version.
