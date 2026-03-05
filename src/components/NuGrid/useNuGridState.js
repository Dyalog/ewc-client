import { useState, useEffect, useCallback } from 'react';

// State management hook for NuGrid
// Handles CurCell (current cell selection) with 1-based indexing (APL convention)
const useNuGridState = (initialCurCell, numRows, numCols) => {
  // CurCell is [row, col] in 1-based indexing
  const [curCell, setCurCell] = useState(() => {
    const initial = initialCurCell || [1, 1];
    return [
      Math.max(1, Math.min(initial[0], numRows || 1)),
      Math.max(1, Math.min(initial[1], numCols || 1)),
    ];
  });

  // Sync with external CurCell changes (e.g., from server)
  // Uses functional setCurCell: returning prev when values match lets React skip the re-render,
  // avoiding unnecessary cycles when initialCurCell is a new array ref with identical values.
  useEffect(() => {
    if (initialCurCell) {
      const clampedRow = Math.max(1, Math.min(initialCurCell[0], numRows || 1));
      const clampedCol = Math.max(1, Math.min(initialCurCell[1], numCols || 1));
      setCurCell(prev => {
        if (prev[0] === clampedRow && prev[1] === clampedCol) return prev;
        return [clampedRow, clampedCol];
      });
    }
  }, [initialCurCell, numRows, numCols]);

  // Move to a specific cell (1-based coordinates)
  const moveTo = useCallback((row, col) => {
    const clampedRow = Math.max(1, Math.min(row, numRows || 1));
    const clampedCol = Math.max(1, Math.min(col, numCols || 1));
    setCurCell([clampedRow, clampedCol]);
    return [clampedRow, clampedCol];
  }, [numRows, numCols]);

  // Move relative to current position
  const moveBy = useCallback((deltaRow, deltaCol) => {
    const newRow = Math.max(1, Math.min(curCell[0] + deltaRow, numRows || 1));
    const newCol = Math.max(1, Math.min(curCell[1] + deltaCol, numCols || 1));
    setCurCell([newRow, newCol]);
    return [newRow, newCol];
  }, [curCell, numRows, numCols]);

  // Check if a cell is the current cell (for highlighting)
  // rowIndex and colIndex are 0-based (from React map)
  const isCurrentCell = useCallback((rowIndex, colIndex) => {
    return curCell[0] === rowIndex + 1 && curCell[1] === colIndex + 1;
  }, [curCell]);

  return {
    curCell,
    setCurCell,
    moveTo,
    moveBy,
    isCurrentCell,
  };
};

export default useNuGridState;
