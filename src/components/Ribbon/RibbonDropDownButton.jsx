import React, { useState, useRef, useEffect } from "react";
import * as Icons from "./RibbonIcons";
import { MdOutlineQuestionMark } from "react-icons/md";
import { GoChevronDown } from "react-icons/go";
import { useAppData } from "../../hooks";
import { getCurrentUrl, getImageFromData, parseFlexStyles } from "../../utils";
import RibbonDropDownItem from "./RibbonDropDownItem";

// A large dropdown button (Office DropDown style): the whole tile opens a menu.
// The popup is position:fixed so it escapes any overflow:clip on ancestor
// TabControl/Ribbon — that getBoundingClientRect is popup placement, not the
// banned layout measurement.
const RibbonDropDownButton = ({ data }) => {
  const ImageList = data.ImageList;
  const { socket, findCurrentData, fontScale } = useAppData();
  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;
  const { Icon, Caption, ImageIndex, CSS, ImageListObj } = data?.Properties || {};

  const customStyles = parseFlexStyles(CSS);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef(null);
  const ImageListObjCurrent = findCurrentData(ImageListObj);
  const ImageData = getImageFromData(ImageListObjCurrent, ImageIndex);

  const handleSelectEvent = (menuItemID, Event) => {
    const exists = Event && Event.some((item) => item[0] === "Select");
    if (!exists) {
      setDropdownOpen(false);
      return;
    }
    socket.send(JSON.stringify({ Event: { EventName: "Select", ID: menuItemID } }));
    setDropdownOpen(false);
  };

  const IconComponent = Icons[Icon] ? Icons[Icon] : MdOutlineQuestionMark;
  const menuItems = Object.keys(data)
    .filter((key) => key.startsWith("MItem"))
    .map((key) => ({ key, item: data[key] }));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const arrowSize = fontProperties?.Size
    ? fontProperties.Size * fontScale
    : 12;

  return (
    <div ref={wrapperRef} className="ewc-ribbon-col">
      <div
        id={data?.ID}
        className="ewc-ribbon-large"
        style={customStyles}
        onClick={(e) => {
          e.stopPropagation();
          setDropdownOpen((prev) => !prev);
        }}
      >
        <span className="ewc-ribbon-large-icon">
          {ImageData ? (
            <img src={`${getCurrentUrl()}${ImageData.imageUrl}`} alt="" />
          ) : ImageIndex && ImageList?.Properties?.Files ? (
            <img
              src={`${getCurrentUrl()}${ImageList?.Properties?.Files[ImageIndex - 1]}`}
              alt=""
            />
          ) : (
            <IconComponent size={32} />
          )}
        </span>
        <span
          className="ewc-ribbon-large-caption"
          style={{
            fontFamily: fontProperties?.PName,
            fontSize: fontProperties?.Size
              ? `${fontProperties.Size * fontScale}px`
              : undefined,
          }}
        >
          {Caption}
        </span>
        <span className="ewc-ribbon-large-arrow">
          <GoChevronDown size={arrowSize} />
        </span>
      </div>

      {dropdownOpen && (
        <div
          className="ewc-ribbon-popup"
          ref={(el) => {
            if (el && wrapperRef.current) {
              const rect = wrapperRef.current.getBoundingClientRect();
              el.style.top = `${rect.bottom}px`;
              el.style.left = `${rect.left}px`;
            }
          }}
        >
          {menuItems.map(({ key, item }) => (
            <RibbonDropDownItem
              key={item?.ID || key}
              data={item}
              handleSelectEvent={handleSelectEvent}
              fontProperties={fontProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RibbonDropDownButton;
