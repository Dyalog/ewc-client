import { useEffect, useRef } from "react";

import {
  excludeKeys,
  setStyle,
  getFontStyles,
  getImageStyles,
  rgbColor,
  parseFlexStyles,
  handleMouseLeave,
  handleMouseMove,
  handleMouseEnter,
  handleMouseUp,
  handleMouseDown,
  handleMouseWheel,
  handleMouseDoubleClick,
  handleKeyPressUtils,
} from "../../utils";
import SelectComponent from "../SelectComponent";
import { useAppData } from "../../hooks";

const SubForm = ({ data }) => {
  const { findCurrentData, socket, inheritedProperty } = useAppData();
  const {
    Size,
    Posn,
    Picture,
    Visible,
    FontObj,
    Flex = 0,
    CSS,
    Event,
    EdgeStyle,
    Border = 0,
  } = data?.Properties;

  const observedDiv = useRef(null);
  const styles = setStyle(data?.Properties, "absolute", Flex);

  const flexStyles = parseFlexStyles(CSS);

  const updatedData = excludeKeys(data);

  const ImageData = findCurrentData(Picture && Picture[0]);

  const imageStyles = getImageStyles(
    Picture && Picture[1],
    ImageData,
    data?.Properties
  );

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

  let updatedStyles = {
    overflow: "clip",
    ...styles,
    ...imageStyles,
    ...flexStyles,
    ...fontStyles,
    ...(EdgeStyle
      ? getEdgeStyleBorder(EdgeStyle)
      : { border: Border == 0 ? "none" : "1px solid #E9E9E9" }
    ),
  };

  // TODO this is extremely suspect and looks to be for one purpose!
  const name = localStorage.getItem("TabControlInSubForm");
  useEffect(() => {
    let existingData;
    // TODO this is extremely suspect and looks to be for one purpose!
    if (data.ID === "F1.SCALE") {
      setTimeout(() => {
        existingData = JSON.parse(localStorage.getItem(data.ID));
        if (existingData && existingData.Event?.ID === data.ID) {
          existingData.Event = {
            ...existingData.Event,
            Size: data.Properties?.Size || existingData.Event?.Size,
            Posn: data.Properties?.Posn || existingData.Event?.Posn,
          };
        }
      }, 500);
      // TODO this is extremely suspect and looks to be for one purpose!
    } else if (data.ID === "F1.BX") {
      localStorage.setItem(
        data.ID,
        JSON.stringify({
          Size: Size || [600, 400], // Default size if none provided
          Posn: Posn || [50, 50], // Default position if none provided
        })
      );
    } else if (name) {
      // TODO this is extremely suspect and looks to be for one purpose!
      let name = JSON.parse(localStorage.getItem("TabControlData"));
      let name1 = JSON.parse(localStorage.getItem("FormData"));
      localStorage.setItem(
        data.ID,
        JSON.stringify({
          Size: name?.Size || name1?.Size,
          Posn: name?.Posn || [0, 0],
        })
      );
    } else {
      localStorage.setItem(
        data.ID,
        JSON.stringify({
          Size: Size && Size,
          Posn: Posn && Posn,
        })
      );
    }
  }, [data]);

  const inheritedSize = inheritedProperty(data, "Size", ["Form", "SubForm"]);
  const inheritedBCol = inheritedProperty(data, "BCol", ["Form", "SubForm"]);

  // Zilde is no background, otherwise inherited, otherwise default
  let background;
  if (Array.isArray(inheritedBCol) && inheritedBCol.length === 0) {
    background = undefined;
  } else {
    background = rgbColor(inheritedBCol) || "#F0F0F0"
  }

  return (
    <div
      id={data.ID}
      style={{
        display:
          Visible == 0
            ? "none"
            : data?.Properties.hasOwnProperty("Flex")
            ? "flex"
            : "block",
        background: background,
        // Must have a z-index, this is important
        zIndex: data.Properties?.ZIndex || 0,
        ...updatedStyles,
        height: Size ? Size[0] : inheritedSize ? inheritedSize[0] : undefined,
        width:  Size ? Size[1] : inheritedSize ? inheritedSize[1] : undefined,
        top: Posn && Posn[0],
        left: Posn && Posn[1],
      }}
      ref={observedDiv}
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
      {Object.keys(updatedData).map((key) => {
        return <SelectComponent data={updatedData[key]} />;
      })}
    </div>
  );
};

export default SubForm;
