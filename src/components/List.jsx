import { useEffect, useRef, useState } from "react";
import { useAppData, useResizeObserver } from "../hooks";
import { extractStringUntilLastPeriod, handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, injectCssStyles, parseFlexStyles, processCssStyles, setStyle } from '../utils';


const List = ({ data }) => {
  const { socket } = useAppData();
  const styles = setStyle(data?.Properties);
  const { Items, SelItems, Visible, Size, Event, CSS, Css,CssClass } = data?.Properties;
  const customStyles = parseFlexStyles(CSS)
  const ref = useRef();
  const [selectedItem, _] = useState(1);
  const [items, setItems] = useState(SelItems);
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

  const handleClick = (index) => {
    const length = SelItems.length;
    let updatedArray = Array(length).fill(0);

    updatedArray[index] = 1;

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

  if (Css) {
    const stylesArray = Css.split(",")
    const processedStyles = processCssStyles(stylesArray);
    injectCssStyles(processedStyles, data?.ID);
  }

  return (
    <div
    className='ewc-list'
      ref={ref}
      style={{
        ...styles,
        width,
        border: "1px solid black",
        display: Visible == 0 ? "none" : "block",
      }}
      onMouseDown={(e) => {
        handleMouseDown(e, socket, Event, data?.ID);
      }}
      onMouseUp={(e) => {
        handleMouseUp(e, socket, Event, data?.ID);
      }}
      onMouseEnter={(e) => {
        handleMouseEnter(e, socket, Event, data?.ID);
      }}
      onMouseMove={(e) => {
        handleMouseMove(e, socket, Event, data?.ID);
      }}
      onMouseLeave={(e) => {
        handleMouseLeave(e, socket, Event, data?.ID);
      }}
      onWheel={(e) => {
        handleMouseWheel(e, socket, Event, data?.ID);
      }}
      onDoubleClick={(e) => {
        handleMouseDoubleClick(e, socket, Event, data?.ID);
      }}
      onKeyDown={(e) => {
        handleKeyPressUtils(e, socket, Event, data?.ID);
      }}
    >
      {Items &&
        Items.map((item, index) =>
          selectedItem == items[index] ? (
            <div
              style={{
                ...selectedStyles,
                fontSize: "12px",
                height: "14px",
                display: "flex",
                alignItems: "center",
                padding: "1px",
                ...customStyles,
              }}
              className='ewc-list-item'
              
              >
              {item}
            </div>
          ) : (
            <div
            onClick={() => handleClick(index)}
            className='ewc-list-item'
            style={{
              cursor: 'pointer',
              fontSize: '12px',
              height: '14px',
              padding: '1px',
              display: 'flex',
              alignItems: 'center',
              ...customStyles,
              }}
            >
              {item}
            </div>
          )
        )}
    </div>
  );
};

export default List;
