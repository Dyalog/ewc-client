import { useState, useEffect } from 'react';
import { useAppData } from '../../hooks';

const Dropdown = ({ title, data }) => {
  const { socket } = useAppData();

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
          .menu-item {
          margin-left: 10px;
          padding: 5px;
          cursor: pointer;
          font-size: 12px;
          position: relative;
        }

        .menu-item:hover {
          background-color: rgb(250, 250, 250); /* Slightly lighter shade */
        }

        .menu-item .dropdown {
          display: none;
          position: absolute;
          top: 100%;
          padding: 10px;
          background-color: #f9f9f9;
          border: 1px solid #ccc;
          border-radius: 5px;
          box-shadow: rgba(149, 157, 165, 0.2) 0px 8px 24px;
        }

        .dropdown-item {
          padding-left: 5px !important;
          padding-right: 5px !important;
        }

        .dropdown-item:hover {
          background-color: #e4e4e4 !important;
        }

        .menu-item:hover .dropdown {
          display: block;
        } 
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
    <div style={{ fontSize: '12px', marginLeft: '7px', cursor: 'pointer' }} className='menu-item'>
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
