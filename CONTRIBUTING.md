# Contributing to EWC

Thanks for helping out. This guide covers how the project is put together and the
conventions we follow. EWC is one repository holding both halves of the product: the
APL server at the root and the React frontend under `client/`.

## Naming

Four similar-looking names, used consistently throughout the docs:

| Name | Meaning |
|---|---|
| **EWC** | The project as a whole. |
| **ewc** | This repository, and the APL server at its root. |
| **ewc-client** | The frontend, in `client/`. Formerly a separate repository. |
| **`eWC`** | EWC's workalike for `⎕WC` — a reimplementation of the same interface, not a wrapper around it. `EWC.Init` creates it in your namespace alongside `eWS`, `eWG`, `eWN`, `eNQ`, `eEX`, `eDQ`. |

`EWC.` also prefixes the APL namespace and its members (`EWC.Init`, `EWC.FOLDER`,
`EWC.Doc.Make`).

## How the two halves fit together

EWC is **one repository, two halves**:

| Path | Language | Responsibility |
|---|---|---|
| `EWC/`, `demo/`, `docs/` | Dyalog APL | The server. Implements `eWC eWS eWG eWN eNQ eEX eDQ` — EWC's workalikes for the `⎕WC` family — owns each class's property/event contract, serves the frontend, ships the demos and the User Guide. |
| `client/` | JavaScript / React | The frontend. Renders the GUI objects the server describes, and reports user events back. |
| `e2e/` | TypeScript / Playwright | End-to-end tests, driving the demos through the real client. |

The two halves talk over a **WebSocket, port `22322`** by default:

- **Browser mode** — the server serves the frontend over HTTP *and* handles the
  WebSocket upgrade on the same port (single origin).
- **Desktop mode** — the frontend runs inside Dyalog's HTMLRenderer (CEF), one renderer
  per form.

The frontend never invents GUI behaviour on its own — the server sends objects and
properties, and the client renders them faithfully to `⎕WC` semantics.

The built client lives in `client/dist/`, which is **git-ignored**. Build it yourself
with `yarn build`; releases ship it as an asset. `EWC/Init.aplf` resolves that path
automatically, so a local build is picked up with no configuration.


### Where does your change belong?

- **APL side** (`EWC/`, `demo/`): property and event semantics, what a class supports,
  server-side messages, demos, the User Guide.
- **Client side** (`client/`): rendering, DOM/CSS, React state, keyboard/mouse behaviour
  in the browser.
- **Both**: most new properties and classes — now a single PR that touches both trees,
  which is the main reason these repositories were merged.

## Getting set up

1. Clone this repository (for example into `/tmp/ewc`).
2. Build the client once, from the repository root:

   ```bash
   yarn install     # installs the workspace: root tooling + client/
   yarn build       # → client/dist, which the server serves
   ```

   All JavaScript tooling is a **yarn workspace rooted here**, so every command runs
   from the repository root — never `cd client`. **Use `yarn`, not `npm`.**

3. Start **Dyalog APL Unicode 18.2 or later**, link the repo and run a demo:

   ```apl
   ]link.create #.EWC /tmp/ewc/EWC
   ]link.create #.demo /tmp/ewc/demo
   demo.Run 'Desktop'    ⍝ or 'Browser', then open http://localhost:22322
   ```

   Link the two APL directories, **not the repository root**: the root now contains
   `client/node_modules`, whose npm package names collide when Link maps them to APL
   names (`acorn-jsx` with `acorn`, `eslint-scope` with `eslint`) and abort the link.
   `ci/setup-ewc.apl` does the same thing for CI.

