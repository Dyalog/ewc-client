import { test, expect } from '@playwright/test';
import { getAttachStyle } from '../../../../src/utils/getAttachStyle';

// Pure unit tests for the Attach -> CSS edge-anchoring mapping. These need no
// EWC server or browser — they exercise the geometry math directly, locking the
// mapping table and the same-side collision rule against regression. The
// numbers mirror the DemoSplitters objects (../ewc/demo/DemoSplitters.aplf).
test.describe('getAttachStyle (unit)', () => {
  test('List "Top Left Top Right": fixed height, stretches horizontally', () => {
    // Posn [10,10] Size [100,150] inside a [800,200] parent.
    expect(getAttachStyle([10, 10], [100, 150], [800, 200], ['Top', 'Left', 'Top', 'Right']))
      .toEqual({ position: 'absolute', top: 10, bottom: 'auto', height: 100, left: 10, right: 40, width: 'auto' });
  });

  test('TreeView "Top Left Top Left": fully pinned, fixed size', () => {
    expect(getAttachStyle([150, 10], [150, 150], [800, 200], ['Top', 'Left', 'Top', 'Left']))
      .toEqual({ position: 'absolute', top: 150, bottom: 'auto', height: 150, left: 10, right: 'auto', width: 150 });
  });

  test('SubForm/Group/Grid "Top Left Bottom Right": fills parent', () => {
    expect(getAttachStyle([0, 200], [800, 600], [800, 800], ['Top', 'Left', 'Bottom', 'Right']))
      .toEqual({ position: 'absolute', top: 0, bottom: 0, height: 'auto', left: 200, right: 0, width: 'auto' });
  });

  test('Default Scroll "None Right None Right": stays flush to parent right edge', () => {
    // Same-side collision on the right edge must keep the object flush right
    // (right:0), not shift it inward by the left edge's gap.
    expect(getAttachStyle([0, 180], [400, 20], [400, 200], ['None', 'Right', 'None', 'Right']))
      .toEqual({ position: 'absolute', top: '0%', bottom: '0%', height: 'auto', left: 'auto', right: 0, width: 20 });
  });

  test('Default "None x4": fully proportional in both axes', () => {
    const s = getAttachStyle([100, 50], [200, 100], [400, 200], ['None', 'None', 'None', 'None']);
    expect(s).toEqual({
      position: 'absolute',
      top: '25%', bottom: '25%', height: 'auto',   // 100/400 and 1-(300/400)
      left: '25%', right: '25%', width: 'auto',     // 50/200 and 1-(150/200)
    });
  });

  test('Pinned top-right "Top Right Top Right": fixed size, hugs top-right', () => {
    // Posn [10,380] Size [50,100] in a [400,500] parent. dRight = 500-(380+100)=20.
    expect(getAttachStyle([10, 380], [50, 100], [400, 500], ['Top', 'Right', 'Top', 'Right']))
      .toEqual({ position: 'absolute', top: 10, bottom: 'auto', height: 50, left: 'auto', right: 20, width: 100 });
  });

  test('Pinned bottom-right "Bottom Right Bottom Right": fixed size, hugs bottom-right', () => {
    // dBottom = 400-(300+50)=50; dRight = 500-(380+100)=20.
    expect(getAttachStyle([300, 380], [50, 100], [400, 500], ['Bottom', 'Right', 'Bottom', 'Right']))
      .toEqual({ position: 'absolute', top: 'auto', bottom: 50, height: 50, left: 'auto', right: 20, width: 100 });
  });

  test('Left sidebar "Top Left Bottom Left": fixed width, full height, hugs left', () => {
    // Posn [60,10] Size [680,110] in [800,497]. dBottom = 800-(60+680)=60.
    expect(getAttachStyle([60, 10], [680, 110], [800, 497], ['Top', 'Left', 'Bottom', 'Left']))
      .toEqual({ position: 'absolute', top: 60, bottom: 60, height: 'auto', left: 10, right: 'auto', width: 110 });
  });

  test('Status bar "Bottom Left Bottom Right": fixed height, full width, hugs bottom', () => {
    // Posn [750,10] Size [40,477] in [800,497]. dBottom=800-(750+40)=10; dRight=497-(10+477)=10.
    expect(getAttachStyle([750, 10], [40, 477], [800, 497], ['Bottom', 'Left', 'Bottom', 'Right']))
      .toEqual({ position: 'absolute', top: 'auto', bottom: 10, height: 40, left: 10, right: 10, width: 'auto' });
  });

  test('returns {} for missing/invalid geometry', () => {
    expect(getAttachStyle(undefined, [1, 1], [1, 1], ['Top', 'Left', 'Top', 'Left'])).toEqual({});
    expect(getAttachStyle([0, 0], [1, 1], [1, 1], ['Top', 'Left'])).toEqual({}); // Attach not length-4
  });

  // The server sends edge names in mixed case (APL enums are case-insensitive):
  // e.g. ['top','left','bottom','right'] and even ['top','Left','Bottom','Left'].
  // A case-insensitive lookup must treat these identically to their canonical
  // form — otherwise a mis-cased edge silently falls through to 'None'
  // (proportional), so a fill object wrongly scales instead of filling.
  test('lowercase "top left bottom right" fills identically to capitalized', () => {
    const lower = getAttachStyle([0, 200], [800, 600], [800, 800], ['top', 'left', 'bottom', 'right']);
    const upper = getAttachStyle([0, 200], [800, 600], [800, 800], ['Top', 'Left', 'Bottom', 'Right']);
    expect(lower).toEqual(upper);
    expect(lower).toEqual({ position: 'absolute', top: 0, bottom: 0, height: 'auto', left: 200, right: 0, width: 'auto' });
  });

  test('mixed case "top Left Bottom Left" matches canonical left-dock', () => {
    expect(getAttachStyle([60, 10], [680, 110], [800, 497], ['top', 'Left', 'Bottom', 'Left']))
      .toEqual(getAttachStyle([60, 10], [680, 110], [800, 497], ['Top', 'Left', 'Bottom', 'Left']));
  });
});
