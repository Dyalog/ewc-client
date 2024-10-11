import React, { useState, useRef, useEffect } from "react";
import { GoChevronUp, GoChevronDown } from "react-icons/go";
import { BsArrowBarDown } from "react-icons/bs";

const onSelect = (item) => {
  console.log("Selected:", item);
  // Handle the selection
};

const RibbonGallery = ({ data }) => {
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
    <div className="ribbon-gallery" ref={galleryRef}>
      {!isDropdownOpen && (
        <>
          <div className="gallery-content" style={{ width: `${50 * Cols}px` }}>
            {visibleItems.map((item, index) => (
              <div
                key={index + startIndex}
                className="gallery-item"
                onClick={() => handleItemClick(item)}
                title={item.Properties.Caption}
              >
                <div className="item-preview">{item.Properties.Caption}</div>
              </div>
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
                <div
                  key={index}
                  className="ribbon-dropdown-item"
                  onClick={() => handleItemClick(item)}
                  title={item.Properties.Caption}
                >
                  <div className="item-preview">{item.Properties.Caption}</div>
                </div>
              ))}
            </div>
          </div>
         
        </>
      )}
    </div>
  );
};

export default RibbonGallery;
