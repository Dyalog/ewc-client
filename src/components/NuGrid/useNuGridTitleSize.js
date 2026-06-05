import { useLayoutEffect, useMemo, useState } from 'react';

// Hook that resolves NuGrid TitleWidth / TitleHeight / CellWidths per
// ⎕WC semantics:
//   - positive number / array  → fixed pixel value(s)
//   - 0                        → hidden (zero) [TitleWidth/Height only]
//   - empty / missing / negative → auto-size from content
//
// Auto-sizing uses canvas.measureText with the grid's computed font:
//   • row-title column → widest row title
//   • col-title row    → tallest col title (multi-line aware)
//   • data columns     → widest col title in that column

// Chrome that must fit alongside the text in a row/col title cell. The CSS
// `padding: 0 6px` contributes 12px; with `table-layout: fixed` the width
// also has to cover the 2px (1+1) cell border plus a few px of font rendering
// slop (anti-aliasing, sub-pixel advance), otherwise a 1-char title clips to
// an ellipsis. 18 leaves a comfortable margin.
const TITLE_PADDING_X = 18;
// Each column-title line occupies exactly one data-row's height. The native
// Win32 grid renders its title band as N rows tall for N title lines (measured:
// native Prices band 48px = 3 lines x 16px row pitch). 16 = cell line-height
// 15px + 1px collapsed gridline, matching .nugrid-cell data rows.
const TITLE_LINE_HEIGHT = 16;
// Auto-sized title/column widths are floored to this — matches the legacy
// EWC Grid component's hardcoded default. Explicit positive values bypass.
const FALLBACK_TITLE_WIDTH = 100;
const FALLBACK_TITLE_HEIGHT = 16;

const isAuto = (value) => {
  if (value === 0) return false;                       // explicit 0 = hide
  if (typeof value === 'number' && value > 0) return false;
  return true;                                          // undefined / [] / ¯1
};

const measureMaxTextWidth = (texts, font) => {
  if (!texts || texts.length === 0) return 0;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  let max = 0;
  for (const t of texts) {
    if (t == null) continue;
    const s = Array.isArray(t) ? t.join(' ') : String(t);
    const w = ctx.measureText(s).width;
    if (w > max) max = w;
  }
  return Math.ceil(max);
};

const maxLines = (titles) => {
  let n = 1;
  for (const t of titles || []) {
    if (Array.isArray(t) && t.length > n) n = t.length;
  }
  return n;
};

// Measure each column title individually so we can derive per-column widths.
const measurePerColumn = (titles, font) => {
  if (!titles || titles.length === 0) return [];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  return titles.map((t) => {
    if (t == null) return 0;
    // For multi-line array titles, the column width must fit the widest line.
    const lines = Array.isArray(t) ? t.map(String) : [String(t)];
    let max = 0;
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      if (w > max) max = w;
    }
    return Math.ceil(max);
  });
};

const useNuGridTitleSize = (
  TitleWidth, TitleHeight, CellWidths, rowTitles, colTitles, gridRef,
) => {
  const [autoWidth, setAutoWidth] = useState(FALLBACK_TITLE_WIDTH);
  const [autoHeight, setAutoHeight] = useState(FALLBACK_TITLE_HEIGHT);
  const [autoColWidths, setAutoColWidths] = useState([]);

  const wantsAutoW = isAuto(TitleWidth);
  const wantsAutoH = isAuto(TitleHeight);
  // CellWidths "auto" = undefined/null/empty/negative scalar. An array or
  // positive scalar is treated as explicit (existing fixed-width behavior).
  const wantsAutoCols = CellWidths == null
    || (Array.isArray(CellWidths) && CellWidths.length === 0)
    || (typeof CellWidths === 'number' && CellWidths <= 0);

  // Stable key so the effect only re-runs when titles actually change.
  const rowKey = useMemo(
    () => (rowTitles || []).map((t) => (Array.isArray(t) ? t.join('\x01') : String(t))).join('\x02'),
    [rowTitles],
  );
  const colKey = useMemo(
    () => (colTitles || []).map((t) => (Array.isArray(t) ? t.join('\x01') : String(t))).join('\x02'),
    [colTitles],
  );

  useLayoutEffect(() => {
    if (!gridRef?.current) return;
    const cs = window.getComputedStyle(gridRef.current);
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    // Auto-sizing is clamped to FALLBACK_* as a floor: short titles don't
    // produce uselessly narrow / short bands. Explicit positive/0 values
    // (handled in the wantsAuto* === false branch) bypass this floor.
    if (wantsAutoW) {
      const measured = measureMaxTextWidth(rowTitles, font) + TITLE_PADDING_X;
      setAutoWidth(Math.max(measured, FALLBACK_TITLE_WIDTH));
    }
    if (wantsAutoH) {
      // One data-row per title line, matching native. The old
      // `fontSize*1.3 + 6px` overshot by ~6px (a 1-line header rendered at 22px
      // instead of 16px), eating vertical space and forcing an unexpected
      // vertical scrollbar. Height is now N lines x the data-row pitch.
      const measured = maxLines(colTitles) * TITLE_LINE_HEIGHT;
      setAutoHeight(Math.max(measured, FALLBACK_TITLE_HEIGHT));
    }
    if (wantsAutoCols) {
      const widths = measurePerColumn(colTitles, font).map(
        (w) => Math.max(w + TITLE_PADDING_X, FALLBACK_TITLE_WIDTH),
      );
      // Only update state when the array contents actually changed; otherwise
      // a fresh `widths` reference triggers a re-render → effect re-runs →
      // infinite loop. rowTitles/colTitles props are new arrays each render
      // from the parent, so the deps trigger the effect even when content is
      // unchanged; the rowKey/colKey strings guard the value updates.
      setAutoColWidths((prev) =>
        prev.length === widths.length && prev.every((w, i) => w === widths[i])
          ? prev
          : widths,
      );
    }
    // rowTitles/colTitles intentionally omitted from deps — their content is
    // tracked by rowKey/colKey (string fingerprints), so reference churn on
    // the arrays doesn't unnecessarily re-trigger the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsAutoW, wantsAutoH, wantsAutoCols, rowKey, colKey, gridRef]);

  const effectiveTitleWidth = wantsAutoW ? autoWidth : TitleWidth;
  const effectiveTitleHeight = wantsAutoH ? autoHeight : TitleHeight;

  return {
    effectiveTitleWidth,
    effectiveTitleHeight,
    autoColWidths,
    wantsAutoCols,
  };
};

export default useNuGridTitleSize;
