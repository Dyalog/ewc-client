import React, { useState, useRef, useEffect } from "react";
import * as Icons from "./RibbonIcons";
import { Row, Col } from "reactstrap"; // Remove if you're not using reactstrap elsewhere
import { MdOutlineQuestionMark } from "react-icons/md";
import { GoChevronDown } from "react-icons/go";
import { useAppData } from "../../hooks";
import { getCurrentUrl, parseFlexStyles } from "../../utils";

const RibbonDropDownButton = ({ data }) => {
  console.log("ribbonDropdownButton", data);
  const ImageList = JSON.parse(localStorage.getItem("ImageList"));
  const ImagesData = JSON.parse(localStorage.getItem("ImagesData"));
  const { socket } = useAppData();

  const { Icon, Caption, Event, ImageIndex, CSS } = data?.Properties;
  const customStyles = parseFlexStyles(CSS);

  // State for dropdown toggle
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Reference for the wrapper container to handle clicks outside
  const wrapperRef = useRef(null);

  // Function to get image data if applicable
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

  // Handle selecting a menu item
  const handleSelectEvent = (menuItemID) => {
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

    // Close the dropdown after selecting an item
    setDropdownOpen(false);
  };

  const IconComponent = Icons[Icon] ? Icons[Icon] : MdOutlineQuestionMark;

  // Extract MenuItems (MItem1, MItem2, etc.) from data
  const menuItems = Object.keys(data)
    .filter((key) => key.startsWith("MItem"))
    .map((key) => data[key]);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setDropdownOpen(false); // Close dropdown if clicked outside
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Toggle dropdown function
  const toggleDropdown = (event) => {
    event.stopPropagation(); // Prevent event bubbling to parent div
    setDropdownOpen((prevState) => !prevState); // Toggle dropdown open/close
  };

  return (
    <div ref={wrapperRef}>
      <Row>
        <Col md={12}>
          {/* Main Div that triggers the dropdown on click */}
          <div
            id={data?.ID}
            className="d-flex align-items-center flex-column justify-content-center"
            style={{ cursor: "pointer", ...customStyles }}
            onClick={(e) => {
                e.stopPropagation(); // Prevent event bubbling to prevent closing dropdown immediately
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
                src={`${getCurrentUrl()}${
                  ImageList?.Properties?.Files[ImageIndex - 1]
                }`}
                alt="Image"
              />
            ) : (
              <IconComponent size={35} />
            )}
            <div className="text-center" style={{ fontSize: "12px" }}>
              {Caption}
            </div>
            {/* Chevron Icon (Toggle Dropdown) */}
            <GoChevronDown
              
              size={16}
            />
          </div>

          {/* Custom Dropdown */}
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
              {menuItems.map((item, index) => (
                <div
                  key={index}
                  className="custom-dropdown-item"
                  style={{
                    padding: "8px 16px",
                    cursor: "pointer",
                    borderBottom:
                      index < menuItems.length - 1 ? "1px solid #ddd" : "none",
                  }}
                  onClick={() => handleSelectEvent(item.ID)}
                >
                  {item.Properties.Caption}
                </div>
              ))}
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default RibbonDropDownButton;
