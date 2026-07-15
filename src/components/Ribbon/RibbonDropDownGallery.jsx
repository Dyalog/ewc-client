import React, { useEffect, useRef, useState } from "react";
import { BsArrowBarDown } from "react-icons/bs";
import { GoChevronUp, GoChevronDown } from "react-icons/go";
import { useAppData } from "../../hooks";
import RibbonGalleyItem from "./RibbonGalleyItem";

// In-ribbon gallery (Office "RibbonGalleryBarItem"): a strip of tiles laid in a
// grid of N visible columns with a 3-button vertical scroller (up / down /
// "More"). "More" opens the full grid in a popup. No measurement timers.
const RibbonGallery = ({ data }) => {
  const { socket, findCurrentData } = useAppData();
  const { Cols, ItemHeight, ItemWidth } = data.Properties || {};
  const cols = (Cols || 3) + 1; // protocol Cols is the spare-column count

  const [startIndex, setStartIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const galleryRef = useRef(null);

  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;

  const menuItems = Object.keys(data)
    .filter((key) => key.startsWith("MItem"))
    .map((key) => ({ key, item: data[key] }));

  const totalItems = menuItems.length;
  const remainder = totalItems % cols;
  const lastPageItems = remainder === 0 ? cols : remainder;
  const maxStartIndex = Math.max(0, totalItems - lastPageItems);

  const handleScrollUp = () => setStartIndex((i) => Math.max(i - cols, 0));
  const handleScrollDown = () =>
    setStartIndex((i) => Math.min(i + cols, maxStartIndex));
  const toggleDropdown = () => setIsDropdownOpen((s) => !s);

  const handleSelectEvent = (menuItemID, Event) => {
    const exists = Event && Event.some((item) => item[0] === "Select");
    if (exists) {
      socket.send(JSON.stringify({ Event: { EventName: "Select", ID: menuItemID } }));
    }
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  const visibleItems = menuItems.slice(startIndex, startIndex + cols);
  const isUpDisabled = startIndex === 0;
  const isDownDisabled = startIndex >= maxStartIndex;
  const itemWidth = ItemWidth ? Math.min(ItemWidth, 70) : 64;
  const itemHeight = 48;

  return (
    <div className="ewc-ribbon-gallery" ref={galleryRef}>
      <div className="ewc-ribbon-gallery-strip">
        {visibleItems.map(({ key, item }, index) => (
          <RibbonGalleyItem
            key={item?.ID || key}
            data={item}
            startIndex={index + startIndex}
            handleSelectEvent={handleSelectEvent}
            ItemWidth={itemWidth}
            ItemHeight={itemHeight}
            fontProperties={fontProperties}
          />
        ))}
      </div>

      <div className="ewc-ribbon-gallery-scroller">
        <button
          className="ewc-ribbon-gallery-btn"
          onClick={handleScrollUp}
          disabled={isUpDisabled}
          title="Scroll up"
        >
          <GoChevronUp size={12} />
        </button>
        <button
          className="ewc-ribbon-gallery-btn"
          onClick={handleScrollDown}
          disabled={isDownDisabled}
          title="Scroll down"
        >
          <GoChevronDown size={12} />
        </button>
        <button
          className="ewc-ribbon-gallery-btn"
          onClick={toggleDropdown}
          title="More"
        >
          <BsArrowBarDown size={12} />
        </button>
      </div>

      {isDropdownOpen && (
        <div
          className="ewc-ribbon-popup ewc-ribbon-gallery-grid"
          style={{ gridTemplateColumns: `repeat(${cols}, ${itemWidth}px)` }}
          ref={(el) => {
            if (el && galleryRef.current) {
              const rect = galleryRef.current.getBoundingClientRect();
              el.style.top = `${rect.bottom}px`;
              el.style.left = `${rect.left}px`;
            }
          }}
        >
          {menuItems.map(({ key, item }, index) => (
            <RibbonGalleyItem
              key={item?.ID || key}
              data={item}
              handleSelectEvent={handleSelectEvent}
              startIndex={index}
              ItemWidth={itemWidth}
              ItemHeight={itemHeight}
              fontProperties={fontProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RibbonGallery;
