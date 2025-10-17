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
import { useState } from "react";
import * as Globals from "../../Globals";

function useForceRerender() {
  const [_state, setState] = useState(true);
  const reRender = () => {
    setState((prev) => !prev);
  };
  return { reRender };
}

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
  // Create a hidden div element to calculate text dimensions
  const scale = Globals.get('fontScale');
  const container = document.createElement('div');
  container.style.visibility = 'hidden';
  container.style.display = 'inline-block';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';

  // TODO remove references to 12px everywhere
  let lineHeight = '12px';
  if (font?.Properties?.Size) {
    lineHeight = (font.Properties.Size * scale) + 'px';
  }

  lines.forEach(line => {
    const lineDiv = document.createElement('div');
    lineDiv.style.margin = '0';
    lineDiv.style.padding = '0';
    lineDiv.textContent = line;
    lineDiv.style.display = 'block'; // Start each on a new line
    lineDiv.style.lineHeight = lineHeight;
    Object.assign(lineDiv.style, getFontStyles(font));
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

  const { reRender } = useForceRerender();

  const newPoints = flattenIfThreeLevels(Points);

  const pointsArray =
    newPoints && newPoints[0].map((y, i) => [newPoints[1][i], y]);

  const rotationDegrees = fontProperties?.Rotate ? -(fontProperties.Rotate * (180 / Math.PI)) : 0;

  return (
    <>
      <div
        style={{
          position: "absolute",
          display: Visible == 0 ? "none" : "block",
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      >
        {Text?.map((text, index) => {
          const dimensions = calculateTextDimensions(
            [text],
            fontProperties
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
          const isFColArray = FCol && Array.isArray(FCol[0]);
          const textColor = FCol
            ? rgbColor(isFColArray ? FCol[index] : FCol)
            : "black";
          const bgColor = BCol ? rgbColor(BCol) : "transparent";

          const fontStyle = fontProperties?.Italic == 1 ? "italic" : "normal";
          const fontWeight = fontProperties?.Weight || "normal";
          const textDecoration = fontProperties?.Underline == 1 ? "underline" : "none";

          return (
            <div
              key={index}
              id={`${data?.ID}-t${index + 1}`}
              style={{
                position: "absolute",
                top: `${points[1]}px`,
                left: `${points[0]}px`,
                // TODO
                // height: textHeight,
                // width: textWidth,
                transform: `rotate(${rotationDegrees}deg)`,
                transformOrigin: '0 0',
                pointerEvents: 'auto',
                fontFamily: fontProperties?.PName,
                fontSize: fontSize,
                color: textColor,
                backgroundColor: bgColor,
                fontStyle: fontStyle,
                fontWeight: fontWeight,
                textDecoration: textDecoration,
                whiteSpace: 'pre',
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
