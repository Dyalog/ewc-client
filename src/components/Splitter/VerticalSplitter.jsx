import { useEffect, useState, useRef } from 'react';
import { useAppData, useResizeObserver } from '../../hooks';
import { extractStringUntilLastPeriod, parseFlexStyles, setStyle } from '../../utils';

const VerticalSplitter = ({ data }) => {
  const elementRef = useRef(null); 

  // Guard the transient null (see HorizontalSplitter): the parent's
  // localStorage entry may not be written yet on an early render. Destructuring
  // JSON.parse(null) throws and, with no error boundary, blanks the form.
  const { Size: SubformSize } = JSON.parse(
    localStorage.getItem(extractStringUntilLastPeriod(data?.ID))
  ) || {};

  const { Posn, SplitObj1, SplitObj2, Event, CSS } = data?.Properties;
  const style = setStyle(data.Properties)
  const customStyles = parseFlexStyles(CSS)
  const [position, setPosition] = useState({ left: Posn && Posn[1] });
  const [isResizing, setResizing] = useState(false);
  const { handleData, reRender, socket } = useAppData();
  const dimensions = useResizeObserver(
    document.getElementById(extractStringUntilLastPeriod(data?.ID))
  );
  const [oldFormValues, setoldFormValues] = useState(SubformSize && SubformSize);
  // Becomes true a beat after mount, so we skip the load-time form-size ramp
  // (the menu->demo transition) and only reproportion on genuine later resizes.
  const readyRef = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => { readyRef.current = true; }, 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!position) return;
    // Until ready (or before a baseline exists), just track the current form
    // size as the baseline and bail — do NOT reproportion. This skips the
    // menu->demo load ramp that would otherwise mis-size the panes, while
    // keeping oldFormValues seeded (the Form writes its localStorage entry in
    // its own, later-running effect, so we can't rely on that at mount).
    if (!readyRef.current || !oldFormValues) {
      if (dimensions?.width) setoldFormValues([dimensions.height, dimensions.width]);
      return;
    }
    // No-op if the form size hasn't actually changed — guards against a
    // reRender()-triggered re-run loop.
    if (oldFormValues[0] === dimensions.height && oldFormValues[1] === dimensions.width) return;

    let calculateLeft =
      position && position.left && oldFormValues && oldFormValues[1]
        ? (position.left / oldFormValues[1]) * dimensions.width
        : 0;
    calculateLeft = Math.max(0, Math.min(calculateLeft, dimensions.width - 3));

    // console.log({ calculateLeft });

    setPosition({ left: calculateLeft });
    const rightWidth = dimensions.width - (calculateLeft + 3);
    handleData(
      {
        ID: SplitObj1,
        Properties: {
          Posn: [0, 0],
          Size: [dimensions.height, Math.round(calculateLeft)],
          BCol: [255, 255, 255],
        },
      },
      'WS'
    );

    handleData(
      {
        ID: SplitObj2,
        Properties: {
          Posn: [0, Math.round(calculateLeft + 3)],
          Size: [dimensions?.height, Math.round(rightWidth)],
          BCol: [255, 255, 255],
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
          Info: [0, Math.round(calculateLeft)],
          Size: [formHeight, 3],
        },
      })
    );

    setoldFormValues([dimensions?.height, dimensions?.width]);
    reRender();
  }, [dimensions]);

  const [left, setLeft] = useState(position?.left);


  useEffect(() => {
    if (position?.left !== undefined) {
      setLeft(position.left); 
      elementRef.current.style.left = `${position.left}px`;
    }
  }, [position?.left]);


  let formWidth = dimensions.width;
  let formHeight = dimensions.height;
  const emitEvent = Event && Event[0];
  let verticalStyles = {
    width: '3px',
    height: '100%',
    backgroundColor: '#F0F0F0',
    cursor: 'col-resize',
    position: 'absolute',
    // Sit above the panes so the divider is always grabbable, even when a pane
    // is authored to start at the same x as the splitter (and would cover it).
    zIndex: 10,
    top: Posn && Posn[0],
    left: left,
    ...style,
    ...customStyles
  };


  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing) {
        const formPositions = JSON.parse(localStorage.getItem('formPositions'));

        let newLeft = e.clientX - formPositions[1];
        newLeft = Math.max(0, Math.min(newLeft, formWidth - 3));
        const rightWidth = formWidth - (newLeft + 3);

        localStorage.setItem(
          SplitObj1,
          JSON.stringify({ Posn: [0, 0], Size: [formHeight, newLeft] })
        );

        localStorage.setItem(
          SplitObj2,
          JSON.stringify({ Posn: [0, newLeft + 3], Size: [formHeight, rightWidth] })
        );

        handleData(
          {
            ID: SplitObj1,
            Properties: {
              Posn: [0, 0],
              Size: [formHeight, newLeft],
              BCol: [255, 255, 255],
            },
          },
          'WS'
        );

        handleData(
          {
            ID: SplitObj2,
            Properties: {
              Posn: [0, newLeft + 3],
              Size: [formHeight, rightWidth],
              BCol: [255, 255, 255],
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
              Info: [0, newLeft],
              Size: [formHeight, 3],
            },
          })
        );
        setPosition({ left: newLeft });
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

  return (
    <div
    ref={elementRef}
    className="border border 2px solid black"
      id={data?.ID}
      onClick={(e) => e.preventDefault()}
      onMouseDown={handleMouseDown}
      style={verticalStyles}
    ></div>
  );
};

export default VerticalSplitter;
