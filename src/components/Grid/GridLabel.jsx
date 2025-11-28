import { useRef, useEffect, useState } from 'react';
import { handleMouseDoubleClick, handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel } from '../../utils';
import { useAppData } from '../../hooks';

const GridLabel = ({ data }) => {
  const labelRef = useRef();
  const {socket} = useAppData()
  const [isEditable, setisEditable] = useState(false);

  useEffect(() => {
    if (data.focused) {
      labelRef?.current?.focus();
    }
  }, [data.focused]);

  useEffect(()=>{
  }, [isEditable])

  const {  Event } = data?.typeObj?.Properties;

  const fontProperties = data?.cellFont && data?.cellFont?.Properties;

  const handleBlur = () => {
    setisEditable(false);
  };

  const handleDoubleClick = () => {
    setisEditable(true);
  };

  let fontStyles = {
    fontFamily: fontProperties?.PName,
    fontSize: !fontProperties?.Size ? '12px' : '12px',
    // fontSize: !fontProperties?.Size ? '11px' : '12px',
    textDecoration: !fontProperties?.Underline
      ? 'none'
      : fontProperties?.Underline == 1
      ? 'underline'
      : 'none',
    fontStyle: !fontProperties?.Italic ? 'none' : fontProperties?.Italic == 1 ? 'italic' : 'none',
    fontWeight: !fontProperties?.Weight ? 0 : fontProperties?.Weight,
  };

  const handleKeyPress = (e) => {
    const isAltPressed = e?.altKey ? 4 : 0;
    const isCtrlPressed = e?.ctrlKey ? 2 : 0;
    const isShiftPressed = e?.shiftKey ? 1 : 0;
    const charCode = e?.key?.charCodeAt(0);
    let shiftState = isAltPressed + isCtrlPressed + isShiftPressed;


    const exists = data?.typeObj?.Properties?.Event?.some((item) => item[0] === 'KeyPress');
    if (!exists) return;

//     console.log(
//       JSON.stringify({
//         Event: {
//           EventName: 'KeyPress',
//           ID: data?.ID,
//           Info: [e.key, charCode, e.keyCode, shiftState],
//         },
//       })
//     );

    socket.send(
      JSON.stringify({
        Event: {
          EventName: 'KeyPress',
          ID: data?.ID,
          Info: [e.key, charCode, e.keyCode, shiftState],
        },
      })
    );
  };

  return (
    <>
      {!isEditable ? (
        <div
          ref={labelRef}
          style={{
            backgroundColor: data?.backgroundColor,
            outline: 0,
            ...fontStyles,
            textAlign: data?.typeObj?.Properties?.Justify,
            paddingRight: '5px',
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            handleKeyPress(e);
          }}
          onDoubleClick={handleDoubleClick}
          onBlur={handleBlur}
          id={data.gridId}
          // onMouseDown={(e) => {
          //   handleMouseDown(e, socket, Event,data?.gridId);
          // }}
          // onMouseUp={(e) => {
          //   handleMouseUp(e, socket, Event, data?.gridId);
          // }}
          // onMouseEnter={(e) => {
          //   handleMouseEnter(e, socket, Event, data?.gridId);
          // }}
          // onMouseMove={(e) => {
          //   handleMouseMove(e, socket, Event, data?.gridId);
          // }}
          // onMouseLeave={(e) => {
          //   handleMouseLeave(e, socket, Event, data?.gridId);
          // }}
          // onWheel={(e) => {
          //   handleMouseWheel(e, socket, Event, data?.gridId);
          // }}
        >
          {data?.formattedValue}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: data?.backgroundColor,
            outline: 0,
            ...fontStyles,
            textAlign: data?.typeObj?.Properties?.Justify,
            paddingRight: '5px',
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            handleKeyPress(e);
          }}
          onBlur={handleBlur}
          ref={labelRef}
          onMouseDown={(e) => {
            handleMouseDown(e, socket, Event,data?.typeObj?.ID);
          }}
          onMouseUp={(e) => {
            handleMouseUp(e, socket, Event, data?.typeObj?.ID);
          }}
          onMouseEnter={(e) => {
            handleMouseEnter(e, socket, Event, data?.typeObj?.ID);
          }}
          onMouseMove={(e) => {
            handleMouseMove(e, socket, Event, data?.typeObj?.ID);
          }}
          onMouseLeave={(e) => {
            handleMouseLeave(e, socket, Event, data?.typeObj?.ID);
          }}
          onWheel={(e) => {
            handleMouseWheel(e, socket, Event, data?.typeObj?.ID);
          }}
          onDoubleClick={(e)=>{
            handleMouseDoubleClick(e, socket, Event,data?.typeObj?.ID);
          }}
        >
          {data?.focused?  data?.value: data?.formattedValue}
        </div>
      )}
    </>
  );
};

export default GridLabel;
