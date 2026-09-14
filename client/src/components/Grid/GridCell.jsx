import { useMemo, useCallback, useRef } from 'react';
import { GridProvider } from './GridContext';
import SelectComponent from '../SelectComponent';

// GridCell wraps an embedded component in grid context
// It provides the component with information about its cell position and value
const GridCell = ({
  row,           // 1-based row number
  col,           // 1-based column number
  cellValue,     // Value from grid's Values[row-1][col-1]
  formattedValue, // Pre-formatted display string from FormattedValues
  componentId,   // ID of the Input component (e.g., 'F.G.E1')
  componentData, // Full data object of the Input component
  gridId,        // ID of the grid (e.g., 'F.G')
  onCellChange,  // Callback to update Values and fire CellChanged
  cellFontId,    // FontObj id from the grid's CellFonts for this cell type
  cellFCol,      // FCol from the grid (raw colour value)
}) => {
  // Use refs to capture current values without causing re-renders
  // This prevents the infinite update loop
  const onCellChangeRef = useRef(onCellChange);
  onCellChangeRef.current = onCellChange;

  // Stable callback that uses refs - won't change between renders
  const handleCellChange = useCallback((newValue) => {
    onCellChangeRef.current(row, col, newValue);
  }, [row, col]); // Only recreate if row/col change (which they shouldn't for a given cell)

  // Build the context value for the embedded component
  // Note: onCellChange is NOT in dependencies - we use handleCellChange instead
  const contextValue = useMemo(() => ({
    isInGrid: true,
    gridId,
    row,
    col,
    cellValue,
    formattedValue,
    componentId,
    componentData,
    onCellChange: handleCellChange,
  }), [gridId, row, col, cellValue, formattedValue, componentId, componentData, handleCellChange]);

  // Clone component data with overrides for grid embedding
  // The embedded component will use cellValue instead of its own Text/Value/State
  const embeddedData = useMemo(() => ({
    ...componentData,
    Properties: {
      ...componentData?.Properties,
      // Override positioning - component fills the cell
      Posn: undefined,
      Size: undefined,
      // The template is shared across every cell in the column. APL may set
      // Visible=0 on the template (it's "hidden" in its standalone form
      // context) — but the native ⎕WC grid never honours that inside a cell.
      // Force visible here so cells don't render as display:none.
      Visible: 1,
      // Inherit the cell's typography so the editor matches the static cell:
      // hand the embedded widget the column's CellFonts/FCol as its own
      // FontObj/FCol (resolved via inheritedProperty), unless the template
      // already specifies its own.
      ...(cellFontId && componentData?.Properties?.FontObj == null ? { FontObj: cellFontId } : {}),
      ...(cellFCol != null && componentData?.Properties?.FCol == null ? { FCol: cellFCol } : {}),
    },
  }), [componentData, cellFontId, cellFCol]);

  return (
    <GridProvider value={contextValue}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex' }}>
        <SelectComponent
          data={embeddedData}
          location="inGrid"
        />
      </div>
    </GridProvider>
  );
};

export default GridCell;
