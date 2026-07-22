import React, { useState, useRef } from "react";
import * as AppIcons from "./RibbonIcons";
import { MdOutlineQuestionMark } from "react-icons/md";
import { GoChevronDown } from "react-icons/go";
import { useAppData } from "../../hooks";
import { excludeKeys, parseFlexStyles, getCurrentUrl, getImageFromData } from "../../utils";
import SelectComponent from "../SelectComponent";
import RibbonDropDownGallery from "./RibbonDropDownGallery";
import RibbonReducedButton from "./RibbonReducedButton";
import RibbonPopup from "./RibbonPopup";
import {
  RIBBON_STATE,
  collectLeaves,
  chunk,
  isSmallItem,
  ribbonChildKeys,
  SMALL_ROWS_PER_COL,
} from "./ribbonLayout";

// A ribbon group. Renders in one of four reduction states chosen by the band
// (spec §7): Large (full layout), Medium (leaves demote to small-text rows
// repacked into 3-row columns), Small (icon-only rows), or Collapsed (the whole
// group becomes one button opening a flyout with the full Large layout). The
// vertical separator to the next group and all heights are CSS-owned; there is
// no imperative measurement here.
const CustomRibbonGroup = ({ data }) => {
  const { findCurrentData, fontScale } = useAppData();

  const updatedData = excludeKeys(data);
  const { Title, CSS } = data?.Properties || {};
  const customStyle = parseFlexStyles(CSS);
  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;
  const caption = Array.isArray(Title) ? Title[0] : Title;
  const state = data.groupState ?? RIBBON_STATE.LARGE;

  const captionRow = (
    <div className="ewc-ribbon-group-caption">
      <span
        id={data.ID + "-title"}
        className="ewc-ribbon-group-caption-text"
        style={{
          fontFamily: fontProperties?.PName,
          fontSize: fontProperties?.Size
            ? `${fontProperties.Size * fontScale}px`
            : undefined,
        }}
      >
        {caption}
      </span>
    </div>
  );

  const renderGroupItem = (key) => (
    <SelectComponent
      key={updatedData[key]?.ID || key}
      data={{
        ...updatedData[key],
        FontObj: data.FontObj,
        ImageList: data.ImageList,
      }}
    />
  );

  // A group item counts as "small" when everything it holds is a 16x16 button —
  // those render as text rows, and native stacks consecutive ones into a shared
  // column instead of giving each its own. (Office's SmallWithText 3-stack.)
  const isSmallGroupItem = (key) => {
    const gi = updatedData[key];
    const kids = ribbonChildKeys(gi).map((k) => gi[k]).filter((c) => c?.Properties);
    return kids.length > 0 && kids.every((c) => isSmallItem(c, findCurrentData));
  };

  // Pack the group's items into columns: each non-small item keeps its own, and
  // runs of small ones fill a column SMALL_ROWS_PER_COL rows deep before
  // starting the next — the stacking the band would get from CSS `column wrap`
  // if Chrome sized such containers correctly.
  const packColumns = () => {
    const cols = [];
    for (const key of Object.keys(updatedData)) {
      const small = isSmallGroupItem(key);
      const last = cols[cols.length - 1];
      if (small && last?.small && last.keys.length < SMALL_ROWS_PER_COL) last.keys.push(key);
      else cols.push({ small, keys: [key] });
    }
    return cols;
  };

  // ---- Large: the full item tree (also reused inside the collapsed flyout) --
  const renderFullItems = () => (
    <div className="ewc-ribbon-group-items">
      {packColumns().map((col) =>
        col.small && col.keys.length > 1 ? (
          <div className="ewc-ribbon-small-stack" key={updatedData[col.keys[0]]?.ID || col.keys[0]}>
            {col.keys.map(renderGroupItem)}
          </div>
        ) : (
          renderGroupItem(col.keys[0])
        )
      )}
    </div>
  );

  if (state === RIBBON_STATE.COLLAPSED) {
    return (
      <CollapsedGroup
        data={data}
        caption={caption}
        captionRow={captionRow}
        customStyle={customStyle}
        fontProperties={fontProperties}
        fontScale={fontScale}
        renderFullItems={renderFullItems}
      />
    );
  }

  if (state === RIBBON_STATE.MEDIUM || state === RIBBON_STATE.SMALL) {
    const iconOnly = state === RIBBON_STATE.SMALL;
    const leaves = collectLeaves(data);
    const galleries = leaves.filter((l) => l.kind === "gallery");
    const rows = leaves.filter((l) => l.kind !== "gallery");
    const columns = chunk(rows, 3);

    return (
      <div id={data?.ID} className="ewc-ribbon-group" style={customStyle}>
        <div className="ewc-ribbon-group-items">
          {columns.map((col, ci) => (
            <div className="ewc-ribbon-small-stack" key={col[0]?.id || ci}>
              {col.map((leaf) => (
                <RibbonReducedButton
                  key={leaf.id}
                  leaf={leaf}
                  iconOnly={iconOnly}
                  fontProps={fontProperties}
                  ImageList={data.ImageList}
                />
              ))}
            </div>
          ))}
          {galleries.map((g) => (
            <RibbonDropDownGallery
              key={g.id}
              data={{ ...g.data, FontObj: data.FontObj, ImageList: data.ImageList }}
            />
          ))}
        </div>
        {captionRow}
      </div>
    );
  }

  // Large (default)
  return (
    <div id={data?.ID} className="ewc-ribbon-group" style={customStyle}>
      {renderFullItems()}
      {captionRow}
    </div>
  );
};

