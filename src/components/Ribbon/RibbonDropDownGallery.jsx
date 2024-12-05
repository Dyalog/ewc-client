import React, { useState, useRef, useEffect } from "react";
import { GoChevronUp, GoChevronDown } from "react-icons/go";
import { BsArrowBarDown } from "react-icons/bs";
import { useAppData } from "../../hooks";
import RibbonGalleyItem from "./RibbonGalleyItem";

const RibbonGallery = ({ data }) => {
  const { socket, findDesiredData } = useAppData();
  const {Cols, ItemHeight ,ItemWidth} = data.Properties;
  const [startIndex, setStartIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const galleryRef = useRef(null);
  const font = findDesiredData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;
  

  const menuItems = Object.keys(data)
    .filter((key) => key.startsWith("MItem"))
    .map((key) => data[key]);

  const totalItems = menuItems.length;
  const remainder = totalItems % Cols;
  const lastPageItems = remainder === 0 ? Cols : remainder;
  const maxStartIndex = totalItems - lastPageItems;

  const handleScrollLeft = () => {
    setStartIndex((prevIndex) => Math.max(prevIndex - Cols, 0));
  };

  const handleScrollRight = () => {
    setStartIndex((prevIndex) => Math.min(prevIndex + Cols, maxStartIndex));
  };

  const toggleDropdown = () => {
    setIsDropdownOpen((prevState) => !prevState);
  };

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
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isDropdownOpen &&
        galleryRef.current &&
        !galleryRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const visibleItems = menuItems.slice(startIndex, startIndex + Cols);
  const isUpDisabled = startIndex === 0;
  const isDownDisabled = startIndex >= maxStartIndex;
  const itemWidth = ItemWidth ? ItemWidth : 50
  const itemHeight = ItemHeight ? ItemHeight : 25

  return (
    <div
      className="ribbon-gallery"
      ref={galleryRef}
      style={{ width: "fit-content" }}
    >
      {!isDropdownOpen && (
        <>
          <div className="gallery-content" style={{ width: `${(itemWidth+2) * Cols}px`, height:`${itemHeight}px` }}>
            {visibleItems.map((item, index) => (
              <RibbonGalleyItem data={item} className="" startIndex={index + startIndex} handleSelectEvent={handleSelectEvent} ItemWidth={itemWidth} ItemHeight={itemHeight} fontProperties={fontProperties} />

            ))}
          </div>
          <div className="gallery-buttons">
            <button
              className="gallery-button"
              onClick={handleScrollLeft}
              disabled={isUpDisabled}
              title="Scroll Left"
            >
              <GoChevronUp size={12} />
            </button>
            <button
              className="gallery-button"
              onClick={handleScrollRight}
              disabled={isDownDisabled}
              title="Scroll Right"
            >
              <GoChevronDown size={12} />
            </button>
            <button
              className="gallery-button"
              onClick={toggleDropdown}
              title="More Styles"
            >
              <BsArrowBarDown size={12} />
            </button>
          </div>
        </>
      )}
      {isDropdownOpen && (
        <>
          <div className="dropdown-content" style={{ width: `${(itemWidth+2) * Cols}px`, height:`${itemHeight}px` }}>
            <div
              className="dropdown-grid"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Cols}, 1fr)`,
                gap: "4px",
              }}
            >
              {menuItems.map((item, index) => (
                <RibbonGalleyItem data={item} handleSelectEvent={handleSelectEvent} startIndex={index} className="ribbon-dropdown-item" ItemWidth={itemWidth} ItemHeight={itemHeight}/>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RibbonGallery;
