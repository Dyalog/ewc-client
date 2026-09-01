import { useMemo } from 'react';

// Convert ⎕FMT output to web form: ¯→'-' and strip column-width padding.
// Used at the APL ↔ web boundary (display read sites and commit).
export const normalizeAplFormatted = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/¯/g, '-').trim();
};

// Hook for numeric formatting using EWC's explicit separators
// Gets Thousand and Decimal separators from the Locale object
const useNumericFormatter = (thousandSep = ',', decimalSep = '.') => {
  const formatNumber = useMemo(() => {
    return (value) => {
      if (value === null || value === undefined || value === '') {
        return '';
      }

      // Parse string to number if needed
      const num = typeof value === 'number' ? value : parseFloat(value);

      if (!Number.isFinite(num)) {
        return String(value);
      }

      // Split into integer and decimal parts
      const [intPart, decPart] = num.toString().split('.');

      // Add thousand separators to integer part
      const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);

      // Combine with decimal part if present
      if (decPart !== undefined) {
        return formattedInt + decimalSep + decPart;
      }

      return formattedInt;
    };
  }, [thousandSep, decimalSep]);

  // Parse a formatted string back to a number (for editing)
  const parseNumber = useMemo(() => {
    return (formattedValue) => {
      if (!formattedValue || typeof formattedValue !== 'string') {
        return null;
      }

      // Remove thousand separators and normalize decimal
      const escaped = thousandSep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let normalized = formattedValue
        .replace(new RegExp(escaped, 'g'), '')
        .replace(decimalSep, '.');

      // Remove any non-numeric characters except . and -
      normalized = normalized.replace(/[^\d.-]/g, '');

      const result = parseFloat(normalized);
      return Number.isFinite(result) ? result : null;
    };
  }, [thousandSep, decimalSep]);

  return {
    formatNumber,
    parseNumber,
  };
};

export default useNumericFormatter;
