import { useEffect, useRef, useCallback, useState } from "react";

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
import * as Globals from "./../../Globals";

const SubForm = ({ data }) => {
  const { findCurrentData, socket, dataRef } = useAppData();
  const {
    Size,
    Posn,
    Picture,
    Visible,
    BCol,
    FlexDirection,
    JustifyContent,
    Display,
    FontObj,
    Flex = 0,
    CSS,
    Event,
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

  let updatedStyles = { ...styles, ...imageStyles, ...flexStyles,...fontStyles };

  const name = Globals.get("TabControlInSubForm")

  console.log("App Subform", {
    styles,
    data,
    updatedStyles,
    flexStyles,
    Size,
    Posn,
  });
  useEffect(() => {
    let existingData;
    if (data.ID === "F1.SCALE") {
      setTimeout(() => {
        existingData = JSON.parse(Globals.get(data.ID));
        if (existingData && existingData.Event?.ID === data.ID) {
          existingData.Event = {
            ...existingData.Event,
            Size: data.Properties?.Size || existingData.Event?.Size,
            Posn: data.Properties?.Posn || existingData.Event?.Posn,
          };
        }
      }, 500);
    } else if (data.ID === "F1.BX") {
      Globals.set(
        data.ID,
        JSON.stringify({
          Size: Size || [600, 400], // Default size if none provided
          Posn: Posn || [50, 50], // Default position if none provided
        })
      );
    }
    else if (name) {
      console.log("Coming in name");
      let name = JSON.parse(Globals.get("TabControlData"))
      let name1=JSON.parse(Globals.get("FormData"))
      if(name.Size1){
        console.log("undeffffff");
      }
      console.log("Wr are getting id is a",data.ID);
      Globals.set(
        data.ID,
        JSON.stringify({
          Size:name.Size||name1.Size,
          Posn:name.Posn||[0,0]
        })
      );
    }
    else {
      Globals.set(
        data.ID,
        JSON.stringify({
          Size: Size && Size,
          Posn: Posn && Posn,
        })
      );
    }
  }, [data]);

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
        background: BCol && rgbColor(BCol),
        ...updatedStyles,
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
