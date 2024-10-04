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

  const parentSize = JSON.parse(localStorage.getItem('formDimension'));
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
      const stylesArray = Css.split(",")
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
    handleMouseEnter(e, socket, Event, data)
  };
  
  const handleTrackMouseLeave = (e) => {
    setShowButtons(false);
    handleMouseLeave(e, socket, Event, data)
  };

  // Updated handleThumbDrag function to only emit the event after the drag is complete
  const handleThumbDrag = (event) => {
    event.preventDefault();

    const startPosition = isHorizontal ? event.clientX : event.clientY;
    let newThumbPosition = thumbPosition;

    const handleMouseMove = (moveEvent) => {
      const currentPosition = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPosition - startPosition;
      newThumbPosition = thumbPosition + delta;

      const maxThumbPosition = isHorizontal ? trackWidth - 50 : trackHeight - 100;
      newThumbPosition = Math.max(0, Math.min(maxThumbPosition, newThumbPosition));
      
      const newScaledValue = (newThumbPosition / maxThumbPosition) * maxValue;

      // Update the UI with the thumb's new position without emitting the event yet
      setScaledValue(newScaledValue);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      // Final thumb position and scaled value when the drag is complete
      const finalThumbPosition = Math.max(0, Math.min(maxThumbPosition, newThumbPosition));
      const finalScaledValue = (finalThumbPosition / maxThumbPosition) * maxValue;
      const roundedScaledValue = Math.round(finalScaledValue) === 0 ? 1 : Math.round(finalScaledValue);

      // Update the thumb value in the data
      handleData({ ID: data?.ID, Properties: { Thumb: roundedScaledValue } }, 'WS');

      // Emit a single event after the drag is complete
      const scrollEvent = JSON.stringify({
        Event: {
          EventName: 'Scroll',
          ID: data?.ID,
          Info: [0, roundedScaledValue],
        },
      });

      console.log('Final Scroll Event:', scrollEvent);
      localStorage.setItem(data.ID, scrollEvent);

      const exists = Event && Event.some((item) => item[0] === 'Scroll');
      if (exists) {
        socket.send(scrollEvent); // Only send the event after the drag is complete
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTrackClick = (event) => {
    if (thumbRef.current) {
      const trackRect = trackRef.current.getBoundingClientRect();
      const clickPosition = isHorizontal ? event.clientX - trackRect.left : event.clientY - trackRect.top;

      const newScaledValue = isHorizontal
        ? (clickPosition / trackWidth) * maxValue
        : (clickPosition / (trackHeight - 50)) * maxValue;

      if (newScaledValue >= 1 && newScaledValue <= maxValue) {
        setScaledValue(newScaledValue);

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

        console.log('Event', scrollEvent);
        localStorage.setItem(data.ID, scrollEvent);

        handleData({ID: data?.ID, Properties: {Thumb: Math.round(newScaledValue) === 0 ? 1: Math.round(newScaledValue) }}, 'WS')

        const exists = Event && Event.some((item) => item[0] === 'Scroll');
        if (exists) {
          socket.send(scrollEvent);
        }
      }
    }
  };

  let thumbPosition = (scaledValue / maxValue) * (trackHeight - 40);

  if (isHorizontal) {
    thumbPosition = (scaledValue / maxValue) * (trackWidth - 40);
  }

  const maxThumbPosition = isHorizontal ? trackWidth - 50 : trackHeight - 100;

  const defaultPosn = Posn || [0, 0];
  const defaultSize = Size || [parentSize[0], parentSize[1]];

  const calculateAttachStyle = () => {
    let attachStyle = {};
  
    if (Attach) {
      const [topAttach, leftAttach, bottomAttach, rightAttach] = Attach;
  
      if (topAttach === 'Top' || topAttach === 'Bottom') {
        attachStyle.top = `${defaultPosn[0]}px`;
      } 

      if (leftAttach === 'Left' || leftAttach === 'Right' ) {
        attachStyle.left = `${defaultPosn[1]}px`;
      } 
      
      if (bottomAttach === 'Bottom' || bottomAttach === 'Top') {
        attachStyle.bottom = `${defaultPosn[0]}px`;
      } 
  
      if (rightAttach === 'Right' ||  rightAttach === 'Left') {
        attachStyle.right = `${defaultPosn[1]}px`;
      } 
    }
  
    return attachStyle;
  };

  const attachStyle = calculateAttachStyle();

  const trackStyle = {
    width: isHorizontal ? `${trackWidth}px` : defaultSize[1] +'px',
    height: isHorizontal ? defaultSize[0] + 'px' : `${trackHeight}px`,
  };

  const thumbStyle = {
    width: isHorizontal ? '40px' : defaultSize[1]-6 +'px',
    height: isHorizontal ? defaultSize[0]-6 + 'px' : '40px',
    backgroundColor: '#9E9E9E',
    position: 'absolute',
    left: isHorizontal ? `${thumbPosition}px` : 2,
    top: isHorizontal ? 2 : `${thumbPosition}px`,
    cursor: 'pointer',
    borderRadius: '5px',
  };

  const verticalPosition = {
    position: 'absolute',
    top: VScroll === -1 && defaultPosn[0] !== undefined ? defaultPosn[0]  : 0,
    ...(VScroll === -1 ? {left: VScroll === -1 && defaultPosn[1] !== undefined ? defaultPosn[1]  : 0 }: {right: 0}),
    display: Visible == 0 ? 'none' : 'block',
    ...attachStyle,

  };

  const horizontalPosition = {
    position: 'absolute',
    ...(HScroll === -1 ? {top: HScroll === -1 && defaultPosn[0] !== undefined ? defaultPosn[0]  : 0}: {bottom: 0} ),
    left: HScroll === -1 && defaultPosn[1] !== undefined ? defaultPosn[1]  : 0,
    width: defaultSize[1] + 'px',
    height: defaultSize[0],
    display: Visible == 0 ? 'none' : 'block',
    ...attachStyle,

  };

  useEffect(() => {
    setScaledValue((prevValue) => Math.min( Thumb, maxValue ));
  }, [Thumb]);



  return (
    <div
      id={data?.ID}
      onMouseEnter={handleTrackMouseEnter}
      onMouseLeave={handleTrackMouseLeave}
      style={isHorizontal ? horizontalPosition : verticalPosition}
      
      onMouseDown={(e) => {
        handleMouseDown(e, socket, Event,data);
      }}
      onMouseUp={(e) => {
        handleMouseUp(e, socket, Event, data);
      }}
      
      onMouseMove={(e) => {
        handleMouseMove(e, socket, Event, data);
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
          <div className={`ewc-thumb`} style={{ ...thumbStyle }} ref={thumbRef}></div>
        </div>
      {/* </div> */}
    </div>
  );
};

export default ScrollBar;
