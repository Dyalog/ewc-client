import { useState, useRef, useEffect } from 'react';
import { Icons } from '../../common';
import './ScrollBar.css';
import { useAppData, useAttachStyle } from '../../hooks';
import {
  handleKeyPressUtils,
  handleMouseDoubleClick,
  handleMouseDown,
  handleMouseEnter,
  handleMouseLeave,
  handleMouseMove,
  handleMouseUp,
  handleMouseWheel,
} from '../../utils';
import { thumbValueInRange } from './clamp';

const arrowButtonSize = 20;

const ScrollBar = ({ data }) => {
  const { FA } = Icons;
  const { Align, Type, Range, Event, Visible, Size, Posn, VScroll, HScroll, Thumb, TabIndex } = data?.Properties || {};
  const rangedThumb = thumbValueInRange(Thumb, Range);
  const isHorizontal = Type === 'Scroll' && (Align === 'Bottom' || HScroll === -1);
  const [scaledValue, setScaledValue] = useState(rangedThumb);
  const [tempScaledValue, setTempScaledValue] = useState(rangedThumb);
  const [showButtons, setShowButtons] = useState(false);
  const emitEvent = Event && Event[0];
  const parentSize = JSON.parse(localStorage.getItem('formDimension'));
  const { socket, handleData, setProceed, proceedEventArray, setProceedEventArray, nqEvents } = useAppData();
  // Edge-anchoring for Attach is handled by the shared hook (single source of
  // truth across all components), replacing ScrollBar's earlier bespoke logic.
  const attachStyle = useAttachStyle(data);
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  // Id of the most recent event this scrollbar emitted, used to correlate the
  // server's proceed signal. Per-instance: the two scrollbars (UPDOWN/LEFTRIGHT)
  // would otherwise clobber a single shared global value.
  const eventIdRef = useRef(null);
  const maxValue = Range;
  const keyPressEventId = eventIdRef.current;

  const trackHeight = !Size ? parentSize && parentSize[0] - arrowButtonSize : Size && Size[0];
  const trackWidth = !Size ? parentSize && parentSize[1] - arrowButtonSize : Size && Size[1];

  // The thumb travels between 0 and maxThumbPosition. Guard against tracks
  // smaller than the arrow buttons + slack (or an unsized track that resolves
  // to null/NaN): a non-positive maxThumbPosition would divide-by-zero in the
  // drag/track-click value math and push the thumb off the track.
  const rawMaxThumbPosition = (isHorizontal ? trackWidth : trackHeight) - arrowButtonSize * 2 - 40;
  const maxThumbPosition = Math.max(1, Number.isFinite(rawMaxThumbPosition) ? rawMaxThumbPosition : 1);

  const calculateThumbPosition = (value) => (value / maxValue) * maxThumbPosition;
  const [thumbPosition, setThumbPosition] = useState(calculateThumbPosition(scaledValue));

  const updateThumbPosition = (newPosition) => {
    if (thumbRef.current) {
      thumbRef.current.style[isHorizontal ? 'left' : 'top'] = `${newPosition}px`;
    }
  };

  useEffect(() => {
    const key = keyPressEventId + 'ArrowClick';
    if (proceedEventArray[key] || proceedEventArray[key] === 0) {
      const eventId = crypto.randomUUID();
      if (nqEvents.length) {
        const { Info, ID } = nqEvents.shift();
        eventIdRef.current = eventId;
        socket.send(
          JSON.stringify({
            Event: {
              EventName: 'CellMove',
              EventID: eventId,
              ID,
              Info: Info,
            },
          })
        );
      }
      setScaledValue(rangedThumb);
      const newPosition = calculateThumbPosition(rangedThumb);
      setThumbPosition(newPosition);
      updateThumbPosition(newPosition + arrowButtonSize);
      setProceed(false);
      setProceedEventArray((prev) => ({ ...prev, [key]: 0 }));
    }
  }, [proceedEventArray[keyPressEventId + 'ArrowClick']]);

  const curCell = JSON.parse(localStorage.getItem('nqCurCell'));
  useEffect(() => {
    const key = keyPressEventId + 'CellMove';
    if (proceedEventArray[key] || proceedEventArray[key] === 0) {
      if (curCell) {
        const { Info, ID } = curCell;
        handleData(
          {
            ID: ID,
            Properties: {
              CurCell: [Info[0], Info[1]],
            },
          },
          'WS'
        );
      }
    }
  }, [proceedEventArray[keyPressEventId + 'CellMove'], rangedThumb]);

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
    const initialThumbPosition = thumbPosition;
    let newThumbPosition = initialThumbPosition;

    const handleMouseMoveEvent = (moveEvent) => {
      const currentPosition = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPosition - startPosition;
      newThumbPosition = initialThumbPosition + delta;
      newThumbPosition = Math.max(0, Math.min(maxThumbPosition, newThumbPosition));

      // The rendered thumb sits at `thumbPosition + arrowButtonSize` (see
      // thumbStyle and the [Thumb]/arrow effects), so the live drag must add
      // the same offset — otherwise the thumb lags the cursor by 20px and
      // snaps into place only on release when the server pushes Thumb back.
      updateThumbPosition(newThumbPosition + arrowButtonSize);
      const newScaledValue = (newThumbPosition / maxThumbPosition) * maxValue;
      setTempScaledValue(newScaledValue);
    };

    const handleMouseUpEvent = () => {
      window.removeEventListener('mousemove', handleMouseMoveEvent);
      window.removeEventListener('mouseup', handleMouseUpEvent);

      const finalScaledValue = (newThumbPosition / maxThumbPosition) * maxValue;
      // Clamp the emitted position to the valid [1, Range].
      const roundedScaledValue = thumbValueInRange(Math.round(finalScaledValue), maxValue);
      setThumbPosition(newThumbPosition);

      const eventId = crypto.randomUUID();
      eventIdRef.current = eventId;
      const scrollEvent = JSON.stringify({
        Event: {
          EventName: 'Scroll',
          ID: data?.ID,
          EventID: eventId,
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

      const prevValue = tempScaledValue;

      const newThumbPosition = Math.max(
        0,
        Math.min(maxThumbPosition, clickPosition - 20)
      );

      // Map the click pixel position back to a value (inverse of
      // calculateThumbPosition) and clamp to the valid [1, Range].
      const newScaledValue = thumbValueInRange(
        Math.round((newThumbPosition / maxThumbPosition) * maxValue),
        maxValue
      );
      setTempScaledValue(newScaledValue);

      const eventId = crypto.randomUUID();
      eventIdRef.current = eventId;

      if (data?.Properties?.Step) {
        const scrollEvent = JSON.stringify({
          Event: {
            EventName: emitEvent && emitEvent[0],
            ID: data?.ID,
            EventID: eventId,
            Info: [
              data?.Properties?.Step[0],
              data?.Properties?.Step[1],
            ],
          },
        });

        const exists = Event && Event.some((item) => item[0] === 'Scroll');
        if (exists) {
          socket.send(scrollEvent);
        }
      } else {
        const scrollEvent = JSON.stringify({
          Event: {
            EventName: emitEvent && emitEvent[0],
            ID: data?.ID,
            EventID: eventId,
            Info: [
              Math.round(prevValue) < newScaledValue ? 2 : -2,
              newScaledValue,
            ],
          },
        });

        const exists = Event && Event.some((item) => item[0] === 'Scroll');
        if (exists) {
          socket.send(scrollEvent);
        }
      }
    }
  };

  const incrementScale = () => {
    const newScaledValue = scaledValue + 1;
    if (newScaledValue <= maxValue) {
      setTempScaledValue(newScaledValue);
      const eventId = crypto.randomUUID();
      eventIdRef.current = eventId;

      const exists = Event && Event.some((item) => item[0] === 'Scroll');
      if (!exists) return;

      socket.send(
        JSON.stringify({
          Event: {
            EventName: 'Scroll',
            EventID: eventId,
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
      setTempScaledValue(newScaledValue);

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

      const eventId = crypto.randomUUID();
      eventIdRef.current = eventId;
      const exists = Event && Event.some((item) => item[0] === 'Scroll');
      if (!exists) return;
      socket.send(
        JSON.stringify({
          Event: {
            EventName: 'Scroll',
            EventID: eventId,
            ID: data?.ID,
            Info: [-1, Math.round(newScaledValue)],
          },
        })
      );
    }
  };

  // The server pushes a new Thumb whenever the grid's current cell moves
  // (CBUpdateScroll's UPDATETHUMBS). Reposition the thumb so it tracks the
  // cell — without this the thumb stays frozen at its mount position. Sync both
  // value states so the +/- buttons (scaledValue) and drag/track-click
  // (tempScaledValue) start from the same server-confirmed position.
  useEffect(() => {
    const newPosition = calculateThumbPosition(rangedThumb);
    setThumbPosition(newPosition);
    updateThumbPosition(newPosition + arrowButtonSize);
    setScaledValue(rangedThumb);
    setTempScaledValue(rangedThumb);
  }, [Thumb]);

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
      tabIndex={TabIndex}
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
      onKeyDown={(e) => {
        handleKeyPressUtils(e, socket, Event, data?.ID);
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
            onKeyDown={(e) => handleKeyPressUtils(e, socket, Event, data?.ID)}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default ScrollBar;
