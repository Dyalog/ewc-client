import * as Icons from "./RibbonIcons";
import { Row, Col } from "reactstrap";
import { useAppData } from "../../hooks";
import { MdOutlineQuestionMark } from "react-icons/md";
import { getCurrentUrl, parseFlexStyles, setStyle } from "../../utils";

const CustomRibbonButton = ({ data }) => {
  const ImageList = JSON.parse(localStorage.getItem("ImageList"));
  const ImagesData = JSON.parse(localStorage.getItem("ImagesData"));
  const { socket, fontScale, findCurrentData } = useAppData();

  const { Icon, Caption, Event, ImageIndex, CSS } = data?.Properties;
  const customStyles = parseFlexStyles(CSS)
  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;


  const getImageFromData = (data) => {
    if (data.Properties && data?.Properties.ImageListObj) {
      const imageListObj = data?.Properties.ImageListObj;
      const imageListData = ImagesData?.find(
        (imageData) => imageData.ID === imageListObj
      );

      if (imageListData) {
        const imageIndex = data?.Properties.ImageIndex;
        const imageUrl = imageListData?.Properties.Files[imageIndex - 1];
        const imageSize = imageListData.Properties.Size;

        return {
          imageUrl: imageUrl,
          imageSize: imageSize,
        };
      }
    }
    return null;
  };

  const ImageData = getImageFromData(data);

  const handleSelectEvent = () => {
    const selectEvent = JSON.stringify({
      Event: {
        EventName: "Select",
        ID: data?.ID,
      },
    });
    const exists = Event && Event.some((item) => item[0] === "Select");
    if (!exists) return;
    console.log(selectEvent);
    socket.send(selectEvent);
  };

  const handleButtonEvent = () => {
    handleSelectEvent();
  };

  const IconComponent = Icons[Icon] ? Icons[Icon] : MdOutlineQuestionMark;

  return (
    <div style={{display:"flex", alignItems: "flex-start", height: "100%", marginTop: "5px" }}>
    <Row>
      <Col>
        <div
          id={data?.ID}
          className="d-flex align-items-center flex-column justify-content-center"
          onClick={handleButtonEvent}
          style={{ cursor: "pointer", ...customStyles }}
        >
          {ImageData ? (
            <img
              style={{
                width: ImageData.imageSize[1],
                height: ImageData.imageSize[0],
              }}
              src={`${getCurrentUrl()}${ImageData.imageUrl}`}
              alt="Image"
            />
          ) : ImageIndex ? (
            <img
              style={{
                width:
                  ImageList?.Properties?.Size && ImageList?.Properties?.Size[1],
                height:
                  ImageList?.Properties?.Size && ImageList?.Properties?.Size[0],
              }}
              src={`${getCurrentUrl()}${ImageList?.Properties?.Files[ImageIndex - 1]
                }`}
              alt="Image"
            />
          ) : (
            <IconComponent size={35} />
          )}
          <div className="text-center" style={{
            fontFamily: fontProperties?.PName,
            fontSize: fontProperties?.Size
              ? `${fontProperties.Size * fontScale}px`
              : `${12 * fontScale}px`,
          }}>
            {Caption}
          </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default CustomRibbonButton;
