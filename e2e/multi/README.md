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

`yarn multitests:headed` to watch, `yarn multitests:report` for the HTML report,
`yarn ewc-multi:logs` to follow the Dyalog log — session create/close, thread
kills and namespace expunges all show up there.

`EWC_SRC=/path/to/ewc` overrides which `Dyalog/ewc` checkout is mounted, which is
how you test a candidate EWC fix without touching your main checkout.

`MULTI_URL` overrides the base URL if you're running a hand-started server on
another port.

## What the specs cover

- **`isolation.spec.ts`** — two users get distinct clones, session ids and APL
  threads; variables, event counts and query strings do not leak between them.
- **`lifecycle.spec.ts`** — closing a browser expunges its clone and fires
  `onClose`; a recycled session id gets a clean clone rather than the previous
  occupant's state; repeated connect/disconnect leaves nothing behind.
- **`concurrency.spec.ts`** — simultaneous WG round-trips from several sessions
  each return to the session that asked; interleaved events and writes stay
  attributed to the right session.

`workers: 1`, for a different reason than the demo suite. There it's because one
Browser-mode backend is one session. Here the backend handles many sessions
happily, but the specs assert on **server-wide** state, which two workers' worth
of sessions would make meaningless. The concurrency being tested is between
contexts *inside* a test, not between workers.

## Known failure

**`a session whose socket dies without a Close signal is still reaped` fails.**
This is a real EWC defect, not a flaky test, and it is left red on purpose.

Teardown currently depends entirely on the client's graceful goodbye: the page's
`pagehide` handler (`src/App.jsx:103-126`) sends `{"Signal":{"Name":"Close"}}`,
and EWC tears the session down in ~300 ms. If the socket instead just dies —
laptop lid shut, wifi dropped, browser crashed — the session is **never**
reclaimed. Measured: still present after 60 s of idle, `onClose` never fired, the
thread never killed, the clone never expunged.

`onTimeout.aplf` exists to reap exactly this case (it sweeps `WSS.Conx` with
`LDRC.Exists`), but it is not catching it. For a hosting feature this leaks a
thread and a namespace per lost connection, against `MAXSESSIONS` (default 100) —
consistent with the "Unable to create more than 100 sessions" note in
`ci/ewc-demo-start.sh`. The fix belongs in `Dyalog/ewc`.

## Also found by this suite

`lifecycle.spec.ts`'s churn test **intermittently** wedges an unpatched EWC
server — observed in two of three full runs, never once the fix below is applied.
The failure mode is total: the server stops answering and every later test dies
with `net::ERR_ABORTED`. The Dyalog log shows:

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

Making `Log` ambivalent fixes it:

```apl
∇ {mode}Log msg
  :If 0=⎕NC'mode' ⋄ mode←'' ⋄ :EndIf
  ⎕←msg
∇
```

Verified locally against a patched copy (`EWC_SRC=...`), where the churn test
goes from wedging the server to passing consistently. The fix belongs in
`Dyalog/ewc` and has not been applied there.

## CI

`tests.yml` runs this as the **`e2e-multi`** job — no matrix, its own container
(`SETUP_APL=/scripts/setup-ewc-multi.apl`, port 22323), its own HTML report
artifact (`playwright-report-multi`). It is separate from the sharded `e2e` job
because folding it into that matrix would make all five shards start a second
container four of them would never use. The same `[NOTEST]` gate applies.
