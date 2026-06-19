import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  setStyle,
  parseFlexStyles,
  rgbColor,
  getFontStyles,
  handleMouseDown,
  handleMouseUp,
  handleMouseEnter,
  handleMouseLeave,
  handleMouseMove,
  handleMouseDoubleClick,
  handleMouseWheel,
} from '../../utils';
import { useAppData } from '../../hooks';
import { getBorderStyles } from '../../styles/edgeStyles';
import { inferCellType, getAlignmentForType, isNumericType } from './cellTypes';
import useNumericFormatter, { normalizeAplFormatted } from './useNumericFormatter';
import useGridState from './useGridState';
import useGridNavigation from './useGridNavigation';
import useGridEvents from './useGridEvents';
import useGridTitleSize from './useGridTitleSize';
import GridDataCell from './GridDataCell';
import './Grid.css';

// Pre-mount / unknown-column fallback before useLayoutEffect measures.
// Matches the legacy Grid component's `!CellWidths ? 100` default.
const FALLBACK_CELL_WIDTH = 100;
// Default data-row height. 16px matches the native Win32 grid row pitch
// (paired with line-height:15px on .grid-cell in Grid.css). Only used to
// fill sparse CellHeights-array holes; explicit APL CellHeights still win.
const FALLBACK_CELL_HEIGHT = 16;
// Shared stable empty-style object for cells with no per-cellType font. Reusing
// one frozen reference keeps the cellFontStyles prop identity constant across
// renders so it doesn't defeat GridDataCell's React.memo.
const EMPTY_STYLE = {};

// Excel-style column letter for index i (0→'A', 25→'Z', 26→'AA', …).
// Matches legacy Grid's `generateHeader(columns)` for missing ColTitles.
const columnLetter = (i) => {
  let s = '';
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
};

// Map EWC scroll values to CSS overflow values
// 0 = hidden, -1/-2 = auto (default), -3 = always visible
const getOverflowStyle = (scrollValue) => {
  const val = Number(scrollValue);
  if (val === 0) return 'hidden';
  if (val === -3) return 'scroll';
  return 'auto'; // -1, -2, or any other value defaults to auto
};

