// Cell type constants and inference for Grid
// Types determine: alignment (left/right), formatting (locale-aware), and future input validation
export const CellTypes = {
  TEXT: 'text',
  NUMERIC: 'numeric',
  BOOLEAN: 'boolean',
  DATE: 'date',
};

// Infer the type of a cell value
export const inferCellType = (value) => {
  // Null/undefined treated as text (empty)
  if (value === null || value === undefined) {
    return CellTypes.TEXT;
  }

  // Boolean check (actual boolean type)
  if (typeof value === 'boolean') {
    return CellTypes.BOOLEAN;
  }

  // Numeric check (number type, excluding NaN/Infinity)
  if (typeof value === 'number' && Number.isFinite(value)) {
    return CellTypes.NUMERIC;
  }

  // String analysis
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Empty string is text
    if (trimmed === '') {
      return CellTypes.TEXT;
    }

    // Boolean-like strings
    if (['true', 'false', 'yes', 'no'].includes(trimmed.toLowerCase())) {
      return CellTypes.BOOLEAN;
    }

    // Numeric string check (handles integers, decimals, negative)
    // Be strict: must be a valid number representation
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return CellTypes.NUMERIC;
    }

    // ISO date format check (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return CellTypes.DATE;
    }
  }

  // Default to text for anything else (objects, arrays, etc.)
  return CellTypes.TEXT;
};

// Get the CSS text-align value for a cell type
export const getAlignmentForType = (cellType) => {
  switch (cellType) {
    case CellTypes.NUMERIC:
      return 'right';
    case CellTypes.BOOLEAN:
      return 'center';
    case CellTypes.DATE:
      return 'center';
    case CellTypes.TEXT:
    default:
      return 'left';
  }
};

export const isNumericType = (cellType) => cellType === CellTypes.NUMERIC;
