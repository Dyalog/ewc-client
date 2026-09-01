// Ribbon layout functions
//
// Should be testable pure functions - anything involving the DOM should be
// outside of this

import { getImageFromData } from "../../utils";

export const RIBBON_STATE = { LARGE: 0, MEDIUM: 1, SMALL: 2, COLLAPSED: 3 };

export const SMALL_ROWS_PER_COL = 3;

// A RibbonButton whose picture is 16x16 renders as a small text row
// TODO think about generalising this
export function isSmallItem(col, findCurrentData) {
  if (col?.Properties?.Type !== "RibbonButton") return false;
  if (typeof findCurrentData !== "function") return false;
  const { ImageListObj, ImageIndex } = col.Properties;
  const img = getImageFromData(findCurrentData(ImageListObj), ImageIndex);
  return !!img && img.imageSize?.[0] === 16 && img.imageSize?.[1] === 16;
}

export function ribbonChildKeys(node) {
  return Object.keys(node || {}).filter((k) => k !== "ID" && k !== "Properties");
}

export function collectColumns(groupData) {
  const cols = [];
  for (const giKey of ribbonChildKeys(groupData)) {
    const gi = groupData[giKey];
    if (!gi?.Properties) continue;
    for (const bKey of ribbonChildKeys(gi)) {
      const b = gi[bKey];
      if (b?.Properties?.Type) cols.push(b);
    }
  }
  return cols;
}

// Flatten a group to individual leaf rows (a ButtonGroup expands to one leaf per
// caption). Used by the Medium/Small renderers to repack into 3-row columns.
export function collectLeaves(groupData) {
  const leaves = [];
  for (const col of collectColumns(groupData)) {
    const t = col.Properties.Type;
    if (t === "RibbonButtonGroup") {
      (col.Properties.Captions || []).forEach((c, i) =>
        leaves.push({ kind: "bg", data: col, index: i, caption: c, id: `${col.ID}-${i}` })
      );
    } else if (t === "RibbonDropDownButton") {
      leaves.push({ kind: "dropdown", data: col, caption: col.Properties.Caption, id: col.ID });
    } else if (t === "RibbonGallery") {
      leaves.push({ kind: "gallery", data: col, caption: col.Properties.Caption, id: col.ID });
    } else {
      leaves.push({ kind: "button", data: col, caption: col.Properties.Caption, id: col.ID });
    }
  }
  return leaves;
}

export function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

