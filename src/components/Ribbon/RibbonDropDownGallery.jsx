import React, { useState, useRef, useEffect } from "react";
import { GoChevronUp, GoChevronDown } from "react-icons/go";
import { BsArrowBarDown } from "react-icons/bs";
import { useAppData } from "../../hooks";
import RibbonGalleyItem from "./RibbonGalleyItem";

const onSelect = (item) => {
  console.log("Selected:", item);
  // Handle the selection
};

const RibbonGallery = ({ data }) => {
  const { socket } = useAppData();
  const { Cols } = data.Properties;



  const [startIndex, setStartIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const galleryRef = useRef(null);

  const menuItems = Object.keys(data)
    .filter((key) => key.startsWith("MItem"))
    .map((key) => data[key]);

  const totalItems = menuItems.length;

  // Calculate the number of items on the last page
  const remainder = totalItems % Cols;
  const lastPageItems = remainder === 0 ? Cols : remainder;

  // Calculate the maximum startIndex
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

  const handleItemClick = (item) => {
    onSelect(item);
    if (isDropdownOpen) {
      setIsDropdownOpen(false);
    }
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

    // Close the dropdown after selecting an item
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

  return (
    <div
      className="ribbon-gallery"
      ref={galleryRef}
      style={{ width: "fit-content" }}
    >
      {!isDropdownOpen && (
        <>
          <div className="gallery-content" style={{ width: `${50 * Cols}px` }}>
            {visibleItems.map((item, index) => (
              <RibbonGalleyItem data={item} className="gallery-item" startIndex={index + startIndex} handleSelectEvent={handleSelectEvent} />

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
          <div className="dropdown-content" style={{ width: `${50 * Cols}px` }}>
            <div
              className="dropdown-grid"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Cols}, 1fr)`,
                gap: "4px",
              }}
            >
              {menuItems.map((item, index) => (
                <RibbonGalleyItem data={item} handleSelectEvent={handleSelectEvent} startIndex={index} className="ribbon-dropdown-item" />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RibbonGallery;
