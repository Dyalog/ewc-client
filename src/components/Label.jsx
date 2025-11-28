import { handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, parseFlexStyles, rgbColor, setStyle } from "../utils";
import "../styles/font.css";
import { useAppData } from "../hooks";

const Label = ({ data, gridValue }) => {
  let styles = setStyle(data?.Properties);

  const { inheritedProperties, findDesiredData, fontScale, socket } = useAppData();
  const haveColor = data?.Properties.hasOwnProperty("FCol");
  const haveFontProperty = data?.Properties.hasOwnProperty("Font");

  const { Visible, Caption, Size, BCol, Event, CSS } = data?.Properties;
  const { FontObj } = inheritedProperties(data, 'FontObj');

  const customStyles = parseFlexStyles(CSS)

  if (haveColor) {
    styles = {
      ...styles,
      color: `rgb(${data?.Properties?.FCol[0]},${data?.Properties?.FCol[1]},${data?.Properties?.FCol[2]})`,
    };
  }

  if (haveFontProperty) {
    styles = {
      ...styles,
      fontFamily: data.Properties?.Font[0],
      fontSize: data?.Properties?.Font[1],
    };
  } else {
    const font = findDesiredData(FontObj && FontObj);
    const fontProperties = font && font?.Properties;
    styles = {
      ...styles,
      fontFamily: fontProperties?.PName,
      fontSize: fontProperties?.Size
        ? `${fontProperties.Size * fontScale}px`
        : `${12 * fontScale}px`,
      // fontSize: fontProperties?.Size ? `${fontProperties.Size * fontScale}px` : `${11 * fontScale}px`,
      textDecoration: !fontProperties?.Underline
        ? "none"
        : fontProperties?.Underline == 1
        ? "underline"
        : "none",
      fontStyle: !fontProperties?.Italic
        ? "none"
        : fontProperties?.Italic == 1
        ? "italic"
        : "none",
      fontWeight: !fontProperties?.Weight ? 0 : fontProperties?.Weight,
      background: BCol && rgbColor(BCol),
      // paddingLeft: '10px',
      // paddingRight: '10px'
    };
  }


  return (
    <div
      id={data?.ID}
      style={{ ...styles, display: Visible == 0 ? "none" : "block" ,...customStyles}}
      onMouseDown={(e) => {
        handleMouseDown(e, socket, Event,data?.ID);
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
    >
      {!Caption ? (
        <span
          style={{
            display: "flex",
            justifyContent: typeof gridValue == "string" ? "start" : "end",
            fontSize: "12px",
            marginLeft: "5px",
          }}
        >
          {gridValue}
        </span>
      ) : (
        Caption
      )}
    </div>
  );
};

export default Label;
