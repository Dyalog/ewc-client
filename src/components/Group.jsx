import { useState, useEffect } from "react";
import {
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
    CSS,CssClass,
    Event,
  } = data?.Properties;
  const { findDesiredData, socket } = useAppData();
  const dimensions = useResizeObserver(
    document.getElementById(extractStringUntilLastPeriod(data?.ID))
  );

  const [width, setWidth] = useState(Size[1]);
  const [height, setHeight] = useState(Size[0]);

  useEffect(() => {
    if (!Size.length) {
      setWidth(dimensions?.width - 47);
      setHeight(dimensions?.height - 47);
    }
  }, [dimensions]);

  const ImageData = findDesiredData(Picture && Picture[0]);

  const imageStyles = getImageStyles(Picture && Picture[1], ImageData);

  const flexStyles = parseFlexStyles(CSS);

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
        border: Border == 0 ? "none" : "1px solid #E9E9E9",
        display: Visible == 0 ? "none" : "block",
        ...imageStyles,
        ...flexStyles,
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
