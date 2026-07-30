# Contributing to ewc-client

Thanks for helping out. This guide covers how the project is put together and the
conventions we follow in this repository — **ewc-client**, the frontend.

## Naming

Four similar-looking names, used consistently throughout the docs:

| Name | Meaning |
|---|---|
| **EWC** | The project as a whole. |
| **ewc** | The other repository — the APL server. |
| **ewc-client** | This repository — the frontend. |
| **`eWC`** | The APL cover function for `⎕WC` that `EWC.Init` creates (alongside `eWS`, `eWG`, …). |

## How ewc-client and ewc fit together

EWC is **two repositories, one product**:

| Repo | Language | Responsibility |
|---|---|---|
| [`Dyalog/ewc-client`](https://github.com/dyalog/ewc-client) (this repo) | JavaScript / React | The frontend. Renders the GUI objects the server describes, and reports user events back. |
| [`Dyalog/ewc`](https://github.com/dyalog/ewc) | Dyalog APL | The server. Implements the `⎕WC ⎕WS ⎕WG ⎕WN ⎕NQ ⎕DQ` covers, owns each class's property/event contract, serves this frontend, ships the demos and the User Guide. |

The two halves talk over a **WebSocket, port `22322`** by default. The frontend never
invents GUI behaviour on its own — the server sends objects and properties, and we render
them faithfully to `⎕WC` semantics.

**You need a running ewc server to develop against.** There is no standalone mode.

### How your change reaches users

1. You merge to `main` here.
2. The **Build and Commit Dist** workflow builds and commits `dist/`.
3. When ewc cuts a release, its Release workflow pulls that `dist` into ewc's
   `client/dist/` and tags the release.

So an EWC release bundles a built frontend and users only ever need ewc. Because `dist/`
is committed and bot-maintained, don't fight it in your PRs — let the workflow rebuild it.

### Which repo does your change belong in?

- **ewc-client (here)**: rendering, DOM/CSS, React state, keyboard and mouse behaviour in the browser.
- **ewc**: property and event semantics, what a class supports, server messages, demos,
  the User Guide.
- **Both**: most new properties and classes. Open a PR in each repo and cross-link them
  in the descriptions — reviewers need to see the pair.

## Getting set up

Clone `ewc` and `ewc-client` next to each other so the server picks up your local build:

```
/my/dev/directory/ewc
/my/dev/directory/ewc-client
```

Then:

```bash
yarn install
cp .env.example .env.development     # points VITE_APL_URL at localhost:22322
yarn dev                             # Vite, hot reload on :5173
```

In your APL session run the demo in browser mode (`demo.Run 'Browser'`), then open
<http://localhost:5173>. The page connects back to the server over `:22322`.

Prefer a containerised server? `yarn ewc-demo:start` runs the ewc server in Docker on
`:22322` (`yarn ewc-demo:stop`, `:logs`, `:restart` round it out).

**Use `yarn`, not `npm`**, for every script in this repo.

## Branching and pull requests

- Development happens on **`main`** in both repos. Branch from `main` and open your PR
  **against `main`**. (The older `next`/`devt` branches are retired.)
- The PR template asks you to link the issue, describe the change, and confirm the
  checklist: tested against applications, demo added, tests updated, documentation
  complete.
- Cross-link the paired ewc PR when a change spans both repos.

## Adding or extending a component

1. Create `src/components/<Class>/index.jsx` (plus CSS and hooks as needed).
2. Register it in `src/components/SelectComponent.jsx` so that object type routes to it.
3. Read properties from `data.Properties` — `Posn`, `Size`, `Values` and friends arrive
   exactly as the server set them.
4. If the server needs to **read** a live value back (`⎕WG`), add a `get<Class>.js`
   handler and list the property in its `supportedProperties`.

### Properties that change at runtime

The property contract is asymmetric, and a live-readable property needs edits in **both
repos**:

- `⎕WC` sends all properties at creation.
- `⎕WS` (runtime set) is filtered by the class's `Supported.apla` in the ewc repo.
- `⎕WG` (read) only asks this client for a live value when the property is listed in
  that class's `Dynamic.apla`.

So: `Supported.apla` + `Dynamic.apla` in ewc, and the `get<Class>.js` answer list here.
Write the live value back into the data tree so the read is satisfied from state. Grid's
`CurCell`, `InputMode` and `InputModeKey` are the reference examples.

## Code style

- **No JSDoc-style comments.** Use plain `//` comments:

  ```javascript
  // Format a value for display
  const formatValue = (value) => { ... }
  ```

- Keep comments concise, and only where the code isn't self-explanatory. Comment *why*,
  not *what*.
- Don't reference customer names, application names, or incident IDs in code or comments.

### Linting

**Lint only the files you changed**, not the whole project:

```bash
npx eslint src/components/Grid/index.jsx
```

Avoid running `yarn lint` across the repo — it reports pre-existing issues unrelated to
your change.

## Tests

End-to-end Playwright specs live in `e2e/demo/tests/` and drive the real demos from the
ewc repo. `e2e/demo/README.md` is the detailed guide; the short version:

```bash
yarn demotests:browser                      # against Vite on :5173
yarn demotests:browser:basic                # only tests/basic
yarn demotests:browser:headed               # visible browser
yarn demotests:report                       # HTML report from the last run
```

Tests need **both** a Vite server (`yarn dev`) and a running ewc server (`:22322`).

If your change alters a demo's behaviour, update the matching spec — and if it needs a
demo change, pair it with a PR in the ewc repo.

### Visual regression

Specs whose names contain `visual` compare screenshots against baselines in
`e2e/demo/tests/baselines/screenshots/`, with a deliberately tight pixel threshold.

- **Baselines are Linux-only and CI-managed.** They're generated on the GitHub runner by
  the `update-baselines.yml` workflow, so expect diffs when running on macOS — a local
  failure isn't necessarily a real regression.
- **Never update a baseline without confirming the visual change is intended.** Describe
  what changed, get agreement, then regenerate via the workflow (which opens a PR with
  the new PNGs for review). `yarn demotests:visual` is for *previewing* Linux rendering
  locally, not for committing canonical baselines.

## CI

| Workflow | Trigger | What it does |
|---|---|---|
| `build-and-commit.yml` | push | Builds and commits `dist/` |
| `tests.yml` | push, PR, manual | Runs Playwright against the frontend served by ewc on `:22322` |
| `update-baselines.yml` | manual | Regenerates visual baselines on the runner, opens a PR |

Skip markers, when a run would add nothing:

- **`[NOTEST]`** in the latest commit message, PR title, or PR body — skips `tests.yml`.
- **`[NOBUILD]`** in the commit message — skips the dist build.
- **`[skip ci]`** — GitHub's native marker, suppresses everything.

Doc-only changes (`**.md`, `docs/**`) already skip the build and test workflows. Note
that a PR opened or merged by `GITHUB_TOKEN` doesn't trigger downstream workflows, so
after merging a baselines PR you may need to re-run `tests.yml` manually.
