import { useLayoutEffect, useRef, useState } from 'react';
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
// Which locator creations have already been placed. Module level, because the
// component remounts whenever the rendered form changes — closing a subsidiary
// window does exactly that — and a fresh instance would otherwise re-arm a
// locator the application finished with long ago.
const resolvedSeqs = new Set();

// Is the user holding a mouse button right now? A Locator needs to know at the
// moment it ARMS, and there may be no further event until the release, so it
// cannot be read off an event — it has to be tracked.
//
// It decides which gesture ends the drag. A locator created from a press the
// user is STILL HOLDING — right-click a card, DRAGCARDS makes one — must
// resolve when they let go, because that is what native ⎕DQ does. One created
// from a gesture already finished — a menu item, as Show Stack does — has no
// release coming, so it waits for a fresh click.
let buttonsDown = 0;
if (typeof window !== 'undefined') {
  window.addEventListener('mousedown', () => { buttonsDown += 1; }, true);
  window.addEventListener('mouseup', () => {
    buttonsDown = Math.max(0, buttonsDown - 1);
  }, true);
  // A drag that ends outside the window never delivers its mouseup.
  window.addEventListener('blur', () => { buttonsDown = 0; });
}

const Locator = ({ data }) => {
  const { socket } = useAppData();
  const { Posn = [0, 0], Size = [0, 0], Event, WCSeq = 0 } = data?.Properties || {};

  // Posn is [y, x] and Size is [h, w], as everywhere else in ⎕WC.
  const [pos, setPos] = useState([Posn[0], Posn[1]]);
  // Once placed, the outline stops drawing. Native ⎕WC's locator is a transient
  // rubber band that vanishes when the drag ends; the OBJECT lives on (the
  // application usually reuses the same name next time) but nothing should
  // remain on screen, and a live listener would steal the next click.
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);
  // Was a button already held when this locator armed? See buttonsDown above.
  const heldAtArmRef = useRef(false);

  // ⎕WC on an existing name RECREATES the object, and applications reuse one
  // locator name for every pick — SELECT_STACK does exactly that — so a placed
  // locator must re-arm for the next creation but NOT for a re-render or a
  // remount. App.jsx stamps WCSeq on each ⎕WC, which is the only signal that
  // distinguishes them.
  // useLayoutEffect, not useEffect, for BOTH the reset and the listener below.
  // A passive effect runs AFTER paint, so between the locator being painted and
  // its listener attaching there is a window in which a click is silently
  // missed — the outline is on screen, armed-looking, but not yet listening.
  // A fast human placing the locator (or a subsidiary window's extra render
  // work lengthening that window) lands in the gap and the placement is lost,
  // leaving the locator stuck. A layout effect runs synchronously before paint,
  // so by the time the outline is visible it is already listening. The two must
  // stay in this order: reset (heldAtArm, done) first, attach second.
  useLayoutEffect(() => {
    // No stamp means this render did not come from a ⎕WC — arming would revive
    // a locator nothing is waiting on.
    if (!WCSeq || resolvedSeqs.has(WCSeq)) return;
    heldAtArmRef.current = buttonsDown > 0;
    doneRef.current = false;
    setDone(false);
    setPos([Posn[0], Posn[1]]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [WCSeq]);

  useLayoutEffect(() => {
    // Returning null from render does NOT stop this effect running — hooks are
    // declared above the early return — so the guard has to be here too, or an
    // inert locator still attaches global mousedown/mousemove listeners and
    // swallows the user's next click anywhere on the form.
    if (!WCSeq || resolvedSeqs.has(WCSeq)) return undefined;

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
      resolvedSeqs.add(WCSeq);
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

    // Which gesture ends it depends on how it began.
    //
    // Held at arm — the user right-clicked a card and is still holding — so
    // the RELEASE places it, exactly as native ⎕DQ returns when the button
    // comes up. Without this the release did nothing and the drag could only
    // be completed by a further, separate click; that extra click used to be
    // supplied by accident, dismissing the browser's context menu, so
    // suppressing the menu made the omission visible.
    //
    // Not held — created from a gesture already over, such as a menu item —
    // so there is no release coming and a fresh press places it.
    //
    // mousedown is registered either way as a backstop: resolve is idempotent,
    // so whichever arrives first wins, and a release lost to a drag that ended
    // outside the window does not strand the locator.
    //
    // Capture phase so the placing click is not also handled by whatever is
    // underneath — natively the locator has the mouse.
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mousedown', resolve, true);
    if (heldAtArmRef.current) window.addEventListener('mouseup', resolve, true);
    return () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mousedown', resolve, true);
      window.removeEventListener('mouseup', resolve, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.ID, Size[0], Size[1], Event, WCSeq, done]);

  // Nothing to draw once placed — and nothing to draw for a locator this client
  // has already resolved, which is what a remount would otherwise revive.
  // Inert unless this is a locator we saw created and have not yet placed.
  // Defaulting to inert matters: an armed stray captures the user's next click
  // anywhere on the form, and with handler 1 that returns straight out of the
  // application's main ⎕DQ, stopping it dead.
  if (done || !WCSeq || resolvedSeqs.has(WCSeq)) return null;

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
