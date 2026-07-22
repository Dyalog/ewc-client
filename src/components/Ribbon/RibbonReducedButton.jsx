import React, { useState, useRef } from "react";
import * as AppIcons from "./RibbonIcons";
import { MdOutlineQuestionMark } from "react-icons/md";
import { GoChevronDown } from "react-icons/go";
import { useAppData } from "../../hooks";
import { getCurrentUrl, getImageFromData, getObjectById } from "../../utils";
import RibbonDropDownItem from "./RibbonDropDownItem";
import RibbonPopup from "./RibbonPopup";

// Renders one flattened leaf (a button, a button-group row, or a dropdown) as a
// small-text row, or icon-only when `iconOnly`. Used by RibbonGroup's Medium /
// Small states where the group's leaves are repacked into columns of three.
// Each leaf keeps its own Select contract.
const RibbonReducedButton = ({ leaf, iconOnly, fontProps, ImageList }) => {
  const { socket, dataRef, findCurrentData, fontScale } = useAppData();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const { kind, data, index, caption } = leaf;

  const send = (id, info) =>
    socket.send(
      JSON.stringify({
        Event: { EventName: "Select", ID: id, ...(info != null ? { Info: [info] } : {}) },
      })
    );

  const captionStyle = {
    fontFamily: fontProps?.PName,
    fontSize: fontProps?.Size ? `${fontProps.Size * fontScale}px` : undefined,
  };

  // ---- resolve a 16px icon node for this leaf -----------------------------
  let iconNode;
  if (kind === "bg") {
    const p = data.Properties || {};
    const IconComp = AppIcons[p.Icons?.[index]] || MdOutlineQuestionMark;
    let imgUrl = null;
    let sz = null;
    if (Array.isArray(p.ImageListObj)) {
      const il = JSON.parse(getObjectById(dataRef.current, p.ImageListObj[index]) || "null");
      const idx = p.ImageIndex?.[index];
      if (il?.Properties?.Files) {
        imgUrl = il.Properties.Files[idx - 1];
        sz = il.Properties.Size;
      }
    }
    iconNode = imgUrl ? (
      <img src={`${getCurrentUrl()}${imgUrl}`} alt="" style={{ width: sz?.[0], height: sz?.[1] }} />
    ) : (
      <IconComp size={16} />
    );
  } else {
    const p = data.Properties || {};
    const ImageData = getImageFromData(findCurrentData(p.ImageListObj), p.ImageIndex);
    const IconComp = AppIcons[p.Icon] || MdOutlineQuestionMark;
    iconNode = ImageData ? (
      <img src={`${getCurrentUrl()}${ImageData.imageUrl}`} alt="" />
    ) : p.ImageIndex && ImageList?.Properties?.Files ? (
      <img src={`${getCurrentUrl()}${ImageList.Properties.Files[p.ImageIndex - 1]}`} alt="" />
    ) : (
      <IconComp size={16} />
    );
  }

  // ---- click behaviour -----------------------------------------------------
  const onClick = (e) => {
    if (kind === "dropdown") {
      e.stopPropagation();
      setOpen((o) => !o);
      return;
    }
    const { Event, ID } = data.Properties ? { Event: data.Properties.Event, ID: data.ID } : {};
    const exists = Event && Event.some((it) => it[0] === "Select");
    if (!exists) return;
    if (kind === "bg") send(data.ID, index + 1);
    else send(data.ID, undefined);
  };

  const menuItems =
    kind === "dropdown"
      ? Object.keys(data)
          .filter((k) => k.startsWith("MItem"))
          .map((k) => ({ key: k, item: data[k] }))
      : [];

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        id={leaf.id}
        className="ewc-ribbon-small"
        onClick={onClick}
        title={iconOnly ? caption : undefined}
      >
        <span className="ewc-ribbon-small-icon">{iconNode}</span>
        {!iconOnly && (
          <span className="ewc-ribbon-small-caption" style={captionStyle}>
            {caption}
          </span>
        )}
        {kind === "dropdown" && (
          <span className="ewc-ribbon-small-arrow">
            <GoChevronDown size={11} />
          </span>
        )}
      </div>

      {kind === "dropdown" && (
        <RibbonPopup
          anchorRef={wrapRef}
          open={open}
          onClose={() => setOpen(false)}
        >
          {menuItems.map(({ key, item }) => (
            <RibbonDropDownItem
              key={item?.ID || key}
              data={item}
              handleSelectEvent={(id, Event) => {
                const exists = Event && Event.some((it) => it[0] === "Select");
                if (exists) send(id, undefined);
                setOpen(false);
              }}
              fontProperties={fontProps}
            />
          ))}
        </RibbonPopup>
      )}
    </div>
  );
};

export default RibbonReducedButton;
