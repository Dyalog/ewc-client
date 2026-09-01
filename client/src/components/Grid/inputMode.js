import { keyShiftState } from "../../utils/keyShiftState";

// Pure helpers for the Grid's InputMode (a Grid property — not Edit/Combo). Kept
// in their own module so the mode state-machine can be unit-tested without pulling
// in the Grid component (and its CSS / React tree). Mirrors ScrollBar/clamp.js.
//
// Modes: 'Scroll' (default) | 'InCell' | 'AlwaysScroll' | 'AlwaysInCell' |
// 'AutoEdit'. Scroll and InCell are fully implemented; the others are modelled
// here so they're easy to finish later (AutoEdit currently behaves as Scroll).

// AlwaysScroll/AlwaysInCell lock the mode: the InputModeKey / double-click can't
// toggle out of it.
export const isLockedMode = (base) =>
  base === "AlwaysScroll" || base === "AlwaysInCell";

// The mode a cell rests in after the user moves to it. InCell reverts to Scroll
// (per ⎕WC) unless the grid is locked AlwaysInCell.
export const restMode = (base) => (base === "AlwaysInCell" ? "InCell" : "Scroll");

// The mode the active cell starts in when the grid is (re)configured by the server.
export const initialEffectiveMode = (base) =>
  base === "InCell" || base === "AlwaysInCell" ? "InCell" : "Scroll";

// Flip between the two interactive modes (the InputModeKey / F2 toggle).
export const toggleMode = (effective) =>
  effective === "InCell" ? "Scroll" : "InCell";

// Does a keydown match the grid's InputModeKey? InputModeKey is specified like
// Accelerator: a [keyNumber, shiftState] pair. keyNumber is a virtual-key code
// (= the browser's event.keyCode for the common keys: F2 = 113, "a" = 65) and
// shiftState is a bitmask Shift(1) + Ctrl(2) + Alt(4) — the same encoding EWC
// uses for a KeyPress event. Default (113 0) = plain F2; e.g. Ctrl+Shift+a = (65 3).
// Also accepts a key-name string ('F2') as a lenient, modifier-agnostic fallback.
export const matchesInputModeKey = (event, key) => {
  if (Array.isArray(key)) {
    const wantShift = key[1] || 0;
    return event.keyCode === key[0] && keyShiftState(event) === wantShift;
  }
  if (typeof key === "string" && key.length) return event.key === key;
  // No key configured → plain F2 (the default), with no modifiers held.
  return (
    (event.key === "F2" || event.keyCode === 113) &&
    !event.shiftKey && !event.ctrlKey && !event.altKey
  );
};
