// Clamp a scrollbar thumb/position value into the valid [1, range].
// Falsy (including 0) and anything below 1 → 1; anything above range → range.
// Pure helper kept in its own module so it can be unit-tested without pulling
// in the React component (and its CSS import).
export const thumbValueInRange = (thumb, range) => {
  if (!thumb) return 1;
  return thumb < 1 ? 1 : thumb > range ? range : thumb;
};
