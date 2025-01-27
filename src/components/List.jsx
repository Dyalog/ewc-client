// import {
//   extractStringUntilLastPeriod,
//   getFontStyles,
//   handleKeyPressUtils,
//   handleMouseDoubleClick,
//   handleMouseDown,
//   handleMouseEnter,
//   handleMouseLeave,
//   handleMouseMove,
//   handleMouseUp,
//   handleMouseWheel,
//   parseFlexStyles,
//   setStyle,
// } from "../utils";
// import { useEffect, useRef, useState } from "react";
// import { useAppData, useResizeObserver } from "../hooks";

// const List = ({ data }) => {
//   const { socket,findDesiredData } = useAppData();
//   const styles = setStyle(data?.Properties);
//   const { Items, SelItems, Visible, Size, Event, CSS,FontObj } = data?.Properties;
//   const customStyles = parseFlexStyles(CSS);

//   const font = findDesiredData(FontObj && FontObj);
//   const fontStyles = getFontStyles(font, 12);

//   const ref = useRef();
//   const [selectedItem, _] = useState(1);
//   const [items, setItems] = useState(SelItems);
//   const dimensions = useResizeObserver(
//     document.getElementById(extractStringUntilLastPeriod(data?.ID))
//   );
//   const [width, setWidth] = useState(Size[1]);
//   useEffect(() => {
//     setWidth(dimensions?.width - 50);
//   }, [dimensions]);

//   const selectedStyles = {
//     background: "#1264FF",
//     color: "white",
//     cursor: "pointer",
//   };

//   const handleClick = (index) => {
//     const length = SelItems.length;
//     let updatedArray = Array(length).fill(0);

//     updatedArray[index] = 1;

//     localStorage.setItem(
//       data?.ID,
//       JSON.stringify({
//         Event: {
//           ID: data?.ID,
//           SelItems: updatedArray,
//         },
//       })
//     );

//     setItems(updatedArray);
//   };

//   return (
//     <div
//       ref={ref}
//       style={{
//         ...styles,
//         width,
//         border: "1px solid black",
//         display: Visible == 0 ? "none" : "block",
//       }}
//       onMouseDown={(e) => {
//         console.log("on mouse down")
//         handleMouseDown(e, socket, Event, data?.ID);
//       }}
//       onMouseUp={(e) => {
//         handleMouseUp(e, socket, Event, data?.ID);
//       }}
//       onMouseEnter={(e) => {
//         handleMouseEnter(e, socket, Event, data?.ID);
//       }}
//       onMouseMove={(e) => {
//         handleMouseMove(e, socket, Event, data?.ID);
//       }}
//       onMouseLeave={(e) => {
//         handleMouseLeave(e, socket, Event, data?.ID);
//       }}
//       onWheel={(e) => {
//         handleMouseWheel(e, socket, Event, data?.ID);
//       }}
//       onDoubleClick={(e) => {
//         handleMouseDoubleClick(e, socket, Event, data?.ID);
//       }}
//       onKeyDown={(e) => {

//         handleKeyPressUtils(e, socket, Event, data?.ID);
//       }}
//     >
//       {Items &&
//         Items.map((item, index) =>
//           selectedItem == items[index] ? (
//             <div
//               style={{
//                 ...selectedStyles,
//                 fontSize: "12px",
//                 height: "14px",
//                 display: "flex",
//                 alignItems: "center",
//                 padding: "1px",
//                 ...customStyles,
//                 ...fontStyles,
//               }}
//             >
//               {item}
//             </div>
//           ) : (
//             <div
//               onClick={() => handleClick(index)}
//               style={{
//                 cursor: "pointer",
//                 fontSize: "12px",
//                 height: "14px",
//                 padding: "1px",
//                 display: "flex",
//                 alignItems: "center",
//                 ...customStyles,
//                 ...fontStyles
//               }}
//             >
//               {item}
//             </div>
//           )
//         )}
//     </div>
//   );
// };
// export default List;

import {
  extractStringUntilLastPeriod,
  getFontStyles,
  handleMouseDoubleClick,
  handleMouseDown,
  handleMouseEnter,
  handleMouseLeave,
  handleMouseMove,
  handleMouseUp,
  handleMouseWheel,
  parseFlexStyles,
  setStyle,
} from "../utils";
import { useEffect, useRef, useState } from "react";
import { useAppData, useResizeObserver } from "../hooks";

