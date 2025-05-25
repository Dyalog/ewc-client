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
import { pad } from "../utils/pad";

const List = ({ data }) => {
  const { socket, findCurrentData, inheritedProperties } = useAppData();
  const styles = setStyle(data?.Properties);
  const { Items, SelItems, Visible, Size, Event, CSS } = data?.Properties;
  const { FontObj } = inheritedProperties(data, 'FontObj');
  const customStyles = parseFlexStyles(CSS);

  const font = findCurrentData(FontObj);
  const fontStyles = getFontStyles(font, 12);

  const ref = useRef();
  let [items, setItems] = useState(SelItems || Array(Items.length).fill(0));
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const dimensions = useResizeObserver(
    document.getElementById(extractStringUntilLastPeriod(data?.ID))
  );
  const [width, setWidth] = useState(Size[1]);

  // SelItems is used as the state, but the internal state of 'items' is used
  // for rendering. So we use a hack where App.jsx sends a message to us, to
  // update the internal state of the component.
  // This is horrible! Everything should come from the core state.
  useEffect(() => {
    const listenerId = 'EWC-WS-' + data?.ID;
    const handler = (e) => {
      // If Items is set, reset the internal equivalent of SelItems (items)
      let newItems = items;
      if (e.detail.Items) { newItems = Array(e.detail.Items.length).fill(0) }
      // If SelItems is set, we trim it if the length is wrong
      if (e.detail.SelItems) { newItems = e.detail.SelItems }
      items = newItems;
      setItems(newItems);
      localStorage.setItem(
        data?.ID,
        JSON.stringify({
          Event: {
            ID: data?.ID,
            SelItems: newItems,
          },
        })
      );
    };
    document.addEventListener(listenerId, handler);
    return () => { document.removeEventListener(listenerId, handler); }
  }, []); // only on mount

  // useEffect(() => {
  //   setWidth(dimensions?.width - 50);
  // }, [dimensions]);

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
  var initlastClickIndex = 0;
  if (SelItems) {
    initlastClickIndex = SelItems.findIndex(x => x !== 0);
  }
  const [lastClickIndex, setLastClickIndex] = useState(initlastClickIndex);

  const handleClick = (index, event) => {
    event.preventDefault(); 

    const length = items.length;
    let updatedArray = [...items];

    if (event.metaKey && data?.Properties?.Style?.toLowerCase() === "multi") {
      updatedArray[index] = updatedArray[index] ? 0 : 1;
      setLastClickIndex(index);
    } else if (event.shiftKey && data?.Properties?.Style?.toLowerCase() === "multi") {
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

      if (data?.Properties?.Style?.toLowerCase() === "multi") {
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
      localStorage.setItem(
        data?.ID,
        JSON.stringify({
          Event: {
            ID: data?.ID,
            SelItems: updatedArray,
          },
        })
      );
     
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
      id={data?.ID}
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
              height: fontStyles.Size + 2 + "px",
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

