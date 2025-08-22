function boundingBox(id) {
  const el = document.getElementById(id + ".$CONTAINER") || document.getElementById(id);
  if (el === null) {
    console.warn(`Element not found for ID: ${id} (tried "${id}.$CONTAINER" and "${id}")`);
    // Try to find elements with IDs that contain the non-special parts
    // This is a temporary diagnostic to understand the issue
    const allElements = document.querySelectorAll('[id*="F0000.App"]');
    if (allElements.length > 0) {
      console.log('Found elements with partial match:', Array.from(allElements).map(e => e.id));
    }
    return null;
  }
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

function size(id) {
  const bb = boundingBox(id);
  if (bb === null) {
    console.log(`size(): No element found for ID "${id}"`);
    return null;
  }
  console.log(`size(): Found element for ID "${id}", size: [${bb.height}, ${bb.width}]`);
  return [bb.height, bb.width];
}

export {size, posn};