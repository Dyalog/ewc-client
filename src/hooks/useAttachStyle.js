import { useLayoutEffect, useRef, useState } from 'react';
import { parentId, getAttachStyle } from '../utils';
import { size } from '../utils/sizeposn';
import useAppData from './useAppData';

// A 2-element array of finite numbers (Posn may legitimately contain 0).
const isPair = (a) =>
  Array.isArray(a) && a.length === 2 && Number.isFinite(a[0]) && Number.isFinite(a[1]);

// A usable parent size: a pair with positive dimensions.
const isValidSize = (s) => isPair(s) && s[0] > 0 && s[1] > 0;

// Coerce the APL Attach value to a 4-element edge vector, or null if it isn't a
// usable spec. Handles the length-1 array-of-array shape a nested APL vector
// can arrive as.
const normalizeAttach = (attach) => {
  if (Array.isArray(attach) && attach.length === 1 && Array.isArray(attach[0])) {
    attach = attach[0];
  }
  return Array.isArray(attach) && attach.length === 4 ? attach : null;
};

// useAttachStyle — CSS for the APL Attach property, anchored against a frozen
// (authoring-time) parent size. Spread the result LAST into the outer element
// style so it overrides setStyle's top/left/width/height. Returns {} (no-op)
// whenever Attach is absent or ineffective, so non-attached objects and
// not-yet-wired component types render exactly as before.
const useAttachStyle = (data) => {
  const { findCurrentData } = useAppData();
  // The parent size the object was authored against, frozen once. The live
  // parent size is supplied by CSS at layout, so we never recompute it.
  const baseParentSizeRef = useRef(null);
  const [, forceTick] = useState(0);

  const Attach = normalizeAttach(data?.Properties?.Attach);
  const { Posn, Size } = data?.Properties || {};
  const pid = parentId(data?.ID);
  const parentNode = pid ? findCurrentData(pid) : null;

  // AutoConf gating: Attach is effective only when the parent propagates resize
  // (AutoConf bit 1 -> value 2 or 3) AND this object accepts it (bit 0 -> 1 or
  // 3). Both default to 3, so Attach is on by default when present.
  const own = data?.Properties?.AutoConf ?? 3;
  const parentAutoConf = parentNode?.Properties?.AutoConf ?? 3;
  const effective = (own & 1) === 1 && (parentAutoConf & 2) === 2;

  const active = !!Attach && effective && isPair(Posn) && isPair(Size);

  // Freeze the base parent size once, from non-DOM sources (cheap, no layout
  // read). On first render this is the authored size, before any splitter drag
  // mutates it.
  if (active && baseParentSizeRef.current === null && pid) {
    let base = parentNode?.Properties?.Size;
    if (!isValidSize(base)) {
      try {
        base = JSON.parse(localStorage.getItem(pid))?.Size;
      } catch {
        base = null;
      }
    }
    if (isValidSize(base)) baseParentSizeRef.current = base;
  }

  // First-paint race fallback: if the parent isn't laid out yet, measure its
  // live box after layout and re-render once a positive size appears. A
  // splitter can't have fired before first layout, so the first positive read
  // is the authoring baseline. Note: a full unmount/remount resets this ref;
  // the demo re-renders (does not remount) attach children during a drag.
  useLayoutEffect(() => {
    if (!active || baseParentSizeRef.current !== null || !pid) return;
    const live = size(pid);
    if (isValidSize(live)) {
      baseParentSizeRef.current = live;
      forceTick((n) => n + 1);
    }
  }, [active, pid]);

  if (!active || baseParentSizeRef.current === null) return {};
  return getAttachStyle(Posn, Size, baseParentSizeRef.current, Attach);
};

export default useAttachStyle;
