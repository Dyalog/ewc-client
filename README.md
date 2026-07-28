# EWC Client

![EWC-Client Cover](./assets/ewc_client_cover.png)

The JavaScript/React client for [EWC](https://github.com/dyalog/ewc) — it renders
APL `⎕WC` GUI objects as React components in the browser.

## Using EWC

You don't need this repository to *use* EWC. Each EWC release bundles the built
client, so grab one from the main project:

- **Releases:** <https://github.com/dyalog/ewc/releases>
- **Documentation:** [EWC User Guide](https://dyalog.github.io/ewc/latest/)

## Developing the client

To work on the client itself:

1. Clone [`ewc`](https://github.com/dyalog/ewc) and `ewc-client` next to each
   other, so EWC picks up your local build automatically:

        /my/dev/directory/ewc
        /my/dev/directory/ewc-client

2. Install dependencies and point the client at a running EWC (default WebSocket
   port `22322`):

        yarn install
        cp .env.example .env.development

3. Start the Vite dev server (hot reload on port `5173`):

        yarn dev

4. In your APL session, switch the demo to browser mode:

        demo.Run 'Browser'

   then open <http://localhost:5173> — it connects back to EWC over `:22322`.

## Contributing

Development happens on `main`; open pull requests against `main`. See
[CONTRIBUTING.md](CONTRIBUTING.md) for conventions, testing, and how this repo relates
to the main `ewc` project.
