# EWC Client

This is the JavaScript/React client for the [EWC project](https://github.com/dyalog/ewc).

## Getting Started

Clone [ewc](https://github.com/dyalog/ewc) and this repository. It is suggested
that you place the two repositories next to each other, for example:

    /my/dev/directory/ewc
    /my/dev/directory/ewc-client

This ensures that when running ewc, it will, by default, pick up the latest
build from ewc-client automatically.

Follow the [instructions for verifying an ewc installation](https://dyalog.github.io/ewc/0.2/Usage/Installation/).

When working on the JavaScript code, we use [vite](https://vite.dev) for hot
reloading. To point to EWC on the default websocket port 22322, simply copy
.env.example:

    cp .env.example .env.development

Then run the vite server:

    vite

For development, it's much easier to run in a browser to use all the tooling.
In APL, you simply change mode from 'Desktop' to 'Browser':

    demo.Run 'Browser'

Then open http://localhost:5173 (assuming default vite port). By default, this
will connect a websockett over the same :22322 port.

