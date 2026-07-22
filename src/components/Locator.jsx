import { useEffect, useRef, useState } from 'react';
import { useAppData } from '../hooks';

// ⎕WC Locator — an outline the user positions, resolving a Locator event (80)
// with where they put it.
//
// Native ⎕WC creates the outline and then MOVES THE OPERATING SYSTEM CURSOR to
// its centre (`⎕NQ obj 3 y x`), so the user is already "holding" it and simply
// drags. No browser can move the pointer, and none will.
//
// So: the outline starts at the requested Posn and thereafter follows the
// pointer, centred on it — which is exactly where the cursor would have been
// put natively. Clicking resolves it. Same gesture, same result; the only
// visible difference is mid-drag, where the real cursor is wherever the user
// actually has it. See the port's ADR-005.
//
// The reply must match what ⎕DQ returns natively: (name 80 y x h w) — the
// event, then Posn and Size — because callers do arithmetic on it, e.g.
//     POSN←1 0.5+.×2 2⍴2↓POSN     ⍝ centre = posn + size÷2
const Locator = ({ data }) => {
  const { socket } = useAppData();
  const { Posn = [0, 0], Size = [0, 0], Event } = data?.Properties || {};

  // Posn is [y, x] and Size is [h, w], as everywhere else in ⎕WC.
  const [pos, setPos] = useState([Posn[0], Posn[1]]);
  // Once placed, the outline stops drawing. Native ⎕WC's locator is a transient
  // rubber band that vanishes when the drag ends; the OBJECT lives on (the
  // application usually reuses the same name next time) but nothing should
  // remain on screen, and a live listener would steal the next click.
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);

  // ⎕WC on an existing name RECREATES the object, and applications reuse one
  // locator name for every pick — SELECT_STACK does exactly that. React keeps
  // the same component instance (same id), so without this the second pick
  // renders nothing at all: the instance is still in its "placed" state from
  // the first. Guarded on doneRef so an ordinary re-render cannot loop.
  useEffect(() => {
    if (!doneRef.current) return;
    doneRef.current = false;
    setDone(false);
    setPos([Posn[0], Posn[1]]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    // Coordinates are relative to the offset parent — the form — which is what
    // the APL side compares against each object's Posn.
    const parent = document.getElementById(data?.ID)?.offsetParent
      || document.body;

    const toLocal = (e) => {
      const r = parent.getBoundingClientRect();
      return [
        Math.round(e.clientY - r.top - Size[0] / 2),
        Math.round(e.clientX - r.left - Size[1] / 2),
      ];
    };

    const onMove = (e) => { if (!doneRef.current) setPos(toLocal(e)); };

    const resolve = (e) => {
      if (doneRef.current) return;
      doneRef.current = true;
      setDone(true);
      const [y, x] = toLocal(e);
      const exists = Event &&
        Event.some((it) => it[0]?.toLowerCase() === 'locator');
      if (!exists) return;
      socket.send(JSON.stringify({
        Event: {
          EventName: 'Locator',
          ID: data?.ID,
          Info: [y, x, Size[0], Size[1]],
        },
      }));
      e.stopPropagation();
      e.preventDefault();
    };

    // Resolve on mouseDOWN, not mouseup. The gesture that creates a Locator is
    // itself a mouse press (a right-click on a card, say), and its trailing
    // mouseup would arrive first and place the locator instantly at the point
    // it started from. Requiring a fresh press means the user positions the
    // outline and clicks, which is the browser equivalent of the native
    // drag-and-release.
    //
    // Capture phase so the placing click is not also handled by whatever is
    // underneath — natively the locator has the mouse.
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mousedown', resolve, true);
    return () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mousedown', resolve, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.ID, Size[0], Size[1], Event]);

  if (done) return null;

  return (
    <div
      id={data?.ID}
      style={{
        position: 'absolute',
        top: pos[0],
        left: pos[1],
        height: Size[0],
        width: Size[1],
        // The native locator is a dashed XOR outline over the application.
        border: '2px dashed #000',
        background: 'transparent',
        boxSizing: 'border-box',
        pointerEvents: 'none',   // never swallow the pointer it is following
        zIndex: 10000,
        cursor: 'move',
      }}
    />
  );
};

export default Locator;
