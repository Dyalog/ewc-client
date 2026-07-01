// EWC keyboard shift-state bitmask: Shift(1) + Ctrl(2) + Alt(4). This is the 4th
// element of a KeyPress event's Info, and the shiftState in an InputModeKey /
// Accelerator pair. (Mouse events use a different 2-bit Shift+Ctrl form.)
// Pure — no imports — so standalone, unit-tested modules (e.g. Grid/inputMode.js)
// can use it without pulling in React/CSS.
export const keyShiftState = (e) =>
  (e?.shiftKey ? 1 : 0) + (e?.ctrlKey ? 2 : 0) + (e?.altKey ? 4 : 0);
