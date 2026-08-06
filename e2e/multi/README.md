# EWC Multi-mode Playwright Tests

End-to-end tests for EWC's **Multi** mode (`EWC.MODE=2`)

Separate from `e2e/demo/` because a Dyalog process runs EWC in exactly one mode.
The demo suite drives a **Browser**-mode server on `:22322`; this one drives a
**Multi**-mode server on `:22323`. Both can run at once.

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
