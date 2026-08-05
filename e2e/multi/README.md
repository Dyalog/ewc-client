# EWC Multi-mode Playwright Tests

End-to-end tests for EWC's **Multi** mode (`EWC.MODE=2`) — the mode that hosts
one EWC application for many simultaneous users.

These are separate from `e2e/demo/` because a Dyalog process runs EWC in exactly
one mode. The demo suite drives a **Browser**-mode server on `:22322`; this suite
drives a **Multi**-mode server on `:22323`. Both can run at the same time.

## What Multi mode does

On each WebSocket upgrade, `newSession.aplf:14` clones the whole application
namespace:

```apl
code←⍎((⍕CODELOCATION),'_',⍕SESSIONID)⎕NS CODELOCATION   ⍝ #.mtest → #.mtest_1, _2, …
```

Each clone gets its own APL thread (`Handler.aplf:46`), its own `_EWC` state
namespace, its own event-pump Timer, and its own WG rendezvous token. On
disconnect, `endSession.aplf` calls the app's `onClose` hook, `⎕TKILL`s the
thread and `⎕EX`s the clone.

There is **no authentication and no session resume**. Identity is the WebSocket
connection and nothing else; every user gets the same URL, and only the query
string distinguishes them (it reaches APL via the `Initialise` frame's `URL`
field, since the WebSocket URL itself drops the query string).

## One user = one browser context

Each simulated user is a Playwright `BrowserContext`. Contexts are storage- and
cookie-partitioned, so this models *different people on different machines* —
the scenario Multi mode exists for.

Tabs within a **single** context are deliberately out of scope for now. They
share one `localStorage` jar, and `src/App.jsx:218-221` calls
`localStorage.clear()` on every Form creation, so a second tab wipes the first
tab's client state. That is a real bug, but it is a client-side one and fixing it
means reworking ~150 `localStorage` call sites (`src/Globals.js` documents the
problem in its own header comment). Multi-tab coverage waits on that.

Do **not** use `e2e/demo/tests/helpers/cdp-helper.ts` here. Its
`connectAndFindEWCPage` is a process-wide singleton that returns the same page
every time — every "user" would be the same user.

## The mtest app

`apl/mtest/` is a purpose-built APL application, mounted into the container at
`/work/mtest` and linked as `#.mtest`. It lives in this repo, not in
`Dyalog/ewc`, so it versions in lockstep with the specs that assert against it.

Its job is to make server-side facts assertable from a browser. Because it runs
inside the interpreter it can evaluate `⍕⎕THIS`, `_EWC.ID`, `⎕TID` and `#.⎕NL 9`
and render them into Labels — which means a **surviving** session can testify
about a **departed** one. That is how teardown and id-recycling get asserted with
no RIDE client and no out-of-band channel.

| Element | Shows |
|---|---|
| `F1.WHOAMI` | `⍕⎕THIS` — this session's clone, e.g. `#.mtest_2` |
| `F1.SESSIONID` / `F1.TID` | `_EWC.ID` / the session thread's `⎕TID` |
| `F1.QUERY` | the `?who=` parameter, from `_EWC.QUERY` |
| `F1.PRIVATEIN` / `F1.SETPRIVATE` / `F1.PRIVATE` | a clone-local variable |
| `F1.COUNTER` / `F1.INC` | this session's own event count |
| `F1.CLONES` | live `mtest_*` namespaces |
| `F1.CLOSELOG` | clones whose `onClose` has fired, from `#.mtestlog` |
| `F1.REFRESH` / `F1.REFRESHN` | re-read the two views; sequence number |
| `F1.TICK` | 1s auto-refresh Timer — only created when `?live=1` |
| `F1.RUNPROBE` / `F1.PROBE` | WG round-trip probe and its verdict |
| `F1.TOKEN` | probe target, seeded with the clone name |

Two details are load-bearing:

- **`F1.TOKEN` is an `Edit`, not a `Label`.** Only *dynamic* properties actually
  go to the browser. `classes/label/Dynamic.apla` is empty, so `eWG 'Caption'` is
  answered from APL state without a round-trip and would test nothing;
  `Edit.Text` is dynamic, so reading it exercises the real
  `⎕TGET`/`⎕TPUT` rendezvous. Seeding it with the clone name makes a
  mis-routed reply self-evident.
- **`F1.REFRESHN` is written last by `CBRefresh`.** A test can't tell a stale
  `CLONES` value from a freshly-written identical one. WebSocket frames apply in
  order, so waiting for the counter to change proves the captions above it are
  current. Without this the helper reads a pre-refresh snapshot.

`#.mtestlog` deliberately sits **outside** `#.mtest`: clones are `⎕EX`'d on
disconnect, so a log held inside would die with the session it recorded.

## Running

