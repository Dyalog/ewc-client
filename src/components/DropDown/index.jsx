import { useEffect } from 'react';
import { useAppData } from '../../hooks';

const DropDown = ({ title, data, style, customStyles, parentData }) => {
  const { socket } = useAppData();

  useEffect(() => {
    const handleShortcut = (event) => {
      Object.keys(data).forEach((key) => {
        const itemCaption = data[key]?.Properties?.Caption;
        const shortcutKey = itemCaption?.includes("&")
          ? itemCaption.charAt(itemCaption.indexOf("&") + 1).toLowerCase()
          : null;

        if (shortcutKey && event.altKey && event.key.toLowerCase() === shortcutKey) {
          handleSelectEvent(data[key]?.ID, data[key]?.Properties);
        }
      });
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [data]);


  const handleSelectEvent = (id, Properties) => {
    const { Event } = Properties;
    const selectEvent = JSON.stringify({
      Event: {
        EventName: 'Select',
        ID: id,
      },
    });
    const exists = Event && Event.some((item) => item[0] === 'Select');
    if (!exists) return;
    socket.send(selectEvent);
  };

  const handleDropDownEvent = () => {
    console.log('data', data, 'parentData', parentData);
    const { Event, ID } = parentData?.Properties || {};

    const exists = Event && Event.some((item) => item[0] === 'DropDown');
    if (!exists) return;

    socket.send(JSON.stringify({
      Event: {
        EventName: 'DropDown',
        ID: ID || parentData?.ID,
      },
    }));
  };

  return (
    <div style={{
        fontSize: '12px',
        marginLeft: '7px',
        cursor: 'pointer',
        zIndex: '1000',
        ...style,
        ...customStyles
      }}
      className='menu-item'
      onMouseEnter={handleDropDownEvent}>
      {title}
      <div className='dropdown'>
        {Object.keys(data).map((key) => (
          <div
            key={data[key]?.ID}
            id={data[key]?.ID}
            className='dropdown-item'
            onClick={() => handleSelectEvent(data[key]?.ID, data[key]?.Properties)}
          >
            {data[key]?.Properties?.Caption?.replace('&', '')}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DropDown;
