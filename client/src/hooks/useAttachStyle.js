import { useEffect, useLayoutEffect, useState } from 'react';
import { parentId, getAttachStyle, acEffective } from '../utils';
import useAppData from './useAppData';

const isPair = (a) =>
  Array.isArray(a) && a.length === 2 && Number.isFinite(a[0]) && Number.isFinite(a[1]);

const isValidSize = (s) => isPair(s) && s[0] > 0 && s[1] > 0;

// An omitted / malformed / all-'None' Attach seems to be, in ⎕WC, equivalent to
// ('None' 'None' 'None' 'None') — proportional scaling with the parent.
const NONE_ATTACH = ['None', 'None', 'None', 'None'];

// Experiments indicated Attach is quite lenient in ⎕WC, so we do best effort
const normalizeAttach = (attach) => {
  if (Array.isArray(attach) && attach.length === 1 && Array.isArray(attach[0])) {
    attach = attach[0];
  }
  return Array.isArray(attach) && attach.length === 4 ? attach : NONE_ATTACH;
};

// Avoid doubly applying Attach semantics when in a Splitter pane
const isSplitterPane = (parentNode, id) => {
  if (!parentNode || !id) return false;
  for (const key in parentNode) {
    const p = parentNode[key]?.Properties;
    if (p?.Type === 'Splitter' && (p.SplitObj1 === id || p.SplitObj2 === id)) return true;
  }
  return false;
};

// Snapshots survive remounts, keyed by object ID.
//
// This has to outlive the component. The Grid — and the Scroll bars beside it —
// unmount and remount on every reflow, and a per-instance ref would re-derive the
// snapshot from whatever the model happens to say at that moment. The model is
// only authoritative at authoring time: the server updates the GRID's Size as it
// reflows but never the scroll bars', so after a resize one is current and the
// other is authored. Re-deriving picks the wrong parent for one of them whichever
// source it prefers. Keeping the snapshot avoids having to guess.
//
// Entries are keyed by ID and not evicted on unmount (that is the point). An
// object destroyed with ⎕EX and re-created under the same ID would inherit the
// old snapshot; its first genuine Posn/Size write re-captures and corrects it.
const SNAPSHOTS = new Map();

// A bit of a HACK. Issues were seen where the same app behaved differently in
// Desktop and Browser mode. In the latter, a space was reserved for the MenuBar,
// but the MenuBar rendered below it. This upset rendering and caused a blank
// empty space above the MB.
const MENUBAR_OFFSET = 25;
const menuBarInset = (parentNode) => {
  if (parentNode?.Properties?.Type !== 'Form') return 0;
  for (const key in parentNode) {
    if (parentNode[key]?.Properties?.Type === 'MenuBar') return MENUBAR_OFFSET;
  }
  return 0;
};

// Usage of useAttachStyle is tricky - it should come after setStyle in
// components. This is because setStyle doesn't account for how Attach works.
// TODO: opportunity to unify the two in the future
const useAttachStyle = (data) => {
  const { findCurrentData } = useAppData();
  // getAttachStyle derives the fixed edge gaps from { parent, posn, size }
  // together (dBottom = Ph - (y + h)), so the three must come from one instant.
  const [, forceTick] = useState(0);

  const Attach = normalizeAttach(data?.Properties?.Attach);
  const { Posn, Size } = data?.Properties || {};
  const id = data?.ID;
  const pid = parentId(data?.ID);
  const parentNode = pid ? findCurrentData(pid) : null;

  // Check if we have AutoConf or an AutoConf parent - see acEffective for more
  const own = data?.Properties?.AutoConf;
  const parentAutoConf = parentNode?.Properties?.AutoConf;
  const effective = acEffective(own, parentAutoConf);

  const active =
    effective && isPair(Posn) && isPair(Size) && !isSplitterPane(parentNode, data?.ID);

  const menuInset = menuBarInset(parentNode);

  // Identifies the object's geometry, so a genuine server-side move/resize is
  // distinguishable from a re-render carrying the same numbers.
  const geomKey = isPair(Posn) && isPair(Size)
    ? `${Posn[0]},${Posn[1]}|${Size[0]},${Size[1]}`
    : null;

  const withMenuInset = (s) => (menuInset ? [Math.max(1, s[0] - menuInset), s[1]] : s);

  // See SNAPSHOTS definition. This is due to issues with Splitter. Considered
  // a bit of a HACK, but works well and hasn't failed in testing. We only want
  // to fire when a usable parent size is available.
  if (active && !SNAPSHOTS.has(id) && pid) {
    // No SNAPSHOTS entry, but we hopefully have a Size specified
    let base = parentNode?.Properties?.Size;
    if (!isValidSize(base)) {
      try {
        base = JSON.parse(localStorage.getItem(pid))?.Size;
      } catch {
        base = null;
      }
    }
    if (isValidSize(base)) {
      SNAPSHOTS.set(id, { key: geomKey, parent: withMenuInset(base), posn: Posn, size: Size });
    }
  }

  // Re-snapshot when the server moves/resizes this object. By now the parent has
  // already reflowed (layout effect runs post-mutation), so read its live box, not
  // the model — the model's parent Size is the stale value that double-counted.
  // Falls back to the previous parent when the element isn't measurable.
  useLayoutEffect(() => {
    if (!active || !geomKey) return;
    const snap = SNAPSHOTS.get(id);
    if (!snap || snap.key === geomKey) return; // nothing captured yet, or unchanged
    const el = pid ? document.getElementById(pid) : null;
    const live = el ? [el.clientHeight, el.clientWidth] : null;
    SNAPSHOTS.set(id, {
      key: geomKey,
      parent: isValidSize(live) ? withMenuInset(live) : snap.parent,
      posn: Posn,
      size: Size,
    });
    forceTick((n) => n + 1);
    // Posn/Size are covered by geomKey, which is what decides a real change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, geomKey, menuInset, pid, id]);

  // Fallback for a size-less parent (eg a splitter pane, F1.RIGHT.TOP/BOT): with no
  // model Size it first renders at its inherited full-parent height, so a one-shot
  // measure would freeze that pre-split transient (800 instead of 300) and collapse
  // every child. Observe the parent and freeze its SETTLED content-box size instead
  // — debounced, so we capture only once it stops changing.
  useEffect(() => {
    if (!active || SNAPSHOTS.has(id) || !pid) return;
    const el = document.getElementById(pid);
    if (!el) return;
    let timer = null;
    const capture = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (SNAPSHOTS.has(id)) return;
        const live = [el.clientHeight, el.clientWidth];
        if (!isValidSize(live)) return;
        SNAPSHOTS.set(id, {
          key: geomKey,
          parent: withMenuInset(live),
          posn: Posn,
          size: Size,
        });
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
  }, [active, pid, menuInset, geomKey, id]);

  if (!active || !SNAPSHOTS.has(id)) return {};
  const { posn, size, parent } = SNAPSHOTS.get(id);
  return getAttachStyle(posn, size, parent, Attach);
};

export default useAttachStyle;
