// Clamp a scrollbar thumb/position value into the valid [1, range].
// Falsy (including 0) and anything below 1 → 1; anything above range → range.
// Pure helper kept in its own module so it can be unit-tested without pulling
// in the React component (and its CSS import).
export const thumbValueInRange = (thumb, range) => {
  if (!thumb) return 1;
  return thumb < 1 ? 1 : thumb > range ? range : thumb;
};

// Map between an APL Scroll value and a pixel position on the track.
//
// The value is 1-origin (⎕IO=1) and clamped to [1, range]; the rendered thumb
// travels 0..maxPos. The origin has to come off, or value 1 lands at
// maxPos/range instead of 0 — a grid sitting on cell 1 1 then shows both thumbs
// short of their corners (measured: 42px in from the left on a 995px track).
// Value 1 belongs hard against the start of the track, value `range` against
// the end.
//
// A range of 1 (or less) means there is nowhere to travel, so the thumb pins to
// the start rather than dividing by zero.
export const thumbPosFromValue = (value, range, maxPos) => {
  const span = range - 1;
  if (!(span > 0) || !(maxPos > 0)) return 0;
  return ((thumbValueInRange(value, range) - 1) / span) * maxPos;
};

// Inverse of thumbPosFromValue: the value a thumb dropped at `pos` represents.
export const thumbValueFromPos = (pos, range, maxPos) => {
  const span = range - 1;
  if (!(span > 0) || !(maxPos > 0)) return 1;
  return 1 + (pos / maxPos) * span;
};
