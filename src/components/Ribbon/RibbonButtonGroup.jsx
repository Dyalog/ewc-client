import * as AppIcons from "./RibbonIcons";
import { Col } from "reactstrap";
import { useAppData } from "../../hooks";
import { getCurrentUrl, getObjectById, parseFlexStyles, setStyle } from "../../utils";
import { MdOutlineQuestionMark } from "react-icons/md";

const CustomRibbonButtonGroup = ({ data }) => {
  const { socket, dataRef , findCurrentData, fontScale} = useAppData();

  let ImageList = data.ImageList

  const { Captions, Icons, Event, ImageIndex, ImageListObj, CSS } = data?.Properties;
//   console.log("Values reendered arw",Captions)


  const customStyles = parseFlexStyles(CSS)
  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;

  const colSize =  12;


  const handleSelectEvent = (info) => {
    const selectEvent = JSON.stringify({
      Event: {
        EventName: "Select",
        ID: data?.ID,
        Info: [info],
      },
    });
    const exists = Event && Event.some((item) => item[0] === "Select");
    if (!exists) return;
//     console.log(selectEvent);
    socket.send(selectEvent);
  };

  const handleButtonEvent = (info) => {
    handleSelectEvent(info);
  };

  let ImagesData;

  if (ImageListObj) {
    if (Array.isArray(ImageListObj)) {
      ImagesData = ImageListObj?.map((id) => {
        return id && JSON.parse(getObjectById(dataRef.current, id));
      });
    } else {
      const ID = ImageListObj.split(".")[1];
      ImageList = ID && JSON.parse(getObjectById(dataRef.current, ID));
    }
    }


  function getImageDataByCaption(caption) {
    if (!ImagesData || !ImagesData.length) return;
    const captionIndex = data?.Properties?.Captions?.indexOf(caption);

    if (captionIndex === -1) {
      return null; 
    }
    const imageListId = data?.Properties?.ImageListObj[captionIndex];
    const imageIndex = data?.Properties?.ImageIndex[captionIndex];
    const imageList = ImagesData?.find((image) => image?.ID === imageListId);

    if (!imageList) {
      return null; 
    }

    const img = imageList?.Properties?.Files[imageIndex - 1];
    const imgSize = imageList?.Properties?.Size;

    return {
      caption,
      imgIndex: imageIndex,
      imgUrl: img,
      imgSize,
    };
  }
  
  return (
    <div className="d-flex flex-column align-items-center justify-content-center " style={{ width: "fit-content" }}>
      {Captions.map((title, i) => {

        const result = getImageDataByCaption(title);
        const imageIndex = i;
        const image =
          result && result.imgUrl
            ? result.imgUrl
            : ImagesData?.[imageIndex] || ImageList;
        const iconKey = Icons?.[i] || "MdOutlineQuestionMark";
        const IconComponent = AppIcons?.[iconKey] || MdOutlineQuestionMark;

        return (
          <Col
            key={`col-${i}`}
            id={`${data?.ID}-${i}`}
            md={colSize}
            className="d-flex align-items-center justify-content-left gap-1"
            style={{ cursor: "pointer", ...customStyles}}
            onClick={() => handleButtonEvent(i + 1)}
          >
            {result && result?.imgUrl ? (
              <img
                style={{
                  width: result.imgSize[0],
                  height: result.imgSize[1],
                }}
                src={`${getCurrentUrl()}${result.imgUrl}`}
                alt={title}
              />
            ) : image ? (
              <img
                style={{
                  width: ImageList?.Properties?.Size?.[1],
                  height: ImageList?.Properties?.Size?.[0],
                }}
                src={`${getCurrentUrl()}${image?.Properties?.Files?.[imageIndex]}`}
                alt={title}
              />
            ) : (
              <IconComponent size={25} />
            )}
            <div
              style={{
                textAlign: "left",
                textOverflow: "ellipsis",
                fontFamily: fontProperties?.PName,
                fontSize: fontProperties?.Size
                  ? `${fontProperties.Size * fontScale}px`
                  : `${12 * fontScale}px`,
              }}
            >
              {title}
            </div>
          </Col>
        );
      })}
    </div>
  );
};

export default CustomRibbonButtonGroup;
