import { extractStringUntilSecondPeriod, handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, setStyle } from '../utils';
import { useEffect, useRef, useState } from 'react';
import { useAppData, useResizeObserver } from '../hooks';

const List = ({ data }) => {
  const {socket} = useAppData()
  const styles = setStyle(data?.Properties);
  const { Items, SelItems, Visible, Size, Event } = data?.Properties;
  const ref = useRef();
  const [selectedItem, _] = useState(1);
  const [items, setItems] = useState(SelItems);
  const dimensions = useResizeObserver(
    document.getElementById(extractStringUntilSecondPeriod(data?.ID))
  );
  const [width, setWidth] = useState(Size[1]);
  useEffect(() => {
    setWidth(dimensions?.width - 50);
  }, [dimensions]);

  const selectedStyles = {
    background: '#1264FF',
    color: 'white',
    cursor: 'pointer',
  };

  const handleClick = (index) => {
    const length = SelItems.length;
    let updatedArray = Array(length).fill(0);

    updatedArray[index] = 1;

    localStorage.setItem(
      data?.ID,
      JSON.stringify({
        Event: {
          ID: data?.ID,
          SelItems: updatedArray,
        },
      })
    );

    setItems(updatedArray);
  };

  return (
    <div
      ref={ref}
      style={{
        ...styles,
        width,
        border: '1px solid black',
        display: Visible == 0 ? 'none' : 'block',
      }}
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
    >
      {Items &&
        Items.map((item, index) =>
          selectedItem == items[index] ? (
            <div
              style={{
                ...selectedStyles,
                fontSize: '12px',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                padding: '1px',
              }}
            >
              {item}
            </div>
          ) : (
            <div
              onClick={() => handleClick(index)}
              style={{
                cursor: 'pointer',
                fontSize: '12px',
                height: '14px',
                padding: '1px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {item}
            </div>
          )
        )}
    </div>
  );
};

export default List;
