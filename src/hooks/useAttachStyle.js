import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  // One SNAPSHOT of { parent, posn, size } — the three values getAttachStyle
  // needs, all taken at the same instant.
  //
  // They have to move together. getAttachStyle derives the fixed edge gaps from
  // all three (dBottom = Ph - (y + h)), so pairing a frozen parent size with a
  // live Posn/Size double-counts every resize: the CSS bottom-anchor already
  // shrinks the object with its parent, and then the app's own ⎕WS of the new
  // Size recomputes dBottom against the OLD parent and shrinks it again.
  // Measured 2026-07-29 on GAMA's Prices grid: an 87px window shrink cost the
  // grid 174px, and at small sizes it collapsed to 0px tall with rows still
  // deployed (the blank pane). Re-capturing against the LIVE parent makes the
  // arithmetic self-cancelling:
  //   dBottom = (Ph-87) - (y + h-87) = Ph - y - h   ← unchanged, no second shrink
  const baseRef = useRef(null);
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

  // Identifies the object's geometry, so a genuine server-side move/resize is
  // distinguishable from a re-render carrying the same numbers.
  const geomKey = isPair(Posn) && isPair(Size)
    ? `${Posn[0]},${Posn[1]}|${Size[0]},${Size[1]}`
    : null;

  const withMenuInset = (s) => (menuInset ? [Math.max(1, s[0] - menuInset), s[1]] : s);

  // Take the FIRST snapshot during render, so the object is anchored on its very
  // first paint. Only fires when a usable parent size is available, so a
  // size-less splitter pane (whose Size isn't in the model yet, and which isn't
  // measurable either) correctly falls through to the settle observer below.
  if (active && baseRef.current === null && pid) {
    // Prefer the parent's LIVE box. A component that remounts after its parent
    // has resized (the Grid does, on every reflow) would otherwise re-freeze
    // against the parent's MODEL Size — which the server does not update on a
    // window resize, so it is stale, and the resulting gap is wrong by exactly
    // the amount the parent has changed since. That is the double-shrink: it
    // survives a correct snapshot on the previous mount because the new mount
    // throws it away. The live box is authoritative and already reflowed.
    let base = null;
    const el = document.getElementById(pid);
    if (el) {
      const live = [el.clientHeight, el.clientWidth];
      if (isValidSize(live)) {
        base = live;
      }
    }
    if (!isValidSize(base)) {
      base = parentNode?.Properties?.Size;
    }
    if (!isValidSize(base)) {
      try {
        base = JSON.parse(localStorage.getItem(pid))?.Size;
      } catch {
        base = null;
      }
    }
    if (isValidSize(base)) {
      baseRef.current = { key: geomKey, parent: withMenuInset(base), posn: Posn, size: Size };
    }
  }

  // Re-snapshot when the SERVER moves or resizes the object. The parent has
  // already reflowed by the time this runs (layout effect, post-mutation), so
  // read its live box rather than the model — the model's parent Size is exactly
  // what goes stale, and reusing it is what caused the double-count. Falls back
  // to the previous parent value when the element isn't measurable.
  useLayoutEffect(() => {
    if (!active || !geomKey) return;
    const snap = baseRef.current;
    if (!snap || snap.key === geomKey) return; // nothing captured yet, or unchanged
    const el = pid ? document.getElementById(pid) : null;
    const live = el ? [el.clientHeight, el.clientWidth] : null;
    baseRef.current = {
      key: geomKey,
      parent: isValidSize(live) ? withMenuInset(live) : snap.parent,
      posn: Posn,
      size: Size,
    };
    forceTick((n) => n + 1);
    // Posn/Size are covered by geomKey, which is what decides a real change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, geomKey, menuInset, pid]);

  // Fallback for a parent with NO authored Size — e.g. a splitter-divided pane
  // (F1.RIGHT.TOP/BOT), which has no Size in the model and, being size-less,
  // first renders at its INHERITED (full-parent) height before the splitter
  // divides it (SubForm inherits its ancestor's Size). A one-shot measure would
  // freeze that pre-split transient (e.g. 800 instead of 300) and collapse every
  // child. Instead observe the parent and freeze its SETTLED content-box size:
  // debounce so we capture the value only after it stops changing.
  useEffect(() => {
    if (!active || baseRef.current !== null || !pid) return;
    const el = document.getElementById(pid);
    if (!el) return;
    let timer = null;
    const capture = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (baseRef.current !== null) return;
        const live = [el.clientHeight, el.clientWidth];
        if (!isValidSize(live)) return;
        baseRef.current = {
          key: geomKey,
          parent: withMenuInset(live),
          posn: Posn,
          size: Size,
        };
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
    // geomKey included so a Posn/Size change before the parent settles is picked
    // up rather than captured stale; withMenuInset is rebuilt every render, so
    // depending on it would re-subscribe the observer constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, pid, menuInset, geomKey]);

  if (!active || baseRef.current === null) return {};
  const { posn, size, parent } = baseRef.current;
  return getAttachStyle(posn, size, parent, Attach);
};

export default useAttachStyle;
