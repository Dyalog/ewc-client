import { useContext, useEffect, useRef } from "react";

import {
  excludeKeys,
  setStyle,
  scaleGeometry,
  acShouldReflow,
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
import { getBorderStyles } from "../../styles/edgeStyles";
import SelectComponent from "../SelectComponent";
import { useAppData, useAutoConfProvider } from "../../hooks";
import { AutoConfContext } from "../../context";

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
    AutoConf = 3,
  } = data?.Properties;

  const observedDiv = useRef(null);

  // AutoConf consumer: a SubForm's own box reflows when it is a bit-0 child of a
  // propagating container. Resolve its effective size (own Size, else inherited),
  // then scale that geometry by the container's published factor when reflowing.
  // We work from the primitives (not useAutoConfStyle) because SubForm keeps an
  // explicit height/width/top/left override below for its inherited-size fallback.
  const inheritedSize = inheritedProperty(data, "Size", ["Form", "SubForm"]);
  const effSize = Size && Size.length ? Size : inheritedSize;
  const parentAutoConf = useContext(AutoConfContext);
  const reflow = acShouldReflow(
    parentAutoConf.propagate,
    AutoConf,
    parentAutoConf.baseline
  );
  const geomProps = { ...data?.Properties, ...(effSize ? { Size: effSize } : {}) };
  const scaledProps = reflow
    ? scaleGeometry(geomProps, parentAutoConf.scaleX, parentAutoConf.scaleY)
    : geomProps;
  const scaledSize = scaledProps.Size;
  const scaledPosn = scaledProps.Posn;
  const styles = setStyle(scaledProps, "absolute", Flex);

  // AutoConf provider: a SubForm is also a container — it publishes its own
  // scale (current box vs its authored/effective size) and propagate bit so its
  // children reflow when it is resized (e.g. an app ⎕WS grow, or a parent reflow).
  const autoConfValue = useAutoConfProvider(effSize, AutoConf);

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

  let updatedStyles = {
    overflow: "clip",
    ...styles,
    ...imageStyles,
    ...flexStyles,
    ...fontStyles,
    ...getBorderStyles(EdgeStyle, Border),
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
        height: scaledSize ? scaledSize[0] : undefined,
        width:  scaledSize ? scaledSize[1] : undefined,
        top: scaledPosn && scaledPosn[0],
        left: scaledPosn && scaledPosn[1],
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
      <AutoConfContext.Provider value={autoConfValue}>
        {Object.keys(updatedData).map((key) => {
          return <SelectComponent data={updatedData[key]} key={key} />;
        })}
      </AutoConfContext.Provider>
    </div>
  );
};

export default SubForm;
