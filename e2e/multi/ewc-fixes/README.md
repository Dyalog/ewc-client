# EWC fixes this suite depends on

Two defects in `Dyalog/ewc` stop `e2e/multi/` passing in full. Neither is fixed
in `~/dev/ewc`. They are recorded here — rather than only in a scratch
directory — so the actual code survives.

Full analysis and evidence: [`../../MULTI_BUG_REPORT.md`](../../MULTI_BUG_REPORT.md).

## 1. `onTimeout` never reaps lost connections — NOT FIXED ANYWHERE

`EWC/onTimeout.aplf`'s guard is always false:

```apl
:If 2=⎕NC 'WSS.Conx'
```

`Conx` is a `:field public` on the `wss` instance, and `⎕NC` does not classify
through an instance reference — it returns `0` for `'WSS.Conx'`, and also for
`'Conx'` evaluated inside the instance. So the reaper has never run, once, ever.

Consequence: a socket that dies without the client's
`{"Signal":{"Name":"Close"}}` — laptop lid shut, wifi dropped, browser crashed —
leaks its session, its APL thread and (in Multi mode) its cloned namespace,
permanently, against `MAXSESSIONS`.

Confirmed live over RIDE against an abandoned session: Conga *does* know the
socket is gone (`WSS.LDRC.Exists¨WSS.Conx[;1]` → `1 0`), and running the body by
hand with the guard bypassed immediately logged `Killed thread 4` /
`Expunged #.mtest_2`. The body is correct; only the guard is broken.

**To apply**, either drop in the whole file:

```bash
cp e2e/multi/ewc-fixes/onTimeout.aplf ~/dev/ewc/EWC/onTimeout.aplf
```

or apply the patch from the root of `Dyalog/ewc`:

```bash
git -C ~/dev/ewc apply /path/to/ewc-client/e2e/multi/ewc-fixes/onTimeout.patch
```

The patch is against the version on `main` / `arachnophobia` / `mandelbrot`
(identical on all three).

Note the added `:Trap 0`. It is not decoration: `onTimeout` runs on the Listen
thread, where an escaping error suspends the thread and wedges the server for
every user — exactly the failure mode of issue 2.

## 2. `wss.aplc` monadic `Log` called dyadically — ALREADY FIXED UPSTREAM

`EWC/wss.aplc:381` defines `∇ Log msg` (monadic) while `:133`, `:144` and `:148`
call it dyadically. Line 144 fires whenever a non-WebSocket connection errors
out, so the `SYNTAX ERROR` suspends the Listen thread and takes the whole server
down — intermittently, observed in two of three full runs.

**No file is shipped here, because a better fix already exists** on
`origin/mandelbrot` and `origin/arachnophobia` (byte-identical on both). It is
ambivalent, routes through the dyadic `#.EWC.Log` so `LOGMODES` / `LOGFILE`
apply, and traps so a logging failure can never crash Listen:

```apl
∇ {mode} Log msg
 ⍝ EWC plaster on vendored wss: funnel every log through the one dyadic
 ⍝ #.EWC.Log, trapped so a logging failure can never crash the Listen thread
 ⍝ (the whole point of this). Drop it when the vendor updates.
  :If 0=⎕NC'mode' ⋄ mode←'C' ⋄ :EndIf
  :Trap 0 ⋄ mode #.EWC.Log msg ⋄ :Else ⋄ ⎕←mode,': ',msg ⋄ :EndTrap
∇
```

It is **not** on `main`. Cherry-pick it, or merge one of those branches.

This resolves the "symptom mismatch" left open in
`deliberanda/cbrundemo-wedge-fix.md`: that document weighed WG token theft
(which predicts a *timeout*) against `CBRunDemo`'s leaked globals, and neither
explains a `SYNTAX ERROR`. The mtest app shares no code with `CBRunDemo` and
leaks no globals, yet reproduces it.

## Testing a fix without touching your checkout

Both containers honour `EWC_SRC`:

```bash
EWC_SRC=/path/to/some/other/ewc yarn ewc-multi:start
yarn multitests
```

That is how both fixes above were verified. With both applied the suite is
**all green**; without fix 1 the session-reaping test fails; without fix 2 the
churn test intermittently wedges the server.

## CI

`.github/actions/checkout-ewc-server` resolves, in order: the
`workflow_dispatch` input → `EWC-REF: <branch>` in the PR body → a branch on
`Dyalog/ewc` with the same name as this branch → `main`. There is no
`multimode-tests` branch pushed to `Dyalog/ewc`, so CI falls back to `main`,
which has neither fix. Until they land, put

```
EWC-REF: arachnophobia
```

in the PR body — that covers fix 2. Fix 1 needs applying somewhere first.
