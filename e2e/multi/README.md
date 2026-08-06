# EWC Multi-mode Playwright Tests

End-to-end tests for EWC's **Multi** mode (`EWC.MODE=2`) — one EWC application
hosting many simultaneous users.

Separate from `e2e/demo/` because a Dyalog process runs EWC in exactly one mode.
The demo suite drives a **Browser**-mode server on `:22322`; this one drives a
**Multi**-mode server on `:22323`. Both can run at once.

## What Multi mode does

On each WebSocket upgrade EWC clones the whole application namespace —
`#.mtest` → `#.mtest_1`, `#.mtest_2` — and gives each clone its own APL thread,
`_EWC` state namespace, event-pump Timer and WG rendezvous token. On disconnect
it calls the app's `onClose`, kills the thread and expunges the clone.

There is no authentication and no session resume: identity is the WebSocket
connection. Every user gets the same URL, and only the query string
distinguishes them — it reaches APL via the `Initialise` frame, since the
WebSocket URL itself drops it.

## One user = one browser context

Contexts are storage- and cookie-partitioned, so this models different people on
different machines.

Tabs within a single context are out of scope for now: they share a
`localStorage` jar that the client clears on every Form creation, so a second
tab wipes the first tab's state. That is a client-side problem of its own.

Don't use `e2e/demo/tests/helpers/cdp-helper.ts` here — its
`connectAndFindEWCPage` is a process-wide singleton, so every "user" would be
the same user.

## The mtest app

`apl/mtest/` is a purpose-built APL application, mounted into the container at
`/work/mtest` and linked as `#.mtest`. It lives here rather than in
`Dyalog/ewc` so it versions with the specs that assert against it.

Its job is to make server-side facts readable from a browser: running inside the
interpreter, it can evaluate `⍕⎕THIS`, `_EWC.ID`, `⎕TID` and `#.⎕NL 9` and
render them as Labels. That is how a **surviving** session testifies about a
**departed** one, with no out-of-band channel.

| Element | Shows |
|---|---|
| `F1.WHOAMI` | this session's clone, e.g. `#.mtest_2` |
| `F1.SESSIONID` / `F1.TID` | `_EWC.ID` / the session thread |
| `F1.QUERY` | the `?who=` parameter |
| `F1.PRIVATEIN` / `F1.SETPRIVATE` / `F1.PRIVATE` | a clone-local variable |
| `F1.COUNTER` / `F1.INC` | this session's own event count |
| `F1.CLONES` / `F1.CLOSELOG` | live clones / clones whose `onClose` fired |
| `F1.REFRESH` / `F1.REFRESHN` | re-read those two; sequence number |
| `F1.RUNPROBE` / `F1.PROBE` | WG round-trip probe and verdict |
| `F1.TOKEN` | probe target, holding the clone name |
| `F1.TICK` | 1s auto-refresh Timer, only under `?live=1` |

Three things are load-bearing:

- **`F1.TOKEN` is an `Edit`, not a `Label`.** Only *dynamic* properties reach
  the browser; a Label's `Caption` is answered from APL state, so a probe built
  on one would test nothing.
- **`F1.REFRESHN` is written last** by `CBRefresh`. Frames apply in order, so a
  test watching the counter knows the captions above it are current — which it
  cannot tell from a caption alone.
- **`#.mtestlog` sits outside `#.mtest`**, so it outlives the clones it records.

## Running

```bash
yarn build              # EWC serves dist/ from the sibling mount
yarn ewc-multi:start    # Multi-mode container on :22323 (RIDE on :4503)
yarn multitests
yarn ewc-multi:stop
```

`yarn multitests` will not start a server for you — that would mean CI silently
launching containers. If none is running it fails immediately with the command
to run. The interactive entry points do start one, via `ci/ewc-multi-ensure.sh`,
which reuses a running server rather than rebuilding it; `ewc-multi:start`
always recreates.

