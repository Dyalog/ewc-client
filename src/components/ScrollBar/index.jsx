import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../../common';
import './ScrollBar.css';
import { useAppData } from '../../hooks';
import { handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, injectCssStyles, parseFlexStyles, processCssStyles } from '../../utils';

const ScrollBar = ({ data }) => {
  const { FA } = Icons;
  const { Align, Type, Thumb, Range, Event, Visible, Size, Posn, VScroll, HScroll, Attach, Css } = data?.Properties;
  const isHorizontal = Type === 'Scroll' && (Align === 'Bottom' || HScroll === -1);
  const [scaledValue, setScaledValue] = useState(Thumb || 1);

  const parentSize = JSON.parse(localStorage.getItem("formDimension"));
  const [showButtons, setShowButtons] = useState(false);
  const emitEvent = Event && Event[0];

  const { socket, handleData, findDesiredData } = useAppData();
  const Style = findDesiredData("F1.STYLE")

  useEffect(() => {
    if (Style && Style.Properties && Style.Properties.Style) {
      const processedStyles = processCssStyles(Style.Properties.Style);  
      injectCssStyles(processedStyles, Style.ID);
    }
  }, [Style]);

  if (Css) {
    const stylesArray = Css.split(",").filter(Boolean); 
    const processedStyles = processCssStyles(stylesArray);
    injectCssStyles(processedStyles, data?.ID);
  }

  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const maxValue = Range;

  const trackHeight = !Size ? parentSize && parentSize[0] : Size && Size[0];
  const trackWidth = !Size ? parentSize && parentSize[1] : Size && Size[1];

  const handleTrackMouseEnter = (e) => {
    setShowButtons(true);
    handleMouseEnter(e, socket, Event, data?.ID);
  };

  const handleTrackMouseLeave = (e) => {
    setShowButtons(false);
    handleMouseLeave(e, socket, Event, data?.ID);
  };

  const handleThumbDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const startPosition = isHorizontal ? event.clientX : event.clientY;
    const thumbStyleProp = isHorizontal ? "left" : "top";
    const initialThumbPosition = thumbRef.current
      ? parseFloat(thumbRef.current.style[thumbStyleProp]) || 0
      : 0;
    let newThumbPosition = initialThumbPosition;

    const maxThumbPosition = isHorizontal ? trackWidth - 50 : trackHeight - 100;

    const handleMouseMoveEvent = (moveEvent) => {
      const currentPosition = isHorizontal
        ? moveEvent.clientX
        : moveEvent.clientY;
      const delta = currentPosition - startPosition;
      newThumbPosition = initialThumbPosition + delta;

      newThumbPosition = Math.max(
        0,
        Math.min(maxThumbPosition, newThumbPosition)
      );

      const newScaledValue = (newThumbPosition / maxThumbPosition) * maxValue;

      // Update the thumb's position directly for immediate visual feedback
      if (thumbRef.current) {
        thumbRef.current.style[thumbStyleProp] = `${newThumbPosition}px`;
      }

      // Throttle UI update to avoid rapid updates and possible race conditions
      requestAnimationFrame(() => {
        setScaledValue(newScaledValue);
      });
    };

    const handleMouseUpEvent = () => {
      window.removeEventListener("mousemove", handleMouseMoveEvent);
      window.removeEventListener("mouseup", handleMouseUpEvent);

      const finalScaledValue = (newThumbPosition / maxThumbPosition) * maxValue;
      const roundedScaledValue = Math.round(finalScaledValue) || 1;

      // Update the thumb value in the data
      handleData(
        { ID: data?.ID, Properties: { Thumb: roundedScaledValue } },
        "WS"
      );

      // Emit a single event after the drag is complete
      const scrollEvent = JSON.stringify({
        Event: {
          EventName: "Scroll",
          ID: data?.ID,
          Info: [0, roundedScaledValue],
        },
      });

      console.log("Final Scroll Event:", scrollEvent);
      localStorage.setItem(data.ID, scrollEvent);

      const exists = Event && Event.some((item) => item[0] === "Scroll");
      if (exists) {
        socket.send(scrollEvent);
      }
    };

    window.addEventListener("mousemove", handleMouseMoveEvent);
    window.addEventListener("mouseup", handleMouseUpEvent);
  };

  const handleTrackClick = (event) => {
    if (
      thumbRef.current &&
      (event.target === thumbRef.current ||
        thumbRef.current.contains(event.target))
    ) {
      return;
    }
    if (thumbRef.current && trackRef.current) {
      const trackRect = trackRef.current.getBoundingClientRect();
      const clickPosition = isHorizontal
        ? event.clientX - trackRect.left
        : event.clientY - trackRect.top;

      const maxThumbPosition = isHorizontal
        ? trackWidth - 50
        : trackHeight - 100;

      const newThumbPosition = Math.max(
        0,
        Math.min(maxThumbPosition, clickPosition - 20) // Adjust for thumb size
      );

      const newScaledValue = (newThumbPosition / maxThumbPosition) * maxValue;

      if (newScaledValue >= 1 && newScaledValue <= maxValue) {
        setScaledValue(newScaledValue);

        // Update the thumb's position directly
        if (thumbRef.current) {
          thumbRef.current.style[
            isHorizontal ? "left" : "top"
          ] = `${newThumbPosition}px`;
        }

        const scrollEvent = JSON.stringify({
          Event: {
            EventName: emitEvent && emitEvent[0],
            ID: data?.ID,
            Info: [
              Math.round(scaledValue) < Math.round(newScaledValue) ? 2 : -2,
              Math.round(newScaledValue),
            ],
          },
        });

        console.log("Event", scrollEvent);
        localStorage.setItem(data.ID, scrollEvent);

        handleData(
          {
            ID: data?.ID,
            Properties: { Thumb: Math.round(newScaledValue) || 1 },
          },
          "WS"
        );

        const exists = Event && Event.some((item) => item[0] === "Scroll");
        if (exists) {
          socket.send(scrollEvent);
        }
      }
    }
  };

  const defaultPosn = Posn || [0, 0];
  const defaultSize = Size || [parentSize[0], parentSize[1]];

  const calculateAttachStyle = () => {
    let attachStyle = {};

    if (Attach) {
      const [topAttach, leftAttach, bottomAttach, rightAttach] = Attach;

      if (topAttach === "Top" || topAttach === "Bottom") {
        attachStyle.top = `${defaultPosn[0]}px`;
      }

      if (leftAttach === "Left" || leftAttach === "Right") {
        attachStyle.left = `${defaultPosn[1]}px`;
      }

      if (bottomAttach === "Bottom" || bottomAttach === "Top") {
        attachStyle.bottom = `${defaultPosn[0]}px`;
      }

      if (rightAttach === "Right" || rightAttach === "Left") {
        attachStyle.right = `${defaultPosn[1]}px`;
      }
    }

    return attachStyle;
  };

  const attachStyle = calculateAttachStyle();

  const trackStyle = {
    width: isHorizontal ? `${trackWidth}px` : defaultSize[1] + "px",
    height: isHorizontal ? defaultSize[0] + "px" : `${trackHeight}px`,
    position: "relative",
  };

  const thumbPosition =
    (scaledValue / maxValue) *
    (isHorizontal ? trackWidth - 50 : trackHeight - 100);

  const thumbStyle = {
    width: isHorizontal ? "40px" : defaultSize[1] - 6 + "px",
    height: isHorizontal ? defaultSize[0] - 6 + "px" : "40px",
    backgroundColor: "#9E9E9E",
    position: "absolute",
    left: isHorizontal ? `${thumbPosition}px` : "2px",
    top: isHorizontal ? "2px" : `${thumbPosition}px`,
    cursor: "pointer",
    borderRadius: "5px",
  };

  const verticalPosition = {
    position: "absolute",
    top: VScroll === -1 && defaultPosn[0] !== undefined ? defaultPosn[0] : 0,
    ...(VScroll === -1
      ? {
          left:
            VScroll === -1 && defaultPosn[1] !== undefined ? defaultPosn[1] : 0,
        }
      : { right: 0 }),
    display: Visible == 0 ? "none" : "block",
    ...attachStyle,

  };

  const horizontalPosition = {
    position: "absolute",
    ...(HScroll === -1
      ? {
          top:
            HScroll === -1 && defaultPosn[0] !== undefined ? defaultPosn[0] : 0,
        }
      : { bottom: 0 }),
    left: HScroll === -1 && defaultPosn[1] !== undefined ? defaultPosn[1] : 0,
    width: defaultSize[1] + "px",
    height: defaultSize[0],
    display: Visible == 0 ? "none" : "block",
    ...attachStyle,
    ...customStyles,

  };

  useEffect(() => {
    setScaledValue((prevValue) => Math.min(Thumb, maxValue));
  }, [Thumb]);

  return (
    <div
      id={data?.ID}
      onMouseEnter={handleTrackMouseEnter}
      onMouseLeave={handleTrackMouseLeave}
      onWheel={(e) => {
        handleMouseWheel(e, socket, Event, data?.ID);
      }}
      style={isHorizontal ? horizontalPosition : verticalPosition}
      
      onMouseDown={(e) => {
        handleMouseDown(e, socket, Event, data?.ID);
      }}
      onMouseUp={(e) => {
        handleMouseUp(e, socket, Event, data?.ID);
      }}
      onMouseMove={(e) => {
        handleMouseMove(e, socket, Event, data?.ID);
      }}
      onDoubleClick={(e) => {
        handleMouseDoubleClick(e, socket, Event, data?.ID);
      }}
    >
      {/* <div> */}
        <div
          className={`ewc-scroll-bar`}
          style={{ ...trackStyle, }}
          onMouseDown={handleThumbDrag}
          onClick={handleTrackClick}
          ref={trackRef}
        >
          <div
            className="ewc-thumb"
            style={{ ...thumbStyle }}
            ref={thumbRef}
            onMouseDown={handleThumbDrag}
            onKeyDown={() => {
              handleKeyPressUtils(e, socket, Event, data?.ID);
            }}
          ></div>
        </div>
      {/* </div> */}
    </div>
  );
};

export default ScrollBar;
