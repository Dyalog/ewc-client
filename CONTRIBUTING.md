# Contributing to ewc

Thanks for helping out. This guide covers how the project is put together and the
conventions we follow in this repository — **ewc**, the APL server.

## Naming

Four similar-looking names, used consistently throughout the docs:

| Name | Meaning |
|---|---|
| **EWC** | The project as a whole. |
| **ewc** | This repository — the APL server. |
| **ewc-client** | The other repository — the frontend. |
| **`eWC`** | EWC's workalike for `⎕WC` — a reimplementation of the same interface, not a wrapper around it. `EWC.Init` creates it in your namespace alongside `eWS`, `eWG`, `eWN`, `eNQ`, `eEX`, `eDQ`. |

`EWC.` also prefixes the APL namespace and its members (`EWC.Init`, `EWC.FOLDER`,
`EWC.Doc.Make`).

## How ewc and ewc-client fit together

EWC is **two repositories, one product**:

| Repo | Language | Responsibility |
|---|---|---|
| [`Dyalog/ewc`](https://github.com/dyalog/ewc) (this repo) | Dyalog APL | The server. Implements `eWC eWS eWG eWN eNQ eEX eDQ` — EWC's workalikes for the `⎕WC` family — owns each class's property/event contract, serves the frontend, ships the demos and the User Guide. |
| [`Dyalog/ewc-client`](https://github.com/dyalog/ewc-client) | JavaScript / React | The frontend. Renders the GUI objects this side describes, and reports user events back. |

The two halves talk over a **WebSocket, port `22322`** by default:

- **Browser mode** — the server serves the frontend over HTTP *and* handles the
  WebSocket upgrade on the same port (single origin).
- **Desktop mode** — the frontend runs inside Dyalog's HTMLRenderer (CEF), one renderer
  per form.

This repo carries a **built copy of the frontend** in `client/dist/`, so a release is
self-contained — users never need to clone or build ewc-client. That directory is
refreshed automatically by the Release workflow from `ewc-client@main`; **don't
hand-edit it**.

### Which repo does your change belong in?

- **ewc (here)**: property and event semantics, what a class supports, server-side
  messages, demos, the User Guide.
- **ewc-client**: rendering, DOM/CSS, React state, keyboard/mouse behaviour in the browser.
- **Both**: most new properties and classes. Open a PR in each repo and cross-link them
  in the descriptions — reviewers need to see the pair.

## Getting set up

1. Clone this repository (for example into `/tmp/ewc`).
2. Start **Dyalog APL Unicode 18.2 or later**.
3. Link the repo and run a demo:

   ```apl
   ]link.create # /tmp/ewc
   demo.Run 'Desktop'    ⍝ or 'Browser', then open http://localhost:22322
   ```

`Browser` mode is usually easier to develop against — you get browser devtools. See
the [User Guide](https://dyalog.github.io/ewc/latest/) for installation and
configuration detail.

## Branching and pull requests

- Development happens on **`main`** in both repos. Branch from `main` and open your PR
  **against `main`**. (The older `next`/`devt` branches are retired.)
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

So a **runtime-settable, live-readable** property needs three edits: `Supported.apla`
here, `Dynamic.apla` here, and ewc-client's `get<Class>.js` answer list.
`CurCell`, `InputMode` and `InputModeKey` on Grid are the reference examples.

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
]link.create # /path/to/ewc
tests.test_proxySpace
```

End-to-end UI tests (Playwright) live in **ewc-client** under `e2e/demo/` and drive the
demos in this repo. If you change a demo that a spec relies on, update the spec in the
matching ewc-client PR.

## Code style

- Match the surrounding APL: existing naming, tradfn style, and comment density.
- Comment *why*, not *what*, and only where the code isn't self-explanatory.
- Don't reference customer names, application names, or incident IDs in code or comments.

## Releasing

Releases are driven by `RELEASES.md`:

1. Add a section at the top:

   ```
   ## [vX.Y.Z] - YYYY-MM-DD

   - Bullet points of user-visible changes
   ```

2. Merge it to `main`. The **Release** workflow then pulls the latest `dist` from
   `ewc-client@main` into `client/dist/`, commits it, tags `vX.Y.Z`, and creates the
   GitHub Release using your notes.

The top version in the file is the one released; existing tags are skipped, so the
workflow is idempotent. Keep `EWC/Version.aplf` in step with the released version.
