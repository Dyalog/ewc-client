// Pure-logic tests for the Grid InputMode state-machine. No browser/server, so
// these are deterministic in CI (mirrors scrollbar-clamp.spec.ts). The live
// behaviour is covered by grid-inputmode.spec.ts when an EWC server is available.
import { test, expect } from '@playwright/test';
import {
  isLockedMode,
  restMode,
  initialEffectiveMode,
  toggleMode,
  matchesInputModeKey,
} from '../../../../src/components/Grid/inputMode.js';

test('restMode: a cell move reverts to Scroll unless locked AlwaysInCell', () => {
  expect(restMode('Scroll')).toBe('Scroll');
  expect(restMode('InCell')).toBe('Scroll');        // InCell reverts on move (per ⎕WC)
  expect(restMode('AlwaysScroll')).toBe('Scroll');
  expect(restMode('AlwaysInCell')).toBe('InCell');  // locked stays InCell
  expect(restMode('AutoEdit')).toBe('Scroll');      // not yet implemented -> Scroll
});

test('initialEffectiveMode: starting mode for a (re)configured grid', () => {
  expect(initialEffectiveMode('Scroll')).toBe('Scroll');       // the default
  expect(initialEffectiveMode('InCell')).toBe('InCell');
  expect(initialEffectiveMode('AlwaysInCell')).toBe('InCell');
  expect(initialEffectiveMode('AlwaysScroll')).toBe('Scroll');
  expect(initialEffectiveMode('AutoEdit')).toBe('Scroll');
});

test('toggleMode: the InputModeKey flips between the two interactive modes', () => {
  expect(toggleMode('Scroll')).toBe('InCell');
  expect(toggleMode('InCell')).toBe('Scroll');
});

test('isLockedMode: only the Always* variants are locked', () => {
  expect(isLockedMode('AlwaysScroll')).toBe(true);
  expect(isLockedMode('AlwaysInCell')).toBe(true);
  expect(isLockedMode('Scroll')).toBe(false);
  expect(isLockedMode('InCell')).toBe(false);
  expect(isLockedMode('AutoEdit')).toBe(false);
});

test('matchesInputModeKey: APL [keyCode,shift] pair (server default 113 0 = F2)', () => {
  expect(matchesInputModeKey({ keyCode: 113 }, [113, 0])).toBe(true);   // the server default
  expect(matchesInputModeKey({ keyCode: 114 }, [113, 0])).toBe(false);  // F3 != F2
});

test('matchesInputModeKey: key-name string form', () => {
  expect(matchesInputModeKey({ key: 'F2' }, 'F2')).toBe(true);
  expect(matchesInputModeKey({ key: 'F3' }, 'F2')).toBe(false);
});

test('matchesInputModeKey: defaults to F2 when unset', () => {
  expect(matchesInputModeKey({ key: 'F2', keyCode: 113 }, undefined)).toBe(true);
  expect(matchesInputModeKey({ key: 'F2' }, '')).toBe(true);            // empty string -> default
  expect(matchesInputModeKey({ keyCode: 113 }, null)).toBe(true);
  expect(matchesInputModeKey({ key: 'a', keyCode: 65 }, undefined)).toBe(false);
});
