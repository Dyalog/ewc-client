import { test, expect } from '@playwright/test';
import { acAccepts, acPropagates, acEffective } from '../../../../src/utils/autoconfGate';

// Pure unit tests for the AutoConf 0/1/2/3 matrix (no server). Truth table:
//   AutoConf | on parent resize      | when itself resized (its children)
//   0        | stays fixed           | children stay fixed
//   1        | reflows               | children stay fixed
//   2        | stays fixed           | children reflow
//   3        | reflows               | children reflow
test.describe('AutoConf gate (unit) — 0/1/2/3 matrix', () => {
  test('acAccepts (bit 0): 1 and 3 accept a parent resize; 0 and 2 do not', () => {
    expect(acAccepts(0)).toBe(false);
    expect(acAccepts(1)).toBe(true);
    expect(acAccepts(2)).toBe(false);
    expect(acAccepts(3)).toBe(true);
    expect(acAccepts(undefined)).toBe(true); // default 3
  });

  test('acPropagates (bit 1): 2 and 3 propagate to children; 0 and 1 do not', () => {
    expect(acPropagates(0)).toBe(false);
    expect(acPropagates(1)).toBe(false);
    expect(acPropagates(2)).toBe(true);
    expect(acPropagates(3)).toBe(true);
    expect(acPropagates(undefined)).toBe(true); // default 3
  });

  test('acEffective: a child reflows iff it accepts AND its parent propagates', () => {
    // Parent propagates (2 or 3):
    expect(acEffective(3, 3)).toBe(true);  // accept + propagating parent
    expect(acEffective(1, 3)).toBe(true);  // accept-only child under a propagating parent
    expect(acEffective(0, 2)).toBe(false); // child ignores its parent's resize
    expect(acEffective(2, 3)).toBe(false); // AutoConf 2 doesn't accept (bit 0 = 0)
    // Parent does NOT propagate (0 or 1) -> no child reflows, even an AutoConf-3 one:
    expect(acEffective(3, 1)).toBe(false);
    expect(acEffective(3, 0)).toBe(false);
    // Defaults (both nullish -> 3/3):
    expect(acEffective(undefined, undefined)).toBe(true);
  });
});
