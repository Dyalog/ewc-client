function boundingBox(id) {
  const el = document.getElementById(id + ".$CONTAINER") || document.getElementById(id);
  if (el === null) return null;
  return el.getBoundingClientRect();
}

function parentId(id) {
  const parts = id.split('.');
  if (parts.length === 1) return null;
  return parts.slice(0, -1).join('.');
}

function posn(id) {
  const bb = boundingBox(id);
  if (bb === null) return null;
  const pid = parentId(id);
  if (pid === null) return [bb.y, bb.x];
  const pbb = boundingBox(pid);
  return [bb.y - pbb.y - 1, bb.x - pbb.x - 1];
}

// Report the CONTENT box, not the border box. Size is the object's usable area
// — the space its children's Posn/Size are authored against — and the border
// sits outside it, so this is the value ⎕WS was given and the value ⎕WG must
// give back. Measuring getBoundingClientRect instead added the border: a form
// the server set to 460x700 answered 462x702, so DemoAutoConfWin (which reads
// Size to decide which way to toggle) never recognised the size it had just
// set and the window never grew.
function size(id) {
  const el =
    document.getElementById(id + ".$CONTAINER") || document.getElementById(id);
  if (el === null) return null;
  return [el.clientHeight, el.clientWidth];
}

export {size, posn};