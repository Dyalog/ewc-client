import {
  getFontStyles,
  setStyle,
  excludeKeys,
  rgbColor,
  getImageStyles,
  parseFlexStyles,
  handleMouseDown,
  handleMouseUp,
  handleMouseEnter,
  handleMouseMove,
  handleMouseLeave,
  handleMouseWheel,
  handleMouseDoubleClick,
  handleKeyPressUtils,
} from "../utils";
import SelectComponent from "./SelectComponent";
import { useAppData, useResizeObserver, useWindowDimensions } from "../hooks";
import { useEffect, useState } from "react";

const Form = ({ data }) => {
  const { viewport } = useWindowDimensions();
  const { findCurrentData, socket , isDesktop } = useAppData();
//   console.log("Desktop is as",!isDesktop);

  const [formStyles, setFormStyles] = useState({});

  const dimensions = useResizeObserver(document.getElementById(data?.ID));

  const {
    BCol,
    Picture,
    Size,
    Visible,
    Posn,
    Flex = 0,
    Event,
    CSS,
    FontObj
  } = data?.Properties;

//   console.log("Dtaa is as",data,Posn);
  
  const styles = parseFlexStyles(CSS);

//   console.log("form after parsing", { styles, CSS, Flex });
  const updatedData = excludeKeys(data);
  const ImageData = findCurrentData(Picture && Picture[0]);

  let imageStyles = getImageStyles(Picture && Picture[1], ImageData);

  const font = findCurrentData(FontObj);
  const fontStyles = getFontStyles(font, 12);

  const sendConfigureEvent = () => {
    const event = JSON.stringify({
      Event: {
        EventName: "Configure",
        ID: data?.ID,
        Info: [
          Posn && Posn[0],
          Posn && Posn[1],
          Size && Size[0],
          Size && Size[1],
        ],
      },
    });
    const exists = Event && Event.some((item) => item[0] === "Configure");
    if (!exists) return;
    socket.send(event);
  };

  const sendDeviceCapabilities = () => {
    let event = JSON.stringify({
      DeviceCapabilities: {
        ViewPort: [window.innerHeight, window.innerWidth],
        ScreenSize: [window.screen.height, window.screen.width],
        DPR: window.devicePixelRatio,
        PPI: 200,
      },
    });
    socket.send(event);
  };

  // Set the current Focus
  useEffect(() => {
    localStorage.setItem("current-focus", data.ID);
  }, []);

  // useEffect to check the size is present otherwise Viewport half height and width

  useEffect(() => {
    const hasSize = data?.Properties?.hasOwnProperty("Size");

    const halfViewportWidth = window.innerWidth;

    const halfViewportHeight = window.innerHeight;

    localStorage.setItem(
      "formDimension",
      JSON.stringify(hasSize ? Size : [halfViewportHeight, halfViewportWidth])
    );
    localStorage.setItem(
      "formPositions",
      JSON.stringify([Posn && Posn[0], Posn && Posn[1]])
    );

    localStorage.setItem(
      data?.ID,
      JSON.stringify({
        Size: hasSize ? Size : [halfViewportHeight, halfViewportWidth],
        Posn,
      })
    );

    setFormStyles(
      setStyle(
        {
          ...data?.Properties,
          ...(hasSize
            ? { Size }
            : { Size: [halfViewportHeight, halfViewportWidth] }),
        },
        "relative",
        Flex,
        "Form"
      )
    );
  }, [data]);

  useEffect(() => {
    sendConfigureEvent();
    // triggers a loop with scaling turned on
    if(!isDesktop){
      sendDeviceCapabilities();
    }
  }, [dimensions]);

  return (
    <div
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
      id={data?.ID}
      style={{
        ...formStyles,
        ...fontStyles,
        background: BCol ? rgbColor(BCol) : "#F0F0F0",
        position: "relative",
        border: "1px solid #F0F0F0",
        display:
          Visible == 0
            ? "none"
            : data?.Properties.hasOwnProperty("Flex")
            ? "flex"
            : "block",

        ...imageStyles,
        ...styles,
        overflow: 'clip',
      }}
      onKeyDown={(e) => {
        // handleKeyPressUtils(e, socket, Event, data?.ID);
      }}
    >
      {(() => {
        const hasMenuBar = Object.keys(updatedData).some(
          key => updatedData[key]?.Properties?.Type === 'MenuBar'
        );
        // TODO: This needs to be determined by menubar styling and font size, etc
        const menuBarOffset = hasMenuBar ? 25 : 0;
        
        return (
          <>
            {/* We separate the MenuBar out, whenever you declare it */}
            {hasMenuBar && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                {Object.keys(updatedData).filter(key => 
                  updatedData[key]?.Properties?.Type === 'MenuBar'
                ).map((key, i) => (
                  <SelectComponent data={updatedData[key]} key={`menubar-${i}`} />
                ))}
              </div>
            )}
            
            <div style={{ 
              position: 'absolute', 
              top: menuBarOffset, 
              left: 0, 
              right: 0, 
              bottom: 0 
            }}>
              {Object.keys(updatedData).filter(key => 
                updatedData[key]?.Properties?.Type !== 'MenuBar'
              ).map((key, i) => (
                <SelectComponent data={updatedData[key]} key={`content-${i}`} />
              ))}
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default Form;
