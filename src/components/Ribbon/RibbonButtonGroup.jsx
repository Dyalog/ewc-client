import * as AppIcons from "./RibbonIcons";
import { useAppData } from "../../hooks";
import { getCurrentUrl, getObjectById, parseFlexStyles } from "../../utils";
import { MdOutlineQuestionMark } from "react-icons/md";

// A vertical stack of small-text buttons (Office "SmallWithText" 3-stack). Each
// caption is its own click target firing Select with a 1-based Info index. The
// image-resolution logic is preserved verbatim; only the markup is Office-ised.
const CustomRibbonButtonGroup = ({ data }) => {
  const { socket, dataRef, findCurrentData, fontScale } = useAppData();

  let ImageList = data.ImageList;
  const { Captions, Icons, Event, ImageListObj, CSS } = data?.Properties || {};
  const customStyles = parseFlexStyles(CSS);
  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;

  const handleButtonEvent = (info) => {
    const exists = Event && Event.some((item) => item[0] === "Select");
    if (!exists) return;
    socket.send(
      JSON.stringify({
        Event: { EventName: "Select", ID: data?.ID, Info: [info] },
      })
    );
  };

  let ImagesData;
  if (ImageListObj) {
    if (Array.isArray(ImageListObj)) {
      ImagesData = ImageListObj?.map(
        (id) => id && JSON.parse(getObjectById(dataRef.current, id))
      );
    } else {
      const ID = ImageListObj.split(".")[1];
      ImageList = ID && JSON.parse(getObjectById(dataRef.current, ID));
    }
  }

  function getImageDataByCaption(caption) {
    if (!ImagesData || !ImagesData.length) return null;
    const captionIndex = data?.Properties?.Captions?.indexOf(caption);
    if (captionIndex === -1) return null;
    const imageListId = data?.Properties?.ImageListObj[captionIndex];
    const imageIndex = data?.Properties?.ImageIndex[captionIndex];
    const imageList = ImagesData?.find((image) => image?.ID === imageListId);
    if (!imageList) return null;
    return {
      caption,
      imgIndex: imageIndex,
      imgUrl: imageList?.Properties?.Files[imageIndex - 1],
      imgSize: imageList?.Properties?.Size,
    };
  }

  const captionStyle = {
    fontFamily: fontProperties?.PName,
    fontSize: fontProperties?.Size
      ? `${fontProperties.Size * fontScale}px`
      : undefined,
  };

  // Chunk into columns of at most 3 rows so a >3 caption group never spills
  // past the band height — it grows wider into a second column (Office behavior).
  const captions = Captions || [];
  const columns = [];
  for (let i = 0; i < captions.length; i += 3) columns.push(captions.slice(i, i + 3));

  const renderRow = (title, i) => {
    const result = getImageDataByCaption(title);
    const image = result && result.imgUrl ? result.imgUrl : ImagesData?.[i] || ImageList;
    const iconKey = Icons?.[i] || "MdOutlineQuestionMark";
    const IconComponent = AppIcons?.[iconKey] || MdOutlineQuestionMark;

    return (
      <div
        key={`${data?.ID}-${title}`}
        id={`${data?.ID}-${i}`}
        className="ewc-ribbon-small"
        onClick={() => handleButtonEvent(i + 1)}
      >
        <span className="ewc-ribbon-small-icon">
          {result && result?.imgUrl ? (
            <img src={`${getCurrentUrl()}${result.imgUrl}`} alt={title} />
          ) : image && ImageList?.Properties?.Files ? (
            <img src={`${getCurrentUrl()}${image?.Properties?.Files?.[i]}`} alt={title} />
          ) : (
            <IconComponent size={16} />
          )}
        </span>
        <span className="ewc-ribbon-small-caption" style={captionStyle}>
          {title}
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexFlow: "row nowrap", alignItems: "stretch", ...customStyles }}>
      {columns.map((col, ci) => (
        <div className="ewc-ribbon-small-stack" key={`${data?.ID}-col-${ci}`}>
          {col.map((title, ri) => renderRow(title, ci * 3 + ri))}
        </div>
      ))}
    </div>
  );
};

export default CustomRibbonButtonGroup;