let _ctx = null;
// Calculate the width of text, in order to stretch horizontally as needed
export function textW(s, fontPx, family) {
  if (s == null || s === "") return 0;
  if (typeof document === "undefined") return String(s).length * (fontPx * 0.58);
  if (!_ctx) _ctx = document.createElement("canvas").getContext("2d");
  const stack = family
    ? `'${family}', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`
    : `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
  _ctx.font = `${fontPx}px ${stack}`;
  return Math.ceil(_ctx.measureText(String(s)).width);
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ICON_ROW_W = 30; // 2 pad + 16 icon + ~12 chrome
const GROUP_CHROME = 8; // group pad-x + separator + slack

function smallRowW(cap, f) {
  return 16 + 4 + textW(cap, f) + 12; // icon + gap + caption + pad/border
}
function largeTileW(cap, f) {
  const tokens = String(cap || "").split(/\s+/).filter(Boolean);
  const longest = tokens.length ? Math.max(...tokens.map((t) => textW(t, f))) : 0;
  const full = textW(cap, f);
  // caption wraps to <=2 lines: width is the longer of the widest word and
  // half the single-line width
  return clamp(Math.max(longest, full / 1.7) + 14, 40, 94);
}
export function galleryTileW(caption, f) {
  return 16 + 4 + textW(caption, f) + 10;
}

export function galleryCaptions(col) {
  return Object.keys(col)
    .filter((k) => k.startsWith("MItem"))
    .map((k) => col[k]?.Properties?.Caption || "");
}

// Total width of the tile area for a given column count, with each column as
// wide as the widest caption that lands in it (row-major fill) — i.e. exactly
// what the CSS grid will produce
function galleryTilesW(caps, cols, tileW, f) {
  let total = 0;
  for (let c = 0; c < cols; c++) {
    let w = tileW;
    for (let i = c; i < caps.length; i += cols) w = Math.max(w, galleryTileW(caps[i], f));
    total += w;
  }
  return total + (cols - 1) * 2; // + grid gaps
}

// How many columns can we fit in a gallery?
export function galleryCols(col, f) {
  const p = col.Properties || {};
  const maxCols = Math.max(1, p.Cols || 3);
  const tileW = p.ItemWidth || 64;
  const caps = galleryCaptions(col);
  if (!caps.length) return maxCols;
  const reserved = maxCols * tileW;
  for (let cols = Math.min(maxCols, caps.length); cols > 1; cols--) {
    if (galleryTilesW(caps, cols, tileW, f) <= reserved) return cols;
  }
  return 1;
}

function galleryW(col, f) {
  const p = col.Properties || {};
  const caps = galleryCaptions(col);
  const tiles = galleryTilesW(caps, galleryCols(col, f), p.ItemWidth || 64, f);
  return tiles + 4 + 16 + 4; // tiles+gaps + strip pad + scroller rail + border
}

function colWidth0(col, f) {
  const t = col.Properties.Type;
  if (t === "RibbonButtonGroup") {
    const caps = col.Properties.Captions || [];
    const cols = Math.ceil((caps.length || 1) / SMALL_ROWS_PER_COL);
    const maxW = Math.max(30, ...caps.map((c) => smallRowW(c, f)));
    return cols * maxW;
  }
  if (t === "RibbonGallery") return galleryW(col, f);
  return largeTileW(col.Properties.Caption, f); // button / dropdown
}

// Large-state width of a group's columns, honouring the band's `column wrap`:
// multiple small items will share a column of 3 rows
function largeStateW(cols, f, findCurrentData) {
  let total = 0;
  let run = []; // captions of the current run of small items
  const flush = () => {
    if (!run.length) return;
    const n = Math.ceil(run.length / SMALL_ROWS_PER_COL);
    total += n * Math.max(30, ...run.map((c) => smallRowW(c, f)));
    run = [];
  };
  for (const col of cols) {
    if (isSmallItem(col, findCurrentData)) run.push(col.Properties.Caption || "");
    else {
      flush();
      total += colWidth0(col, f);
    }
  }
  flush();
  return total;
}

export function measureGroup(groupData, title, fontPx = 12, findCurrentData) {
  const cols = collectColumns(groupData);
  const galleries = cols.filter((c) => c.Properties.Type === "RibbonGallery");
  const gW = galleries.reduce((s, g) => s + galleryW(g, fontPx), 0);
  const rowCaps = collectLeaves(groupData)
    .filter((l) => l.kind !== "gallery")
    .map((l) => l.caption || "");

  // Large: real column layout, with small items stacked as the band stacks them.
  const w0 = largeStateW(cols, fontPx, findCurrentData);

  // Medium: caption rows repacked into columns of 3 (galleries stay full).
  let w1 = gW;
  for (const ch of chunk(rowCaps, SMALL_ROWS_PER_COL))
    w1 += Math.max(30, ...ch.map((c) => smallRowW(c, fontPx)));

  // Small: icon-only rows, columns of 3.
  const w2 = gW + Math.ceil(rowCaps.length / SMALL_ROWS_PER_COL) * ICON_ROW_W;

  // Collapsed: one large button (group icon + caption + arrow).
  const w3 = clamp(largeTileW(title, fontPx), 52, 94);

  // Keep Medium/Small monotonically non-increasing so reducing never "costs"
  // width; Collapsed is its true render width (<= a full large group).
  const a = w0;
  const b = Math.min(w1, a);
  const c = Math.min(w2, b);
  const d = Math.min(w3, a);
  return [a + GROUP_CHROME, b + GROUP_CHROME, c + GROUP_CHROME, d + GROUP_CHROME];
}

// Deterministic shrink ladder: while the row overflows, advance the lowest
// priority (rightmost) not-yet-collapsed group one rung, then re-measure.
// Stateless in width → identical layout regardless of resize direction.
export function computeStates(widths, available) {
  const states = widths.map(() => 0);
  if (!isFinite(available)) return states;
  const total = () => widths.reduce((s, w, i) => s + w[states[i]], 0);
  let guard = 0;
  while (total() > available && guard++ < 4000) {
    let idx = -1;
    for (let i = states.length - 1; i >= 0; i--) {
      if (states[i] < RIBBON_STATE.COLLAPSED) {
        idx = i;
        break;
      }
    }
    if (idx < 0) break; // all collapsed and still too wide → band scrolls
    states[idx] += 1;
  }
  return states;
}
