import {
  excludeKeys,
  handleContextMenu,
  handleMouseDown,
  handleMouseUp,
  handleMouseMove,
  handleMouseEnter,
  handleMouseLeave,
  handleMouseDoubleClick,
  parseFlexStyles,
  rgbColor,
  setStyle,
} from "../utils";
import { getBorderStyles } from "../styles/edgeStyles";
import SelectComponent from "./SelectComponent";
import { useAppData } from "../hooks";

// ⎕WC Static — the plain panel class that pre-dates SubForm and Group.
//
// Legacy applications use it as a bare positioned container that holds drawn
// children (Image, Text, Rect, ...) and reports mouse events. Unlike Group it
// has no caption and no etched frame: native Static defaults to
// EdgeStyle 'None', so it renders flush unless the application asks otherwise.
//
// Children are positioned absolutely against this element, and mouse
// coordinates must be relative to it — handleMouseDown/Up measure against
// e.currentTarget, so a click landing on a child Image still bubbles up here
// and reports coordinates in THIS element's space, which is what ⎕WC does.
const Static = ({ data }) => {
  const {
    Visible = 1,
    Size,
    BCol,
    FCol,
    Border = 0,
    EdgeStyle = "None",
    Event,
    CSS,
  } = data?.Properties || {};

  const { socket } = useAppData();
  const styles = setStyle(data?.Properties, "absolute");
  const flexStyles = parseFlexStyles(CSS);
  const children = excludeKeys(data);

  return (
    <div
      id={data?.ID}
      style={{
        ...styles,
        ...(Size && { height: Size[0], width: Size[1] }),
        display: Visible == 0 ? "none" : "block",
        // Win32 clips children to the panel; keep that so a stack of cards
        // taller than its Static does not spill over its neighbours.
        overflow: "hidden",
        ...(BCol ? { background: rgbColor(BCol) } : {}),
        ...(FCol ? { color: rgbColor(FCol) } : {}),
        ...getBorderStyles(EdgeStyle, Border),
        ...flexStyles,
      }}
      onContextMenu={(e) => handleContextMenu(e, Event)}
      onMouseDown={(e) => handleMouseDown(e, socket, Event, data?.ID)}
      onMouseUp={(e) => handleMouseUp(e, socket, Event, data?.ID)}
      onMouseMove={(e) => handleMouseMove(e, socket, Event, data?.ID)}
      onMouseEnter={(e) => handleMouseEnter(e, socket, Event, data?.ID)}
      onMouseLeave={(e) => handleMouseLeave(e, socket, Event, data?.ID)}
      onDoubleClick={(e) => handleMouseDoubleClick(e, socket, Event, data?.ID)}
    >
      {Object.keys(children).map((key) => (
        <SelectComponent key={key} data={children[key]} />
      ))}
    </div>
  );
};

export default Static;
