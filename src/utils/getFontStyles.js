export const getFontStyles = (fontObj, defaultSize = 12) => { // TODO remove defaultSize
    const dflt = { fontSize: `${defaultSize}px` };
    // TODO! no fontScale used?!
    if (!fontObj) return dflt;
  
    const fontProperties = fontObj?.Properties;
  
    if (!fontProperties) return dflt;
  
    return {
      fontFamily: fontProperties.PName || "inherit",
      fontSize: fontProperties.Size
        ? `${fontProperties.Size}px`
        : `${defaultSize}px`,
      textDecoration: fontProperties.Underline ? "underline" : "none",
      fontStyle: fontProperties.Italic ? "italic" : "normal",
      fontWeight: fontProperties.Weight || "normal",
    };
  };