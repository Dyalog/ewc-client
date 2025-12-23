import { useState, useEffect } from "react";
import {
  getFontStyles,
  setStyle,
  excludeKeys,
  getImageStyles,
  extractStringUntilLastPeriod,
  parseFlexStyles,
  handleMouseWheel,
  handleMouseEnter,
  handleMouseLeave,
  handleMouseMove,
  handleMouseDoubleClick,
  handleKeyPressUtils,
  handleMouseDown,
  handleMouseUp,
} from "../utils";
import SelectComponent from "./SelectComponent";
import { useAppData, useResizeObserver } from "../hooks";

const Group = ({ data }) => {
  const {
    Visible,
    Picture,
    Border = 1,
    Size,
    Flex = 0,
    CSS,
    Event,
    FontObj,
    EdgeStyle,
  } = data?.Properties;
  const { findCurrentData, socket } = useAppData();
  const dimensions = useResizeObserver(
    document.getElementById(extractStringUntilLastPeriod(data?.ID))
  );

  const [width, setWidth] = useState(Size[1]);
  const [height, setHeight] = useState(Size[0]);

  // TODO B1: This was known wrong already! Fix
  // useEffect(() => {
  //   if (!Size.length) {
  //     setWidth(dimensions?.width - 47);
  //     setHeight(dimensions?.height - 47);
  //   }
  // }, [dimensions]);

  const ImageData = findCurrentData(Picture && Picture[0]);

  const imageStyles = getImageStyles(Picture && Picture[1], ImageData);

  const flexStyles = parseFlexStyles(CSS);

   const font = findCurrentData(FontObj);
    const fontStyles = getFontStyles(font, 12);

  const getEdgeStyleBorder = (edgeStyle) => {
    if (!edgeStyle) return {};
    switch (edgeStyle) {
      case 'Ridge':
        return { borderWidth: '2px', borderStyle: 'ridge', borderColor: '#E9E9E9' };
      case 'Groove':
        return { borderWidth: '2px', borderStyle: 'groove', borderColor: '#E9E9E9' };
      case 'Recess':
        return { borderWidth: '2px', borderStyle: 'inset', borderColor: '#E9E9E9' };
      case 'Plinth':
        return { borderWidth: '2px', borderStyle: 'outset', borderColor: '#E9E9E9' };
      case 'Shadow':
        return { border: '1px solid #E9E9E9', boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)' };
      case 'None':
        return { border: 'none' };
      default:
        return {};
    }
  };

  const updatedData = excludeKeys(data);

  const styles = setStyle(data?.Properties, "absolute", Flex);

  //   const shiftState = (e.shiftKey ? 1 : 0) + (e.ctrlKey ? 2 : 0); // Shift + Ctrl state
  //   const x = e.clientX;
  //   const y = e.clientY;
  //   const button = e.button;

  //   const mousedownEvent = JSON.stringify({
  //     Event: {
  //       EventName: "MouseDown",
  //       ID: data?.ID,
  //       Info: [x, y, button, shiftState],
  //     },
  //   });

  //   const exists = Event && Event.some((item) => item[0] === "MouseDown");
  //   if (!exists) return;
  //   console.log(mousedownEvent);
  //   socket.send(mousedownEvent);
  // };

  // const handleMouseUp = (e) => {
  //   const shiftState = (e.shiftKey ? 1 : 0) + (e.ctrlKey ? 2 : 0);
  //   const x = e.clientX;
  //   const y = e.clientY;
  //   const button = e.button;

  //   const mouseUpEvent = JSON.stringify({
  //     Event: {
  //       EventName: "MouseUp",
  //       ID: data?.ID,
  //       Info: [x, y, button, shiftState],
  //     },
  //   });

  //   const exists = Event && Event.some((item) => item[0] === "MouseUp");
  //   if (!exists) return;
  //   console.log(mouseUpEvent);
  //   socket.send(mouseUpEvent);
  // };

  return (
    <div
      style={{
        ...styles,
        width,
        height,
        ...(EdgeStyle
          ? getEdgeStyleBorder(EdgeStyle)
          : { border: Border == 0 ? "none" : "1px solid #E9E9E9" }
        ),
        display: Visible == 0 ? "none" : "block",
        ...imageStyles,
        ...flexStyles,
        ...fontStyles
      }}
      id={data?.ID}
      // !!! TODO !!!
      // Temporarily disabled due to errors around socket not available
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
      onKeyDown={(e) => {
        handleKeyPressUtils(e, socket, Event, data?.ID);
      }}
    >
      {data?.Properties?.Caption != "" && (
        <span
          style={{
            fontSize: "12px",
            // fontSize: '10px',
            position: "relative",
            bottom: 14,
            left: 10,
            background: "#F1F1F1 ",
          }}
        >
          {data?.Properties?.Caption}
        </span>
      )}
      {Object.keys(updatedData).map((key) => (
        <SelectComponent data={updatedData[key]} />
      ))}
    </div>
  );
};

export default Group;
