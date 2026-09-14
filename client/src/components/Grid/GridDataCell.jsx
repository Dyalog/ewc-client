import { memo } from 'react';
import { normalizeAplFormatted } from './useNumericFormatter';
import GridCell from './GridCell';

// One data cell (<td>), memoized so a selection / drag / navigation change only
// re-renders the cells whose own props actually changed — not the whole R×C
// grid. The parent computes every prop from cheap arithmetic plus the already-
// resolved per-cellType arrays, so no full-tree lookups happen here, and the
// handlers/objects it passes are referentially stable so memo isn't defeated.
const GridDataCell = memo(function GridDataCell({
  row, col,                 // 1-based, for data-row/data-col + events
  rowIndex, colIndex,       // 0-based, passed to the stable cell handlers
  value,                    // raw cell value (for the embedded widget)
  rawFormatted,             // raw FormattedValues entry (normalized for the widget)
  displayValue,             // precomputed display string (text path)
  width, height, textAlign,
  isSelected, inRange, edgeClasses, showWidget,
  bgColor, fgColor, cellFontStyles,
  inputComponentData, componentId, cellFontId, gridId, fcol,
  onCellChange,
  onCellMouseDownCapture, onCellMouseDown, onCellMouseEnter,
}) {
  const className = `grid-cell${isSelected ? ' selected' : ''}`
    + `${inRange ? ' range-selected' : ''}${edgeClasses}`
    + `${showWidget ? ' has-component' : ''}`;

  return (
    <td
      className={className}
      data-row={row}
      data-col={col}
      style={{
        width,
        height,
        textAlign: showWidget ? undefined : textAlign,
        padding: showWidget ? 0 : undefined,
        backgroundColor: bgColor,
        color: fgColor,
        ...cellFontStyles,
      }}
      onMouseDownCapture={(e) => onCellMouseDownCapture(e, rowIndex, colIndex)}
      onMouseDown={(e) => onCellMouseDown(e, rowIndex, colIndex)}
      onMouseEnter={() => onCellMouseEnter(rowIndex, colIndex)}
    >
      {showWidget ? (
        <GridCell
          row={row}
          col={col}
          cellValue={value}
          formattedValue={normalizeAplFormatted(rawFormatted)}
          componentId={componentId}
          componentData={inputComponentData}
          gridId={gridId}
          onCellChange={onCellChange}
          cellFontId={cellFontId}
          cellFCol={fcol}
        />
      ) : (
        displayValue
      )}
    </td>
  );
});

export default GridDataCell;
