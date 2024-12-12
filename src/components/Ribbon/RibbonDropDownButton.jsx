import React, { useState, useRef, useEffect } from "react";
import * as Icons from "./RibbonIcons";
import { Row, Col } from "reactstrap"; // Remove if you're not using reactstrap elsewhere
import { MdOutlineQuestionMark } from "react-icons/md";
import { GoChevronDown } from "react-icons/go";
import { useAppData } from "../../hooks";
import { getCurrentUrl, getImageFromData, parseFlexStyles } from "../../utils";
import RibbonDropDownItem from "./RibbonDropDownItem";

const RibbonDropDownButton = ({ data }) => {
  const ImageList = data.ImageList
  const { socket, findCurrentData, fontScale } = useAppData();
  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;
  const { Icon, Caption, ImageIndex, CSS,ImageListObj } = data?.Properties;
  const customStyles = parseFlexStyles(CSS);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef(null);
  const ImageListObjCurrent = findCurrentData(ImageListObj)
  const ImageData = getImageFromData(ImageListObjCurrent); 

  const handleSelectEvent = (menuItemID, Event) => {
    const selectEvent = JSON.stringify({
      Event: {
        EventName: "Select",
        ID: menuItemID,
      },
    });
    const exists = Event && Event.some((item) => item[0] === "Select");
    if (!exists) return;
    console.log(selectEvent);
    socket.send(selectEvent);
    setDropdownOpen(false);
  };

  const IconComponent = Icons[Icon] ? Icons[Icon] : MdOutlineQuestionMark;
  const menuItems = Object.keys(data)
    .filter((key) => key.startsWith("MItem"))
    .map((key) => data[key]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = (event) => {
    event.stopPropagation();
    setDropdownOpen((prevState) => !prevState);
  };

  return (
    <div ref={wrapperRef}>
      <Row>
        <Col md={12}>
          <div
            id={data?.ID}
            className="d-flex align-items-center flex-column justify-content-center"
            style={{ cursor: "pointer", ...customStyles }}
            onClick={(e) => {
              e.stopPropagation();
              toggleDropdown(e);
            }}
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
                    ImageList?.Properties?.Size &&
                    ImageList?.Properties?.Size[1],
                  height:
                    ImageList?.Properties?.Size &&
                    ImageList?.Properties?.Size[0],
                }}
                src={`${getCurrentUrl()}${ImageList?.Properties?.Files[ImageIndex - 1]
                  }`}
                alt="Image"
              />
            ) : (
              <IconComponent size={35} />
            )}
            <div className="text-center" style={{ fontFamily: fontProperties?.PName,
                fontSize: fontProperties?.Size
                    ? `${fontProperties.Size * fontScale}px`
                    : `${12 * fontScale}px`,}}>
              {Caption}
            </div>
            <GoChevronDown

              size={fontProperties?.Size
                ? `${fontProperties.Size * fontScale}`
                : `${12 * fontScale}`}
            />
          </div>

          {dropdownOpen && (
            <div

              className="custom-dropdown-menu"
              style={{
                position: "absolute",
                background: "#fff",
                borderRadius: "5px",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                marginTop: "5px",
                zIndex: 1000,
              }}
            >
              {menuItems.map((item, index) => {
                return (
                  <RibbonDropDownItem key={index} data={item} handleSelectEvent={handleSelectEvent} menuLength={menuItems.length} startIndex={index} fontProperties={fontProperties} />
                )

              })}
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default RibbonDropDownButton;
