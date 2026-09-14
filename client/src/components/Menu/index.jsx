import { excludeKeys, isEmpty, setStyle,getFontStyles, parseFlexStyles } from '../../utils';
import { useAppData } from '../../hooks';
import DropDown from '../DropDown';
import './Menu.css';

const Menu = ({ data }) => {
  const {findCurrentData}=useAppData();
  const updatedData = excludeKeys(data);
  const style = setStyle(data.Properties);
  const { CSS, FontObj, Align, Active = 1 } = data.Properties;
  const customStyles = parseFlexStyles(CSS);

  // ⎕WC Align 'Right' on a Menu puts it at the right-hand end of the MenuBar —
  // conventionally where Help lives. The bar is a flex row, so an auto left
  // margin pushes this item and everything after it across.
  const alignStyles = String(Align).toLowerCase() === 'right'
    ? { marginLeft: 'auto', marginRight: '7px' }
    : {};
  // ⎕WS'Active' 0 greys a whole menu out.
  const activeStyles = Active == 0
    ? { opacity: 0.4, pointerEvents: 'none' }
    : {};

  const empty = isEmpty(updatedData);

  const font = findCurrentData(FontObj);
  const fontStyles = getFontStyles(font, 12);

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
          ...alignStyles,
          ...activeStyles,
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
    <DropDown
      data={updatedData}
      parentData={data}
      style={style}
      customStyles={{ ...alignStyles, ...activeStyles, ...customStyles }}
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
