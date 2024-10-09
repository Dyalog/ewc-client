import {
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
  processCssStyles,
  injectCssStyles,
} from "../utils";
import SelectComponent from "./SelectComponent";
import { useAppData, useResizeObserver, useWindowDimensions } from "../hooks";
import { useEffect, useState } from "react";

const Form = ({ data }) => {
  const PORT = localStorage.getItem("PORT");
  const { viewport } = useWindowDimensions();
  const { findDesiredData, socket } = useAppData();
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
    Css
  } = data?.Properties;
  const styles = parseFlexStyles(CSS);
  if (Css) {
    const stylesArray = Css.split(",")
    const processedStyles = processCssStyles(stylesArray);
    injectCssStyles(processedStyles, data?.ID);
  }

  console.log("form after parsing", { styles, CSS, Flex });
  const updatedData = excludeKeys(data);
  const ImageData = findDesiredData(Picture && Picture[0]);

  let imageStyles = getImageStyles(Picture && Picture[1], PORT, ImageData);

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
    console.log(event);
    if (!exists) return;
    socket.send(event);
  };

  const sendDeviceCapabilities = () => {
    let zoom = Math.round(window.devicePixelRatio * 100);
    let event = JSON.stringify({
      DeviceCapabilities: {
        ViewPort: [window.innerHeight, window.innerWidth],
        ScreenSize: [window.screen.height, window.screen.width],
        DPR: zoom / 100,
        PPI: 200,
      },
    });
    console.log(event);
    socket.send(event);
  };

  // Set the current Focus
  useEffect(() => {
    localStorage.setItem("current-focus", data.ID);
  }, []);

  // useEffect to check the size is present otherwise Viewport half height and width

  useEffect(() => {
    const hasSize = data?.Properties?.hasOwnProperty("Size");

    const halfViewportWidth = Math.round(window.innerWidth / 2);

    const halfViewportHeight = Math.round(window.innerHeight / 2);

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
    sendDeviceCapabilities();
  }, [dimensions]);

  // console.log("App Form", {
  //   formStyles,
  //   styles,
  //   data,
  //   updatedStyles,
  //   flexDirection: updatedStyles.flexDirection,
  // });

  // console.log("App Form stringify", JSON.stringify(updatedStyles));

  return (
    <div
    onMouseDown={(e) => {
      handleMouseDown(e, socket, Event,data);
    }}
    onMouseUp={(e) => {
      handleMouseUp(e, socket, Event, data);
    }}
    onMouseEnter={(e) => {
      handleMouseEnter(e, socket, Event, data);
    }}
    onMouseMove={(e) => {
      handleMouseMove(e, socket, Event, data);
    }}
    onMouseLeave={(e) => {
      handleMouseLeave(e, socket, Event, data);
    }}
    className={`ewc-form`}
      id={data?.ID}
      style={{
        ...formStyles,
        ...styles,
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
        // overflow: 'hidden',
      }}
    >
      {Object.keys(updatedData).map((key, i) => {
        return <SelectComponent data={updatedData[key]} key={i} />;
      })}
    </div>
  );
};

export default Form;
