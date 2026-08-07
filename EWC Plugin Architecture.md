# EWC Plugin Architecture

This will require ~/dev/ewc/ and ~/dev/ewc-client/ and we will create a new
~/dev/ewc-kendo-test

(We're going to use integrating Kendo as example 1 - if you look at EWC history
there were Kendo components shipped for some time, so we can restore them and
their demos easily)

## Synopsis

The goal is to implement a new plugin architecture for EWC. They are intended to
be simple APL libraries that register themselves with EWC - a typical session
interaction might be:

```
]link.create ~/dev/ewc/EWC
]link.create KendoPlugin ~/dev/ewc-kendo/APLSource
KendoPlugin.Register ⍝ calls EWC.RegisterPlugin...
EWC.Init '...'
⍝ Normal EWC workflow
```

## What's important design-wise

Everything is in the APL library repo. That library will provide new `classes`
for ewc (easy, as APL is dynamic), and it will inject required JS libraries to
the frontend. Two mechanisms are fine: inject on initial load, inject on first
use of library. I tend towards the latter, but NOT strongly at all. Main reason
is that it allows the RegisterPlugin call to happen at any time.

The injection might be JS code shipped with the APL library, or a simple
`2 eNQ'F1' 'EvalJS' '...JS code...'`. It can even fetch from a CDN. We don't
care beyond the code registering classes. It could be as simple as an
`EnsureKendo` call at the top of each Kendo component.

The JS side is trickier - the frontend is a React app with a fixed set of
components. I believe we will need to add a dynamic registry, so that JS
injected from the server can setup the components for SelectComponent to find
them.

So my view is:

* Single APL library containing APL and JS code
* Registered against EWC
* When used, the frontend is injected with all the necessary 'patches' for EWC
  components