// Grid - Modern Grid reimplementation with embedded EWC components,
// explicit type awareness, and modular architecture
const Grid = ({ data }) => {
  const { handleData, socket, findCurrentData } = useAppData();

  const {
    Size,
    Visible,
    Posn,
    Values: propsValues,
    ColTitles,
    RowTitles,
    // No defaults here — undefined means "auto" per ⎕WC, resolved below.
    TitleWidth,
    TitleHeight,
    // No default: undefined = auto-size per column from col titles.
    CellWidths,
    CellHeights = 16,
    CurCell,
    VScroll = -1,
    HScroll = -1,
    Input,
    CellTypes,
    ShowInput = 0,
    FormatString,
    FormattedValues: propsFormattedValues,
    FCol,
    BCol,
    CellFonts,
    ColTitleBCol,
    ColTitleFCol,
    RowTitleBCol,
    RowTitleFCol,
    CSS,
    Event,
    Border,
    EdgeStyle,
  } = data?.Properties || {};

  // Values and FormattedValues are kept in local state so handleCellChange
  // updates are immediately visible without depending on the App re-rendering.
  // Server updates (FormatCell responses, server-set Values) arrive via props
  // and are synced here.
  const [Values, setValues] = useState(propsValues);
  const [FormattedValues, setFormattedValues] = useState(propsFormattedValues);
  // Selection rectangle (1-based inclusive bounds) for row/column/range
  // selection via header clicks. null = single-cell mode (just curCell).
  const [selection, setSelection] = useState(null);
  // The corner that doesn't move during shift+click / shift+arrow extension.
  // Set on every non-shift click; used by extendSelectionTo to grow/shrink
  // the rectangle while preserving the user's directional intent.
  const [anchor, setAnchor] = useState(null);
  // Mouse drag-select tracking (mousedown on cell → enter cells → mouseup).
  const isDraggingRef = useRef(false);
  // Mirror selection + fireGridSelect into refs so the window mouseup listener
  // (installed once on mount) reads the latest values without re-attaching.
  const selectionRef = useRef(null);
  const fireGridSelectRef = useRef(null);
  // Mirror anchor/curCell/handleData/handleCellChange into refs so the cell
  // mouse handlers can be stable useCallbacks (read latest values without
  // listing them as deps). Stable handlers are what let GridDataCell's memo
  // actually skip unchanged cells on every selection/drag/navigation change.
  const anchorRef = useRef(null);
  const curCellRef = useRef(null);
  const handleDataRef = useRef(handleData);
  const handleCellChangeRef = useRef(null);
  // Refs for the grid element and scrollable container. Declared up here so
  // getPageRows and the navigation hook (both below) can read containerRef.
  const gridRef = useRef(null);
  const containerRef = useRef(null);

  // The "page" step for PageUp/PageDown: how many data rows fit in the scroll
  // viewport, measured from the live DOM (container height minus the sticky
  // column-title band, divided by the actual rendered row pitch) rather than a
  // hardcoded stride. One row of overlap is kept for context (Excel-style).
  // Falls back to 9 before the grid has mounted / been measured.
  const getPageRows = useCallback(() => {
    const c = containerRef.current;
    if (!c) return 9;
    const rowEl = c.querySelector('tbody .grid-row');
    const pitch = rowEl ? rowEl.getBoundingClientRect().height : FALLBACK_CELL_HEIGHT;
    const head = c.querySelector('thead');
    const headH = head ? head.getBoundingClientRect().height : 0;
    const visible = Math.floor((c.clientHeight - headH) / Math.max(pitch, 1));
    return Math.max(1, visible - 1);
  }, []);

  useEffect(() => {
    setValues(propsValues);
  }, [propsValues]);

  useEffect(() => {
    setFormattedValues(propsFormattedValues);
  }, [propsFormattedValues]);

  // Track whether the most recent mouseup ended a drag, so the click event
  // that fires immediately after can be suppressed at capture phase.
  const justEndedDragRef = useRef(false);

  // Window-level mouseup ends any active drag-select. Registered with capture
  // so we run BEFORE widget descendants (Combo, checkbox) see mouseup — that
  // way we can stopPropagation + preventDefault to suppress their click when
  // the drag terminates over them.
  useEffect(() => {
    const mouseup = (e) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      const sel = selectionRef.current;
      if (sel) {
        e.preventDefault();
        e.stopPropagation();
        justEndedDragRef.current = true;
        if (fireGridSelectRef.current) {
          fireGridSelectRef.current(sel.sr, sel.sc, sel.er, sel.ec);
        }
      }
    };
    // The click event browsers synthesize after mouseup must also be
    // suppressed during drag-end — otherwise a Combo at the release
    // point opens via its click handler.
    const click = (e) => {
      if (justEndedDragRef.current) {
        justEndedDragRef.current = false;
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('mouseup', mouseup, true);
    window.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('mouseup', mouseup, true);
      window.removeEventListener('click', click, true);
    };
  }, []);

  // Keep refs in sync with the latest values for the window listener and the
  // stable cell handlers.
  useEffect(() => { selectionRef.current = selection; });
  useEffect(() => { fireGridSelectRef.current = fireGridSelect; });
  useEffect(() => { anchorRef.current = anchor; });
  useEffect(() => { curCellRef.current = curCell; });
  useEffect(() => { handleDataRef.current = handleData; });

  // Normalize Input to an array (can be single string or array of strings)
  // useMemo ensures stable reference for useCallback dependencies
  const inputArray = useMemo(() => {
    return Input ? (Array.isArray(Input) ? Input : [Input]) : [];
  }, [Input]);

  // Calculate grid dimensions for bounds checking
  const numRows = Values?.length || 0;
  const numCols = Values?.[0]?.length || (numRows > 0 ? 1 : 0);

  // State management for current cell selection
  const { curCell, moveTo, moveBy, isCurrentCell } = useGridState(CurCell, numRows, numCols);


  // Keyboard navigation
  const { handleKeyDown: navigationKeyDown } = useGridNavigation(
    moveBy, moveTo, curCell, numRows, numCols, getPageRows
  );

  // Event handling (CellMove, KeyPress, CellChanged)
  const { fireCellMove, fireKeyPress, fireCellChanged, fireGridSelect } = useGridEvents(socket, Event, data?.ID);

  // Use a ref for Values to avoid recreating handleCellChange on every Values change
  // This prevents the infinite re-render loop when embedded components update values
  const valuesRef = useRef(Values);
  valuesRef.current = Values;

  const formatStringRef = useRef(FormatString);
  formatStringRef.current = FormatString;
  const cellTypesRef = useRef(CellTypes);
  cellTypesRef.current = CellTypes;

  // Per-cell Input-template resolution and the ShowInput rule (which only
  // applies to Combo/Button cells) are computed inline in the render loop now,
  // indexing the pre-resolved `resolvedInputs` array by CellTypes — so neither
  // costs a per-cell findCurrentData full-tree walk. (Replaces the old
  // getInputComponentId / getCellTypeIndex / shouldShowInput helpers.)

  // Handle cell value changes from embedded components
  // Uses valuesRef to avoid recreating this callback when Values changes
  const handleCellChange = useCallback((row, col, newValue) => {
    // Validate row/col to prevent errors
    if (typeof row !== 'number' || typeof col !== 'number' || row < 1 || col < 1) {
      console.error('Grid handleCellChange: invalid row/col', { row, col, newValue });
      return;
    }

    const currentValues = valuesRef.current;
    if (!currentValues || !currentValues[row - 1]) {
      console.error('Grid handleCellChange: invalid Values matrix', { row, col, currentValues });
      return;
    }

    // Clone the Values matrix
    const newValues = currentValues.map(r => [...r]);
    newValues[row - 1][col - 1] = newValue;

    // Update local state immediately — this guarantees a re-render
    // even when App's reRender() toggle cancels out
    setValues(newValues);

    // Clear stale FormattedValue for this cell so formatCellValue
    // falls through to the raw value until the server responds
    setFormattedValues(prev => {
      if (!prev || !prev[row - 1]) return prev;
      const updated = prev.map(r => [...r]);
      updated[row - 1][col - 1] = null;
      return updated;
    });

    // Also update the data tree for server sync
    handleData({
      ID: data?.ID,
      Properties: { Values: newValues },
    }, 'WS');

    // Fire CellChanged event if registered
    fireCellChanged(row, col, newValue);

    // Send FormatCell to server if a format string applies to this cell
    const fs = formatStringRef.current;
    const ct = cellTypesRef.current;
    if (fs && ct) {
      const cellType = ct[row - 1]?.[col - 1];
      const fmt = cellType ? fs[cellType - 1] : null;
      if (fmt) {
        socket.send(JSON.stringify({
          FormatCell: { Cell: [row, col], ID: data?.ID, Value: newValue },
        }));
      }
    }
  }, [data?.ID, handleData, fireCellChanged]); // Note: Values removed from deps!

  // handleCellChange's identity changes whenever App recreates handleData, which
  // would defeat GridDataCell's memo. Pass cells this stable wrapper instead.
  useEffect(() => { handleCellChangeRef.current = handleCellChange; });
  const stableOnCellChange = useCallback((r, c, v) => handleCellChangeRef.current(r, c, v), []);


  // Commit any in-progress cell edit by blurring the active element.
  // Must be called synchronously BEFORE React processes curCell state changes,
  // so the Edit's handleBlur fires while the component is still mounted.
  const commitActiveEdit = useCallback(() => {
    const activeEl = document.activeElement;
    if (activeEl && containerRef.current?.contains(activeEl)) {
      activeEl.blur();
      gridRef.current?.focus({ preventScroll: true });
    }
  }, []);

  // Blur any focused element in non-selected cells when curCell changes
  // This ensures only the currently selected cell can be edited
  useEffect(() => {
    if (!containerRef.current || !curCell) return;
    const [row, col] = curCell;
    const activeElement = document.activeElement;

    // Check if the focused element is inside the grid but not in the current cell
    if (activeElement && containerRef.current.contains(activeElement)) {
      const cellElement = activeElement.closest('[data-row][data-col]');
      if (cellElement) {
        const focusedRow = parseInt(cellElement.getAttribute('data-row'), 10);
        const focusedCol = parseInt(cellElement.getAttribute('data-col'), 10);
        // If the focused element is in a different cell, blur it and refocus the grid
        if (focusedRow !== row || focusedCol !== col) {
          activeElement.blur();
          // Focus the grid so keyboard navigation continues to work
          gridRef.current?.focus({ preventScroll: true });
        }
      }
    }
  }, [curCell]);

  // Activate the current cell's component (for Space key)
  const activateCurrentCell = () => {
    if (!containerRef.current || !curCell) return;
    const [row, col] = curCell;
    const cellElement = containerRef.current.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    );
    if (!cellElement) return;

    // Find interactive element in the cell and click/focus it
    const checkbox = cellElement.querySelector('input[type="checkbox"]');
    if (checkbox) {
      checkbox.click();
      return;
    }

    const comboButton = cellElement.querySelector('button[role="combobox"]');
    if (comboButton) {
      comboButton.click();
      return;
    }

    const input = cellElement.querySelector('input');
    if (input) {
      input.focus();
      return;
    }
  };

  // Handle keyboard events
  const handleKeyDown = (event) => {
    // Keys typed inside an embedded cell editor (the Edit <input>, etc.) bubble
    // up to this grid-level handler because the widget is a React child. When
    // that happens, the editor owns text keys — the grid must not steal Space
    // (insert a space), Ctrl/Cmd+A (select the input text), or Ctrl/Cmd+C (copy
    // the input text). Cell-movement keys (arrows/Tab/Enter) still fall through
    // to drive the grid, matching Edit's own handleKeyPress which lets them
    // bubble. Checkboxes are excluded so Space still toggles them via activate.
    const inEditor = event.target !== gridRef.current
      && typeof event.target.closest === 'function'
      && !!event.target.closest(
        'input:not([type="checkbox"]), textarea, select, [contenteditable="true"]'
      );

    // Space must insert a literal space when editing. navigationKeyDown
    // preventDefault()s Space before returning 'activate', so we have to bail
    // here, before it runs, or the character is lost.
    if (inEditor && event.key === ' ') return;

    // Ctrl/Cmd+C copies the current selection as TSV. Tab-delimited within
    // rows, newline-delimited between rows — pastes into Excel/Sheets.
    if (!inEditor && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      copySelectionToClipboard();
      return;
    }
    // Ctrl/Cmd+A selects all (Excel-style).
    if (!inEditor && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      selectAll();
      return;
    }
    // Shift+arrow extends the selection from `anchor` toward the new cell.
    // Without shift, arrows just navigate (existing path). Inside an editor,
    // shift+arrow extends the text selection, so the grid stays out of it.
    if (!inEditor && event.shiftKey
        && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const [r, c] = curCell;
      const dr = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
      const dc = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      const nr = Math.min(Math.max(r + dr, 1), numRows);
      const nc = Math.min(Math.max(c + dc, 1), numCols);
      extendSelectionTo(nr, nc);
      return;
    }

    const result = navigationKeyDown(event);

    if (result === 'activate') {
      // Space key - activate the current cell's component
      activateCurrentCell();
    } else if (result) {
      const newCell = result;
      // Non-shift arrow navigation clears any range and re-anchors at the
      // new cell — matches Excel's "arrow without shift drops the selection".
      if (selection) {
        fireGridSelect(newCell[0], newCell[1], newCell[0], newCell[1]);
      }
      setSelection(null);
      setAnchor({ r: newCell[0], c: newCell[1] });

      // Commit any in-progress edit before the widget unmounts.
      // This fires Edit's handleBlur synchronously while still mounted,
      // so onCellChange updates Values before React re-renders.
      commitActiveEdit();

      // Boundary: navigation clamped at edge — fire KeyPress for virtual scrolling
      if (newCell[0] === curCell[0] && newCell[1] === curCell[1]) {
        // Update CurCell in the data tree silently (no app re-render) so the
        // server can read it via eWG. Any Values change from commitActiveEdit
        // is already reflected by handleCellChange's local setValues.
        handleData({
          ID: data?.ID,
          Properties: { CurCell: newCell },
        }, 'WS', { render: false });
        // Find an Input component with KeyPress registered to use as event source
        // (mirrors old Grid where the Edit child fires the event to the server)
        let sourceId = null;
        for (const id of inputArray) {
          const inputData = findCurrentData(id);
          const inputEvent = inputData?.Properties?.Event;
          if (inputEvent && inputEvent.some(item => item[0] === 'KeyPress')) {
            sourceId = id;
            break;
          }
        }
        fireKeyPress(event, sourceId);
        return;
      }

      // Update data tree so server can read CurCell via eWG. Silent (no app
      // re-render): Grid already re-renders from its own curCell state.
      handleData({
        ID: data?.ID,
        Properties: { CurCell: newCell },
      }, 'WS', { render: false });
      // Fire CellMove event if registered (mouseFlag=0 for keyboard)
      fireCellMove(newCell[0], newCell[1], 0);
    } else {
      // Not a navigation key. Inside an embedded editor the key belongs to the
      // input (and Edit fires its own KeyPress if registered), so suppress the
      // grid-level KeyPress to avoid sending the server a duplicate event.
      if (!inEditor) fireKeyPress(event);
    }
  };

  // Handle cell click - update selection and notify server. Stable identity
  // (reads curCell/handleData via refs) so the cell mouse handlers stay stable.
  const handleCellClick = useCallback((rowIndex, colIndex) => {
    // Convert from 0-based to 1-based
    const row = rowIndex + 1;
    const col = colIndex + 1;

    // Skip if already selected
    const cc = curCellRef.current;
    if (cc && cc[0] === row && cc[1] === col) return;

    // Commit any in-progress edit before changing selection
    commitActiveEdit();

    // Update local state
    moveTo(row, col);

    // Update data tree (silently — no app re-render) so server can read CurCell
    // via eWG; Grid re-renders from its own curCell state.
    handleDataRef.current({
      ID: data?.ID,
      Properties: { CurCell: [row, col] },
    }, 'WS', { render: false });
    // Fire CellMove event if registered (mouseFlag=1 for mouse)
    fireCellMove(row, col, 1);
  }, [commitActiveEdit, moveTo, fireCellMove, data?.ID]);

  // Get locale separators from EWC's Locale object. findCurrentData is an
  // O(depth) path walk returning the live node; the old getObjectById did a
  // full-tree DFS plus a JSON.stringify/parse round-trip on every render
  // (Locale is set once at startup and never changes).
  const localeData = findCurrentData('Locale');
  const { Thousand = ',', Decimal = '.' } = localeData?.Properties || {};
  const { formatNumber } = useNumericFormatter(Thousand, Decimal);

  // Width for a column: auto (measured from col title) if user didn't set
  // CellWidths, else scalar or per-column array as provided.
  const getCellWidth = (colIndex) => {
    if (wantsAutoCols) return autoColWidths[colIndex] ?? FALLBACK_CELL_WIDTH;
    if (Array.isArray(CellWidths)) {
      return CellWidths[colIndex] ?? CellWidths[0] ?? FALLBACK_CELL_WIDTH;
    }
    return CellWidths || FALLBACK_CELL_WIDTH;
  };

  // Helper to get height for a row (scalar or per-row array)
  const getCellHeight = (rowIndex) => {
    if (Array.isArray(CellHeights)) {
      return CellHeights[rowIndex] ?? CellHeights[0] ?? FALLBACK_CELL_HEIGHT;
    }
    return CellHeights || FALLBACK_CELL_HEIGHT;
  };

  // Selection helpers (1-based row/col). Selection is a rectangle that
  // covers row/column/range/all selections uniformly.
  const isCellInSelection = (row, col) => {
    if (!selection) return false;
    return row >= selection.sr && row <= selection.er
        && col >= selection.sc && col <= selection.ec;
  };
  // Which sides of an in-range cell lie on the selection's outer boundary, so
  // CSS can draw a single border around the whole block (Excel-style) rather
  // than one box per cell. Returns space-prefixed class names for the cell.
  const selectionEdgeClasses = (row, col) => {
    if (!selection || !isCellInSelection(row, col)) return '';
    return (row === selection.sr ? ' sel-top' : '')
         + (row === selection.er ? ' sel-bottom' : '')
         + (col === selection.sc ? ' sel-left' : '')
         + (col === selection.ec ? ' sel-right' : '');
  };
  const isRowInSelection = (row) => {
    if (selection) return row >= selection.sr && row <= selection.er;
    return curCell[0] === row;
  };
  const isColInSelection = (col) => {
    if (selection) return col >= selection.sc && col <= selection.ec;
    return curCell[1] === col;
  };

  // Click handlers for the three header surfaces. Each fires GridSelect with
  // the resulting rectangle so APL handlers can react (e.g. log, export).
  // The `shift` flag extends from the existing anchor (Excel-style).
  const selectRow = (row, shift = false) => {
    const anchorR = shift && anchor ? anchor.r : row;
    const sr = Math.min(anchorR, row);
    const er = Math.max(anchorR, row);
    if (!shift) setAnchor({ r: row, c: 1 });
    setSelection({ sr, sc: 1, er, ec: numCols });
    moveTo(row, 1);
    fireGridSelect(sr, 1, er, numCols);
  };
  const selectColumn = (col, shift = false) => {
    const anchorC = shift && anchor ? anchor.c : col;
    const sc = Math.min(anchorC, col);
    const ec = Math.max(anchorC, col);
    if (!shift) setAnchor({ r: 1, c: col });
    setSelection({ sr: 1, sc, er: numRows, ec });
    moveTo(1, col);
    fireGridSelect(1, sc, numRows, ec);
  };
  const selectAll = () => {
    setAnchor({ r: 1, c: 1 });
    setSelection({ sr: 1, sc: 1, er: numRows, ec: numCols });
    moveTo(1, 1);
    fireGridSelect(1, 1, numRows, numCols);
  };

  // Extend the selection to (r, c) from the current anchor (or curCell if no
  // anchor exists yet). Used by shift+click on a cell, shift+arrow, and drag.
  // Stable (reads anchor/curCell via refs) so it doesn't churn the cell handlers.
  const extendSelectionTo = useCallback((r, c) => {
    const cc = curCellRef.current || [1, 1];
    const a = anchorRef.current ?? { r: cc[0], c: cc[1] };
    if (!anchorRef.current) setAnchor(a);
    const sr = Math.min(a.r, r), er = Math.max(a.r, r);
    const sc = Math.min(a.c, c), ec = Math.max(a.c, c);
    if (sr === er && sc === ec) {
      setSelection(null);
    } else {
      setSelection({ sr, sc, er, ec });
    }
    moveTo(r, c);
    fireGridSelect(sr, sc, er, ec);
  }, [moveTo, fireGridSelect]);

  // Stable per-cell mouse handlers shared by every GridDataCell. They take the
  // 0-based (rowIndex, colIndex) and read selection/anchor from refs, so their
  // identity never changes — the precondition for the cells' memo to hold.
  const onCellMouseDownCapture = useCallback((e, rowIndex, colIndex) => {
    // Shift+click extends the selection — intercept at capture so it works even
    // on cells with widgets (Combo, checkbox), preventing widget activation.
    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      extendSelectionTo(rowIndex + 1, colIndex + 1);
    }
  }, [extendSelectionTo]);

  const onCellMouseDown = useCallback((e, rowIndex, colIndex) => {
    if (e.shiftKey) return; // handled in capture
    const r = rowIndex + 1, c = colIndex + 1;
    // Clicking into a cell's widget (Combo/Button/editor) doesn't start a
    // drag-select, but must still move CurCell + fire CellMove and cancel any
    // active range (so an always-shown ShowInput widget still selects its cell).
    if (e.target !== e.currentTarget) {
      if (selectionRef.current) {
        fireGridSelect(r, c, r, c);
        setSelection(null);
      }
      setAnchor({ r, c });
      handleCellClick(rowIndex, colIndex);
      return;
    }
    if (selectionRef.current) fireGridSelect(r, c, r, c);
    setAnchor({ r, c });
    setSelection(null);
    isDraggingRef.current = true;
    handleCellClick(rowIndex, colIndex);
  }, [fireGridSelect, handleCellClick]);

  const onCellMouseEnter = useCallback((rowIndex, colIndex) => {
    // While dragging, sweep the selection rectangle from the anchor.
    if (!isDraggingRef.current || !anchorRef.current) return;
    const a = anchorRef.current;
    const r = rowIndex + 1, c = colIndex + 1;
    const sr = Math.min(a.r, r), er = Math.max(a.r, r);
    const sc = Math.min(a.c, c), ec = Math.max(a.c, c);
    if (sr === er && sc === ec) {
      setSelection(null);
    } else {
      setSelection({ sr, sc, er, ec });
    }
    moveTo(r, c);
  }, [moveTo]);

  // Build TSV from the current selection (or just curCell). Cells in a row
  // join with tab; rows join with newline — pastes directly into Excel/Sheets.
  const copySelectionToClipboard = async () => {
    const sr = selection?.sr ?? curCell[0];
    const sc = selection?.sc ?? curCell[1];
    const er = selection?.er ?? curCell[0];
    const ec = selection?.ec ?? curCell[1];
    const lines = [];
    for (let r = sr; r <= er; r++) {
      const cells = [];
      for (let c = sc; c <= ec; c++) {
        const v = Array.isArray(Values[r - 1]) ? Values[r - 1][c - 1] : Values[r - 1];
        cells.push(v == null ? '' : String(v));
      }
      lines.push(cells.join('\t'));
    }
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for non-secure contexts (some embedded browsers reject the
      // async API); silently no-op — test paths use the async branch.
    }
    return text;
  };

  // Format cell value based on its type
  const formatCellValue = (value, cellType, formattedValue) => {
    if (formattedValue != null) return normalizeAplFormatted(formattedValue);
    if (value === null || value === undefined) return '';
    if (isNumericType(cellType)) return formatNumber(value);
    return String(value);
  };

  // Resolve the small per-cellType Input templates + fonts ONCE per render
  // (length = number of distinct cell types, not R×C). Cells then index these
  // by cellType instead of each doing its own findCurrentData full-tree walk —
  // the change from O(R×C × tree) lookups to O(types) per render.
  const resolvedInputs = inputArray.map((id) => findCurrentData(id));
  // Font styles are memoized: getFontStyles builds a fresh object each call, so
  // recomputing per render would hand cells a new cellFontStyles identity and
  // defeat their memo. Keyed on CellFonts (font definitions are static).
  const resolvedFontStyles = useMemo(
    () => (CellFonts || []).map((id) => {
      const obj = id ? findCurrentData(id) : null;
      return obj ? getFontStyles(obj) : EMPTY_STYLE;
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [CellFonts],
  );

  const customStyles = parseFlexStyles(CSS);
  const baseStyles = setStyle(data?.Properties);

  const styles = {
    ...baseStyles,
    display: Visible === 0 ? 'none' : 'block',
    width: Size?.[1] ?? 275,
    height: Size?.[0] ?? 225,
    // Honor APL Border/EdgeStyle; default keeps the historical #b4b4b4 line.
    ...getBorderStyles(EdgeStyle, Border, '#b4b4b4'),
    ...customStyles,
  };

  // Normalize titles to arrays. Missing/empty → Excel-style auto-labels
  // (A,B,C… for columns, 1,2,3… for rows). Matches legacy Grid behavior:
  // titles are always present unless explicitly suppressed with TitleWidth/
  // TitleHeight = 0.
  const explicitColTitles = ColTitles != null
    && (Array.isArray(ColTitles) ? ColTitles.length > 0 : true);
  const explicitRowTitles = RowTitles != null
    && (Array.isArray(RowTitles) ? RowTitles.length > 0 : true);
  // Memoized so the array reference is stable across renders. Without this,
  // useGridTitleSize's rowKey/colKey memos (which depend on these arrays)
  // never cache and rebuild their O(rows+cols) string fingerprints every render.
  const colTitlesArray = useMemo(() => (explicitColTitles
    ? (Array.isArray(ColTitles) ? ColTitles : [ColTitles])
    : Array.from({ length: numCols }, (_, i) => columnLetter(i))),
    [explicitColTitles, ColTitles, numCols]);
  const rowTitlesArray = useMemo(() => (explicitRowTitles
    ? (Array.isArray(RowTitles) ? RowTitles : [RowTitles])
    : Array.from({ length: numRows }, (_, i) => String(i + 1))),
    [explicitRowTitles, RowTitles, numRows]);
  const hasColTitles = colTitlesArray.length > 0;
  const hasRowTitles = rowTitlesArray.length > 0;

  // ⎕WC behavior: undefined/empty/negative TitleWidth/Height/CellWidths
  // auto-size to fit content; 0 hides titles; positive is fixed.
  const {
    effectiveTitleWidth, effectiveTitleHeight, autoColWidths, wantsAutoCols,
  } = useGridTitleSize(
    TitleWidth, TitleHeight, CellWidths, rowTitlesArray, colTitlesArray, gridRef,
  );

  // ⎕WC: TitleWidth/Height = 0 fully hides the row/col title band (no DOM at all).
  const showRowTitles = hasRowTitles && effectiveTitleWidth !== 0;
  const showColTitles = hasColTitles && effectiveTitleHeight !== 0;

  // Keep the focused cell visible: keyboard navigation can move CurCell to a
  // cell hidden behind the native scroll, so scroll the container the minimum
  // amount to reveal it. The sticky row/col title bands cover the left/top
  // edges, so a cell must clear those bands too — not just the raw viewport.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !curCell) return;
    const [r, c] = curCell;
    const cellEl = container.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    if (!cellEl) return;
    const cell = cellEl.getBoundingClientRect();
    const cont = container.getBoundingClientRect();
    const bandW = showRowTitles ? effectiveTitleWidth : 0; // sticky row-title band
    const bandH = showColTitles ? effectiveTitleHeight : 0; // sticky col-title band
    const left = cell.left - cont.left;
    const right = cell.right - cont.left;
    const top = cell.top - cont.top;
    const bottom = cell.bottom - cont.top;
    if (right > container.clientWidth) container.scrollLeft += right - container.clientWidth;
    else if (left < bandW) container.scrollLeft -= bandW - left;
    if (bottom > container.clientHeight) container.scrollTop += bottom - container.clientHeight;
    else if (top < bandH) container.scrollTop -= bandH - top;
  }, [curCell, effectiveTitleWidth, effectiveTitleHeight, showRowTitles, showColTitles]);

  return (
    <div
      ref={gridRef}
      id={data?.ID}
      className="grid"
      style={styles}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseDown={(e) => handleMouseDown(e, socket, Event, data?.ID)}
      onMouseUp={(e) => handleMouseUp(e, socket, Event, data?.ID)}
      onMouseEnter={(e) => handleMouseEnter(e, socket, Event, data?.ID)}
      onMouseLeave={(e) => handleMouseLeave(e, socket, Event, data?.ID)}
      onMouseMove={(e) => handleMouseMove(e, socket, Event, data?.ID)}
      onDoubleClick={(e) => handleMouseDoubleClick(e, socket, Event, data?.ID)}
      onWheel={(e) => handleMouseWheel(e, socket, Event, data?.ID)}
    >
      <div
        ref={containerRef}
        className={`grid-container${Number(VScroll) === -3 ? ' force-vscroll' : ''}${Number(HScroll) === -3 ? ' force-hscroll' : ''}`}
        style={{
          overflowX: getOverflowStyle(HScroll),
          overflowY: getOverflowStyle(VScroll),
        }}
      >
        {Values && Values.length > 0 ? (
          <table className="grid-table">
            {/* <colgroup> is the cross-engine reliable way to pin column
                widths under table-layout: fixed. Cell-level widths can be
                ignored by some browsers (notably CEF) when the table itself
                doesn't have an explicit declared width. */}
            <colgroup>
              {showRowTitles && <col style={{ width: effectiveTitleWidth }} />}
              {(Array.isArray(Values[0]) ? Values[0] : [Values[0]]).map((_, colIndex) => (
                <col key={colIndex} style={{ width: getCellWidth(colIndex) }} />
              ))}
            </colgroup>
            {showColTitles && (
              <thead>
                <tr className="grid-header-row" style={{ height: effectiveTitleHeight }}>
                  {showRowTitles && (
                    <th
                      className="grid-corner-cell"
                      style={{ width: effectiveTitleWidth, height: effectiveTitleHeight, cursor: 'cell' }}
                      onMouseDown={() => {
                        setAnchor({ r: 1, c: 1 });
                        setSelection({ sr: 1, sc: 1, er: numRows, ec: numCols });
                        moveTo(1, 1);
                        isDraggingRef.current = true;
                      }}
                    />
                  )}
                  {colTitlesArray.map((title, colIndex) => (
                    <th
                      key={colIndex}
                      className={`grid-col-header${Array.isArray(title) ? ' multi-line' : ''}${isColInSelection(colIndex + 1) ? ' selected-col' : ''}`}
                      onMouseDown={(e) => {
                        const col = colIndex + 1;
                        if (e.shiftKey && anchor) {
                          const sc = Math.min(anchor.c, col), ec = Math.max(anchor.c, col);
                          setSelection({ sr: 1, sc, er: numRows, ec });
                          moveTo(1, col);
                          fireGridSelect(1, sc, numRows, ec);
                        } else {
                          setAnchor({ r: 1, c: col });
                          setSelection({ sr: 1, sc: col, er: numRows, ec: col });
                          moveTo(1, col);
                          isDraggingRef.current = true;
                        }
                      }}
                      onMouseEnter={() => {
                        if (!isDraggingRef.current || !anchor) return;
                        const col = colIndex + 1;
                        const sc = Math.min(anchor.c, col), ec = Math.max(anchor.c, col);
                        setSelection({ sr: 1, sc, er: numRows, ec });
                        moveTo(1, col);
                      }}
                      style={{
                        width: getCellWidth(colIndex),
                        height: effectiveTitleHeight,
                        cursor: 'cell',
                        backgroundColor: isColInSelection(colIndex + 1)
                          ? '#b8d4e8'
                          : ColTitleBCol ? rgbColor(ColTitleBCol) : undefined,
                        color: ColTitleFCol ? rgbColor(ColTitleFCol) : undefined,
                      }}
                    >
                      {Array.isArray(title)
                        ? <div className="grid-col-header-lines">
                            {title.map((line, i) => (
                              <div key={i} className="grid-col-header-line">
                                {line ? String(line) : '\u00A0'}
                              </div>
                            ))}
                          </div>
                        : (title !== null && title !== undefined ? String(title) : '')}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {Values.map((row, rowIndex) => {
                // One render path for array rows and scalar (single-column)
                // rows alike: normalize to an array, then map once.
                const cells = Array.isArray(row) ? row : [row];
                const rowHeight = getCellHeight(rowIndex);
                return (
                <tr key={rowIndex} className="grid-row" style={{ height: rowHeight }}>
                  {showRowTitles && (
                    <th
                      className={`grid-row-header${isRowInSelection(rowIndex + 1) ? ' selected-row' : ''}`}
                      onMouseDown={(e) => {
                        const row = rowIndex + 1;
                        if (e.shiftKey && anchor) {
                          const sr = Math.min(anchor.r, row), er = Math.max(anchor.r, row);
                          setSelection({ sr, sc: 1, er, ec: numCols });
                          moveTo(row, 1);
                          fireGridSelect(sr, 1, er, numCols);
                        } else {
                          setAnchor({ r: row, c: 1 });
                          setSelection({ sr: row, sc: 1, er: row, ec: numCols });
                          moveTo(row, 1);
                          isDraggingRef.current = true;
                        }
                      }}
                      onMouseEnter={() => {
                        if (!isDraggingRef.current || !anchor) return;
                        const row = rowIndex + 1;
                        const sr = Math.min(anchor.r, row), er = Math.max(anchor.r, row);
                        setSelection({ sr, sc: 1, er, ec: numCols });
                        moveTo(row, 1);
                      }}
                      style={{
                        width: effectiveTitleWidth,
                        height: rowHeight,
                        cursor: 'cell',
                        backgroundColor: isRowInSelection(rowIndex + 1)
                          ? '#b8d4e8'
                          : RowTitleBCol ? rgbColor(RowTitleBCol) : undefined,
                        color: RowTitleFCol ? rgbColor(RowTitleFCol) : undefined,
                      }}
                    >
                      {rowTitlesArray[rowIndex] !== null && rowTitlesArray[rowIndex] !== undefined
                        ? String(rowTitlesArray[rowIndex])
                        : ''}
                    </th>
                  )}
                  {cells.map((cell, colIndex) => {
                    const row1 = rowIndex + 1;
                    const col1 = colIndex + 1;
                    const cellType = inferCellType(cell);
                    const isSelected = isCurrentCell(rowIndex, colIndex);

                    // Resolve the embedded Input template by indexing the
                    // pre-resolved arrays — no per-cell full-tree lookup.
                    const inputIdx = CellTypes?.[rowIndex]?.[colIndex];
                    const inputComponentData = inputIdx >= 1
                      ? (resolvedInputs[inputIdx - 1] || null)
                      : null;
                    const inputType = inputComponentData?.Properties?.Type;

                    // shouldShowInput inlined against the resolved template:
                    // ShowInput only applies to Combo/Button cells.
                    let showInputForced = false;
                    if (inputType === 'Combo' || inputType === 'Button') {
                      if (ShowInput === 1) showInputForced = true;
                      else if (Array.isArray(ShowInput) && inputIdx >= 1) {
                        showInputForced = ShowInput[inputIdx - 1] === 1;
                      }
                    }
                    // The active cell shows its editor only as a single-cell
                    // focus; during a multi-cell range it renders as text.
                    const showWidget = !!inputComponentData
                      && inputType !== 'Label'
                      && (showInputForced || (isSelected && !selection));

                    const cellTypeIdx = inputIdx >= 1 ? inputIdx : null;
                    const rawFormatted = FormattedValues?.[rowIndex]?.[colIndex];
                    return (
                      <GridDataCell
                        key={colIndex}
                        row={row1}
                        col={col1}
                        rowIndex={rowIndex}
                        colIndex={colIndex}
                        value={cell}
                        rawFormatted={rawFormatted}
                        displayValue={formatCellValue(cell, cellType, rawFormatted)}
                        width={getCellWidth(colIndex)}
                        height={rowHeight}
                        textAlign={getAlignmentForType(cellType)}
                        isSelected={isSelected}
                        inRange={isCellInSelection(row1, col1)}
                        edgeClasses={selectionEdgeClasses(row1, col1)}
                        showWidget={showWidget}
                        bgColor={cellTypeIdx ? rgbColor(BCol?.[cellTypeIdx - 1]) : undefined}
                        fgColor={FCol ? rgbColor(FCol) : undefined}
                        cellFontStyles={cellTypeIdx ? (resolvedFontStyles[cellTypeIdx - 1] ?? EMPTY_STYLE) : EMPTY_STYLE}
                        inputComponentData={inputComponentData}
                        componentId={inputComponentData?.ID ?? null}
                        cellFontId={cellTypeIdx ? (CellFonts?.[cellTypeIdx - 1] ?? null) : null}
                        gridId={data?.ID}
                        fcol={FCol}
                        onCellChange={stableOnCellChange}
                        onCellMouseDownCapture={onCellMouseDownCapture}
                        onCellMouseDown={onCellMouseDown}
                        onCellMouseEnter={onCellMouseEnter}
                      />
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="grid-empty">
            No data
          </div>
        )}
      </div>
    </div>
  );
};

export default Grid;