```bash
yarn build              # EWC serves dist/ from the sibling mount
yarn ewc-multi:start    # Multi-mode container on :22323 (RIDE on :4503)
yarn multitests
yarn ewc-multi:stop
```

**The server is not started for you by `yarn multitests`** — that would mean CI
silently launching containers. If it isn't running the suite fails immediately
with a message telling you the command to run, rather than a browser full of
"This site can't be reached". The two interactive entry points
(`multitests:watch`, `ewc-multi:observe`) *do* start one if it's missing, via
`ci/ewc-multi-ensure.sh`, which reuses a running server rather than rebuilding
it. `yarn ewc-multi:ensure` does that on its own.

Note `ewc-multi:start` always destroys and recreates the container; `ensure`
only starts one when nothing is answering.

`yarn multitests:headed` to watch, `yarn multitests:report` for the HTML report,
`yarn ewc-multi:logs` to follow the Dyalog log — session create/close, thread
kills and namespace expunges all show up there.

`EWC_SRC=/path/to/ewc` overrides which `Dyalog/ewc` checkout is mounted, which is
how you test a candidate EWC fix without touching your main checkout.

`MULTI_URL` overrides the base URL if you're running a hand-started server on
another port.

## Watching it happen

Multi mode is much easier to believe once you've seen it, so there are five ways
to watch — three live, two after the fact.

| Command | What it gives you |
|---|---|
| `yarn multitests:step` | Click through the suite a step at a time |
| `yarn multitests:watch` | Watch it run itself, slowed down |
| `yarn ewc-multi:observe` | Tiled windows to poke at by hand |
| `yarn multitests:ui` | Playwright UI mode, re-runs on change |
| `yarn multitests:trace` | Replay a finished run |

All of them tile their windows and label each one with its session.

### `yarn multitests:watch` — watch the suite drive real users

```bash
yarn multitests:watch
```

Starts a Multi server if one isn't already up (and reuses it if it is), then
runs the suite in real windows with actions slowed down, painting a banner
along the bottom of **every open session window** naming that session
(`#.mtest_2`) and the step currently running. So when the suite says "A sets its
private value to 'alpha'", you see it typed in A's window and you see B's
Private line not move.

The lifecycle specs are the ones to watch: the observer window's `Clones` and
`Closed` lines are where teardown becomes visible.

Windows are tiled rather than stacked, so you can see every session at once. A
session takes the lowest free slot and gives it back when it closes, so a
long-lived observer keeps its position while short-lived sessions cycle through
the slot beside it.

Every knob is an environment variable, set in front of the command. The current
values are printed at the top of each run so you don't have to remember them:

```bash
SLOWMO=800 yarn multitests:watch                  # slow the actions (default 350ms)
STEP_PAUSE=2000 yarn multitests:watch             # dwell on each step (default 900ms)
OBSERVE_TILE=520x600 yarn multitests:watch        # smaller windows (default 600x660)
SLOWMO=800 STEP_PAUSE=2000 yarn multitests:watch  # combine freely
yarn multitests:watch --grep recycled             # watch one test
```

`OBSERVE_TILE` is worth reaching for on a laptop display: the grid is computed
by dividing the available screen by the tile size, so smaller tiles mean more
columns. The default fits the mtest form (which occupies x 50–570, y 50–450)
plus the banner.

All of this is gated on `OBSERVE=1`, which only `multitests:watch` sets — a
normal or CI run is untouched and takes the same time either way.

One more that bites: `openSession` waits for `#F1.TOKEN`, not just
`#F1.WHOAMI`. WHOAMI is the *first* widget `Initialise.aplf` creates (before its
`:Trap`), so waiting on it alone hands back a session whose form is still
streaming in — and the next click finds no control. TOKEN is the *last* widget,
so it proves the whole form arrived. If you add widgets after it, move the wait.

Two more that bite if you change this code: config `use: { viewport }` does
**not** apply to these sessions, because `openSession` calls
`browser.newContext()` directly and those options only reach contexts Playwright
creates for the `page` fixture. And Chromium puts every new window in the same
place, so the tiling is done explicitly over CDP
(`Browser.getWindowForTarget` → `Browser.setWindowBounds`) in
`tests/helpers/session.ts`.

### `yarn multitests:step` — click through it yourself

```bash
yarn multitests:step
```

Same windows as watch mode, but nothing happens until you say so. Each session
window's banner gains two buttons:

```
┌─────────────────────────────────────────────────────────────┐
│ #.mtest_1                                                   │
│ B sets its own value to 'beta'      [ Next ▶ ] [ Run to end ⏭ ] │
│ ⟵ click Next to run this                                    │
└─────────────────────────────────────────────────────────────┘
```

