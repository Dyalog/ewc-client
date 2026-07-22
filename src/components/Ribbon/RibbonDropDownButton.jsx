import React, { useState, useRef } from "react";
import * as Icons from "./RibbonIcons";
import { MdOutlineQuestionMark } from "react-icons/md";
import { GoChevronDown } from "react-icons/go";
import { useAppData } from "../../hooks";
import { getCurrentUrl, getImageFromData, parseFlexStyles } from "../../utils";
import RibbonDropDownItem from "./RibbonDropDownItem";
import RibbonPopup from "./RibbonPopup";
import { textW } from "./ribbonLayout";

// A large dropdown button. Native renders these as Office *split* buttons: the
// icon half runs the button's own default action and the caption+caret half
// opens the menu, each highlighting separately. The button carries its own
// Select event alongside its MItem children, so both halves are live; a button
// with no Select of its own degrades to "either half opens the menu".
//
// The popup is position:fixed so it escapes any overflow:clip on ancestor
// TabControl/Ribbon — that getBoundingClientRect is popup placement, not the
// banned layout measurement.
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
  // Cap the caption box at its own text width. Native sizes a dropdown tile to
  // its caption and lets the caret fall to the next line when it does not fit
  // ("Access" over its caret) while keeping it inline where there is room
  // ("Overal Data / Quality v"). Without this the caret widens the tile enough
  // to always fit itself, so it is never pushed under. A negative margin would
  // shrink the tile too, but it also shrinks the caret for line-breaking, so it
  // would never wrap either — the box has to be narrow, not the caret.
  // The few px of slack keep a measurement that is a hair short of the rendered
  // text from breaking the word itself instead of pushing the caret down.
  const captionMaxW = Caption
    ? textW(Caption, captionPx, fontProperties?.PName) + 3
    : undefined;

  return (
    <div ref={wrapperRef} className="ewc-ribbon-col">
      <div id={data?.ID} className="ewc-ribbon-large ewc-ribbon-split" style={customStyles}>
        {/* Top half: the default action. */}
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

        {/* Bottom half: opens the menu. The arrow is part of the caption's inline
            flow, so it wraps onto the last caption line ("Overal Data /
            Quality v") the way native does, instead of taking a third row the
            band has no height for. */}
        <span className="ewc-ribbon-split-drop" onClick={toggleDropdown}>
          <span
            className="ewc-ribbon-large-caption"
            style={{
              fontFamily: fontProperties?.PName,
              fontSize: fontProperties?.Size ? `${captionPx}px` : undefined,
              maxWidth: captionMaxW ? `${captionMaxW}px` : undefined,
              // min-content is the browser's own measure of the longest word, and
              // a min-width beats a max-width, so however far the canvas estimate
              // is off, the box can never be too narrow for its own text — the
              // caret gets pushed to the next line instead of the word breaking.
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
