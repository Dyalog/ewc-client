import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  setStyle,
  parseFlexStyles,
  getObjectById,
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
import useNuGridState from './useNuGridState';
import useNuGridNavigation from './useNuGridNavigation';
import useNuGridEvents from './useNuGridEvents';
import useNuGridTitleSize from './useNuGridTitleSize';
import NuGridCell from './NuGridCell';
import './NuGrid.css';

// Pre-mount / unknown-column fallback before useLayoutEffect measures.
// Matches the legacy Grid component's `!CellWidths ? 100` default.
const FALLBACK_CELL_WIDTH = 100;
// Default data-row height. 16px matches the native Win32 grid row pitch
// (paired with line-height:15px on .nugrid-cell in NuGrid.css). Only used to
// fill sparse CellHeights-array holes; explicit APL CellHeights still win.
const FALLBACK_CELL_HEIGHT = 16;

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

// NuGrid - Modern Grid reimplementation with embedded EWC components,
// explicit type awareness, and modular architecture
const NuGrid = ({ data }) => {
  const { dataRef, handleData, socket, findCurrentData } = useAppData();

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

  // Keep refs in sync with the latest values for the window listener.
  useEffect(() => { selectionRef.current = selection; });
  useEffect(() => { fireGridSelectRef.current = fireGridSelect; });

  // Normalize Input to an array (can be single string or array of strings)
  // useMemo ensures stable reference for useCallback dependencies
  const inputArray = useMemo(() => {
    return Input ? (Array.isArray(Input) ? Input : [Input]) : [];
  }, [Input]);

  // Calculate grid dimensions for bounds checking
  const numRows = Values?.length || 0;
  const numCols = Values?.[0]?.length || (numRows > 0 ? 1 : 0);

  // State management for current cell selection
  const { curCell, moveTo, moveBy, isCurrentCell } = useNuGridState(CurCell, numRows, numCols);


  // Keyboard navigation
  const { handleKeyDown: navigationKeyDown } = useNuGridNavigation(
    moveBy, moveTo, curCell, numRows, numCols
  );

  // Event handling (CellMove, KeyPress, CellChanged)
  const { fireCellMove, fireKeyPress, fireCellChanged, fireGridSelect } = useNuGridEvents(socket, Event, data?.ID);

  // Use a ref for Values to avoid recreating handleCellChange on every Values change
  // This prevents the infinite re-render loop when embedded components update values
  const valuesRef = useRef(Values);
  valuesRef.current = Values;

  const formatStringRef = useRef(FormatString);
  formatStringRef.current = FormatString;
  const cellTypesRef = useRef(CellTypes);
  cellTypesRef.current = CellTypes;

  // Get the Input component ID for a specific cell based on CellTypes matrix
  const getInputComponentId = useCallback((rowIndex, colIndex) => {
    if (!inputArray.length || !CellTypes) return null;

    // CellTypes is a matrix of 1-based indices into the Input array
    const cellType = CellTypes[rowIndex]?.[colIndex];
    if (!cellType || cellType < 1) return null;

    // Convert 1-based index to 0-based for array access
    return inputArray[cellType - 1] || null;
  }, [inputArray, CellTypes]);

  // Get the 1-based CellType index for a cell, or null if none
  const getCellTypeIndex = useCallback((rowIndex, colIndex) => {
    const cellType = CellTypes?.[rowIndex]?.[colIndex];
    return (cellType && cellType >= 1) ? cellType : null;
  }, [CellTypes]);

  // Check if a cell's input widget should be shown (even when not selected)
  const shouldShowInput = useCallback((rowIndex, colIndex) => {
    if (ShowInput === 1) return true;
    if (ShowInput === 0) return false;
    if (Array.isArray(ShowInput)) {
      const cellType = CellTypes?.[rowIndex]?.[colIndex];
      if (cellType && cellType >= 1) {
        return ShowInput[cellType - 1] === 1;
      }
    }
    return false;
  }, [ShowInput, CellTypes]);

  // Handle cell value changes from embedded components
  // Uses valuesRef to avoid recreating this callback when Values changes
  const handleCellChange = useCallback((row, col, newValue) => {
    // Validate row/col to prevent errors
    if (typeof row !== 'number' || typeof col !== 'number' || row < 1 || col < 1) {
      console.error('NuGrid handleCellChange: invalid row/col', { row, col, newValue });
      return;
    }

    const currentValues = valuesRef.current;
    if (!currentValues || !currentValues[row - 1]) {
      console.error('NuGrid handleCellChange: invalid Values matrix', { row, col, currentValues });
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

  // Refs for the grid element and scrollable container
  const gridRef = useRef(null);
  const containerRef = useRef(null);

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
    // Ctrl/Cmd+C copies the current selection as TSV. Tab-delimited within
    // rows, newline-delimited between rows — pastes into Excel/Sheets.
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      copySelectionToClipboard();
      return;
    }
    // Ctrl/Cmd+A selects all (Excel-style).
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      selectAll();
      return;
    }
    // Shift+arrow extends the selection from `anchor` toward the new cell.
    // Without shift, arrows just navigate (existing path).
    if (event.shiftKey
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
        // Still update CurCell in data tree so the re-render picks up
        // any Values changes made by commitActiveEdit above
        handleData({
          ID: data?.ID,
          Properties: { CurCell: newCell },
        }, 'WS');
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

      // Always update data tree so server can read CurCell via eWG
      handleData({
        ID: data?.ID,
        Properties: { CurCell: newCell },
      }, 'WS');
      // Fire CellMove event if registered (mouseFlag=0 for keyboard)
      fireCellMove(newCell[0], newCell[1], 0);
    } else {
      // Not a navigation key - fire KeyPress for other keys
      fireKeyPress(event);
    }
  };

  // Handle cell click - update selection and notify server
  const handleCellClick = (rowIndex, colIndex) => {
    // Convert from 0-based to 1-based
    const row = rowIndex + 1;
    const col = colIndex + 1;

    // Skip if already selected
    if (curCell[0] === row && curCell[1] === col) return;

    // Commit any in-progress edit before changing selection
    commitActiveEdit();

    // Update local state
    moveTo(row, col);

    // Always update data tree so server can read CurCell via eWG
    handleData({
      ID: data?.ID,
      Properties: { CurCell: [row, col] },
    }, 'WS');
    // Fire CellMove event if registered (mouseFlag=1 for mouse)
    fireCellMove(row, col, 1);
  };

  // Get locale separators from EWC's Locale object
  const localeData = JSON.parse(getObjectById(dataRef.current, 'Locale') || '{}');
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
  const extendSelectionTo = (r, c) => {
    const a = anchor ?? { r: curCell[0], c: curCell[1] };
    if (!anchor) setAnchor(a);
    const sr = Math.min(a.r, r), er = Math.max(a.r, r);
    const sc = Math.min(a.c, c), ec = Math.max(a.c, c);
    if (sr === er && sc === ec) {
      setSelection(null);
    } else {
      setSelection({ sr, sc, er, ec });
    }
    moveTo(r, c);
    fireGridSelect(sr, sc, er, ec);
  };

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
  const colTitlesArray = explicitColTitles
    ? (Array.isArray(ColTitles) ? ColTitles : [ColTitles])
    : Array.from({ length: numCols }, (_, i) => columnLetter(i));
  const rowTitlesArray = explicitRowTitles
    ? (Array.isArray(RowTitles) ? RowTitles : [RowTitles])
    : Array.from({ length: numRows }, (_, i) => String(i + 1));
  const hasColTitles = colTitlesArray.length > 0;
  const hasRowTitles = rowTitlesArray.length > 0;

  // ⎕WC behavior: undefined/empty/negative TitleWidth/Height/CellWidths
  // auto-size to fit content; 0 hides titles; positive is fixed.
  const {
    effectiveTitleWidth, effectiveTitleHeight, autoColWidths, wantsAutoCols,
  } = useNuGridTitleSize(
    TitleWidth, TitleHeight, CellWidths, rowTitlesArray, colTitlesArray, gridRef,
  );

  // ⎕WC: TitleWidth/Height = 0 fully hides the row/col title band (no DOM at all).
  const showRowTitles = hasRowTitles && effectiveTitleWidth !== 0;
  const showColTitles = hasColTitles && effectiveTitleHeight !== 0;

  return (
    <div
      ref={gridRef}
      id={data?.ID}
      className="nugrid"
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
        className={`nugrid-container${Number(VScroll) === -3 ? ' force-vscroll' : ''}${Number(HScroll) === -3 ? ' force-hscroll' : ''}`}
        style={{
          overflowX: getOverflowStyle(HScroll),
          overflowY: getOverflowStyle(VScroll),
        }}
      >
        {Values && Values.length > 0 ? (
          <table className="nugrid-table">
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
                <tr className="nugrid-header-row" style={{ height: effectiveTitleHeight }}>
                  {showRowTitles && (
                    <th
                      className="nugrid-corner-cell"
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
                      className={`nugrid-col-header${Array.isArray(title) ? ' multi-line' : ''}${isColInSelection(colIndex + 1) ? ' selected-col' : ''}`}
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
                        ? <div className="nugrid-col-header-lines">
                            {title.map((line, i) => (
                              <div key={i} className="nugrid-col-header-line">
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
              {Values.map((row, rowIndex) => (
                <tr key={rowIndex} className="nugrid-row" style={{ height: getCellHeight(rowIndex) }}>
                  {showRowTitles && (
                    <th
                      className={`nugrid-row-header${isRowInSelection(rowIndex + 1) ? ' selected-row' : ''}`}
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
                        height: getCellHeight(rowIndex),
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
                  {Array.isArray(row) ? (
                    row.map((cell, colIndex) => {
                      const cellType = inferCellType(cell);
                      const textAlign = getAlignmentForType(cellType);
                      const isSelected = isCurrentCell(rowIndex, colIndex);

                      // Check if this cell has an embedded Input component
                      const inputComponentId = getInputComponentId(rowIndex, colIndex);
                      const inputComponentData = inputComponentId
                        ? findCurrentData(inputComponentId)
                        : null;

                      const showWidget = inputComponentData
                            && inputComponentData?.Properties?.Type !== 'Label'
                            && (shouldShowInput(rowIndex, colIndex) || isSelected);

                      // Per-cellType styling
                      const cellTypeIdx = getCellTypeIndex(rowIndex, colIndex);
                      const bgColor = cellTypeIdx ? rgbColor(BCol?.[cellTypeIdx - 1]) : undefined;
                      const fgColor = FCol ? rgbColor(FCol) : undefined;
                      const cellFontId = cellTypeIdx ? CellFonts?.[cellTypeIdx - 1] : null;
                      const cellFontObj = cellFontId ? findCurrentData(cellFontId) : null;
                      const cellFontStyles = cellFontObj ? getFontStyles(cellFontObj) : {};

                      const inRange = isCellInSelection(rowIndex + 1, colIndex + 1);
                      return (
                        <td
                          key={colIndex}
                          className={`nugrid-cell${isSelected ? ' selected' : ''}${inRange ? ' range-selected' : ''}${showWidget ? ' has-component' : ''}`}
                          data-row={rowIndex + 1}
                          data-col={colIndex + 1}
                          style={{
                            width: getCellWidth(colIndex),
                            height: getCellHeight(rowIndex),
                            textAlign: showWidget ? undefined : textAlign,
                            padding: showWidget ? 0 : undefined,
                            backgroundColor: bgColor,
                            color: fgColor,
                            ...cellFontStyles,
                          }}
                          onMouseDownCapture={(e) => {
                            // Shift+click extends selection — intercept at
                            // capture so it works even on cells with widgets
                            // (Combo, checkbox), preventing widget activation.
                            if (e.shiftKey) {
                              e.preventDefault();
                              e.stopPropagation();
                              extendSelectionTo(rowIndex + 1, colIndex + 1);
                            }
                          }}
                          onMouseDown={(e) => {
                            if (e.shiftKey) return; // handled in capture
                            // Plain mousedown: only start drag-select if the
                            // event hit the cell itself (not a widget child).
                            // For widget cells, mousedown opens the widget as
                            // usual; users start drags from non-widget cells.
                            if (e.target !== e.currentTarget) return;
                            const r = rowIndex + 1, c = colIndex + 1;
                            if (selection) fireGridSelect(r, c, r, c);
                            setAnchor({ r, c });
                            setSelection(null);
                            isDraggingRef.current = true;
                            handleCellClick(rowIndex, colIndex);
                          }}
                          onMouseEnter={() => {
                            // While dragging, sweep the selection rectangle.
                            if (!isDraggingRef.current || !anchor) return;
                            const r = rowIndex + 1, c = colIndex + 1;
                            const sr = Math.min(anchor.r, r), er = Math.max(anchor.r, r);
                            const sc = Math.min(anchor.c, c), ec = Math.max(anchor.c, c);
                            if (sr === er && sc === ec) {
                              setSelection(null);
                            } else {
                              setSelection({ sr, sc, er, ec });
                            }
                            moveTo(r, c);
                          }}
                        >
                          {showWidget ? (
                            <NuGridCell
                              row={rowIndex + 1}
                              col={colIndex + 1}
                              cellValue={cell}
                              formattedValue={normalizeAplFormatted(FormattedValues?.[rowIndex]?.[colIndex])}
                              componentId={inputComponentId}
                              componentData={inputComponentData}
                              gridId={data?.ID}
                              onCellChange={handleCellChange}
                            />
                          ) : (
                            formatCellValue(cell, cellType, FormattedValues?.[rowIndex]?.[colIndex])
                          )}
                        </td>
                      );
                    })
                  ) : (
                    (() => {
                      const cellType = inferCellType(row);
                      const textAlign = getAlignmentForType(cellType);
                      const isSelected = isCurrentCell(rowIndex, 0);

                      // Check if this cell has an embedded Input component
                      const inputComponentId = getInputComponentId(rowIndex, 0);
                      const inputComponentData = inputComponentId
                        ? findCurrentData(inputComponentId)
                        : null;

                      const showWidget = inputComponentData
                            && inputComponentData?.Properties?.Type !== 'Label'
                            && (shouldShowInput(rowIndex, 0) || isSelected);

                      // Per-cellType styling
                      const cellTypeIdx = getCellTypeIndex(rowIndex, 0);
                      const bgColor = cellTypeIdx ? rgbColor(BCol?.[cellTypeIdx - 1]) : undefined;
                      const fgColor = FCol ? rgbColor(FCol) : undefined;
                      const cellFontId = cellTypeIdx ? CellFonts?.[cellTypeIdx - 1] : null;
                      const cellFontObj = cellFontId ? findCurrentData(cellFontId) : null;
                      const cellFontStyles = cellFontObj ? getFontStyles(cellFontObj) : {};

                      return (
                        <td
                          className={`nugrid-cell${isSelected ? ' selected' : ''}${isCellInSelection(rowIndex + 1, 1) ? ' range-selected' : ''}${showWidget ? ' has-component' : ''}`}
                          data-row={rowIndex + 1}
                          data-col={1}
                          style={{
                            width: getCellWidth(0),
                            height: getCellHeight(rowIndex),
                            textAlign: showWidget ? undefined : textAlign,
                            padding: showWidget ? 0 : undefined,
                            backgroundColor: bgColor,
                            color: fgColor,
                            ...cellFontStyles,
                          }}
                          onMouseDownCapture={(e) => {
                            if (e.shiftKey) {
                              e.preventDefault();
                              e.stopPropagation();
                              extendSelectionTo(rowIndex + 1, 1);
                            }
                          }}
                          onMouseDown={(e) => {
                            if (e.shiftKey) return;
                            if (e.target !== e.currentTarget) return;
                            const r = rowIndex + 1;
                            if (selection) fireGridSelect(r, 1, r, 1);
                            setAnchor({ r, c: 1 });
                            setSelection(null);
                            isDraggingRef.current = true;
                            handleCellClick(rowIndex, 0);
                          }}
                          onMouseEnter={() => {
                            if (!isDraggingRef.current || !anchor) return;
                            const r = rowIndex + 1;
                            const sr = Math.min(anchor.r, r), er = Math.max(anchor.r, r);
                            if (sr === er) setSelection(null);
                            else setSelection({ sr, sc: 1, er, ec: 1 });
                            moveTo(r, 1);
                          }}
                        >
                          {showWidget ? (
                            <NuGridCell
                              row={rowIndex + 1}
                              col={1}
                              cellValue={row}
                              formattedValue={normalizeAplFormatted(FormattedValues?.[rowIndex]?.[0])}
                              componentId={inputComponentId}
                              componentData={inputComponentData}
                              gridId={data?.ID}
                              onCellChange={handleCellChange}
                            />
                          ) : (
                            formatCellValue(row, cellType, FormattedValues?.[rowIndex]?.[0])
                          )}
                        </td>
                      );
                    })()
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="nugrid-empty">
            No data
          </div>
        )}
      </div>
    </div>
  );
};

export default NuGrid;
