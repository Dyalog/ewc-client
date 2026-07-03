import { useEffect, useRef, useState } from 'react';
import { parentId, getAttachStyle, acEffective } from '../utils';
import useAppData from './useAppData';

// A 2-element array of finite numbers (Posn may legitimately contain 0).
const isPair = (a) =>
  Array.isArray(a) && a.length === 2 && Number.isFinite(a[0]) && Number.isFinite(a[1]);

// A usable parent size: a pair with positive dimensions.
const isValidSize = (s) => isPair(s) && s[0] > 0 && s[1] > 0;

// An omitted / malformed / all-'None' Attach is, in ⎕WC, equivalent to
// ('None' 'None' 'None' 'None') — pure proportional scaling with the parent.
const NONE_ATTACH = ['None', 'None', 'None', 'None'];

// Coerce the APL Attach value to a 4-element edge vector, defaulting to
// all-'None' (proportional) when it's absent or malformed. Handles the
// length-1 array-of-array shape a nested APL vector can arrive as.
const normalizeAttach = (attach) => {
  if (Array.isArray(attach) && attach.length === 1 && Array.isArray(attach[0])) {
    attach = attach[0];
  }
  return Array.isArray(attach) && attach.length === 4 ? attach : NONE_ATTACH;
};

// A pane whose geometry is driven by a sibling Splitter (via handleData) must
// NOT also reflow via attach — otherwise the splitter's reproportion and the
// proportional CSS double-transform on a form resize and the pane overflows.
// The splitter owns the pane; only the boxes INSIDE it get attach.
const isSplitterPane = (parentNode, id) => {
  if (!parentNode || !id) return false;
  for (const key in parentNode) {
    const p = parentNode[key]?.Properties;
    if (p?.Type === 'Splitter' && (p.SplitObj1 === id || p.SplitObj2 === id)) return true;
  }
  return false;
};

// A top-level child of a Form that has a MenuBar lives in the content area
// BELOW the menu bar (Form.jsx offsets the content div by ~25px), so its base
// parent box is the form height minus the menu bar. Mirror Form.jsx's fixed
// offset. TODO: derive from menu styling/font later.
const MENUBAR_OFFSET = 25;
const menuBarInset = (parentNode) => {
  if (parentNode?.Properties?.Type !== 'Form') return 0;
  for (const key in parentNode) {
    if (parentNode[key]?.Properties?.Type === 'MenuBar') return MENUBAR_OFFSET;
  }
  return 0;
};

// useAttachStyle — CSS for the APL AutoConf/Attach reflow, anchored against a
// frozen (authoring-time) parent size. Spread the result LAST into the outer
// element style so it overrides setStyle's top/left/width/height. Returns {}
// (no-op) only when the object is ineffective (AutoConf gate fails, no
// Posn/Size, or the parent base size is unknown) — an omitted Attach still
// reflows proportionally, per ⎕WC.
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

  // AutoConf gating: reflow only when this object ACCEPTS its parent's resize
  // (bit 0) AND the parent PROPAGATES (bit 1). Both default to 3.
  const own = data?.Properties?.AutoConf;
  const parentAutoConf = parentNode?.Properties?.AutoConf;
  const effective = acEffective(own, parentAutoConf);

  // No Attach gate: an omitted Attach defaults to proportional (NONE_ATTACH),
  // which is the ⎕WC default — so any positioned object under a propagating
  // parent reflows, matching native behaviour. At rest the '%' resolves to the
  // same pixels, so this is a no-op until the parent actually resizes.
  const active =
    effective && isPair(Posn) && isPair(Size) && !isSplitterPane(parentNode, data?.ID);

  // If the parent is a menu-bar Form, the content area is inset below the menu.
  const menuInset = menuBarInset(parentNode);

  // Freeze the base parent size once from a KNOWN authored/data size (cheap, no
  // layout read). This is the common case: the parent carries a real Size in the
  // data model (authored at ⎕WC, or merged in by a splitter drag). Only fires
  // when the size is genuinely present, so a size-less splitter pane (whose Size
  // isn't in the model yet) correctly falls through to the settle observer below.
  if (active && baseParentSizeRef.current === null && pid) {
    let base = parentNode?.Properties?.Size;
    if (!isValidSize(base)) {
      try {
        base = JSON.parse(localStorage.getItem(pid))?.Size;
      } catch {
        base = null;
      }
    }
    if (isValidSize(base)) {
      baseParentSizeRef.current = menuInset ? [Math.max(1, base[0] - menuInset), base[1]] : base;
    }
  }

  // Fallback for a parent with NO authored Size — e.g. a splitter-divided pane
  // (F1.RIGHT.TOP/BOT), which has no Size in the model and, being size-less,
  // first renders at its INHERITED (full-parent) height before the splitter
  // divides it (SubForm inherits its ancestor's Size). A one-shot measure would
  // freeze that pre-split transient (e.g. 800 instead of 300) and collapse every
  // child. Instead observe the parent and freeze its SETTLED content-box size:
  // debounce so we capture the value only after it stops changing.
  useEffect(() => {
    if (!active || baseParentSizeRef.current !== null || !pid) return;
    const el = document.getElementById(pid);
    if (!el) return;
    let timer = null;
    const capture = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (baseParentSizeRef.current !== null) return;
        const live = [el.clientHeight, el.clientWidth];
        if (!isValidSize(live)) return;
        baseParentSizeRef.current = menuInset ? [Math.max(1, live[0] - menuInset), live[1]] : live;
        forceTick((n) => n + 1);
      }, 120);
    };
    const ro = new ResizeObserver(capture);
    ro.observe(el);
    capture(); // also handles a parent that is already stable (never resizes)
    return () => {
      if (timer) clearTimeout(timer);
      ro.disconnect();
    };
  }, [active, pid, menuInset]);

  if (!active || baseParentSizeRef.current === null) return {};
  return getAttachStyle(Posn, Size, baseParentSizeRef.current, Attach);
};

export default useAttachStyle;
