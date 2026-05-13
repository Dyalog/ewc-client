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

Local dev against the ewc-demo Docker container:

```bash
yarn install
yarn build                              # build dist/ so EWC serves your changes
yarn ewc-demo:start                   # start Docker dyalog with EWC on :22322
BROWSER_URL=http://localhost:22322 npx playwright test
yarn ewc-demo:stop                    # when done
```

NOTE: Visual regressions are baselined for linux so they may fail on other Operating systems

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
| `yarn ewc-demo:start` | Start `ewc-demo` Docker container; block until `:22322` answers HTTP |
| `yarn ewc-demo:stop` | `docker rm -f ewc-demo` |
| `yarn ewc-demo:logs` | `docker logs -f ewc-demo` |
| `yarn ewc-demo:restart` | Idempotent: same as `:start`, always replaces a running container |

The start script (`ci/ewc-demo-start.sh`) also exposes RIDE on `:4502`, so
you can attach a RIDE client to the running interpreter for live APL
inspection while tests run.

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
3. The bot regenerates baselines on the runner and **opens a PR** against your branch with the new PNGs.
4. Review the diffs in the PR's "Files changed" tab — confirm the visual changes match the UI change you intended, then merge.
5. After merge, the next `tests.yml` run on your branch sees byte-identical pixels and passes. **Note:** the baselines-PR merge is authored by `GITHUB_TOKEN`, which doesn't fire downstream workflows — so `tests.yml` won't re-run automatically. Use the manual rerun option (or push any commit) to confirm the new baselines pass.

Re-running the workflow against the same branch updates the existing PR rather than opening a new one. After the PR merges, the bot's branch is auto-deleted.

The local `yarn demotests:visual{,:update}` scripts are for *previewing* — what
does my UI change look like on Linux Chromium? — not for committing canonical
baselines.

## CI

Three workflows live in `.github/workflows/`:

| Workflow | Trigger | What it does |
|---|---|---|
| `build-and-commit.yml` | push | Builds and commits `dist/` |
| `tests.yml` | push, PR, manual (`workflow_dispatch`) | Runs Playwright against `:22322` (EWC-served browser mode) |
| `update-baselines.yml` | manual (`workflow_dispatch`) | Regenerates visual baselines on the runner; opens a PR for review |

`tests.yml` and `update-baselines.yml` both use `ci/run-server.sh` to bring up
the Dyalog/EWC backend in a Docker container with the same setup as
`yarn ewc-demo:start` does locally. Both also share
`.github/actions/checkout-ewc-server/` for resolving which `Dyalog/ewc` branch
to build against.

`[NOTEST]` markers are **ignored** on manual dispatch — clicking
"Run workflow" is explicit intent and overrides the skip.

### Skipping `tests.yml`

Two ways to suppress the test workflow on a given commit/PR:

- **`[NOTEST]` in the latest commit message, PR title, or PR body** —
  uppercase, mirrors `[NOBUILD]` for `build-and-commit.yml`. The
  `check` job greps all three signals (commit message via
  `git log -1 --pretty=%B`, PR title and body via the event payload)
  and skips the e2e job when any of them contains the marker. Use for
  commits where re-running tests adds nothing (e.g. comment-only edits
  in a tested file, doc updates inside a code dir). Putting it in the
  PR title is the convenient option since you don't need a new
  commit — but note that *editing* a PR title alone doesn't refire
  the workflow; you'd need any new push event to trigger the re-eval.
- **Doc-only PRs** — `tests.yml` already skips PRs that only touch
  `**.md`, `README`, or `docs/**`, so renaming sections of this
  README or editing other docs won't burn CI minutes.

For the absolute nuke, GitHub's native `[skip ci]` / `[ci skip]` /
`[no ci]` markers in a commit message suppress *all* workflows
(including `build-and-commit.yml`).
