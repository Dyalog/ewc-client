// Resolve Border (0/1) and EdgeStyle ('Ridge'|'Groove'|'Recess'|'Plinth'|
// 'Shadow'|'None') — two independent APL properties — into a single CSS
// border declaration. A border is drawn when Border != 0 OR EdgeStyle names
// a real style; EdgeStyle wins on appearance, Border alone gets a plain 1px
// line in defaultColor.
export const getBorderStyles = (EdgeStyle, Border, defaultColor = '#E9E9E9') => {
  const hasEdgeStyle = EdgeStyle && EdgeStyle !== 'None';
  const hasBorder = Border != 0 || hasEdgeStyle;
  if (!hasBorder) return { border: 'none' };
  if (hasEdgeStyle) return getEdgeStyleBorder(EdgeStyle);
  return { border: `1px solid ${defaultColor}` };
};

export const getEdgeStyleBorder = (edgeStyle) => {
  if (!edgeStyle) return {};
  switch (edgeStyle) {
    case 'Ridge':
      return { borderWidth: '2px', borderStyle: 'ridge', borderColor: '#E9E9E9' };
    case 'Groove':
      return { borderWidth: '2px', borderStyle: 'groove', borderColor: '#E9E9E9' };
    case 'Recess':
      return { borderWidth: '2px', borderStyle: 'inset', borderColor: '#E9E9E9' };
    case 'Plinth':
      return { borderWidth: '1px', borderStyle: 'outset', borderColor: '#E9E9E9' };
    case 'Shadow':
      return {
        borderWidth: '1px',
        borderStyle: 'solid',
        borderTopColor: '#404040',
        borderLeftColor: '#404040',
        borderRightColor: '#D4D4D4',
        borderBottomColor: '#D4D4D4'
      };
    case 'None':
      return { border: 'none' };
    default:
      return {};
  }
};