The banner names the step that is *about* to run, so you can look at the state
first, then click **Next ▶** and watch exactly what that one step changes.
Clicking in any window advances them all. **Run to end ⏭** drops back to running
normally for the rest of the run, without restarting.

When the test finishes, the control becomes **End ⏹** and the windows are held
open until you click it. Without that hold the last step's body would return,
`afterEach` would close everything, and the final state — the one you stepped
all the way through to see — would be on screen for a few milliseconds. The hold
applies after "Run to end" too (which means *get me to the end*, not *and then
throw it away*), and after a **failing** test, where seeing what was actually
left behind is the whole point.

The terminal follows along, so you can see where you are without reading the
windows:

```
  ⏸  A sets its private value to 'alpha'   [Next ▶]
  ⏸  B is untouched by it   [Next ▶]
  ⏹  test complete — click End to tear down
```

The hold lives in `teardown()` (`tests/helpers/session.ts`), which every spec's
`afterEach` calls instead of closing sessions itself — so a new spec gets the
behaviour by using the same one-liner.

There is no test timeout in this mode — the gap between steps is however long
you take. The first step of each test runs straight through, because it opens
the first session and there is no window to click in yet.

`--grep` is especially worth it here: `yarn multitests:step --grep recycled`
walks just the session-id recycling test, which is the most interesting one to
take slowly.

### `yarn multitests:ui` — step through with time travel

Playwright's UI mode. Every step is named (the specs are written with `step()`),
so you get a clickable list of beats and, for each one, the exact DOM of each
window at that moment. Best for "what precisely was on screen when that
assertion ran?" — and it re-runs on file change.

### `yarn ewc-multi:observe [n]` — an interactive playground

```bash
yarn ewc-multi:observe 3
```

Opens N tiled windows (default 3, each its own EWC session) and leaves them
open for you to poke at. Each is loaded with `?live=1`, which gives that session
a 1-second Timer that re-reads the server-wide views — so the `Clones` and
`Closed` lines update themselves as you open and close windows, no clicking
required.

`?live=1` is opt-in and the specs never pass it: they drive `F1.REFRESH`
explicitly so they control exactly when a snapshot is taken.

Worth trying: type in one window's Private box and watch the others ignore it;
close a window with the OS button and watch the survivors drop it from `Clones`
and gain it in `Closed`; hit *Run WG probe* in several windows at once and check
each reports its own clone name.

### Traces — after the fact

`multitests:watch` records a trace for every test (`trace: 'on'` under
`OBSERVE`). Open one with `yarn multitests:trace <path-to-trace.zip>`, or browse
them from `yarn multitests:report`. Same step-by-step DOM snapshots as UI mode,
but rewindable after the run — which is how to inspect a CI failure.

## What the specs cover

- **`isolation.spec.ts`** — two users get distinct clones, session ids and APL
  threads; variables, event counts and query strings do not leak between them.
- **`lifecycle.spec.ts`** — closing a browser expunges its clone and fires
  `onClose`; a recycled session id gets a clean clone rather than the previous
  occupant's state; repeated connect/disconnect leaves nothing behind.
- **`concurrency.spec.ts`** — simultaneous WG round-trips from several sessions
  each return to the session that asked; interleaved events and writes stay
  attributed to the right session.

Everything passes against an EWC carrying the two fixes below, in well under a
minute. Against `Dyalog/ewc` `main` the reaping test fails and the churn test
intermittently wedges the server — both for the reasons documented there, not
because Multi mode's isolation is wrong. Multi mode's core promise (a private
clone, thread and event pump per user) holds up under every test here.

`workers: 1`, for a different reason than the demo suite. There it's because one
Browser-mode backend is one session. Here the backend handles many sessions
happily, but the specs assert on **server-wide** state, which two workers' worth
of sessions would make meaningless. The concurrency being tested is between
contexts *inside* a test, not between workers.

## Required EWC fixes

The suite passes in full **only against an EWC that carries both fixes below**.
Neither is in this repo; both belong in `Dyalog/ewc`.

### 1. `onTimeout` never reaps lost connections — `EWC/onTimeout.aplf`

Session teardown currently depends entirely on the client's graceful goodbye: the
page's `pagehide` handler (`src/App.jsx:103-126`) sends
`{"Signal":{"Name":"Close"}}` and EWC tears the session down in ~300 ms. If the
socket instead just dies — laptop lid shut, wifi dropped, browser crashed — the
session was **never** reclaimed: still present after 60 s idle, `onClose` never
fired, thread never `⎕TKILL`ed, clone never `⎕EX`ed. That leaks a thread and a
namespace per lost connection against `MAXSESSIONS` (default 100), consistent
with the "Unable to create more than 100 sessions" note in
`ci/ewc-demo-start.sh`.

`onTimeout.aplf` exists to reap exactly this. Its guard is the problem:

