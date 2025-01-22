export const getFontStyles = (fontObj, defaultSize = 12) => {
    if (!fontObj) return {};
  
    const fontProperties = fontObj?.Properties;
  
    if (!fontProperties) return {};
  
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