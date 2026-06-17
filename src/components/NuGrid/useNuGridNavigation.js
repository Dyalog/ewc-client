import { useCallback } from 'react';

// Keyboard navigation hook for NuGrid
// Handles arrow keys, Tab, Enter, Home, End, Page Up/Down, Space
// Returns: newCell array for navigation, 'activate' for Space, null for other keys
const useNuGridNavigation = (moveBy, moveTo, curCell, numRows, numCols, getPageRows) => {
  const handleKeyDown = useCallback((event) => {
    let newCell = null;
    const [row, col] = curCell;

    switch (event.key) {
      case ' ':
        // Space: activate current cell (toggle checkbox, open combo, edit text)
        event.preventDefault();
        return 'activate';

      case 'ArrowUp':
        event.preventDefault();
        newCell = moveBy(-1, 0);
        break;

      case 'ArrowDown':
        event.preventDefault();
        newCell = moveBy(1, 0);
        break;

      case 'ArrowLeft':
        event.preventDefault();
        newCell = moveBy(0, -1);
        break;

      case 'ArrowRight':
        event.preventDefault();
        newCell = moveBy(0, 1);
        break;

      case 'Tab':
        event.preventDefault();
        if (event.shiftKey) {
          // Shift+Tab: previous cell (wrap to previous row)
          if (col > 1) {
            newCell = moveBy(0, -1);
          } else if (row > 1) {
            newCell = moveTo(row - 1, numCols);
          }
        } else {
          // Tab: next cell (wrap to next row)
          if (col < numCols) {
            newCell = moveBy(0, 1);
          } else if (row < numRows) {
            newCell = moveTo(row + 1, 1);
          }
        }
        break;

      case 'Enter':
        event.preventDefault();
        // Enter moves down (like existing Grid behavior)
        newCell = moveBy(1, 0);
        break;

      case 'Home':
        event.preventDefault();
        if (event.ctrlKey) {
          // Ctrl+Home: first cell
          newCell = moveTo(1, 1);
        } else {
          // Home: first column in current row
          newCell = moveTo(row, 1);
        }
        break;

      case 'End':
        event.preventDefault();
        if (event.ctrlKey) {
          // Ctrl+End: last cell
          newCell = moveTo(numRows, numCols);
        } else {
          // End: last column in current row
          newCell = moveTo(row, numCols);
        }
        break;

      case 'PageUp': {
        event.preventDefault();
        // Page Up: move up by one viewport of rows (measured), not a fixed stride.
        const step = getPageRows ? getPageRows() : 9;
        newCell = moveBy(-step, 0);
        break;
      }

      case 'PageDown': {
        event.preventDefault();
        // Page Down: move down by one viewport of rows (measured), not a fixed stride.
        const step = getPageRows ? getPageRows() : 9;
        newCell = moveBy(step, 0);
        break;
      }

      default:
        // Don't prevent default for other keys
        return null;
    }

    return newCell;
  }, [curCell, moveBy, moveTo, numRows, numCols, getPageRows]);

  return { handleKeyDown };
};

export default useNuGridNavigation;
