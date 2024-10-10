import React, { useState, useRef } from "react";
import * as Icons from "./RibbonIcons";
import { MdOutlineQuestionMark } from "react-icons/md";
import { useAppData } from "../../hooks";
import { GoChevronUp, GoChevronDown } from "react-icons/go"; 
import { FiChevronsDown } from "react-icons/fi";

const RibbonDropDownGallery = ({ data }) => {
  const ImageList = JSON.parse(localStorage.getItem("ImageList"));
  const ImagesData = JSON.parse(localStorage.getItem("ImagesData"));
  const { socket } = useAppData();

  const { Icon, Caption, Event, ImageIndex, CSS, Cols } = data?.Properties;
  // const customStyles = parseFlexStyles(CSS);

  // References for the scroll container
  const scrollContainerRef = useRef(null);

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
    socket.send(selectEvent);
  };

  const IconComponent = Icons[Icon] ? Icons[Icon] : MdOutlineQuestionMark;

  // Extract MenuItems (MItem1, MItem2, etc.) from data
  const menuItems = Object.keys(data)
    .filter((key) => key.startsWith("MItem"))
    .map((key) => data[key]);

  // Scroll up and down functions
  const scrollUp = () => {
    scrollContainerRef.current.scrollBy({
      top: -100, // Adjust this value to control the scroll speed
      behavior: "smooth",
    });
  };

  const scrollDown = () => {
    scrollContainerRef.current.scrollBy({
      top: 100, // Adjust this value to control the scroll speed
      behavior: "smooth",
    });
  };

  return (
    <div className="ribbon-dropdown-gallery" style={{ display: "flex",  alignItems: "center" }}>
   
      <div
        className="scroll-container"
        ref={scrollContainerRef}
        style={{
          height:"40px",
          display: "grid",
          gridTemplateColumns: `repeat(${Cols}, 1fr)`, // Use Cols from data.Properties for columns
          gridAutoRows: "min-content", // Each row will expand based on content height
          overflowY: "hidden",
          scrollBehavior: "smooth",
          gap: "2px", 
          padding: "2px", 
        }}
      >
        {menuItems.map((item, index) => (
          <div
            key={index}
            className="gallery-item"
            style={{
              cursor: "pointer",
              textAlign: "center",
              padding: "4px",
            }}
            onClick={() => handleSelectEvent(item.ID)}
          >
            {item.Properties.Caption}
          </div>
        ))}
      </div>
      <div>

        <div><GoChevronUp/></div>
        <div><GoChevronDown/></div>
        <div><FiChevronsDown/></div>
      </div>
    </div>
   
  );
};

export default RibbonDropDownGallery;
