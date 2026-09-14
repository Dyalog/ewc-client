# EWC

![EWC Cover](docs/img/ewc_cover.png)

EWC ("Everywhere Window Create") is a cross-platform implementation of Dyalog APL's
`⎕WC` GUI family, currently a growing subset of `⎕WC`'s functionality. 

It lets a `⎕WC` application run outside Windows - on Linux, macOS or Windows - either in
a desktop window or in a browser. The supported subset grows with the needs of early
adopters; see the [object reference](https://dyalog.github.io/ewc/latest/ObjectRef/Classes/) to check what is covered.

> **Status:** EWC is under active development and not yet supported through normal Dyalog channels.

**Documentation:** the [EWC User Guide](https://dyalog.github.io/ewc/latest/) covers
installation, configuration, and a reference page for every supported class.

## Requirements

- Dyalog APL Unicode **18.2 or later**
- **Desktop mode** needs the HTMLRenderer - currently Linux, macOS and Windows
- **Browser modes** run on any Dyalog-supported platform
- **Only to build the client from source:** Node.js and Yarn 1 (classic) -
  [install guide](https://classic.yarnpkg.com/en/docs/install). A release download
  needs neither; see [Quick start](#quick-start) below.

## Quick start

Just want to use EWC? A release is self-contained - **no Node.js, no yarn, no build
step**. Three steps:

1. **Download and unpack** the **`ewc-vX.Y.Z.zip`** asset from the
   [latest release](https://github.com/dyalog/ewc/releases).

   > Take that named asset, **not** GitHub's auto-generated "Source code" archive. The
   > built client isn't committed to the repository, so only `ewc-vX.Y.Z.zip` runs.

2. **Start Dyalog APL** and link the two APL directories:

        ]link.create #.EWC /path/to/ewc/EWC
        ]link.create #.demo /path/to/ewc/test-apps/demo

3. **Run the demo**:

        demo.Run 'Desktop'

   You get a form with a dropdown of sample applications (about 100 of them). The source
   for each is the function `demo.DemoXXX`, where `XXX` is the name in the dropdown.

Then build your own:

```apl
EWC.Init 'Desktop'
'F1' eWC 'Form' 'Hello World' (10 10) (400 600)
```

`EWC.Init` creates `eWC`, `eWS`, `eWG`, `eWN`, `eNQ`, `eEX` and `eDQ` in the calling
namespace - EWC's workalikes for `⎕WC`, `⎕WS`, `⎕WG`, … They reimplement the same
interface rather than wrapping the system functions, so you call them instead of, not
alongside, the originals. A left argument changes the prefix (`'x' EWC.Init 'Browser'`
gives `xWC`, `xWS`, …).

> Using `]link.import` instead of `]link.create` (or running without .NET / a file system
> watcher)? Also set `EWC.FOLDER←'/path/to/ewc'`.

## Developing EWC

Building the client from source is the only reason you need Node.js and
[yarn](https://classic.yarnpkg.com/en/docs/install):

    git clone https://github.com/dyalog/ewc.git
    cd ewc
    yarn install     # installs the workspace: root tooling + client/
    yarn build       # → client/dist, which the server serves

Then link and run exactly as in [Quick start](#quick-start) above. Every yarn command
runs from the repository root - there is no need to `cd client`.

> Link the two APL directories, **not** the repository root. Link maps directory names
> to APL names, and once `client/node_modules` exists npm package names collide
> (`acorn-jsx` with `acorn`, `eslint-scope` with `eslint`), which aborts the whole link.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development workflow.

## Releases

Releases are tagged `vX.Y.Z` and published on the
[releases page](https://github.com/dyalog/ewc/releases); the notes for each one live in
[RELEASES.md](RELEASES.md).

Every release ships an `ewc-vX.Y.Z.zip` asset containing the APL server **and** a
prebuilt copy of the React client in `client/dist/`, so a release is self-contained -
no Node.js and no build step to use EWC. The built client is deliberately not committed
to the repository; it is produced by the Release workflow.

## Modes

`EWC.Init` (and `demo.Run`) take the mode as a right argument:

| Mode | Behaviour |
|---|---|
| `'Desktop'` | Each form gets its own HTMLRenderer window - closest to `⎕WC`. |
| `'Browser'` | The server serves the client and listens on port `22322` (configurable); one browser session, so effectively a single form. |
| `'Multi'` | Experimental. Multiple browser sessions; the application namespace is cloned per connection (`demo_1`, `demo_2`, …) so each has its own state. Requires the `e` prefix, and an `Initialise` function to build the GUI per session. |

## Documentation

The [**EWC User Guide**](https://dyalog.github.io/ewc/latest/) is the full documentation.
Useful starting points:

- [Installation](https://dyalog.github.io/ewc/latest/Usage/Installation/) and
  [initialisation](https://dyalog.github.io/ewc/latest/Usage/Initialisation/)
- [Configuration](https://dyalog.github.io/ewc/latest/Usage/Configuration/) - port,
  folders, resources, logging
- [Supported classes](https://dyalog.github.io/ewc/latest/ObjectRef/Classes/) - per-class
  properties and events
- [EWC versus `⎕WC`](https://dyalog.github.io/ewc/latest/Discussion/Differences/) - known
  differences and limitations

If you are new to `⎕WC` itself, start with the standard Dyalog GUI documentation; the EWC
docs only describe where EWC differs.

## Repository layout

EWC is one repository with two halves that talk over a WebSocket (port `22322` by
default):

| Path | What it is |
|---|---|
| `EWC/` | The APL server - implements the `eWC` family and owns each class's property and event contract. Link this with `]link.create #.EWC <repo>/EWC`. |
| `test-apps/demo/` | The demo application (~100 examples), also what the e2e suite drives. |
| `docs/` | This User Guide, published to <https://dyalog.github.io/ewc/>. |
| `client/` | The frontend - a JavaScript/React app that renders the GUI objects the server describes and reports user events back. Builds to `client/dist/`. |
| `e2e/` | Playwright tests, driving the demos through the real client. |

Not to be confused with **`eWC`** - EWC's workalike for `⎕WC`, which `EWC.Init` creates
in your namespace.

All JavaScript tooling is a yarn workspace rooted at the repository root, so `yarn
install`, `yarn build` and the test commands all run from there - there is no need to
change directory into `client/`.


## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how the project fits together and the
conventions we follow. Development happens on `main`; open pull requests against `main`.

## Licence

MIT (Dyalog Ltd.) - see [LICENSE](LICENSE).
