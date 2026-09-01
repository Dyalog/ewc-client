export const getFontStyles = (fontObj, defaultSize = 12) => { // TODO remove defaultSize
    const dflt = { fontSize: `${defaultSize}px` };
    // TODO! no fontScale used?!
    if (!fontObj) return dflt;

    const fontProperties = fontObj?.Properties;

    if (!fontProperties) return dflt;

    // Add generic CSS fallback based on font name
    const getFontFamily = (pname) => {
      if (!pname) return "inherit";
      const lower = pname.toLowerCase();
      if (lower.includes("courier") || lower.includes("mono") || lower.includes("consolas")) {
        return `"${pname}", monospace`;
      }
      if (lower.includes("times") || lower.includes("georgia") || lower.includes("serif")) {
        return `"${pname}", serif`;
      }
      return `"${pname}", sans-serif`;
    };

    return {
      fontFamily: getFontFamily(fontProperties.PName),
      fontSize: fontProperties.Size
        ? `${fontProperties.Size}px`
        : `${defaultSize}px`,
      textDecoration: fontProperties.Underline ? "underline" : "none",
      fontStyle: fontProperties.Italic ? "italic" : "normal",
      fontWeight: fontProperties.Weight || "normal",
    };
  };