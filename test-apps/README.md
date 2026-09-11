# test-apps

EWC applications that exist to be driven by automated tests, rather than to be
read by people.

| Directory | What it holds |
|---|---|
| `demo/` | The sample gallery — a human picks a demo from a menu |
| `tests/` | In-process APL unit tests (`assert.aplf`, `test_*.aplf`) |
| `test-apps/` | Whole EWC apps used as fixtures by external test suites |

## Contents

| App | Mode | Port | Driven by |
|---|---|---|---|
| `multitest` | Multi (`EWC.MODE=2`) | 22323 | `ewc-client`'s `e2e/multi/` Playwright suite |

## Running one

Linked alongside `EWC/`, then started by its own `Run`. Example:

```apl
]link.create /path/to/ewc/EWC
]link.create /path/to/ewc/test-apps/multitest
EWC.FOLDER←'/path/to/ewc'
multitest.Run
```
