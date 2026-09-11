import React, { useState, useRef } from "react";
import * as Icons from "./RibbonIcons";
import { MdOutlineQuestionMark } from "react-icons/md";
import { GoChevronDown } from "react-icons/go";
import { useAppData } from "../../hooks";
import { getCurrentUrl, getImageFromData, parseFlexStyles } from "../../utils";
import RibbonDropDownItem from "./RibbonDropDownItem";
import RibbonPopup from "./RibbonPopup";
import { textW } from "./ribbonLayout";

// 'Split' buttons - ie an icon with a default function and a dropdown for all
// functions
const RibbonDropDownButton = ({ data }) => {
  const ImageList = data.ImageList;
  const { socket, findCurrentData, fontScale } = useAppData();
  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;
  const { Icon, Caption, ImageIndex, CSS, ImageListObj, Event } = data?.Properties || {};

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

  // The default action = the button's own Select, as fired by a plain
  // RibbonButton. Without one there is nothing to default to, so the icon half
  // falls through to opening the menu.
  const hasDefaultAction = !!Event && Event.some((e) => e[0] === "Select");
  const handleDefaultAction = (e) => {
    e.stopPropagation();
    if (!hasDefaultAction) {
      setDropdownOpen((prev) => !prev);
      return;
    }
    setDropdownOpen(false);
    socket.send(JSON.stringify({ Event: { EventName: "Select", ID: data?.ID } }));
  };
  const toggleDropdown = (e) => {
    e.stopPropagation();
    setDropdownOpen((prev) => !prev);
  };

  const captionPx = fontProperties?.Size ? fontProperties.Size * fontScale : 12;
  const arrowSize = captionPx;
  const captionMaxW = Caption
    ? textW(Caption, captionPx, fontProperties?.PName) + 3
    : undefined;

  return (
    <div ref={wrapperRef} className="ewc-ribbon-col">
      <div id={data?.ID} className="ewc-ribbon-large ewc-ribbon-split" style={customStyles}>
        {/* Top half */}
        <span
          className="ewc-ribbon-split-main"
          onClick={handleDefaultAction}
          title={hasDefaultAction ? Caption : undefined}
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
        </span>

        {/* Menu half */}
        <span className="ewc-ribbon-split-drop" onClick={toggleDropdown}>
          <span
            className="ewc-ribbon-large-caption"
            style={{
              fontFamily: fontProperties?.PName,
              fontSize: fontProperties?.Size ? `${captionPx}px` : undefined,
              maxWidth: captionMaxW ? `${captionMaxW}px` : undefined,
              minWidth: "min-content",
            }}
          >
            {Caption}{" "}
            <span className="ewc-ribbon-large-arrow">
              <GoChevronDown size={arrowSize} />
            </span>
          </span>
        </span>
      </div>

      <RibbonPopup
        anchorRef={wrapperRef}
        open={dropdownOpen}
        onClose={() => setDropdownOpen(false)}
      >
        {menuItems.map(({ key, item }) => (
          <RibbonDropDownItem
            key={item?.ID || key}
            data={item}
            handleSelectEvent={handleSelectEvent}
            fontProperties={fontProperties}
          />
        ))}
      </RibbonPopup>
    </div>
  );
};

export default RibbonDropDownButton;
