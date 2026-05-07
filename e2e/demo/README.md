# EWC Demo Playwright Tests

End-to-end Playwright tests for the EWC demo. Exercises the full stack:
the React UI (this package's `dist/`), EWC's WebSocket server (Dyalog APL),
and the demos under `Dyalog/ewc/demo/`.

## How tests connect to EWC

Tests connect via the `BROWSER_URL` env var. Three modes are supported:

| Mode | `BROWSER_URL` | Used by |
|---|---|---|
| **Browser, EWC-served** *(CI)* | `http://localhost:22322` | `tests.yml`, visual baselines |
| **Browser, Vite-served** *(local dev)* | `http://localhost:5173` | `yarn demotests:browser*` |
| **Desktop CDP** *(legacy)* | *(unset)* | EWC in CEF mode (`--remote-debugging-port=8080`) |

In Browser, EWC-served mode (the most common path now), EWC's own WebSocket
Server serves the React client over HTTP at `:22322` AND handles the
WebSocket upgrade on the same port — single origin.

In Browser, Vite-served mode, the React client is served by `vite` (port
5173) with hot reload. The bundled JS reads `VITE_APL_URL` to know it should
WebSocket-connect to `localhost:22322` for the APL backend.

CI exclusively uses Browser, EWC-served (no Vite — production-style).

## Quick start

Local dev against the dyalog-server Docker container:

```bash
yarn install
yarn build                              # build dist/ so EWC serves your changes
yarn ewc-server:start                   # start Docker dyalog with EWC on :22322
BROWSER_URL=http://localhost:22322 \
  npx playwright test e2e/demo/tests/basic/buttons.spec.ts
yarn ewc-server:stop                    # when done
```

Local dev against your own Dyalog APL session + Vite (hot-reload-friendly):

```bash
# Terminal 1: start a Dyalog APL session with EWC + demo linked,
#             then run `1 demo.Run 'Browser'` so the EWC WebSocket
#             server listens on :22322 (see ../ewc/README for setup).
# Terminal 2:
yarn dev                                # Vite preview on :5173
# Terminal 3:
yarn demotests:browser                  # baked-in BROWSER_URL=http://localhost:5173
```

## Available scripts

### Running tests

| Command | What it does |
|---|---|
| `yarn demotests:browser` | All tests against `http://localhost:5173` (Vite + a local Dyalog APL session running EWC) |
| `yarn demotests:browser:basic` | Same, only `basic/` |
| `yarn demotests:browser:headed` | Same, with a visible browser |
| `yarn demotests:browser:debug` | Same, with the Playwright Inspector |
| `yarn demotests:report` | Open the HTML report from the last run |
| `yarn demotests:record` | Playwright codegen against `:5173` |

### Visual regression (Docker-wrapped)

| Command | What it does |
|---|---|
| `yarn demotests:visual` | Run via Microsoft Playwright Docker image — useful for *previewing* visual diffs locally before pushing |
| `yarn demotests:visual:update` | Same, but `UPDATE_BASELINES=1` overwrites local PNGs |

> **Local-Docker baselines are NOT canonical for CI.** There's a ~1% per-pixel
> delta between the Microsoft Playwright Docker image and the GitHub runner's
> native Playwright install. See [Visual regression](#visual-regression) below.

### Dyalog/EWC server lifecycle

| Command | What it does |
|---|---|
| `yarn ewc-server:start` | Start `dyalog-server` Docker container; block until `:22322` answers HTTP |
| `yarn ewc-server:stop` | `docker rm -f dyalog-server` |
| `yarn ewc-server:logs` | `docker logs -f dyalog-server` |
| `yarn ewc-server:restart` | Idempotent: same as `:start`, always replaces a running container |

The start script (`ci/ewc-server-start.sh`) also exposes RIDE on `:4502`, so
you can attach a RIDE client to the running interpreter for live APL
inspection while tests run.

## Test layout

```
e2e/demo/
├── tests/
│   ├── basic/                          # the test specs (~111 tests)
│   │   ├── buttons.spec.ts
│   │   ├── combo.spec.ts
│   │   ├── nugrid*.spec.ts             # NuGrid suite
│   │   ├── pictures.spec.ts
│   │   ├── pie.spec.ts
│   │   ├── rect.spec.ts
│   │   ├── stdcolors.spec.ts
│   │   ├── subform-{edit,combo,grid,nested}.spec.ts
│   │   └── textsize.spec.ts
│   ├── helpers/                        # connection + navigation utilities
│   │   ├── cdp-helper.ts               # browser launch + page-find logic
│   │   ├── navigation.ts               # demo selection from the menu combobox
│   │   ├── screenshot.ts
│   │   ├── wait-helpers.ts
│   │   └── error-collector.ts
│   └── baselines/screenshots/          # visual-regression PNGs (CI-managed)
└── README.md                           # this file
```

CI infrastructure (Docker entrypoints, APL setup script, server lifecycle)
lives at the repo root in `ci/`, not under `tests/`.

## Visual regression

Tests whose names contain `visual` capture full-page screenshots via
`expect(page).toHaveScreenshot(...)` and compare against committed baselines
under `tests/baselines/screenshots/`. The default pixel threshold is
intentionally tight (`maxDiffPixels: 100`) so that small layout shifts in
this UI library show up as test failures, not silent drift.

**Baselines are managed by CI**, not committed from local-dev. The
`update-baselines.yml` workflow regenerates them on the GitHub Linux runner;
`tests.yml` compares on the same runner — so the comparison environment is
byte-identical to the baseline-generation environment, and the tight
threshold doesn't trip on noise.

To regenerate baselines after an intentional UI change:

1. Push your change to a branch.
2. GitHub → **Actions** → **update visual baselines** → **Run workflow** → select your branch.
3. The bot regenerates baselines on the runner and commits them back.
4. The next `tests.yml` run on your branch sees byte-identical pixels and passes.

The local `yarn demotests:visual{,:update}` scripts are for *previewing* — what
does my UI change look like on Linux Chromium? — not for committing canonical
baselines.

## CI

Three workflows live in `.github/workflows/`:

| Workflow | Trigger | What it does |
|---|---|---|
| `build-and-commit.yml` | push | Builds and commits `dist/` |
| `tests.yml` | after build, also on PR | Runs Playwright against `:22322` (EWC-served browser mode) |
| `update-baselines.yml` | manual (`workflow_dispatch`) | Regenerates visual baselines on the runner; commits back |

`tests.yml` and `update-baselines.yml` both use `ci/run-server.sh` to bring up
the Dyalog/EWC backend in a Docker container with the same setup as
`yarn ewc-server:start` does locally.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `EWC server did not come up within 60 seconds` | `run-server.sh` errored. Check `yarn ewc-server:logs`. |
| `Unable to create more than 100 sessions` (in dyalog logs) | Container's been running through too many test runs. `yarn ewc-server:restart`. |
| `wait-on tcp:22322` hangs | Dyalog container is up but `:22322` not bound — usually a `]link.create` failure. Inspect `docker logs dyalog-server`. |
| Tests show "waiting for `[role="combobox"]`" timeout | Browser connected but EWC didn't push the demo menu. Container session limit, demo.Run wait-loop hung, or stale APL state — restart the container. |
| Visual tests fail with ~1% pixel diff | Baselines were generated in a different environment than CI. Regenerate via the **update visual baselines** workflow. |
| `dist/` warning on server start | EWC will fall back to the bundled client inside the ewc repo. Run `yarn build` first so it serves your local React changes. |

## Available demos

From `../ewc/demo/DEMOS.apla`:

- **Basic**: Boxes, Buttons, Combo, Fonts, Grids, ListView, MsgBox, Password, Pictures, Pie, Poly, Rect, Rotate, Scroll, Splitters, StdColors, Tabs, TextSize, TimerLines, TreeView
- **SubForm**: SubFormEdit, SubFormCombo, SubFormGrid, SubFormNested
- **Extras**: RibbonTabs
- **Charts**: ApexCandleStick, ApexHorizontalBar, ApexMovAvg, ApexSineWave
- **Flex**: FlexLogin

## References

- [Playwright `chromium.launch`](https://playwright.dev/docs/api/class-browsertype#browser-type-launch)
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)
- [Playwright `workflow_dispatch` for visual baselines](https://playwright.dev/docs/ci-intro#testing-visual-changes)

