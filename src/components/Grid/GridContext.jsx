import { createContext, useContext } from 'react';

// Context for components embedded in Grid cells
// Allows Edit, Button, Combo, Label to detect they're in a grid and adapt
const GridContext = createContext(null);

// Provider component for wrapping embedded cell components
export const GridProvider = GridContext.Provider;

// Hook for components to access grid context
// Returns null when component is used outside a grid
export const useGridContext = () => {
  return useContext(GridContext);
};

// Context shape (for reference):
// {
//   isInGrid: true,              // Always true when in context
//   gridId: 'F.G',               // Grid's ID for events
//   row: 2,                      // 1-based row number
//   col: 3,                      // 1-based column number
//   cellValue: <value>,          // Current value from Values[row][col]
//   componentId: 'F.G.E1',       // The Input component's ID
//   componentData: {...},        // The Input component's full data object
//   onCellChange: (newValue) => {...},  // Callback to update Values and fire events
// }

export default GridContext;
