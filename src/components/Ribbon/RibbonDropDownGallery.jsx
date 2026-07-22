import React, { useEffect, useRef, useState } from "react";
import { BsArrowBarDown } from "react-icons/bs";
import { GoChevronUp, GoChevronDown } from "react-icons/go";
import { useAppData } from "../../hooks";
import RibbonGalleyItem from "./RibbonGalleyItem";
import RibbonPopup from "./RibbonPopup";
import { galleryCols } from "./ribbonLayout";

// In-ribbon gallery (Office "RibbonGalleryBarItem"): a fixed grid of `Cols`
// columns × the rows that fit the band, with a 3-button vertical scroller (up /
// down / "More"). The grid width is always `Cols × ItemWidth`, so a partial last
// row (e.g. 3-wide gallery whose last row holds one tile) never shrinks it. Tiles
// use the authored ItemWidth/ItemHeight so the vertical scale matches the app.
// "More" opens the full grid in a body-portalled popup.
const RibbonGallery = ({ data }) => {
  const { socket, findCurrentData, fontScale } = useAppData();
  const { Cols, ItemHeight, ItemWidth } = data.Properties || {};
  const tileW = ItemWidth || 64;
  const tileH = ItemHeight || 40;

  const galleryRef = useRef(null);
  const gridRef = useRef(null);
  const [startRow, setStartRow] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // Available band height, measured. The grid element fills the band
  // (align-items:stretch), so its clientHeight is the room to fill and does NOT
  // depend on how many rows we render — no measure→render→measure feedback loop.
  const [availH, setAvailH] = useState(tileH);

  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;
  // Caption metrics drive how many columns fit, so they must use the font the
  // tiles actually render with.
  const fontPx = (fontProperties?.Size || 12) * (fontScale || 1);

  const menuItems = Object.keys(data)
    .filter((key) => key.startsWith("MItem"))
    .map((key) => ({ key, item: data[key] }));

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => setAvailH(el.clientHeight || tileH);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [tileH]);

  // Columns come from the app's own reservation (Cols x ItemWidth) versus how
  // wide the captions actually are — the same rule the width estimator uses, so
  // the band and the gallery never disagree.
  const numCols = galleryCols(data, fontPx);
  const totalRows = Math.max(1, Math.ceil(menuItems.length / numCols));
  // Rows follow the authored ItemHeight: that is the app telling us how tall a
  // gallery row is, and rounding is what makes a 40px row in a ~72px band show
  // two slightly compressed rows rather than one, as native does.
  const rowsFit = Math.min(totalRows, Math.max(1, Math.round(availH / tileH)));
  // Divide the band evenly among those rows (never taller than the authored
  // ItemHeight), so the rows fill the band with no clip and no dead gap.
  const rowH = Math.max(1, Math.min(tileH, Math.floor(availH / rowsFit)));
  const maxStartRow = Math.max(0, totalRows - rowsFit);
  const start = Math.min(startRow, maxStartRow);

  const handleScrollUp = () => setStartRow((r) => Math.max(0, r - 1));
  const handleScrollDown = () => setStartRow((r) => Math.min(maxStartRow, r + 1));
  const toggleDropdown = () => setIsDropdownOpen((s) => !s);

  const handleSelectEvent = (menuItemID, Event) => {
    const exists = Event && Event.some((item) => item[0] === "Select");
    if (exists) {
      socket.send(JSON.stringify({ Event: { EventName: "Select", ID: menuItemID } }));
    }
    setIsDropdownOpen(false);
  };

  const isUpDisabled = start === 0;
  const isDownDisabled = start >= maxStartRow;

  const visibleItems = menuItems.slice(start * numCols, (start + rowsFit) * numCols);

  // `Cols` columns, each at least the authored ItemWidth but free to grow to its
  // widest caption (`max-content`) so no tile is truncated — native sizes its
  // gallery columns to the text too. A short last row leaves empty cells rather
  // than collapsing the width.
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${numCols}, minmax(${tileW}px, max-content))`,
    gridAutoRows: `${rowH}px`,
  };

  return (
    <div className="ewc-ribbon-gallery" ref={galleryRef}>
      <div className="ewc-ribbon-gallery-strip" ref={gridRef} style={gridStyle}>
        {visibleItems.map(({ key, item }, index) => (
          <RibbonGalleyItem
            key={item?.ID || key}
            data={item}
            startIndex={start * numCols + index}
            handleSelectEvent={handleSelectEvent}
            ItemWidth={tileW}
            ItemHeight={rowH}
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

      <RibbonPopup
        anchorRef={galleryRef}
        open={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
        className="ewc-ribbon-gallery-grid"
        style={{
          // The "More" popup is not width-constrained by the band, so it shows
          // the full authored Cols rather than the fitting subset.
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(1, Cols || 3)}, minmax(${tileW}px, max-content))`,
          gridAutoRows: `${tileH}px`,
        }}
      >
        {menuItems.map(({ key, item }, index) => (
          <RibbonGalleyItem
            key={item?.ID || key}
            data={item}
            handleSelectEvent={handleSelectEvent}
            startIndex={index}
            ItemWidth={tileW}
            ItemHeight={tileH}
            fontProperties={fontProperties}
          />
        ))}
      </RibbonPopup>
    </div>
  );
};

export default RibbonGallery;