```apl
:If 2=⎕NC 'WSS.Conx'      ⍝ ALWAYS FALSE
```

`Conx` is a `:field public` on the `wss` instance, and `⎕NC` does not classify
through an instance reference — it returns `0` for `'WSS.Conx'`, and also for
`'Conx'` evaluated inside the instance. So the guard never passed and the reaper
never ran, once, ever.

Confirmed live over RIDE against an abandoned session: Conga *does* know the
socket is gone (`WSS.LDRC.Exists¨WSS.Conx[;1]` → `1 0`), and running the body
by hand with the guard bypassed immediately logged `Killed thread 4` /
`Expunged #.mtest_2`. The body is correct; only the guard is broken.

`⎕NC 'WSS'` does classify (returns `9`), and `Conx` is initialised with the
instance, so:

```apl
:Trap 0
    :If 9=⎕NC 'WSS'
    :AndIf 0≠≢conns←WSS.Conx[;1]
    :AndIf ∨/m←~WSS.LDRC.Exists¨conns
        endSession¨{0 ⍵ 'Close'}¨m/conns
    :EndIf
:Else
    'E' Log 'onTimeout failed: ',⊃⎕DMX.DM
:EndTrap
```

The `:Trap` is not decoration: this runs on the Listen thread, where an escaping
error suspends the thread and wedges the server for every user — exactly the
failure mode of issue 2 below.

### 2. `wss.aplc` monadic/dyadic `Log` — already fixed upstream

`wss.aplc:381` defines `∇ Log msg` (monadic) while `:133`, `:144` and `:148` call
it dyadically. Line 144 fires when a non-WebSocket connection errors out, so the
`SYNTAX ERROR` suspends the Listen thread and takes the whole server down.

**Already fixed on `mandelbrot` and `arachnophobia`** (identical on both), which
make `Log` ambivalent, route it through the dyadic `#.EWC.Log` so `LOGMODES` /
`LOGFILE` apply, and trap it so a logging failure can never crash Listen. It is
**not** on `main`. See "How this suite found it" below.

## How this suite found the `Log` wedge

`lifecycle.spec.ts`'s churn test **intermittently** wedges an EWC server that
lacks fix 2 — observed in two of three full runs, never once it is applied. The
failure mode is total: the server stops answering and every later test dies with
`net::ERR_ABORTED`. The Dyalog log shows:

```
2:SYNTAX ERROR: The function does not take a left argument
Listen[31] 'C'Log'Client disconnected (Conga ',(⍕4⊃wres),') on non-WS connection ',(2⊃wres)
```

`wss.aplc:381` defines `∇ Log msg` — monadic — but three call sites in the Listen
loop (`:133`, `:144`, `:148`) call it dyadically, copying `#.EWC.Log`'s
convention. Line 144 fires whenever a non-WebSocket connection errors out, which
suspends the Listen thread and takes the whole server down.

This resolves the "symptom mismatch" left open in
`deliberanda/cbrundemo-wedge-fix.md`: that document weighed WG token theft
(predicting a *timeout*) against `CBRunDemo`'s leaked globals, and neither
explains a `SYNTAX ERROR`. The mtest app shares no code with `CBRunDemo` and
leaks no globals, yet reproduces it — so the demo-side hygiene fix cannot be the
cure. It also explains the intermittency: line 144 only fires when a non-WS
connection produces a Conga `Error` event, which depends on exactly how each
teardown is seen.

The churn test is therefore a **regression test** for the `mandelbrot` /
`arachnophobia` fix — it is what will tell you if that fix is ever lost or if
`main` ships without it.

## Which EWC ref CI builds against

`.github/actions/checkout-ewc-server` resolves, in order: the
`workflow_dispatch` input → `EWC-REF: <branch>` in the PR body → a branch on
`Dyalog/ewc` with the same name as this branch → `main`.

At time of writing neither fix is on `Dyalog/ewc` `main`, and the local
`multimode-tests` branch there is not pushed — so CI falls back to `main` and
`e2e-multi` will fail the reaping test and intermittently wedge on churn. Until
both fixes land on `main`, point CI at a branch that has them:

```
EWC-REF: arachnophobia
```

in the PR body (that branch carries fix 2; fix 1 still needs applying anywhere).

Locally, `EWC_SRC=/path/to/ewc` does the same job — it is how both fixes were
verified without touching the main checkout.

## CI

`tests.yml` runs this as the **`e2e-multi`** job — no matrix, its own container
(`SETUP_APL=/scripts/setup-ewc-multi.apl`, port 22323), its own HTML report
artifact (`playwright-report-multi`). It is separate from the sharded `e2e` job
because folding it into that matrix would make all five shards start a second
container four of them would never use. The same `[NOTEST]` gate applies.