`Browser` mode is usually easier to develop against — you get browser devtools. See
the [User Guide](https://dyalog.github.io/ewc/latest/) for installation and
configuration detail.

### Working on the frontend with hot reload

```bash
cp client/.env.example client/.env.development   # points VITE_APL_URL at :22322
yarn dev                                          # Vite on :5173, hot reload
```

Run the demo in browser mode from APL, then open <http://localhost:5173>; the page
connects back to the server on `:22322`. Prefer a containerised server?
`yarn ewc-demo:start` runs it in Docker (`:stop`, `:logs`, `:restart` round it out).

## Branching and pull requests

- Development happens on **`main`**. Branch from `main` and open your PR **against
  `main`**. (The older `next`/`devt` branches are retired.)
- Keep PRs focused; describe *why* as well as *what*.
- Before requesting review, check as applicable:
  - Tested against a real application
  - Demo added or updated
  - Tests updated
  - Documentation complete (regenerated reference pages, `RELEASES.md` entry, comments)

## Adding or extending a GUI class

Each class lives in `EWC/classes/<class>/` and is described by small APL arrays:

| File | Purpose |
|---|---|
| `ClassName.apla` | The class name as `⎕WC` spells it (e.g. `'Button'`) |
| `PropList.apla` | Positional property order for `⎕WC` |
| `Supported.apla` | Properties EWC actually supports |
| `Dynamic.apla` | Properties whose value can change while running the application |
| `Defaults.apla` | Default values |
| `SupportedEvents.apla` | Events the class can raise |
| `methodlist.apla` | Supported methods |
| `Limitations.apla` | Caveats — rendered into the class's doc page |

### The property contract is asymmetric

Worth knowing before you wire anything up:

- **`eWC` (creation)** sends *all* properties to the frontend; unsupported ones only warn.
- **`eWS` (runtime change)** is **filtered by `Supported.apla`** (`EWC/dWS.aplf`) — set a
  property that isn't listed and it warns and never reaches the frontend.
- **`eWG` (read)** only asks the frontend for a live value when the property is in
  **`Dynamic.apla`** (`EWC/dWG.aplf`); otherwise the server returns its last stored value.

So a **runtime-settable, live-readable** property needs three edits: `Supported.apla`,
`Dynamic.apla`, and the `get<Class>.js` answer list under
`client/src/components/<Class>/`. All three now live in one commit. `CurCell`,
`InputMode` and `InputModeKey` on Grid are the reference examples.

## Adding or extending a client component

1. Create `client/src/components/<Class>/index.jsx` (plus CSS and hooks as needed).
2. Register it in `client/src/components/SelectComponent.jsx` so that object type routes
   to it.
3. Read properties from `data.Properties` — `Posn`, `Size`, `Values` and friends arrive
   exactly as the server set them.
4. If the server needs to **read** a live value back (`eWG`), add a `get<Class>.js`
   handler and list the property in its `supportedProperties`. Write the live value back
   into the data tree so the read is satisfied from state.

## Documentation

`docs/ObjectRef/*.md` and the `mkdocs.yml` nav are **generated** from the class files by
`EWC.Doc.Make` (`EWC/Doc/`). **Never hand-edit them** — your changes will be overwritten.

- To change a reference page, change the class's `Supported.apla` /
  `SupportedEvents.apla` / `Limitations.apla` and regenerate.
- Regenerate locally with `]Link.Create #.EWC <repo>/EWC` then `#.EWC.Doc.Make`, or run
  the **Update Docs** action, which regenerates in a container and opens a PR.
- Hand-authored pages (`README.md`, `docs/index.md`, `docs/Usage/*`,
  `docs/Discussion/*`) are edited normally.
- Publishing is the **Deploy Docs** action (`mike`, under the `latest` alias). It fires
  on human pushes touching `docs/**`; after merging a bot-authored docs PR you must run
  it manually — a `GITHUB_TOKEN` merge doesn't trigger downstream workflows.

## Demos

Demos are the primary way we exercise and showcase features, and the e2e suite drives them.

- Add `demo/DemoXxx.aplf` and register the name in `demo/DEMOS.apla`.
- **Keep a new demo to about two files** — the `DemoXxx.aplf` itself plus at most one
  callback dispatcher (`CBXxx.aplf`). Prefer one dispatcher over many tiny callbacks.
- Demos are baked in at server start, so restart the server after editing one.

## Tests

APL unit tests live in `tests/` as `test_<thing>.aplf`, using the `assert` helper:

```apl
]link.create #.tests /path/to/ewc/tests
tests.test_proxySpace
```

End-to-end Playwright specs live in `e2e/demo/tests/` and drive the real demos in
`demo/`. `e2e/demo/README.md` is the detailed guide; the short version, all run from the
repository root:

```bash
yarn demotests:browser                      # against Vite on :5173
yarn demotests:browser:basic                # only tests/basic
yarn demotests:browser:headed               # visible browser
yarn demotests:report                       # HTML report from the last run
```

Tests need **both** a built client and a running EWC server on `:22322`. If your change
alters a demo's behaviour, update the matching spec in the same PR — that pairing no
longer spans two repositories.

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


## Code style

Common to both halves:

- Comment *why*, not *what*, and only where the code isn't self-explanatory.
- Don't reference customer names, application names, or incident IDs in code or comments.

APL:

- Match the surrounding code: existing naming, tradfn style, and comment density.

JavaScript:

- **No JSDoc-style comments.** Use plain `//` comments:

  ```javascript
  // Format a value for display
  const formatValue = (value) => { ... }
  ```

- **Lint only the files you changed**, not the whole project — a repo-wide run reports
  pre-existing issues unrelated to your change:

  ```bash
  npx eslint client/src/components/Grid/index.jsx
  ```

## Releasing

Releases are driven by `RELEASES.md`:

1. Add a section at the top:

   ```
   ## [vX.Y.Z] - YYYY-MM-DD

   - Bullet points of user-visible changes
   ```

2. Merge it to `main`. The **Release** workflow then builds the client in-tree, tags
   `vX.Y.Z`, and creates the GitHub Release using your notes, attaching an
   `ewc-vX.Y.Z.zip` asset containing the APL server plus the built `client/dist/`.

The top version in the file is the one released; existing tags are skipped, so the
workflow is idempotent. Keep `EWC/Version.aplf` in step with the released version.

Because `client/dist/` is not committed, **the release asset is the only runnable
download** — GitHub's auto-generated "Source code" archive does not contain a built
client. Say `ewc-vX.Y.Z.zip` when pointing users at a download.

## CI

| Workflow | Trigger | What it does |
|---|---|---|
| `tests.yml` | push, PR, manual | Builds the client and runs Playwright against it, sharded across parallel runners each with a fresh Dyalog/EWC container |
| `update-baselines.yml` | manual | Regenerates visual baselines on the runner, opens a PR |
| `release.yml` | `RELEASES.md` on `main` | Builds, tags, publishes the release asset |
| `update-docs.yml` | manual, or after a release | Regenerates the reference docs and opens a PR |
| `deploy-docs.yml` | push to `docs/**`, manual | Publishes the User Guide with `mike` |

Skip markers, when a run would add nothing:

- **`[NOTEST]`** in the latest commit message, PR title, or PR body — skips `tests.yml`.
- **`[skip ci]`** — GitHub's native marker, suppresses everything.

Doc-only changes (`**.md`, `docs/**`) already skip the test workflow. Note that a PR
opened or merged by `GITHUB_TOKEN` doesn't trigger downstream workflows, so after
merging a baselines or docs PR you may need to re-run the follow-up manually.
