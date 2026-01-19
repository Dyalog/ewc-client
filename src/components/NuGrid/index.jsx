import { setStyle, parseFlexStyles } from '../../utils';
import './NuGrid.css';

/**
 * NuGrid - A modern reimplementation of the Grid component
 *
 * Key improvements over the original Grid:
 * - Embeds actual EWC components (Edit, Button, Combo) instead of duplicated cell components
 * - Explicit type awareness for proper localization and formatting
 * - Modular architecture with hooks and context
 */
const NuGrid = ({ data }) => {
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
                    row.map((cell, colIndex) => (
                      <td
                        key={colIndex}
                        className="nugrid-cell"
                        style={{ width: getCellWidth(colIndex), height: getCellHeight(rowIndex) }}
                      >
                        {cell !== null && cell !== undefined ? String(cell) : ''}
                      </td>
                    ))
                  ) : (
                    <td className="nugrid-cell" style={{ width: getCellWidth(0), height: getCellHeight(rowIndex) }}>
                      {row !== null && row !== undefined ? String(row) : ''}
                    </td>
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
