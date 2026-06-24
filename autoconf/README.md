# AutoConf / WS-on-Size comparison harness

A tiny harness to demonstrate **AutoConf (0–3)** and the **WS-on-Size** path, and
to render the *same* APL layout via **native ⎕WC** or **EWC** so they can be
compared side by side.

## How it works
The layout-building code (`BuildAutoConf`, `MkArea`) never calls `⎕WC`/`eWC`
directly — it calls **`xWC`** / **`xWS`**, which dispatch to `⎕WC`/`⎕WS` or
`eWC`/`eWS` based on the global `AC_RENDER`. `eWC` mirrors `⎕WC`'s calling
convention, so one switch is enough.

## Files
- `Run.aplf` — entry point + the switch (`'WC' Run` / `'EWC' Run`).
- `xWC.aplf`, `xWS.aplf` — the ⎕WC-vs-EWC dispatchers.
- `BuildAutoConf.aplf` — the demo layout (a resizable form + 4 AutoConf SubForms).
- `MkArea.aplf` — builds one labelled SubForm with corner children.
- `CBGrow.aplf` — "Grow boxes" button callback: WS-grows all four SubForms.

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
