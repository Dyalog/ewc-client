import { useEffect } from 'react';
import { excludeKeys, isEmpty } from '../../utils';
import Dropdown from '../Dropdown';
// import './Menu.css';

const Menu = ({ data }) => {
  const updatedData = excludeKeys(data);

  const empty = isEmpty(updatedData);

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

        .menu-item {
          display: none;
          position: absolute;
          top: 100%;
          padding: 10px;
          background-color: #f9f9f9;
          border: 1px solid #ccc;
          border-radius: 5px;
          box-shadow: rgba(149, 157, 165, 0.2) 0px 8px 24px;
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


  // Render the Caption if the Object didn't have any Keys

  if (empty) {
    return (
      <div
        style={{
          fontSize: '12px',
          marginLeft: '7px',
          cursor: 'pointer',
          display: 'inline-block',
        }}
        className='menu-item'
      >
        {/* {data?.Properties?.Caption?.includes('&')
          ? data?.Properties?.Caption?.substring(1)
          : data?.Properties?.Caption} */}
        {data?.Properties?.Caption?.replace('&', '')}
      </div>
    );
  }

  // Render the DropDown if the Object have Menu Items
  return (
    <Dropdown
      data={updatedData}
      title={
        // data?.Properties?.Caption?.includes('&')
        //   ? data?.Properties?.Caption?.substring(1)
        //   : data?.Properties?.Caption
        data?.Properties?.Caption?.replace('&', '')
      }
    />
  );
};

export default Menu;
