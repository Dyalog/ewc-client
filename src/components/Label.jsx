import { handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, parseFlexStyles, rgbColor, setStyle } from "../utils";
import "../styles/font.css";
import { useAppData } from "../hooks";

const Label = ({ data, gridValue }) => {
  let styles = setStyle(data?.Properties);

  const { inheritedProperties, findCurrentData, fontScale, socket } = useAppData();
  const haveColor = data?.Properties.hasOwnProperty("FCol");
  const haveFontProperty = data?.Properties.hasOwnProperty("Font");

  const { Visible, Caption, Size, Font, FCol, BCol, Justify, Event, CSS } = data?.Properties;
  const { FontObj } = inheritedProperties(data, 'FontObj');

  const customStyles = parseFlexStyles(CSS)

  // If a newline is used anywhere, it's a wrapping, multiline label, otherwise
  // it is always a single line label
  if (Caption.indexOf('\n') !== -1) {
    styles.whiteSpace = 'pre-wrap';
  } else {
    styles.textWrapMode = 'nowrap';
  }

  // TODO this should always be set, but we have an issue where size is being
  // incorrectly inherited from the container.
  if (Size) styles.overflow = 'hidden';

  if (haveColor) {
    styles = {
      ...styles,
      color: `rgb(${data?.Properties?.FCol[0]},${data?.Properties?.FCol[1]},${data?.Properties?.FCol[2]})`,
    };
  }

  // Both center and centre are allowed in ⎕WC
  const justifications = { 'left': 'left', 'centre': 'center', 'center': 'center', 'right': 'right', };
  if (Justify) styles.textAlign = justifications[Justify.toLowerCase()];

  if (haveFontProperty) {
    if (!styles.lineHeight) styles.lineHeight= `${Font[1] * fontScale + 2}px`;
    styles = {
      ...styles,
      fontFamily: Font[0],
      fontSize: Font[1] * fontScale,
    };
  } else {
    const font = findCurrentData(FontObj);
    const fontProperties = font && font?.Properties;
    const fontCss = fontProperties?.CSS ? parseFlexStyles(fontProperties.CSS) : {};
    const fontSize = fontScale * (fontProperties?.Size ? fontProperties.Size : 12);
    styles = {
      ...styles,
      fontFamily: fontProperties?.PName,
      fontSize: `${fontSize}px`,
      lineHeight: `${fontSize + 2}px`,
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
      ...fontCss,
    };
  }

  styles = {
    ...styles,
    background: BCol && rgbColor(BCol),
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
