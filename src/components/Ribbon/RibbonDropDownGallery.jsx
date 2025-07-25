import React, { useEffect, useRef, useState } from "react";
import { BsArrowBarDown } from "react-icons/bs";
import { GoChevronDown, GoChevronUp } from "react-icons/go";
import { useAppData } from "../../hooks";
import RibbonGalleyItem from "./RibbonGalleyItem";

const RibbonGallery = ({ data }) => {
  const { socket, findCurrentData } = useAppData();

  const { Cols, ItemHeight, ItemWidth } = data.Properties;
  const updatedCols = Cols && Cols + 1;


//   console.log("Collllllsss", updatedCols)
  const [startIndex, setStartIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const galleryRef = useRef(null);
  const galleryRef2 = useRef(null);
  const [maxWidth, setMaxWidth] = useState(0);

  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;

  const menuItems = Object.keys(data)
    .filter((key) => key.startsWith("MItem"))
    .map((key) => data[key]);

  const totalItems = menuItems.length;
  const remainder = totalItems % updatedCols;
  const lastPageItems = remainder === 0 ? updatedCols : remainder;
  const maxStartIndex = totalItems - lastPageItems;

  const handleScrollLeft = () => {

    setStartIndex((prevIndex) => Math.max(prevIndex - updatedCols, 0));
  };

  const handleScrollRight = () => {
    setStartIndex((prevIndex) => Math.min(prevIndex + updatedCols, maxStartIndex));
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
//     console.log(selectEvent);
    socket.send(selectEvent);
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const calculateMaxWidth = () => {
      if (galleryRef2.current) {
        const childElements = galleryRef2.current.children;
        let widestWidth = 0;

        // Debugging: Log child elements
//         console.log("Child elements for maxWidth calculation:", childElements);

        // Find the maximum width of all child items
        Array.from(childElements).forEach((child, index) => {
          const childWidth = child.getBoundingClientRect().width;

          // Debugging: Log each child's width
//           console.log(`Child ${index} width:`, childWidth);

          widestWidth = Math.max(widestWidth, childWidth);
        });

        // Debugging: Log the calculated maxWidth
//         console.log("Calculated widest width:", widestWidth);

        setMaxWidth(widestWidth);
      }
    };

    // Use setTimeout to ensure DOM is fully rendered
    setTimeout(calculateMaxWidth, 100);
  }, [menuItems]);

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

  const visibleItems = menuItems.slice(startIndex, startIndex + updatedCols);
  const isUpDisabled = startIndex === 0;
  const isDownDisabled = startIndex >= maxStartIndex;
  const itemWidth = maxWidth || ItemWidth || 50;
  const itemHeight = ItemHeight || 40;

//   console.log("Final maxWidth value:", maxWidth, maxWidth * updatedCols + updatedCols * 5 + 22);

  return (
    // <div
    //   className="ribbon-gallery"
    //   ref={galleryRef}
    //   style={{
    //     // minWidth:"max-content",
    //     // width: maxWidth * Cols + Cols * 5 + 22,
    //     // height: `${itemHeight + itemHeight}px`,
    //     width: `${maxWidth * 2 + 22}px`,
    //     height: `${itemHeight * 2+10}px`,
    //     justifyContent: "start",
    //     background:"#d3e5f7",
    //     // border:"2px solid purple",
    //     // margin: "5px",
    //     display: "flex",
    //     flexWrap: "wrap",
    //     gap: "5px",

    //   }}
    // >
    //   {!isDropdownOpen && (
    //     <div
    //       className="d-flex"
    //       style={{
    //         justifyContent: `${visibleItems.length < Cols ? "start" : "center"
    //           }`,
    //         marginLeft: `${visibleItems.length < Cols ? "10px" : ""}`,
    //       }}
    //     >
    //       <div className="gallery-content" style={{ display: "flex", width: "100%", flexWrap: "wrap"}} ref={galleryRef2}>
    //         {visibleItems.map((item, index) => (
    //           <RibbonGalleyItem
    //             key={index}
    //             data={item}
    //             className=""
    //             startIndex={index + startIndex}
    //             handleSelectEvent={handleSelectEvent}
    //             ItemWidth={maxWidth}
    //             ItemHeight={itemHeight - 2}
    //             fontProperties={fontProperties}
    //           />
    //         ))}
    //       </div>
    //       <div className="gallery-buttons" style={{ position: "absolute", right: 0 }}>
    //         <button
    //           className="gallery-button"
    //           onClick={handleScrollLeft}
    //           disabled={isUpDisabled}
    //           title="Scroll Left"
    //         >
    //           <GoChevronUp size={12} />
    //         </button>
    //         <button
    //           className="gallery-button"
    //           onClick={handleScrollRight}
    //           disabled={isDownDisabled}
    //           title="Scroll Right"
    //         >
    //           <GoChevronDown size={12} />
    //         </button>
    //         <button
    //           className="gallery-button"
    //           onClick={toggleDropdown}
    //           title="More Styles"
    //         >
    //           <BsArrowBarDown size={12} />
    //         </button>
    //       </div>
    //     </div>
    //   )}
    //   {isDropdownOpen && (
    //     <>
    //       <div
    //         className="dropdown-content"
    //         style={{
    //           width: `${itemWidth * Cols}px`,
    //           height: `${itemHeight}px`,
    //         }}
    //       >
    //         <div
    //           className="dropdown-grid"
    //           style={{
    //             display: "grid",
    //             gridTemplateColumns: `repeat(${Cols}, 1fr)`,
    //             gap: "4px",
    //           }}
    //         >
    //           {menuItems.map((item, index) => (
    //             <RibbonGalleyItem
    //               key={index}
    //               data={item}
    //               handleSelectEvent={handleSelectEvent}
    //               startIndex={index}
    //               className="ribbon-dropdown-item"
    //               ItemWidth={itemWidth}
    //               ItemHeight={itemHeight}
    //             />
    //           ))}
    //         </div>
    //       </div>
    //     </>
    //   )}
    // </div>

    <div
      className="ribbon-gallery"
      ref={galleryRef}
      style={{
        width: `${maxWidth * 2 + 30}px`,
        height: `${itemHeight * 2}px`,
        justifyContent: "start",
        background: "#d3e5f7",
        display: "flex",
        flexWrap: "wrap",
        gap: "3px",

      }}
    >
      {!isDropdownOpen && (
        <div
          className="d-flex"
          style={{
            justifyContent: `${visibleItems.length < updatedCols ? "start" : "center"
              }`,
            marginLeft: `${visibleItems.length < updatedCols ? "15px" : ""}`,
          }}
        >
          <div
            className="gallery-content"
            style={{
              display: "flex",
              width: "100%",
              flexWrap: "wrap",
              gap: "0px",
              marginTop: "15px",
              marginLeft:"3px"
            }}
            ref={galleryRef2}
          >
            {visibleItems.map((item, index) => (
              <RibbonGalleyItem
                key={index}
                data={item}
                startIndex={index + startIndex}
                handleSelectEvent={handleSelectEvent}
                ItemWidth={maxWidth}
                ItemHeight={itemHeight - 2}
                fontProperties={fontProperties}
              />
            ))}
          </div>
          <div
            className="gallery-buttons"
            style={{
              position: "absolute",
              right: "0px", // Aligns the buttons to the right edge
              top: "0px", // Starts from the top of the container
              bottom: "6px", // Ends 6px from the bottom
              width: "20px", // Fixed width for the button column
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between", // Ensures buttons are evenly distributed
              alignItems: "center", // Centers buttons horizontally
              backgroundColor: "#f0f0f0", // Optional: Add a background color for the button column
            }}
          >
            <button
              className="gallery-button"
              onClick={handleScrollLeft}
              disabled={isUpDisabled}
              title="Scroll Up"
              style={{
                flex: 1, // This will make the button take equal space
                width: "100%", // Makes the button fill the column width
                padding: "0",
                display: "flex",
                justifyContent: "center", // Center the icon horizontally
                alignItems: "center", // Center the icon vertically
              }}
            >
              <GoChevronUp size={12} />
            </button>
            <button
              className="gallery-button"
              onClick={handleScrollRight}
              disabled={isDownDisabled}
              title="Scroll Down"
              style={{
                flex: 1, // This will make the button take equal space
                width: "100%", // Makes the button fill the column width
                padding: "0",
                display: "flex",
                justifyContent: "center", // Center the icon horizontally
                alignItems: "center", // Center the icon vertically
              }}
            >
              <GoChevronDown size={12} />
            </button>
            <button
              className="gallery-button"
              onClick={toggleDropdown}
              title="More Options"
              style={{
                flex: 1, // This will make the button take equal space
                width: "100%", // Makes the button fill the column width
                padding: "0",
                display: "flex",
                justifyContent: "center", // Center the icon horizontally
                alignItems: "center", // Center the icon vertically
              }}
            >
              <BsArrowBarDown size={12} />
            </button>
          </div>

          {/* <div
            className="gallery-buttons"
            style={{
              position: "absolute",
              right: "0px", // Aligns the buttons to the right edge
              top: "0px", // Starts from the top of the container
              bottom: "6px", // Ends 10px from the bottom
              width: "20px", // Fixed width for the button column
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between", // Ensures buttons are evenly distributed
              alignItems: "center", // Centers buttons horizontally
              backgroundColor: "#f0f0f0", // Optional: Add a background color for the button column
            }}
          >
            <button
              className="gallery-button"
              onClick={handleScrollLeft}
              disabled={isUpDisabled}
              title="Scroll Up"
              style={{
                height: "30px", // Fixed button height
                width: "100%", // Makes the button fill the column width
                padding: "0",
              }}
            >
              <GoChevronUp size={12} />
            </button>
            <button
              className="gallery-button"
              onClick={handleScrollRight}
              disabled={isDownDisabled}
              title="Scroll Down"
              style={{
                height: "25px", // Fixed button height
                width: "100%", // Makes the button fill the column width
                padding: "0",
              }}
            >
              <GoChevronDown size={12} />
            </button>
            <button
              className="gallery-button"
              onClick={toggleDropdown}
              title="More Options"
              style={{
                height: "30px", // Fixed button height
                width: "100%", // Makes the button fill the column width
                padding: "0",
              }}
            >
              <BsArrowBarDown size={12} />
            </button>
          </div> */}
          {/* <div
            className="gallery-buttons"
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 20, 
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between", 
            }}
          >
            <button
              className="gallery-button"
              onClick={handleScrollLeft}
              disabled={isUpDisabled}
              title="Scroll Left"
              style={{ flex: 1 }} // Ensures the button stretches vertically
            >
              <GoChevronUp size={12} />
            </button>
            <button
              className="gallery-button"
              onClick={handleScrollRight}
              disabled={isDownDisabled}
              title="Scroll Right"
              style={{ flex: 1 }} // Ensures the button stretches vertically
            >
              <GoChevronDown size={12} />
            </button>
            <button
              className="gallery-button"
              onClick={toggleDropdown}
              title="More Styles"
              style={{ flex: 1 }} // Ensures the button stretches vertically
            >
              <BsArrowBarDown size={12} />
            </button>
          </div> */}
        </div>
      )}
      {isDropdownOpen && (
        <>
          <div
            className="dropdown-content"
            style={{
              width: `${itemWidth * updatedCols}px`,
              height: `${itemHeight}px`,
            }}
          >
            <div
              className="dropdown-grid"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${updatedCols}, 1fr)`,
                gap: "4px",
              }}
            >
              {menuItems.map((item, index) => (
                <RibbonGalleyItem
                  key={index}
                  data={item}
                  handleSelectEvent={handleSelectEvent}
                  startIndex={index}
                  className="ribbon-dropdown-item"
                  ItemWidth={itemWidth}
                  ItemHeight={itemHeight}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>

  );
};

export default RibbonGallery;
