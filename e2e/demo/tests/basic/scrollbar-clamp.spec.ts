// Regression: a ScrollBar position must be clamped to the valid [1, Range].
// A far-track click previously emitted 0 (below the min of 1); the track-click
// handler now routes its computed position through thumbValueInRange, the same
// helper used for incoming Thumb values. Pure-logic test (no browser) so it's
// deterministic in CI.
import { test, expect } from '@playwright/test';
import { thumbValueInRange } from '../../../../src/components/ScrollBar/clamp.js';

test('ScrollBar thumbValueInRange clamps to [1, Range]', () => {
  const RANGE = 1000;
  expect(thumbValueInRange(0, RANGE)).toBe(1);      // the reported bug: 0 → 1
  expect(thumbValueInRange(-5, RANGE)).toBe(1);     // below min → 1
  expect(thumbValueInRange(1, RANGE)).toBe(1);
  expect(thumbValueInRange(500, RANGE)).toBe(500);  // in range → unchanged
  expect(thumbValueInRange(1000, RANGE)).toBe(1000);
  expect(thumbValueInRange(1500, RANGE)).toBe(1000); // above max → Range
  expect(thumbValueInRange(undefined, RANGE)).toBe(1);
});
