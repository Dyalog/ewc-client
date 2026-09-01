# Installation                                     
 
EWC is developed as an open-source GitHub repository.

## To use EWC

Download the **`ewc-vX.Y.Z.zip`** asset from the
[latest release](https://github.com/dyalog/ewc/releases) and unpack it. It contains the
APL server and a matching prebuilt JavaScript client, so nothing else is needed — no
Node.js and no build step.

!!! warning "Use the named asset"
    Take `ewc-vX.Y.Z.zip`, **not** GitHub's auto-generated "Source code" archive. The
    built client is not committed to the repository, so only the named asset contains a
    runnable EWC.

## To develop EWC

Clone the repository and build the client once:

```
git clone https://github.com/dyalog/ewc.git
cd ewc
yarn install
yarn build
```

That produces `client/dist`, which the server locates automatically. All JavaScript
commands are a yarn workspace rooted at the repository root, so they run from there —
there is no need to change into `client/`. See
[CONTRIBUTING.md](https://github.com/dyalog/ewc/blob/main/CONTRIBUTING.md) for the full
development workflow.

## Verify Installation

The simplest way to verify installation is to run the demo application:

```
]link.create #.EWC /path/to/ewc/EWC
]link.create #.demo /path/to/ewc/demo
demo.Run 'Desktop'
```

!!! note "Why two links, not `]link.create # /path/to/ewc`"
    Linking the repository root would also walk `client/` — including
    `node_modules` once you have run `yarn install`. Link maps directory names to
    APL names, and npm package names collide when it does (`acorn-jsx` with
    `acorn`, `eslint-scope` with `eslint`), which aborts the whole link. Naming the
    two APL directories keeps the link to the code you actually want.


This will pop up a form with a Dyalog logo and a dropdown on the right which allows
you to select a variety of simple test applications that have been used to test
EWC during development.

Note that, if you use `]link.import` instead of `]link.create`, or you do not have
.NET and a File System Watcher available, you will also need to set the variable
`EWC.FOLDER` to point to the location of the EWC repository. For example:

```
EWC.FOLDER←'/tmp/ewc'
```

`EWC.FOLDER` must be the **repository root**, not the `EWC` subdirectory — EWC looks
for the JavaScript client at `<EWC.FOLDER>/client/dist/`.

## The Demo Application

The [demo application](Demo.md) provides several examples that illustrate the use of
EWC. It supports Desktop, Browser and Multi modes - and will run in the mode that you
select using the right argument.

For each example in the drop-down menu, you will find the corresponding source code
in a function called `demo.DemoXXX`, where `XXX` is the name selected in the drop-down.

## Building your Own Application

After linking ewc, you can create a form as follows:

```
EWC.Init 'Desktop'
'F1' eWC 'Form' 'Hello World' (10 10) (400 600)
```

This should create an HTMLRenderer window with the caption "Hello World". For more
information on getting started, see [initialisation](Initialisation.md).

## Upgrading

Releases are independent downloads; unpack a newer one alongside or over the old
folder. If you are working from a clone, `git pull` and re-run `yarn build` to refresh
the client.
