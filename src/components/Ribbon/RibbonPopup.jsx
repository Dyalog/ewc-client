import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Shared dropdown/gallery popup for the ribbon. Portalled to document.body (the
// same model Combo.jsx uses) so it floats above the overflow:clip'd ribbon /
// TabControl instead of being trapped inside it. It anchors under `anchorRef`
// and closes on an outside mousedown — but a click on the anchor or INSIDE the
// popup is not "outside", otherwise selecting a menu item would unmount the
// popup on mousedown before the click ever lands.
const RibbonPopup = ({ anchorRef, open, onClose, className = '', style, children }) => {
  const popupRef = useRef(null);
  const [pos, setPos] = useState(null);

  // Anchor the popup under the trigger. Recompute while open so a scroll/resize
  // doesn't leave it stranded (getBoundingClientRect here is placement, not the
  // banned layout-measurement feedback loop).
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = anchorRef?.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom, left: r.left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (anchorRef?.current?.contains(e.target)) return;
      if (popupRef.current?.contains(e.target)) return;
      onClose?.();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, anchorRef, onClose]);

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={popupRef}
      className={`ewc-ribbon-popup ${className}`.trim()}
      style={{ position: 'fixed', top: pos.top, left: pos.left, ...style }}
    >
      {children}
    </div>,
    document.body
  );
};

export default RibbonPopup;
