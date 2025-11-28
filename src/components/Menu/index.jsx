import { excludeKeys, isEmpty, setStyle,getFontStyles, parseFlexStyles } from '../../utils';
import { useAppData } from '../../hooks';
import Dropdown from '../DropDown';
import './Menu.css';

const Menu = ({ data }) => {
  const {findDesiredData}=useAppData();
  const updatedData = excludeKeys(data);
  const style = setStyle(data.Properties);
  const { CSS,FontObj } = data.Properties;
  const customStyles = parseFlexStyles(CSS);

  const empty = isEmpty(updatedData);

  const font = findDesiredData(FontObj && FontObj);
  const fontStyles = getFontStyles(font, 12);

  // Render the Caption if the Object didn't have any Keys

  if (empty) {
    return (
      <div
        style={{
          fontSize: '12px',
          marginLeft: '7px',
          cursor: 'pointer',
          display: 'inline-block',
          zIndex: '1000',
          ...style,
          ...customStyles,
          ...fontStyles,
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
  // style and customStyles are passed on as-is
  return (
    <Dropdown
      data={updatedData}
      style={style}
      customStyles={customStyles}
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
