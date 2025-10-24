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
  const dimensions = useResizeObserver(
    document.getElementById(extractStringUntilLastPeriod(data?.ID))
  );
  
  const width = Size ? {width: Size[1]} : {};
  const [isFocused, setIsFocused] = useState(false);

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

  // Update focused or not
  useEffect(() => {
    const f = () => {
      const focused = document.activeElement === ref.current;
      setIsFocused(focused);
    };
    window.addEventListener('focus', f, true);
    window.addEventListener('blur', f, true);
    return () => {
      window.removeEventListener('focus', f, true);
      window.removeEventListener('blur', f, true);
    };
  }, []);

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
  // Three starts are used for selecting items:
  // lastSel is the last selected item, by itself
  // curStart is where we last did a single click, moved by one with the arrow
  //     keys, or started a drag
  // dragStart is used only during drags
  // Example, saying we have a list of 5 items:
  //   - click 2       - lastSel = 2, curStart = 2, sel = 2
  //   - shift-click 4 - lastSel = 4, curStart = 2, sel = 2,3,4
  //   - shift-click 5 - lastSel = 5, curStart = 2, sel = 2,3,4,5
  //   - shift-up x4   - lastSel = 1, curStart = 2, sel = 1,2
  //   - meta-click 3  - lastSel = 3, curStart = 3, sel = 1,2,3
  //   - shift-down    - lastSel = 4, curStart = 3, sel = 3,4
  const [lastSelIndex, setLastSelIndex] = useState(initlastClickIndex);
  const [curStartIndex, setCurStartIndex] = useState(initlastClickIndex);
  const [dragStart, setDragStart] = useState(null);

  const isMulti = data?.Properties?.Style?.toLowerCase() === "multi";

  const handleClick = (index, event) => {
    event.preventDefault(); 

    const length = items.length;
    let updatedArray = [...items];

    if ((event.ctrlKey || event.metaKey) && isMulti) {
      updatedArray[index] = updatedArray[index] ? 0 : 1;
      setCurStartIndex(index);
    } else if (event.shiftKey && isMulti) {
      updatedArray = Array(length).fill(0);
      if (index > curStartIndex) {
        for (let i = index; i >= curStartIndex; i--) {
          updatedArray[i] = 1;
        }
      } else {
        for (let i = index; i <= curStartIndex; i++) {
          updatedArray[i] = 1;
        }
      }
    } else {
      updatedArray = Array(length).fill(0);
      updatedArray[index] = 1;
      setCurStartIndex(index);
    }
    setLastSelIndex(index);
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
    document.getElementById(data.ID).focus();
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
      }
      else {
        updatedArray.fill(0); 
        updatedArray[index] = 1; 
      }
      setItems(updatedArray);
      setLastSelIndex(index);
      setCurStartIndex(dragStart);
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
    document.getElementById(data.ID).focus();
  };

  const handleKeyDown = (e) => {
    const length = items.length;
    let updatedArray = [...items];
    let newIndex
    if (e.key === 'ArrowDown' && lastSelIndex !== length - 1) {
      newIndex = lastSelIndex + 1;
    } else if (e.key === 'ArrowUp' && lastSelIndex !== 0) {
      newIndex = lastSelIndex - 1;
    }
    // Nothing to do
    if (newIndex === undefined) return;

    if (!e.shiftKey || !isMulti) {
      // If a single select or simple move, just move up or down - unselect
      // everything and then select just the newIndex and make it the last
      // clicked position.
      updatedArray.fill(0);
      updatedArray[newIndex] = 1;
      setItems(updatedArray);
      setLastSelIndex(newIndex);
      setCurStartIndex(newIndex);
    } else if (e.shiftKey && isMulti) {
      // Otherwise, it's a Multi and we're using shift.
      // Shift and cursor keys can be thought of as a 'drag', so we reuse that
      updatedArray.fill(0);
      for (let i = Math.min(curStartIndex, newIndex); i <= Math.max(curStartIndex, newIndex); i++) {
        updatedArray[i] = 1;
        setItems(updatedArray);
      }
      setLastSelIndex(newIndex);
    } else {
      return;
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
  };

  return (
    <div
      id={data?.ID}
      ref={ref}
      style={{
        ...styles,
        ...width,
        border: "1px solid " + (isFocused ? "black" : "darkgrey"),
        display: Visible === 0 ? "none" : "block",
      }}
      tabIndex={0}
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
      onKeyDown={(e) => {
        handleKeyDown(e);
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

