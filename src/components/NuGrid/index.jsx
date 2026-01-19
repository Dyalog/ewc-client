import { setStyle, parseFlexStyles, getObjectById } from '../../utils';
import { useAppData } from '../../hooks';
import { inferCellType, getAlignmentForType, isNumericType } from './cellTypes';
import useNumericFormatter from './useNumericFormatter';
import './NuGrid.css';

// NuGrid - Modern Grid reimplementation with embedded EWC components,
// explicit type awareness, and modular architecture
const NuGrid = ({ data }) => {
  const { dataRef } = useAppData();

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
    CSS,
  } = data?.Properties || {};

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
    >
      <div className="nugrid-container">
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
                      className="nugrid-col-header"
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
                      className="nugrid-row-header"
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
                      return (
                        <td
                          key={colIndex}
                          className="nugrid-cell"
                          style={{
                            width: getCellWidth(colIndex),
                            height: getCellHeight(rowIndex),
                            textAlign,
                          }}
                        >
                          {formatCellValue(cell, cellType)}
                        </td>
                      );
                    })
                  ) : (
                    (() => {
                      const cellType = inferCellType(row);
                      const textAlign = getAlignmentForType(cellType);
                      return (
                        <td
                          className="nugrid-cell"
                          style={{
                            width: getCellWidth(0),
                            height: getCellHeight(rowIndex),
                            textAlign,
                          }}
                        >
                          {formatCellValue(row, cellType)}
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
