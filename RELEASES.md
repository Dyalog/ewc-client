# Releases

## [Unreleased]

## [0.4.0] - 2026-07-06

### New
- `Grid`: Rewrite of our old grid implementation with lots of new features and better parity with `⎕WC`
- `e2e/`: UI testing using Playwright is now a part of ewc-client
   - Adds automated visual regressions tests to github
- `EWC.LOGFILE` option: Logs can now be written to a text file rather than the session

### Improved
- `Label`, `Text`, `Subform`, `Combo`, `Grid` layout fixes 
- `Edgestyle` and `Border` are improved
- `Scroll Bar` was refactored
- Lots of internal stability fixes

## [v0.3.0] - 2026-04-29

### New

- `DropDown`, `StatusBar` and `StatusField` classes
- `Div` for embedding HTML directly, with optional `Flex` layout
- `EdgeStyle` and `Border` on `Group`, `List`, `Label`, `Edit` and `SubForm`
- Styling for `Upload` and `Link`; `Link` text is selectable
- `Form.SysMenu`, `Edit.LostFocus`, `Font.CSS`
- `Default` on `Button` (Enter activates the focused default button)
- `Active` works on `Edit` and `Button`
- Heartbeat / keep-alive so disconnected clients are detected

### Improved

- Complete rewrite of `∆DQ`; `∆NQ` supports left arguments to callbacks
- `Combo` fully rewritten — always on top, no longer crashes with no options
- `Edit`: cursor positioning, backspace and date-input behaviour now mirror `⎕WC`
- `Text` migrated from SVG to `<div>`
- `Circle`/`Ellipse`/`Polygon`/`Rectangle` bounds fixed
- `List`: keyboard navigation, single/multi selection with shift/ctrl
- `SubForm` inherits `BCol` from parent forms
- Font fallback when a requested font isn't installed

<!--
Release process:

1. Add a new section above older versions using the format:

       ## [vX.Y.Z] - YYYY-MM-DD

       - Bullet points of user-visible changes

2. Push to main (or merge a PR that touches this file). The Release
   workflow will:
   - Pull latest dist from dyalog/ewc-client@main
   - Commit any client/dist/ changes to main
   - Tag vX.Y.Z and create a GitHub Release with these notes

The version at the top of this file is the one that will be released.
Versions whose tag already exists are skipped (idempotent).
-->
