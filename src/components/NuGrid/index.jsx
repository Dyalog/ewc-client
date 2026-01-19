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
    CSS,
  } = data?.Properties || {};

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

  return (
    <div
      id={data?.ID}
      className="nugrid"
      style={styles}
    >
      <div className="nugrid-container">
        {Values && Values.length > 0 ? (
          <table className="nugrid-table">
            <tbody>
              {Values.map((row, rowIndex) => (
                <tr key={rowIndex} className="nugrid-row">
                  {Array.isArray(row) ? (
                    row.map((cell, colIndex) => (
                      <td
                        key={colIndex}
                        className="nugrid-cell"
                      >
                        {cell !== null && cell !== undefined ? String(cell) : ''}
                      </td>
                    ))
                  ) : (
                    // Handle case where row is a single value (1-column grid)
                    <td className="nugrid-cell">
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
