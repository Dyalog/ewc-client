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
  if (bb === null) return [0, 0];
  const pid = parentId(id);
  if (pid === null) return [bb.y, bb.x];
  const pbb = boundingBox(pid);
  return [bb.y - pbb.y - 1, bb.x - pbb.x - 1];
}

function size(id) {
  const bb = boundingBox(id);
  if (bb === null) return [0, 0];
  return [bb.height, bb.width];
}

export {size, posn};