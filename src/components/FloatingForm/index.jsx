import { useRef, useState } from "react";
import { useAppData } from "../../hooks";
import { SelectComponent } from "../";
import "./FloatingForm.css";

// A non-primary Form, in Browser/Multi mode, rendered as a window over the
// primary: titlebar (its Caption), a close box, and drag. Desktop mode never
// mounts this — there the form is a real OS window, as before — so App.jsx
// gates it on !isDesktop.
//
// Close sends the Close event (33), whose default action on the server
// expunges the form. That is the ONLY way out of a window with no in-app close
// of its own: Arachnid's Help form, for one, has no Quit item and relies
// entirely on the OS titlebar box natively.
const FloatingForm = ({ data, zIndex }) => {
  const { socket } = useAppData();
  const { Caption, Posn, Size } = data?.Properties || {};

  // Honour Posn if the application set one; otherwise centre it, so a window
  // that gave no Posn (Arachnid's Show Stack and Help both do) does not pile
  // up at the top-left corner.
  const [pos, setPos] = useState(() => {
    if (Array.isArray(Posn) && (Posn[0] || Posn[1])) return [Posn[0], Posn[1]];
    const h = Array.isArray(Size) ? Size[0] : 200;
    const w = Array.isArray(Size) ? Size[1] : 320;
    return [
      Math.max(16, Math.round(window.innerHeight / 2 - h / 2)),
      Math.max(16, Math.round(window.innerWidth / 2 - w / 2)),
    ];
  });

  const drag = useRef(null);
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    setPos([d.top + (e.clientY - d.y), d.left + (e.clientX - d.x)]);
  };
  const onUp = () => {
    drag.current = null;
    window.removeEventListener("mousemove", onMove, true);
    window.removeEventListener("mouseup", onUp, true);
  };
  const onTitleDown = (e) => {
    // Left button only; leave right-click to the application/browser.
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, top: pos[0], left: pos[1] };
    e.preventDefault();
    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("mouseup", onUp, true);
  };

  const close = () => {
    socket.send(JSON.stringify({ Event: { EventName: "Close", ID: data?.ID } }));
  };

  return (
    <div className="floatform" style={{ top: pos[0], left: pos[1], zIndex }}>
      <div className="floatform-title" onMouseDown={onTitleDown}>
        <span className="floatform-caption">{Caption || ""}</span>
        <button
          type="button"
          className="floatform-close"
          onClick={close}
          title="Close"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="floatform-body">
        <SelectComponent data={data} />
      </div>
    </div>
  );
};

export default FloatingForm;
