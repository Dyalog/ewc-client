import { useState, useEffect, useRef } from 'react';
import { useAppData, useResizeObserver } from '../../hooks';
import { extractStringUntilLastPeriod, parseFlexStyles, setStyle } from '../../utils';

const HorizontalSplitter = ({ data }) => {
  const elementRef = useRef(null);

  // Guard the transient null: the parent's localStorage entry may not be
  // written yet on an early render (it lands in the parent SubForm's effect).
  // JSON.parse(null) is null, and destructuring null throws — with no error
  // boundary that blanks the whole form. Fall back to {} and read on re-render.
  const { Size: SubformSize } = JSON.parse(
    localStorage.getItem(extractStringUntilLastPeriod(data?.ID))
  ) || {};


  const { Posn, SplitObj1, SplitObj2, Event, Size, CSS } = data?.Properties;
  const style = setStyle(data.Properties)

  const customStyles = parseFlexStyles(CSS)

  const [position, setPosition] = useState({ top: Posn && Posn[0] });
  const [isResizing, setResizing] = useState(false);
  const { handleData, reRender, socket } = useAppData();
  const dimensions = useResizeObserver(
    document.getElementById(extractStringUntilLastPeriod(data?.ID))
  );

  const [oldFormValues, setoldFormValues] = useState(SubformSize && SubformSize);
  const [oldHeight, setOldHeight] = useState(Size && Size[0]);
  // See VerticalSplitter: skip the load-time ramp, reflow only on genuine resizes.
  const readyRef = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => { readyRef.current = true; }, 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!position) return;
    // Until ready (or before a baseline exists), just track the current form
    // size as the baseline and bail — do NOT reproportion (skips the menu->demo
    // load ramp that would mis-size the panes).
    if (!readyRef.current || !oldFormValues) {
      if (dimensions?.height) setoldFormValues([dimensions.height, dimensions.width]);
      return;
    }
    // No-op if the form size hasn't actually changed — guards against a
    // reRender()-triggered re-run loop.
    if (oldFormValues[0] === dimensions.height && oldFormValues[1] === dimensions.width) return;

    if (oldHeight == dimensions.height) {
      const obj1 = JSON.parse(localStorage.getItem(SplitObj1));
      const obj2 = JSON.parse(localStorage.getItem(SplitObj2));
      if (!obj1 && !obj2) return;
      const { Size: Size1, Posn: Posn1 } = obj1;
      const { Size: Size2, Posn: Posn2 } = obj2;
      localStorage.setItem(
        SplitObj1,
        JSON.stringify({
          Size: [Math.round(Size1 && Size1[0]), dimensions.width],
          Posn: Posn1,
        })
      );
      localStorage.setItem(
        SplitObj2,
        JSON.stringify({
          Size: [Math.round(Size2 && Size2[0]), dimensions.width],
          Posn: Posn2,
        })
      );
      handleData(
        {
          ID: SplitObj1,
          Properties: {
            Posn: Posn1,
            Size: [Math.round(Size1 && Size1[0]), dimensions.width],
          },
        },
        'WS'
      );
      handleData(
        {
          ID: SplitObj2,
          Properties: {
            Posn: Posn2,
            Size: [Math.round(Size2 && Size2[0]), dimensions.width],
          },
        },
        'WS'
      );
    } else {
      let calculateTop =
        position && position.top && oldFormValues && oldFormValues[0]
          ? (position.top / oldFormValues[0]) * dimensions.height
          : 0;
      calculateTop = Math.max(0, Math.min(calculateTop, dimensions.height - 3));

      setPosition({ top: Math.round(calculateTop) });

      handleData(
        {
          ID: SplitObj1,
          Properties: {
            Posn: [0, 0],
            Size: [Math.round(calculateTop), dimensions.width],
          },
        },
        'WS'
      );

      handleData(
        {
          ID: SplitObj2,
          Properties: {
            Posn: [Math.round(calculateTop + 3), 0],
            Size: [Math.round(dimensions?.height - (calculateTop + 3)), dimensions.width],
          },
        },
        'WS'
      );
    }

    setOldHeight(dimensions.height);
    setoldFormValues([dimensions?.height, dimensions?.width]);

    reRender();
  }, [dimensions]);

  let formHeight = dimensions.height;
  const emitEvent = Event && Event[0];

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing) {
        const formPositions = JSON.parse(localStorage.getItem('formPositions'));
        let newTop = e.clientY - formPositions[1];

        const parentSize = JSON.parse(
          localStorage.getItem(extractStringUntilLastPeriod(data?.ID))
        );
        const { Size } = parentSize;

        newTop = Math.max(0, Math.min(newTop, formHeight));
        handleData(
          {
            ID: SplitObj1,
            Properties: {
              Posn: [0, 0],
              Size: [newTop, Size[1]],
            },
          },
          'WS'
        );

        handleData(
          {
            ID: SplitObj2,
            Properties: {
              Posn: [newTop + 3, 0],
              Size: [formHeight - (newTop + 3), Size[1]],
            },
          },
          'WS'
        );

        localStorage.setItem(
          data?.ID,
          JSON.stringify({
            Event: {
              EventName: emitEvent && emitEvent[0],
              ID: data.ID,
              Info: [newTop, 0],
              Size: [3, formHeight],
            },
          })
        );
        setPosition({ top: newTop });
        reRender();
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setResizing(false);
        const { Event: customEvent } = JSON.parse(localStorage.getItem(data?.ID));
        const { Size, ...event } = customEvent;
        const exists = Event && Event?.some((item) => item[0] === 'EndSplit');
        if (!exists) return;
//         console.log(JSON.stringify({ Event: { ...event } }));
        socket.send(JSON.stringify({ Event: { ...event } }));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setResizing(true);
  };

  useEffect(() => {
    elementRef.current.style.top = `${position.top}px`;
  }, [position?.top]);


  let horizontalStyles = {
    width: '100%',
    height: '3px',
    backgroundColor: '#F0F0F0',
    cursor: 'row-resize',
    position: 'absolute',
    // Sit above the panes so the divider is always grabbable (see VerticalSplitter).
    zIndex: 10,
    top: position?.top,
    left: 0,
    ...style,
    ...customStyles
  };

  return <div ref={elementRef} id={data?.ID} style={horizontalStyles} onMouseDown={(e) => handleMouseDown(e)}></div>;
};

export default HorizontalSplitter;