const List = ({ data }) => {
  const { socket, findDesiredData } = useAppData();
  const styles = setStyle(data?.Properties);
  const { Items, SelItems, Visible, Size, Event, CSS, FontObj } = data?.Properties;
  const customStyles = parseFlexStyles(CSS);

  const font = findDesiredData(FontObj && FontObj);
  const fontStyles = getFontStyles(font, 12);

  const ref = useRef();
  const [items, setItems] = useState(SelItems || Array(Items.length).fill(0));
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const dimensions = useResizeObserver(
    document.getElementById(extractStringUntilLastPeriod(data?.ID))
  );
  const [width, setWidth] = useState(Size[1]);

  useEffect(() => {
    setWidth(dimensions?.width - 50);
  }, [dimensions]);

  const selectedStyles = {
    background: "#1264FF",
    color: "white",
    cursor: "pointer",
  };

  // Meta-click and plain click both reset this state, and then it is used for
  // shift-clicking. The logic from Windows is that if you've ctrl-clicked
  // multiple items, then the last one clicked is used for the next shift click.
  // However, it's also the case that if you click item 3 then shift click 2
  // then 4, your selection should be {3} -> {2, 3} -> {3, 4}, so shift clicks
  // themselves don't set this.
  const [lastClickIndex, setLastClickIndex] = useState(0);

  const handleClick = (index, event) => {
    event.preventDefault(); 

    const length = items.length;
    let updatedArray = [...items];

    if (event.metaKey && data?.Properties?.Style === "Multi") {
      updatedArray[index] = updatedArray[index] ? 0 : 1;
      setLastClickIndex(index);
    } else if (event.shiftKey && data?.Properties?.Style === "Multi") {
      updatedArray = Array(length).fill(0);
      if (index > lastClickIndex) {
        for (let i = index; i >= lastClickIndex; i--) {
          updatedArray[i] = 1;
        }
      } else {
        for (let i = index; i <= lastClickIndex; i++) {
          updatedArray[i] = 1;
        }
      }
    } else {
      updatedArray = Array(length).fill(0);
      updatedArray[index] = 1;
      setLastClickIndex(index);
    }
    localStorage.setItem(
      data?.ID,
      JSON.stringify({
        Event: {
          ID: data?.ID,
          SelItems: updatedArray,
        },
      })
    );
    setItems(updatedArray);
  };

  const handleMouseDownDrag = (index,event) => {
    event.preventDefault(event); 
    setIsMouseDown(true);
    setDragStart(index);
  };

  const handleMouseOverDrag = (index,event) => {
    event.preventDefault(); 


    if (isMouseDown) {
      const updatedArray = [...items];

      if (data?.Properties?.Style === "Multi") {
        const start = Math.min(dragStart, index);
        const end = Math.max(dragStart, index);
        updatedArray.fill(0); 
        for (let i = start; i <= end; i++) {
          updatedArray[i] = 1;
        }
        setItems(updatedArray);
      }
      else {
        updatedArray.fill(0); 
        updatedArray[index] = 1; 
        setItems(updatedArray);
      }
     
    }
  };

  const handleMouseUpDrag = () => {
    // TODO - replace localStorage
    localStorage.setItem(
      data?.ID,
      JSON.stringify({
        Event: {
          ID: data?.ID,
          SelItems: items,
        },
      })
    );
    setIsMouseDown(false);
    setDragStart(null);
  };

  return (
    <div
      ref={ref}
      style={{
        ...styles,
        width,
        border: "1px solid black",
        display: Visible === 0 ? "none" : "block",
      }}
      onMouseDown={(e) => {
        handleMouseDown(e, socket, Event, data?.ID);
      }}
      onMouseUp={(e) => {
        handleMouseUp(e, socket, Event, data?.ID);
        handleMouseUpDrag();
      }}
      onMouseEnter={(e) => {
        handleMouseEnter(e, socket, Event, data?.ID);
      }}
      onMouseMove={(e) => {
        handleMouseMove(e, socket, Event, data?.ID);
      }}
      onMouseLeave={(e) => {
        handleMouseLeave(e, socket, Event, data?.ID);
        handleMouseUpDrag(); // End drag on mouse leave
      }}
      onWheel={(e) => {
        handleMouseWheel(e, socket, Event, data?.ID);
      }}
      onDoubleClick={(e) => {
        handleMouseDoubleClick(e, socket, Event, data?.ID);
      }}
    >
      {Items &&
        Items.map((item, index) => (
          <div
            key={index}
            onMouseDown={(e) => handleMouseDownDrag(index,e)}
            onMouseOver={(e) => handleMouseOverDrag(index,e)}
            onClick={(e) => handleClick(index, e)}
            style={{
              ...(items[index] ? selectedStyles : {}),
              fontSize: "12px",
              height: "14px",
              padding: "1px",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              ...customStyles,
              ...fontStyles,
            }}
          >
            {item}
          </div>
        ))}
    </div>
  );
};

export default List;

