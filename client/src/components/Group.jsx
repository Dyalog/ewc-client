import { useState, useEffect } from "react";
import {
  getFontStyles,
  setStyle,
  excludeKeys,
  getImageStyles,
  extractStringUntilLastPeriod,
  parseFlexStyles,
  rgbColor,
  handleMouseWheel,
  handleMouseEnter,
  handleMouseLeave,
  handleMouseMove,
  handleMouseDoubleClick,
  handleKeyPressUtils,
  handleContextMenu,
  handleMouseDown,
  handleMouseUp,
} from "../utils";
import { getBorderStyles } from "../styles/edgeStyles";
import SelectComponent from "./SelectComponent";
import { useAppData, useResizeObserver, useAttachStyle, useConfigureReport } from "../hooks";

const Group = ({ data }) => {
  const {
    Visible,
    Picture,
    Border = 0,
    Size,
    Flex = 0,
    CSS,
    BCol,
    Event,
    FontObj,
    EdgeStyle,
  } = data?.Properties;
  const { findCurrentData, socket } = useAppData();
  // A ⎕WC Group draws its etched frame by default — Border does NOT gate it,
  // and only an explicit EdgeStyle='None' suppresses it. Customer groups send
  // Border:0 with no EdgeStyle, so default the EdgeStyle to 'Groove' (etched)
  // to restore the frame, matching native ⎕WC. (#445)
  const effectiveEdgeStyle = EdgeStyle ?? 'Groove';
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

  const updatedData = excludeKeys(data);

  const styles = setStyle(data?.Properties, "absolute", Flex);
  const attachStyle = useAttachStyle(data);
  const configureDims = useResizeObserver(document.getElementById(data?.ID), { box: 'content' });
  useConfigureReport(data?.ID, Event, socket, configureDims);

  const hasCaption =
    data?.Properties?.Caption != null && data?.Properties?.Caption !== "";
  const CAPTION_HEIGHT = 14; // line-box height; the frame's top line sits at its centre

  return (
    <div
      style={{
        ...styles,
        width,
        height,
        display: Visible == 0 ? "none" : "block",
        ...imageStyles,
        ...flexStyles,
        ...fontStyles,
        ...attachStyle,
      }}
      id={data?.ID}
      // !!! TODO !!!
      // Temporarily disabled due to errors around socket not available
      onContextMenu={(e) => handleContextMenu(e, Event)}
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
      {/* Etched frame, inset from the top by half the caption height so the
          caption can sit CENTRED on its top line while staying inside the
          group's bounds — avoids the parent SubForm's overflow:clip cutting
          the caption off. (#445) */}
      <div
        data-group-frame=""
        style={{
          position: "absolute",
          top: hasCaption ? CAPTION_HEIGHT / 2 : 0,
          left: 0,
          right: 0,
          bottom: 0,
          ...getBorderStyles(effectiveEdgeStyle, Border),
          pointerEvents: "none",
        }}
      />
      {hasCaption && (
        <span
          style={{
            position: "absolute",
            top: 0,
            left: 10,
            height: CAPTION_HEIGHT,
            lineHeight: `${CAPTION_HEIGHT}px`,
            padding: "0 3px",
            fontSize: "12px",
            // Mask the frame's top line behind the text with the group's BCol.
            background: BCol ? rgbColor(BCol) : "#F1F1F1",
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
