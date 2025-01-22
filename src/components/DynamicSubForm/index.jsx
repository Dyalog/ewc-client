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

const SubForm = ({ data }) => {
  const { findDesiredData, socket, dataRef } = useAppData();
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

  const ImageData = findDesiredData(Picture && Picture[0]);

  const imageStyles = getImageStyles(
    Picture && Picture[1],
    ImageData,
    data?.Properties                            
  );

  const font = findDesiredData(FontObj && FontObj);
  const fontStyles = getFontStyles(font, 12);



  let updatedStyles = { ...styles, ...imageStyles, ...flexStyles,...fontStyles };


  const name = localStorage.getItem("TabControlInSubForm")
  console.log("nmsmsmsmsmsmsmsmsmsmmsmsms", name)

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
        existingData = JSON.parse(localStorage.getItem(data.ID));
        if (existingData && existingData.Event?.ID === data.ID) {
          existingData.Event = {
            ...existingData.Event,
            Size: data.Properties?.Size || existingData.Event?.Size,
            Posn: data.Properties?.Posn || existingData.Event?.Posn,
          };
        }
      }, 500);
    } else if (data.ID === "F1.BX") {
      localStorage.setItem(
        data.ID,
        JSON.stringify({
          Size: Size || [600, 400], // Default size if none provided
          Posn: Posn || [50, 50], // Default position if none provided
        })
      );
    }
    else if (name) {
      console.log("Coming in name");
      let name = JSON.parse(localStorage.getItem("TabControlData"))
      let name1=JSON.parse(localStorage.getItem("FormData"))
      // console.log("nmmmmmm",name,name.Posn)
      if(name.Size1){
        console.log("undeffffff");
      }
      console.log("Wr are getting id is a",data.ID);
      localStorage.setItem(
        data.ID,
        // JSON.parse(localStorage.getItem())
        JSON.stringify({
          Size:name.Size||name1.Size,
          Posn:name.Posn||[0,0]
        })
        // localStorage.getItem("TabControlData")
      );
    }
    else {

      // let name=localStorage.getItem("TabControlData",JSON)
      localStorage.setItem(
        data.ID,
        // JSON.parse(localStorage.getItem())
        // localStorage.getItem("TabControlData")
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
        // height: Size && Size[0],
        // width: Size && Size[1],
        // top: Posn && Posn[0],
        // left: Posn && Posn[1],
        // position: 'absolute',
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
