# EWC Multi-mode Playwright Tests

End-to-end tests for EWC's **Multi** mode (`EWC.MODE=2`)

Separate from `e2e/demo/` because a Dyalog process runs EWC in exactly one mode.
The demo suite drives a **Browser**-mode server on `:22322`; this one drives a
**Multi**-mode server on `:22323`. Both can run at once.

## The app under test lives in Dyalog/ewc

Only the specs are here. The APL app they drive is `test-apps/multitest/` in
[Dyalog/ewc](https://github.com/Dyalog/ewc), beside the EWC code it exercises, so
`EWC_SRC=/path/to/ewc` swaps backend and fixture together. It links as
`#.multitest` and EWC clones it per session as `#.multitest_1`, `_2`, … — the
names the specs assert on.

Changing a widget id or a callback there is therefore a two-repo change. CI pairs
them automatically when both repos have a branch of the same name; otherwise put
`EWC-REF: <branch>` in the PR body (see `.github/actions/checkout-ewc-server`).

## One user = one playwright context

Contexts are storage- and cookie-partitioned, so this models different people on
different machines.

## Running for CI

```bash
yarn build
yarn ewc-multi:start # start server
yarn multitests      # run tests
yarn ewc-multi:stop
```

## Watching it happen

`:step` and `:watch` are recommended to learn what the test suite is doing

| Command | |
|---|---|
| `yarn multitests:step` | Click through the suite a step at a time |
| `yarn multitests:watch` | Watch it run itself, slowed down |
| `yarn ewc-multi:observe` | Tiled windows to poke at by hand |
| `yarn multitests:ui` | Playwright UI mode, re-runs on change |
| `yarn multitests:trace` | Replay a finished run |

```bash
SLOWMO=800 STEP_PAUSE=2000 yarn multitests:watch
OBSERVE_TILE=520x600 yarn multitests:watch
yarn multitests:watch --grep recycled
```
