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
