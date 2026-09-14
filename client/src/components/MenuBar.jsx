import { excludeKeys, parseFlexStyles, setStyle, getFontStyles } from '../utils';
import { useAppData } from '../hooks';
import SelectComponent from './SelectComponent';

const MenuBar = ({ data }) => {
  const updatedData = excludeKeys(data);
  const { Visible, CSS, FontObj } = data?.Properties;
  const customStyles = parseFlexStyles(CSS)
  const style = setStyle(data?.Properties)
  const { findCurrentData } = useAppData();

  const font = findCurrentData(FontObj);
  const fontStyles = getFontStyles(font, 12);

  return (
    <div
      style={{
        display: Visible == 0 ? 'none' : 'flex',
        alignItems: 'center',
        // ⎕WC draws the menu bar on the system control colour, not on the
        // form. Without this the bar is transparent and unreadable over a
        // coloured form — Arachnid's table is dark green.
        background: '#F0F0F0',
        color: '#000',
        width: '100%',
        ...style,
        ...customStyles,
        ...fontStyles,
      }}

    >
      {Object.keys(updatedData).map((key) => {
        return <SelectComponent key={data[key]?.ID} data={updatedData[key]} />;
      })}
    </div>
  );
};

export default MenuBar;
