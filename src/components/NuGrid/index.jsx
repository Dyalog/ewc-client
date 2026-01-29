import { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  setStyle,
  parseFlexStyles,
  getObjectById,
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
import useNumericFormatter from './useNumericFormatter';
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
    Values,
    ColTitles,
    RowTitles,
    TitleWidth = 50,
    TitleHeight = 24,
    CellWidths = 100,
    CellHeights = 24,
    CurCell,
    VScroll = -1,
    HScroll = -1,
    Input,
    CellTypes,
    CSS,
    Event,
  } = data?.Properties || {};

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

  // Get the Input component ID for a specific cell based on CellTypes matrix
  const getInputComponentId = useCallback((rowIndex, colIndex) => {
    if (!inputArray.length || !CellTypes) return null;

    // CellTypes is a matrix of 1-based indices into the Input array
    const cellType = CellTypes[rowIndex]?.[colIndex];
    if (!cellType || cellType < 1) return null;

    // Convert 1-based index to 0-based for array access
    return inputArray[cellType - 1] || null;
  }, [inputArray, CellTypes]);

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

    // Update Values in the tree
    handleData({
      ID: data?.ID,
      Properties: { Values: newValues },
    }, 'WS');

    // Fire CellChanged event if registered
    fireCellChanged(row, col, newValue);
  }, [data?.ID, handleData, fireCellChanged]); // Note: Values removed from deps!

  // Ref for scrolling selected cell into view
  const containerRef = useRef(null);

  // Scroll the selected cell into view when curCell changes
  useEffect(() => {
    if (!containerRef.current || !curCell) return;
    const [row, col] = curCell;
    const cellElement = containerRef.current.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    );
    if (cellElement) {
      cellElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [curCell]);

  // Handle keyboard events
  const handleKeyDown = (event) => {
    const newCell = navigationKeyDown(event);
    if (newCell) {
      // Fire CellMove event if registered, otherwise just update CurCell
      // mouseFlag=0 because keyboard was used (not mouse)
      const eventFired = fireCellMove(newCell[0], newCell[1], 0);
      if (!eventFired) {
        // No CellMove handler, just update property
        handleData({
          ID: data?.ID,
          Properties: { CurCell: newCell },
        }, 'WS');
      }
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

    // Update local state
    moveTo(row, col);

    // Fire CellMove event if registered, otherwise just update CurCell
    // mouseFlag=1 because mouse was used
    const eventFired = fireCellMove(row, col, 1);
    if (!eventFired) {
      // No CellMove handler, just update property
      handleData({
        ID: data?.ID,
        Properties: { CurCell: [row, col] },
      }, 'WS');
    }
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
  const formatCellValue = (value, cellType) => {
    if (value === null || value === undefined) {
      return '';
    }
    if (isNumericType(cellType)) {
      return formatNumber(value);
    }
    return String(value);
  };

  const customStyles = parseFlexStyles(CSS);
  const baseStyles = setStyle(data?.Properties);

  const styles = {
    ...baseStyles,
    position: 'absolute',
    display: Visible === 0 ? 'none' : 'block',
    width: Size?.[1] ?? 275,
    height: Size?.[0] ?? 225,
    top: Posn?.[0] ?? 0,
    left: Posn?.[1] ?? 0,
    ...customStyles,
  };

  // Normalize titles to arrays
  const colTitlesArray = ColTitles ? (Array.isArray(ColTitles) ? ColTitles : [ColTitles]) : [];
  const rowTitlesArray = RowTitles ? (Array.isArray(RowTitles) ? RowTitles : [RowTitles]) : [];
  const hasColTitles = colTitlesArray.length > 0;
  const hasRowTitles = rowTitlesArray.length > 0;

  return (
    <div
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
                      className={`nugrid-col-header${curCell[1] === colIndex + 1 ? ' selected-col' : ''}`}
                      style={{ width: getCellWidth(colIndex), height: TitleHeight }}
                    >
                      {title !== null && title !== undefined ? String(title) : ''}
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
                      style={{ width: TitleWidth, height: getCellHeight(rowIndex) }}
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

                      return (
                        <td
                          key={colIndex}
                          className={`nugrid-cell${isSelected ? ' selected' : ''}${inputComponentData ? ' has-component' : ''}`}
                          data-row={rowIndex + 1}
                          data-col={colIndex + 1}
                          style={{
                            width: getCellWidth(colIndex),
                            height: getCellHeight(rowIndex),
                            textAlign: inputComponentData ? undefined : textAlign,
                            padding: inputComponentData ? 0 : undefined,
                          }}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                        >
                          {inputComponentData ? (
                            <NuGridCell
                              row={rowIndex + 1}
                              col={colIndex + 1}
                              cellValue={cell}
                              componentId={inputComponentId}
                              componentData={inputComponentData}
                              gridId={data?.ID}
                              onCellChange={handleCellChange}
                            />
                          ) : (
                            formatCellValue(cell, cellType)
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

                      return (
                        <td
                          className={`nugrid-cell${isSelected ? ' selected' : ''}${inputComponentData ? ' has-component' : ''}`}
                          data-row={rowIndex + 1}
                          data-col={1}
                          style={{
                            width: getCellWidth(0),
                            height: getCellHeight(rowIndex),
                            textAlign: inputComponentData ? undefined : textAlign,
                            padding: inputComponentData ? 0 : undefined,
                          }}
                          onClick={() => handleCellClick(rowIndex, 0)}
                        >
                          {inputComponentData ? (
                            <NuGridCell
                              row={rowIndex + 1}
                              col={1}
                              cellValue={row}
                              componentId={inputComponentId}
                              componentData={inputComponentData}
                              gridId={data?.ID}
                              onCellChange={handleCellChange}
                            />
                          ) : (
                            formatCellValue(row, cellType)
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
