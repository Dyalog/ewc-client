import {
  getFontStyles,
  handleMouseDoubleClick,
  handleMouseDown,
  handleMouseEnter,
  handleMouseLeave,
  handleMouseMove,
  handleMouseUp,
  handleMouseWheel,
  parseFlexStyles,
  rgbColor,
} from "../../utils";
import { useAppData } from "../../hooks";
import * as Globals from "../../Globals";

const getNestingLevel = (array) => {
  if (!Array.isArray(array)) {
    return 0;
  }
  return 1 + Math.max(0, ...array.map(getNestingLevel));
};

const flattenArrayOneLevel = (array) => {
  return array.reduce((acc, val) => acc.concat(val), []);
};

const flattenIfThreeLevels = (arr) => {
  if (getNestingLevel(arr) === 3) {
    return flattenArrayOneLevel(arr);
  } else {
    return arr;
  }
};

const calculateTextDimensions = (lines, font) => {
  // Handle empty or invalid input
  if (!lines || (Array.isArray(lines) && lines.length === 0)) {
    return { height: 0, width: 0 };
  }
  //console.log('calculateTextDimensions input:', { lines, font, fontPName: font?.Properties?.PName, fontSize: font?.Properties?.Size });
  // Ensure lines is an array
  const linesArray = Array.isArray(lines) ? lines : [lines];

  // Create a hidden div element to calculate text dimensions
  const scale = Globals.get('fontScale');
  const container = document.createElement('div');
  container.style.visibility = 'hidden';
  container.style.display = 'inline-block';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.whiteSpace = 'pre';

  // TODO remove references to 12px everywhere
  let lineHeight = '12px';
  if (font?.Properties?.Size) {
    lineHeight = (font.Properties.Size * scale) + 'px';
  }

  const fontStyles = getFontStyles(font);
  linesArray.forEach(line => {
    const lineDiv = document.createElement('div');
    lineDiv.style.margin = '0';
    lineDiv.style.padding = '0';
    lineDiv.textContent = line;
    lineDiv.style.display = 'block'; // Start each on a new line
    lineDiv.style.lineHeight = lineHeight;
    if (font?.Properties?.Size) {
      fontStyles.fontSize = (font.Properties.Size * scale) + 'px';
    } else {
      fontStyles.fontSize = (12 * scale) + 'px';
    }
    Object.assign(lineDiv.style, fontStyles);
    container.appendChild(lineDiv);
  });

  document.body.appendChild(container);
  const width = container.offsetWidth;
  const height = container.offsetHeight;
  document.body.removeChild(container);
  return {height, width};
};

const Text = ({ data, fontProperties }) => {
  const { findCurrentData,socket, fontScale, inheritedProperties } = useAppData();
  const { Visible, Points, Text, FCol, BCol, Event, CSS } = data?.Properties;
  const { FontObj } = inheritedProperties(data, 'FontObj');

  const customStyles = parseFlexStyles(CSS);

  const font = findCurrentData(FontObj);
  const fontStyles = getFontStyles(font, 12);

  const newPoints = flattenIfThreeLevels(Points);

  const pointsArray =
    newPoints && newPoints[0].map((y, i) => [newPoints[1][i], y]);

  const rotationDegrees = fontProperties?.Rotate ? -(fontProperties.Rotate * (180 / Math.PI)) : 0;

  return (
    <>
      <div
        id={data?.ID}
        style={{
          // Anchor the wrapper at the parent's origin so each line's Points
          // (which the app sends parent-relative — e.g. a group-child label at
          // [[14],[8]]) position deterministically, rather than drifting with
          // the wrapper's static/flow position. (#445)
          position: "absolute",
          top: 0,
          left: 0,
          display: Visible == 0 ? "none" : "block",
        }}
      >
        {Text?.map((text, index) => {
          const dimensions = calculateTextDimensions(
            [text],
            font
          );
          const textWidth = dimensions?.width;
          const textHeight = dimensions?.height;

          const points = pointsArray[index] || [
            pointsArray?.[index - 1]?.[0],
            pointsArray?.[index - 1]?.[1] + 10,
          ];

          const fontSize = fontProperties?.Size
            ? `${fontProperties.Size * fontScale}px`
            : `${12 * fontScale}px`;

          // Check if FCol is a single color [R,G,B] or array of colors [[R,G,B], [R,G,B], ...]
          // A separator-split Text (⎕UCS 8743) renders as multiple lines, but the color
          // may be given as a single color or an array shorter than the line count; clamp
          // the index so trailing lines reuse the last color instead of falling back to
          // black (rgbColor returns null for an out-of-bounds undefined). (#440)
          const isFColArray = FCol && Array.isArray(FCol[0]);
          const fcolForLine = isFColArray ? FCol[Math.min(index, FCol.length - 1)] : FCol;
          const textColor = fcolForLine ? rgbColor(fcolForLine) ?? "black" : "black";

          // Check if BCol is a single color [R,G,B] or array of colors [[R,G,B], [R,G,B], ...]
          const isBColArray = BCol && Array.isArray(BCol[0]);
          const bcolForLine = isBColArray ? BCol[Math.min(index, BCol.length - 1)] : BCol;
          const bgColor = bcolForLine ? rgbColor(bcolForLine) ?? "transparent" : "transparent";

          const fontStyle = fontProperties?.Italic == 1 ? "italic" : "normal";
          const fontWeight = fontProperties?.Weight || "normal";
          const textDecoration = fontProperties?.Underline == 1 ? "underline" : "none";

          const lineHeight = fontProperties?.Size
            ? `${fontProperties.Size * fontScale}px`
            : `${12 * fontScale}px`;

          return (
            <div
              key={index}
              id={`${data?.ID}-t${index + 1}`}
              style={{
                position: "absolute",
                top: `${points[1]}px`,
                left: `${points[0]}px`,
                height: textHeight,
                width: textWidth,
                transform: `rotate(${rotationDegrees}deg)`,
                transformOrigin: '0 0',
                pointerEvents: 'auto',
                fontFamily: fontProperties?.PName,
                fontSize: fontSize,
                lineHeight: lineHeight,
                color: textColor,
                backgroundColor: bgColor,
                fontStyle: fontStyle,
                fontWeight: fontWeight,
                textDecoration: textDecoration,
                whiteSpace: 'pre',
                margin: 0,
                padding: 0,
                display: 'inline-block',
                overflow: 'hidden',
                ...customStyles,
                ...fontStyles
              }}
              onMouseDown={(e) => {
                handleMouseDown(e, socket, Event, data?.ID);
              }}
              onMouseUp={(e) => {
                handleMouseUp(e, socket, Event, data?.ID);
              }}
              onMouseEnter={(e) => {
                handleMouseEnter(e, socket, Event, data?.ID);
              }}
              onMouseMove={(e) => {
                handleMouseMove(e, socket, Event, data?.ID);
              }}
              onMouseLeave={(e) => {
                handleMouseLeave(e, socket, Event, data?.ID);
              }}
              onWheel={(e) => {
                handleMouseWheel(e, socket, Event, data?.ID);
              }}
              onDoubleClick={(e) => {
                handleMouseDoubleClick(e, socket, Event, data?.ID);
              }}
            >
              {text}
            </div>
          );
        })}
      </div>
    </>
  );
};

Text.calculateTextDimensions = calculateTextDimensions;

export default Text;
