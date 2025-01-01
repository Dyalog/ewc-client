import React, { useRef, useEffect, useState } from 'react';

const GridCell = ({ data, keyPress }) => {
  const cellRef = useRef(null);
  const [isEditable, setisEditable] = useState(false);

  useEffect(() => {
    if (data.focused) {
      cellRef?.current?.focus();
    }
  }, [data.focused]);

  return (
    <>
      {!isEditable ? (
        <div
          style={{
            backgroundColor: data?.backgroundColor,
            outline: 0,
            // ...fontStyles,
            textAlign: data?.typeObj?.Properties?.Justify,
            paddingRight: '5px',
            paddingLeft: '5px',

          }}
          onDoubleClick={(e) => setisEditable(true)}
        >
          {!data?.formattedValue ? data.value : data?.formattedValue}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: data?.align,
          paddingLeft: '5px',
          paddingRight: '5px',
        }}>
          <div
            style={{
              outline: 0,
              height: '100%',
              width: data.width * 0.90,
              textAlign: data?.align,
              backgroundColor: data?.backgroundColor,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            onBlur={() => setisEditable(false)}
            ref={cellRef}
            id={`${data?.row}-${data?.column}`}
            tabIndex='0'
          >
            {data?.value}
          </div>
        </div>
      )}
    </>
  );
};

export default GridCell;
