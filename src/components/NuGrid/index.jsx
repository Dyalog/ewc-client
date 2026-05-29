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
import { inferCellType, getAlignmentForType, isNumericType } from './cellTypes';
import useNumericFormatter, { normalizeAplFormatted } from './useNumericFormatter';
import useNuGridState from './useNuGridState';
import useNuGridNavigation from './useNuGridNavigation';
import useNuGridEvents from './useNuGridEvents';
import NuGridCell from './NuGridCell';
import './NuGrid.css';

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
    TitleWidth = 50,
    TitleHeight = 20,
    CellWidths = 100,
    CellHeights = 20,
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
  } = data?.Properties || {};

  // Values and FormattedValues are kept in local state so handleCellChange
  // updates are immediately visible without depending on the App re-rendering.
  // Server updates (FormatCell responses, server-set Values) arrive via props
  // and are synced here.
  const [Values, setValues] = useState(propsValues);
  const [FormattedValues, setFormattedValues] = useState(propsFormattedValues);

  useEffect(() => {
    setValues(propsValues);
  }, [propsValues]);

  useEffect(() => {
    setFormattedValues(propsFormattedValues);
  }, [propsFormattedValues]);

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
  const { fireCellMove, fireKeyPress, fireCellChanged } = useNuGridEvents(socket, Event, data?.ID);

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
    const result = navigationKeyDown(event);

    if (result === 'activate') {
      // Space key - activate the current cell's component
      activateCurrentCell();
    } else if (result) {
      const newCell = result;

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

  // Helper to get width for a column (scalar or per-column array)
  const getCellWidth = (colIndex) => {
    if (Array.isArray(CellWidths)) {
      return CellWidths[colIndex] ?? CellWidths[0] ?? 100;
    }
    return CellWidths || 100;
  };

  // Helper to get height for a row (scalar or per-row array)
  const getCellHeight = (rowIndex) => {
    if (Array.isArray(CellHeights)) {
      return CellHeights[rowIndex] ?? CellHeights[0] ?? 24;
    }
    return CellHeights || 24;
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
    ...customStyles,
  };

  // Normalize titles to arrays
  const colTitlesArray = ColTitles ? (Array.isArray(ColTitles) ? ColTitles : [ColTitles]) : [];
  const rowTitlesArray = RowTitles ? (Array.isArray(RowTitles) ? RowTitles : [RowTitles]) : [];
  const hasColTitles = colTitlesArray.length > 0;
  const hasRowTitles = rowTitlesArray.length > 0;

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
            {hasColTitles && (
              <thead>
                <tr className="nugrid-header-row" style={{ height: TitleHeight }}>
                  {hasRowTitles && (
                    <th
                      className="nugrid-corner-cell"
                      style={{ width: TitleWidth, height: TitleHeight }}
                    />
                  )}
                  {colTitlesArray.map((title, colIndex) => (
                    <th
                      key={colIndex}
                      className={`nugrid-col-header${Array.isArray(title) ? ' multi-line' : ''}${curCell[1] === colIndex + 1 ? ' selected-col' : ''}`}
                      style={{
                        width: getCellWidth(colIndex),
                        height: TitleHeight,
                        backgroundColor: curCell[1] === colIndex + 1
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
                  {hasRowTitles && (
                    <th
                      className={`nugrid-row-header${curCell[0] === rowIndex + 1 ? ' selected-row' : ''}`}
                      style={{
                        width: TitleWidth,
                        height: getCellHeight(rowIndex),
                        backgroundColor: curCell[0] === rowIndex + 1
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

                      return (
                        <td
                          key={colIndex}
                          className={`nugrid-cell${isSelected ? ' selected' : ''}${showWidget ? ' has-component' : ''}`}
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
                          onClick={() => handleCellClick(rowIndex, colIndex)}
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
                          className={`nugrid-cell${isSelected ? ' selected' : ''}${showWidget ? ' has-component' : ''}`}
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
                          onClick={() => handleCellClick(rowIndex, 0)}
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
