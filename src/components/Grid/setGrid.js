// HACK this is a make-shift way to pull some logic out from App.jsx. It's not
// intended as a template for a general solution, but more to feel out the right
// direction to go...
export function setGrid({
  data,
  currentLevel,
  finalKey,
}) {
  // New CurCell is either provided or preserved...
  let curCell = data.Properties?.CurCell
    ? data.Properties?.CurCell
    : currentLevel[finalKey].Properties.CurCell;
  // ...but it is also clamped to within the confines of the Grid
  const vals = data.Properties?.Values || currentLevel[finalKey].Properties.Values;
  const height = vals.length;
  const width = vals[0]?.length || 0;
  curCell = [Math.min(height, curCell[0]), Math.min(width, curCell[1])];
  curCell = [Math.max(1, curCell[0]), Math.max(1, curCell[1])];
  data.Properties.CurCell = curCell;
}