// Resolve a 32px icon for the collapsed group from its first leaf.
const useGroupIcon = (data) => {
  const { findCurrentData } = useAppData();
  const leaf = collectLeaves(data)[0];
  if (!leaf) return <MdOutlineQuestionMark size={32} />;
  const p = leaf.data.Properties || {};
  if (leaf.kind === "bg") {
    const IconComp = AppIcons[p.Icons?.[leaf.index]] || MdOutlineQuestionMark;
    return <IconComp size={32} />;
  }
  const ImageData = getImageFromData(findCurrentData(p.ImageListObj), p.ImageIndex);
  if (ImageData) return <img src={`${getCurrentUrl()}${ImageData.imageUrl}`} alt="" />;
  const IconComp = AppIcons[p.Icon] || MdOutlineQuestionMark;
  return <IconComp size={32} />;
};

const CollapsedGroup = ({ data, caption, captionRow, customStyle, fontProperties, fontScale, renderFullItems }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const icon = useGroupIcon(data);

  return (
    <div id={data?.ID} className="ewc-ribbon-group" style={customStyle} ref={wrapRef}>
      <div className="ewc-ribbon-group-items">
        <div
          className="ewc-ribbon-large ewc-ribbon-collapsed"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          <span className="ewc-ribbon-large-icon">{icon}</span>
          <span
            className="ewc-ribbon-large-caption"
            style={{
              fontFamily: fontProperties?.PName,
              fontSize: fontProperties?.Size
                ? `${fontProperties.Size * fontScale}px`
                : undefined,
            }}
          >
            {caption}{" "}
            <span className="ewc-ribbon-large-arrow">
              <GoChevronDown size={12} />
            </span>
          </span>
        </div>
      </div>
      {captionRow}

      {/* Flyout portalled to body (via RibbonPopup) so the full Large layout floats
          above the clipped band rather than being trapped inside it. */}
      <RibbonPopup
        anchorRef={wrapRef}
        open={open}
        onClose={() => setOpen(false)}
        className="ewc-ribbon ewc-ribbon-flyout"
      >
        <div className="ewc-ribbon-group">{renderFullItems()}</div>
      </RibbonPopup>
    </div>
  );
};

export default CustomRibbonGroup;