`EWC_SRC=/path/to/ewc` mounts a different `Dyalog/ewc` checkout — the way to try
a candidate EWC fix. `MULTI_URL` overrides the base URL.

## Watching it happen

| Command | What it gives you |
|---|---|
| `yarn multitests:step` | Click through the suite a step at a time |
| `yarn multitests:watch` | Watch it run itself, slowed down |
| `yarn ewc-multi:observe` | Tiled windows to poke at by hand |
| `yarn multitests:ui` | Playwright UI mode, re-runs on change |
| `yarn multitests:trace` | Replay a finished run |

All of them tile their windows and label each with its session.

**`multitests:step`** gates each step behind a **Next ▶** button drawn into every
session window, so you can inspect the state, click, and see what that one step
changes. **Run to end ⏭** stops gating for the rest of the run. At the finish the
button becomes **End ⏹** and the windows stay open until you click it —
otherwise `afterEach` would close them the instant the last step returned.
Applies after "Run to end" and after a failure, where seeing what was left
behind is the point.

**`multitests:watch`** runs the same thing unattended with the actions slowed.
Knobs are env vars, and the values in force are printed at the top of each run:

```bash
SLOWMO=800 STEP_PAUSE=2000 yarn multitests:watch
OBSERVE_TILE=520x600 yarn multitests:watch      # smaller screens
yarn multitests:watch --grep recycled           # one test
```

`OBSERVE_TILE` matters on a laptop: the grid divides available screen width by
tile width, so smaller tiles give more columns.

**`ewc-multi:observe [n]`** opens N tiled windows (default 3) and leaves them
open. Each loads with `?live=1`, giving that session a Timer so the Clones and
Closed lists update themselves as you open and close windows. The specs never
pass `?live=1` — they drive `F1.REFRESH` explicitly so they control when a
snapshot is taken.

All of this sits behind `OBSERVE=1` / `STEP_MODE=manual`, so a normal or CI run
is unaffected and takes the same time.

## What the specs cover

- **`isolation.spec.ts`** — distinct clones, session ids and APL threads;
  variables, event counts and query strings don't leak between users.
- **`lifecycle.spec.ts`** — closing a browser expunges its clone and fires
  `onClose`; a recycled session id gets a clean clone; repeated
  connect/disconnect leaves nothing behind; an ungracefully-dropped socket is
  still reaped.
- **`concurrency.spec.ts`** — simultaneous WG round-trips each return to the
  session that asked; interleaved events stay attributed correctly.

`workers: 1`, because the specs assert on server-wide state and two workers
would see each other's sessions in those readouts. The concurrency under test is
between contexts inside a test.

## EWC fixes this suite needs

The suite passes in full only against an EWC carrying two fixes, both described
with patches in [`ewc-fixes/`](ewc-fixes/README.md): the `onTimeout` reaper
guard, and `wss.aplc`'s `Log` arity. Without the first the reaping test fails;
without the second the churn test can wedge the server outright.

## Sharp edges

- `browser.newContext()` ignores config `use: {}` — those options only reach
  contexts Playwright creates for the `page` fixture. Window geometry is set
  explicitly over CDP in `tests/helpers/session.ts`.
- `openSession` waits for `F1.TOKEN`, the *last* widget `Initialise` creates,
  not `F1.WHOAMI`, the first — otherwise it hands back a session whose form is
  still streaming in. Move the wait if you add widgets after it.
- `page.close()` tears a session down; `context.close()` does not, because the
  page never unloads and so never sends its Close signal.
- Only dynamic properties round-trip to the browser (`classes/*/Dynamic.apla`).

## CI

`tests.yml` runs this as the **`e2e-multi`** job — no matrix, its own container
and HTML report artifact. Separate from the sharded `e2e` job, which would
otherwise start a second container in all five shards.

`.github/actions/checkout-ewc-server` resolves the EWC ref as: workflow input →
`EWC-REF: <branch>` in the PR body → same-named branch on `Dyalog/ewc` → `main`.
Until both fixes land on `main`, point CI at a branch that has them.
