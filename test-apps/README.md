# test-apps

EWC applications used as fixtures by the test suites, plus the demo gallery the
suites drive.

| Directory | What it holds |
|---|---|
| `test-apps/demo/` | The sample gallery - a human picks a demo from a menu, and `e2e/demo/` drives the same demos |
| `test-apps/multitest/` | A Multi-mode app, exercised only by `e2e/multi/` |
| `tests/` | In-process APL unit tests (`assert.aplf`, `test_*.aplf`), at the repo root |

`demo/` is both things at once: the gallery a user opens to see what EWC can do,
and the fixture the ~455-test Playwright suite asserts against. That dual role is
why it lives here rather than in its own top-level directory.

## Contents

| App | Mode | Port | Driven by |
|---|---|---|---|
| `demo` | Desktop / Browser | 22322 | `e2e/demo/` Playwright suite, and people |
| `multitest` | Multi (`EWC.MODE=2`) | 22323 | `e2e/multi/` Playwright suite |

## Running one

Linked alongside `EWC/`, then started by its own `Run`. Example:

```apl
]link.create /path/to/ewc/EWC
]link.create /path/to/ewc/test-apps/multitest
EWC.FOLDER←'/path/to/ewc'
multitest.Run
```

The demo is the same shape:

```apl
]link.create /path/to/ewc/EWC
]link.create /path/to/ewc/test-apps/demo
EWC.FOLDER←'/path/to/ewc'
demo.Run 'Desktop'    ⍝ or 'Browser', then open http://localhost:22322
```

Both resolve their own asset folders from the linked function's file location,
so `EWC.FOLDER` only needs setting when Link can't supply it (`]link.import`, or
no file-system watcher).
