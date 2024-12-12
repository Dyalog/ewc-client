import * as Icons from "./RibbonIcons";
import { Row, Col } from "reactstrap";
import { useAppData } from "../../hooks";
import { MdOutlineQuestionMark } from "react-icons/md";
import { getCurrentUrl, getImageFromData, parseFlexStyles, setStyle } from "../../utils";

const CustomRibbonButton = ({ data }) => {
  const ImageList = data.ImageList
  const { socket, fontScale, findCurrentData } = useAppData();
  const { Icon, Caption, Event, ImageIndex, CSS, ImageListObj } = data?.Properties;
  const customStyles = parseFlexStyles(CSS)
  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;
  const ImageListObjCurrent = findCurrentData(ImageListObj)

  
  const ImageData = getImageFromData(ImageListObjCurrent);


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
    <div style={{ display: "flex", alignItems: "flex-start", height: "100%", marginTop: "5px" }}>
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
