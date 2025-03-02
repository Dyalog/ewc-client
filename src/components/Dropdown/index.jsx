import { useState, useEffect } from 'react';
import './Dropdown.css';
import { useAppData } from '../../hooks';
import { setStyle } from '../../utils';

const Dropdown = ({ title, data }) => {
  const { socket } = useAppData();
  const style = setStyle(data.Properties)

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
    console.log(selectEvent);
    socket.send(selectEvent);
  };

  return (
    <div style={{ fontSize: '12px', marginLeft: '7px', cursor: 'pointer', ...style, }} className='menu-item'>
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

export default Dropdown;
