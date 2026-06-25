import * as Icons from "./RibbonIcons";
import { useAppData } from "../../hooks";
import { MdOutlineQuestionMark } from "react-icons/md";
import { getCurrentUrl, getImageFromData, parseFlexStyles } from "../../utils";

// A single ribbon button. Renders as a large 32px tile (icon over caption) by
// default, or as a 16px small-text row when its image resolves to 16x16 — that
// is how the protocol distinguishes large vs small buttons. Only markup +
// styling changed here; the Select event contract is untouched.
const CustomRibbonButton = ({ data }) => {
  const ImageList = data.ImageList;
  const { socket, fontScale, findCurrentData } = useAppData();
  const { Icon, Caption, Event, ImageIndex, CSS, ImageListObj } = data?.Properties || {};
  const customStyles = parseFlexStyles(CSS);
  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;
  const ImageListObjCurrent = findCurrentData(ImageListObj);

  const ImageData = getImageFromData(ImageListObjCurrent, ImageIndex);

  const handleButtonEvent = () => {
    const exists = Event && Event.some((item) => item[0] === "Select");
    if (!exists) return;
    socket.send(
      JSON.stringify({ Event: { EventName: "Select", ID: data?.ID } })
    );
  };

  const IconComponent = Icons[Icon] ? Icons[Icon] : MdOutlineQuestionMark;
  const isSmall =
    ImageData && ImageData.imageSize?.[0] === 16 && ImageData.imageSize?.[1] === 16;

  const captionStyle = {
    fontFamily: fontProperties?.PName,
    fontSize: fontProperties?.Size
      ? `${fontProperties.Size * fontScale}px`
      : undefined,
  };

  // Resolve the icon node once for either layout.
  const iconNode = ImageData ? (
    <img src={`${getCurrentUrl()}${ImageData.imageUrl}`} alt="" />
  ) : ImageIndex && ImageList?.Properties?.Files ? (
    <img
      src={`${getCurrentUrl()}${ImageList?.Properties?.Files[ImageIndex - 1]}`}
      alt=""
    />
  ) : (
    <IconComponent size={isSmall ? 16 : 32} />
  );

  if (isSmall) {
    return (
      <div
        id={data?.ID}
        className="ewc-ribbon-small"
        onClick={handleButtonEvent}
        style={customStyles}
      >
        <span className="ewc-ribbon-small-icon">{iconNode}</span>
        <span className="ewc-ribbon-small-caption" style={captionStyle}>
          {Caption}
        </span>
      </div>
    );
  }

  return (
    <div
      id={data?.ID}
      className="ewc-ribbon-large"
      onClick={handleButtonEvent}
      style={customStyles}
    >
      <span className="ewc-ribbon-large-icon">{iconNode}</span>
      <span className="ewc-ribbon-large-caption" style={captionStyle}>
        {Caption}
      </span>
    </div>
  );
};

export default CustomRibbonButton;
