import {
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

const Text = ({ data, fontProperties }) => {
  const { Visible, Points, Text, FCol, BCol, Event, CSS } = data?.Properties;

  console.log("254", { data, fontProperties });
  const { socket, fontScale } = useAppData();

  const customStyles = parseFlexStyles(CSS);

  const { reRender } = useForceRerender();

  const parentSize = JSON.parse(localStorage.getItem("formDimension"));

  const newPoints = flattenIfThreeLevels(Points);

  const pointsArray =
    newPoints && newPoints[0].map((y, i) => [newPoints[1][i], y]);

  const calculateTextDimensions = (text, fontSize = 12) => {
    const container = document.createElement("span");
    container.style.visibility = "hidden";
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.fontSize = fontSize + "px";
    container.style.lineHeight = "1";

    const span = document.createElement("p");
    span.textContent = text;
    span.style.display = "block";
    container.appendChild(span);

    document.body.appendChild(container);

    const width = span.offsetWidth;
    const height = span.offsetHeight;
    document.body.removeChild(container);

    return { height, width };
  };

  return (
    <>
      <div
        style={{
          position: "absolute",
          display: Visible == 0 ? "none" : "block",
          top: 0,
          left: 0,
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
        <svg
          height={parentSize && parentSize[0]}
          width={parentSize && parentSize[1]}
        >
          {Text?.map((text, index) => {
            const dimensions = calculateTextDimensions(
              text,
              fontProperties?.Size
                ? fontProperties.Size * fontScale
                : 12 * fontScale
            );
            const textWidth = dimensions?.width;
            const textHeight = dimensions?.height;

            const points = pointsArray[index] || [
              pointsArray?.[index - 1]?.[0],
              pointsArray?.[index - 1]?.[1] + 10,
            ];

            return (
              <g key={index}>
                <rect
                  x={points && points[0]}
                  y={points && points[1]}
                  width={textWidth}
                  height={textHeight}
                  transform={`translate(${points && points[0]}, ${
                    points && points[1]
                  }) rotate(${
                    fontProperties?.Rotate * (180 / Math.PI)
                  }) translate(${points && -points[0]}, ${
                    points && -points[1]
                  })`}
                  fill={BCol ? rgbColor(BCol) : "transparent"} // Set your desired background color here
                />
                <text
                  id={`${data?.ID}-t${index + 1}`}
                  // fill='red'
                  alignment-baseline="middle"
                  dy="0.6em"
                  x={points && points[0]}
                  y={points && points[1]}
                  font-family={fontProperties?.PName}
                  font-size={
                    fontProperties?.Size
                      ? `${fontProperties.Size * fontScale}px`
                      : `${12 * fontScale}px`
                  }
                  fill={FCol ? rgbColor(FCol[index]) : "black"}
                  font-style={
                    !fontProperties?.Italic
                      ? "none"
                      : fontProperties?.Italic == 1
                      ? "italic"
                      : "none"
                  }
                  font-weight={
                    !fontProperties?.Weight ? 0 : fontProperties?.Weight
                  }
                  text-decoration={
                    !fontProperties?.Underline
                      ? "none"
                      : fontProperties?.Underline == 1
                      ? "underline"
                      : "none"
                  }
                  transform={`translate(${points && points[0]}, ${
                    points && points[1]
                  }) rotate(${
                    fontProperties?.Rotate * (180 / Math.PI)
                  }) translate(${points && -points[0]}, ${
                    points && -points[1]
                  })`}
                  style={{ ...customStyles }}
                >
                  {text /*text.replace(/ /g, "\u00A0")*/}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
};
export default Text;
