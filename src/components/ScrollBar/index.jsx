import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../../common';
import './ScrollBar.css';
import { useAppData } from '../../hooks';
import {
  handleKeyPressUtils,
  handleMouseDoubleClick,
  handleMouseDown,
  handleMouseEnter,
  handleMouseLeave,
  handleMouseMove,
  handleMouseUp,
  handleMouseWheel,
  parseFlexStyles
} from '../../utils';

const arrowButtonSize = 20;

const ScrollBar = ({ data }) => {
  const { FA } = Icons;
  const { Align, Type, Thumb, Range, Event, Visible, Size, Posn, VScroll, HScroll, Attach, CSS } = data?.Properties;
  const isHorizontal = Type === 'Scroll' && (Align === 'Bottom' || HScroll === -1);
  const [scaledValue, setScaledValue] = useState(Thumb || 1);
  const customStyles = parseFlexStyles(CSS);
  const [showButtons, setShowButtons] = useState(false);
  const emitEvent = Event && Event[0];
  const parentSize = JSON.parse(localStorage.getItem('formDimension'));
  const { socket, handleData } = useAppData();
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const maxValue = Range;

  const trackHeight = !Size ? parentSize && parentSize[0] : Size && Size[0];
  const trackWidth = !Size ? parentSize && parentSize[1] : Size && Size[1];

  const maxThumbPosition = isHorizontal
    ? trackWidth - arrowButtonSize * 2 - 40
    : trackHeight - arrowButtonSize * 2 - 40;

  const calculateThumbPosition = (value) => (value / maxValue) * maxThumbPosition;
  const [thumbPosition, setThumbPosition] = useState(calculateThumbPosition(scaledValue));

  const handleTrackMouseEnter = (e) => {
    setShowButtons(true);
    handleMouseEnter(e, socket, Event, data?.ID);
  };

  const handleTrackMouseLeave = (e) => {
    setShowButtons(false);
    handleMouseLeave(e, socket, Event, data?.ID);
  };

  const updateThumbPosition = (newPosition) => {
    if (thumbRef.current) {
      thumbRef.current.style[isHorizontal ? 'left' : 'top'] = `${newPosition}px`;
    }
  };

  const handleThumbDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const startPosition = isHorizontal ? event.clientX : event.clientY;
    const thumbStyleProp = isHorizontal ? 'left' : 'top';
    const initialThumbPosition = thumbPosition;
    let newThumbPosition = initialThumbPosition;

    const handleMouseMoveEvent = (moveEvent) => {
      const currentPosition = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPosition - startPosition;
      newThumbPosition = initialThumbPosition + delta;
      newThumbPosition = Math.max(0, Math.min(maxThumbPosition, newThumbPosition));

      updateThumbPosition(newThumbPosition);
      const newScaledValue = (newThumbPosition / maxThumbPosition) * maxValue;
      setScaledValue(newScaledValue);
    };

    const handleMouseUpEvent = () => {
      window.removeEventListener('mousemove', handleMouseMoveEvent);
      window.removeEventListener('mouseup', handleMouseUpEvent);

      const finalScaledValue = (newThumbPosition / maxThumbPosition) * maxValue;
      const roundedScaledValue = Math.round(finalScaledValue) || 1;
      setThumbPosition(newThumbPosition);

      handleData(
        { ID: data?.ID, Properties: { Thumb: roundedScaledValue } },
        'WS'
      );

      const scrollEvent = JSON.stringify({
        Event: {
          EventName: 'Scroll',
          ID: data?.ID,
          Info: [0, roundedScaledValue],
        },
      });

      localStorage.setItem(data.ID, scrollEvent);
      const exists = Event && Event.some((item) => item[0] === 'Scroll');
      if (exists) {
        socket.send(scrollEvent);
      }
    };

    window.addEventListener('mousemove', handleMouseMoveEvent);
    window.addEventListener('mouseup', handleMouseUpEvent);
  };

  const defaultPosn = Posn || [0, 0];
  const defaultSize = Size || [20, 20];

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
        Math.min(maxThumbPosition, clickPosition - 20)
      );

      const newScaledValue = (newThumbPosition / maxThumbPosition) * maxValue;

      if (newScaledValue >= 1 && newScaledValue <= maxValue) {
        setScaledValue(newScaledValue);
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

  const incrementScale = () => {
    const newScaledValue = scaledValue + 1;
    if (newScaledValue <= maxValue) {
      setScaledValue(newScaledValue);
      console.log(
        'Event',
        JSON.stringify({
          Event: {
            EventName: emitEvent && emitEvent[0],
            ID: data?.ID,
            Info: [1, Math.round(newScaledValue)],
          },
        })
      );

      // console.log("horizontal increment")
      handleData({ ID: data?.ID, Properties: { Thumb: Math.round(newScaledValue) } }, 'WS')

      localStorage.setItem(
        data.ID,
        JSON.stringify({
          Event: {
            EventName: emitEvent && emitEvent[0],
            ID: data?.ID,
            Info: [1, Math.round(newScaledValue)],
          },
        })
      );


      if (isHorizontal) {
        localStorage.setItem(
          'horizontalScroll',
          JSON.stringify({
            oldValue: Math.round(scaledValue),
            newValue: Math.round(newScaledValue),
          })
        );
      } else {
        localStorage.setItem(
          'verticalScroll',
          JSON.stringify({
            oldValue: Math.round(scaledValue),
            newValue: Math.round(newScaledValue),
          })
        );
      }

      const exists = Event && Event.some((item) => item[0] === 'Scroll');
      if (!exists) return;

      socket.send(
        JSON.stringify({
          Event: {
            EventName: 'Scroll',
            ID: data?.ID,
            Info: [1, Math.round(newScaledValue)],
          },
        })
      );
    }
  };

  const decrementScale = () => {
    const newScaledValue = scaledValue - 1;
    if (newScaledValue >= 1) {
      setScaledValue(newScaledValue);
      console.log(
        JSON.stringify({
          Event: {
            EventName: emitEvent && emitEvent[0],
            ID: data?.ID,
            Info: [-1, Math.round(newScaledValue)],
          },
        })
      );

      localStorage.setItem(
        data.ID,
        JSON.stringify({
          Event: {
            EventName: emitEvent && emitEvent[0],
            ID: data?.ID,
            Info: [-1, Math.round(newScaledValue)],
          },
        })
      );

      if (isHorizontal) {
        localStorage.setItem(
          'horizontalScroll',
          JSON.stringify({
            oldValue: Math.round(scaledValue),
            newValue: Math.round(newScaledValue),
          })
        );
      } else {
        localStorage.setItem(
          'verticalScroll',
          JSON.stringify({
            oldValue: Math.round(scaledValue),
            newValue: Math.round(newScaledValue),
          })
        );
      }
      const exists = Event && Event.some((item) => item[0] === 'Scroll');
      if (!exists) return;

      socket.send(
        JSON.stringify({
          Event: {
            EventName: 'Scroll',
            ID: data?.ID,
            Info: [-1, Math.round(newScaledValue)],
          },
        })
      );
    }
  };

  useEffect(() => {
    if (isHorizontal) {
      localStorage.setItem(
        'horizontalScroll',
        JSON.stringify({ oldValue: Thumb || 1, newValue: Thumb || 1 })
      );
    } else {
      localStorage.setItem(
        'verticalScroll',
        JSON.stringify({ oldValue: Thumb || 1, newValue: Thumb || 1 })
      );
    }
  }, []);

  useEffect(() => {
    setScaledValue((prevValue) => Math.min(Thumb, maxValue));
  }, [Thumb]);

  const calculateAttachStyle = () => {
    let attachStyle = {};

    if (Attach) {
      const [topAttach, leftAttach, bottomAttach, rightAttach] = Attach;

      if (topAttach === 'Top' || topAttach === 'Bottom') {
        attachStyle.top = `${defaultPosn[0]}px`;
      }

      if (leftAttach === 'Left' || leftAttach === 'Right') {
        attachStyle.left = `${defaultPosn[1]}px`;
      }

      if (bottomAttach === 'Bottom' || bottomAttach === 'Top') {
        attachStyle.bottom = `${defaultPosn[0]}px`;
      }

      if (rightAttach === 'Right' || rightAttach === 'Left') {
        attachStyle.right = `${defaultPosn[1]}px`;
      }
    }

    return attachStyle;
  };


  const attachStyle = calculateAttachStyle();

  const trackStyle = {
    width: isHorizontal ? `${trackWidth}px` : `${defaultSize[1]}px`,
    height: isHorizontal ? `${defaultSize[0]}px` : `${trackHeight}px`,
    paddingLeft: isHorizontal ? `${arrowButtonSize}px` : 0,
    paddingRight: isHorizontal ? `${arrowButtonSize}px` : 0,
    paddingTop: !isHorizontal ? `${arrowButtonSize}px` : 0,
    paddingBottom: !isHorizontal ? `${arrowButtonSize}px` : 0,
  };

  const thumbStyle = {
    width: isHorizontal ? '40px' : `${defaultSize[1] - 6}px`,
    height: isHorizontal ? `${defaultSize[0] - 6}px` : '40px',
    backgroundColor: '#9E9E9E',
    position: 'absolute',
    left: isHorizontal ? `${thumbPosition + arrowButtonSize}px` : '2px',
    top: isHorizontal ? '2px' : `${thumbPosition + arrowButtonSize}px`,
    cursor: 'pointer',
    borderRadius: '5px',
  };

  const verticalPosition = {
    position: 'absolute',
    top: VScroll === -1 && defaultPosn[0] !== undefined ? defaultPosn[0] : 0,
    ...(VScroll === -1 ? { left: VScroll === -1 && defaultPosn[1] !== undefined ? defaultPosn[1] : 0 } : { right: 0 }),
    display: Visible == 0 ? 'none' : 'block',
    ...attachStyle
  };

  const horizontalPosition = {
    position: 'absolute',
    ...(HScroll === -1 ? { top: HScroll === -1 && defaultPosn[0] !== undefined ? defaultPosn[0] : 0 } : { bottom: 0 }),
    left: HScroll === -1 && defaultPosn[1] !== undefined ? defaultPosn[1] : 0,
    width: defaultSize[1] + 'px',
    height: defaultSize[0],
    display: Visible == 0 ? 'none' : 'block',
    ...attachStyle
  };

  return (
    <div
      id={data?.ID}
      onMouseEnter={handleTrackMouseEnter}
      onMouseLeave={handleTrackMouseLeave}
      onWheel={(e) => handleMouseWheel(e, socket, Event, data?.ID)}
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
      style={isHorizontal ? horizontalPosition : verticalPosition}
    >
      <div>
        {isHorizontal && showButtons ? (
          <>
            <div
              className="scroll-bar-icon scroll-bar-icon-horizontal icon-style"
              style={{ left: '0', height: `${trackHeight}px` }}
              onClick={decrementScale}
            >
              <FA.FaCaretDown style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            </div>
            <div
              className="scroll-bar-icon scroll-bar-icon-horizontal icon-style"
              style={{ right: '0', height: `${trackHeight}px` }}
              onClick={incrementScale}
            >
              <FA.FaCaretUp style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            </div>
          </>
        ) : showButtons ? (
          <>
            <div
              className="scroll-bar-icon icon-style"
              style={{ top: '0', width: `${defaultSize[1]}px` }}
              onClick={decrementScale}
            >
              <FA.FaCaretUp style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            </div>
            <div
              className="scroll-bar-icon icon-style"
              style={{ bottom: '0', width: `${defaultSize[1]}px` }}
              onClick={incrementScale}
            >
              <FA.FaCaretDown style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            </div>
          </>
        ) : null}
        <div
          className={`scroll-bar ${isHorizontal ? "horizontal" : "vertical"}`}
          style={trackStyle}
          onMouseDown={handleTrackClick}
          ref={trackRef}
        >
          <div
            className="thumb"
            style={thumbStyle}
            ref={thumbRef}
            onMouseDown={handleThumbDrag}
            onKeyDown={() => handleKeyPressUtils(e, socket, Event, data?.ID)}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default ScrollBar;
