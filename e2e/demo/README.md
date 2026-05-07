# EWC Demo Playwright Tests

Automated UI tests for the EWC Demo application using Playwright, connecting to the HTMLRenderer CEF windows via Chrome DevTools Protocol (CDP).

## Prerequisites

- Node.js 18+
- Yarn
- EWC installation with HTMLRenderer mode
- Dyalog APL 20.0+ (with HTMLRenderer support)

## Installation

```bash
yarn install
```

## Starting EWC Demo with Remote Debugging

To run tests, the EWC Demo must be started with CEF remote debugging enabled. Add these arguments to the Dyalog command line:

```
-cef --remote-debugging-port=8080
```

### Starting from APL

```apl
⍝ Load EWC from parent directory
]link.create # ../ewc/EWC
]link.create # ../ewc/demo

⍝ Run demo in Desktop mode with debugging
0 demo.Run 'Desktop'
```

### Full Command Line Example (macOS)

```bash
/Applications/Dyalog-20.0.app/Contents/Resources/Dyalog/dyalog \
    -cef --remote-debugging-port=8080
```

We currently run with ride using:
```bash
RIDE_INIT="SERVE:*:4502" /Applications/Dyalog-20.0.app/Contents/Resources/Dyalog/mapl -cef --remote-debugging-port=8080
```

Then load and run the demo from the APL session.

## Running Tests

With the EWC Demo running (with remote debugging enabled):

```bash
# Run all tests
yarn test

# Run tests with browser visible (headed mode)
yarn test:headed

# Run tests in debug mode (step through)
yarn test:debug

# View test report
yarn report
```

### Using a Different CDP Port

```bash
CDP_PORT=9222 yarn test
```

## How It Works

1. Playwright connects to the CEF browser via CDP at `http://127.0.0.1:8080`
2. It discovers all HTMLRenderer windows (each appears as a "page")
3. Tests scan pages to find the one with expected elements
4. Standard Playwright assertions and interactions work on the page

## Test Structure

```
tests/
├── demo.spec.ts              # Main demo tests (menu + buttons)
├── helpers/                  # Test utilities
│   ├── cdp-helper.ts         # CDP connection & page finding
│   ├── navigation.ts         # Demo navigation utilities
│   ├── screenshot.ts         # Visual regression helpers
│   ├── wait-helpers.ts       # Smart waiting utilities
│   └── error-collector.ts    # Error accumulation pattern
├── basic/                    # Basic UI demo tests
├── extras/                   # Extra demo tests
├── charts/                   # ApexCharts demo tests
├── flex/                     # Flex demo tests
└── baselines/screenshots/    # Visual regression baselines
```

## Troubleshooting

### "Could not connect to CDP"

- Ensure EWC Demo is running with `-cef --remote-debugging-port=8080`
- Check no other process is using port 8080
- Verify the demo started successfully (HTMLRenderer window visible)

### "No pages found" or wrong page selected

- EWC Demo may have multiple HTMLRenderer windows
- Tests try to find the page with expected elements
- Check test output to see which pages were found

### Screenshots are blank

- The test may have selected the wrong page
- Check `test-results/` folder for screenshots
- Run with `yarn test:debug` to step through

## Available Demos to Test

From `../ewc/demo/DEMOS.apla`:
- **Basic**: Boxes, Buttons, Fonts, Grids, ListView, MsgBox, Password, Pictures, Pie, Poly, Rect, Rotate, Scroll, Splitters, StdColors, Tabs, TextSize, TimerLines, TreeView
- **Extras**: RibbonTabs
- **Charts**: ApexCandleStick, ApexHorizontalBar, ApexMovAvg, ApexSineWave
- **Flex**: FlexLogin

## References

- [Dyalog HTMLRenderer Documentation](https://help.dyalog.com/19.0/Content/GUI/Objects/HTMLRenderer.htm)
- [EWC Test Suite (reference implementation)](https://github.com/Dyalog/ewc/tree/30-testing/Tests)
- [Playwright CDP Documentation](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp)
