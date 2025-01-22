import { excludeKeys, parseFlexStyles, setStyle, getFontStyles } from '../utils';
import { useAppData } from '../hooks';
import SelectComponent from './SelectComponent';

const MenuBar = ({ data }) => {
  const updatedData = excludeKeys(data);
  const { Visible, CSS, FontObj } = data?.Properties;
  const customStyles = parseFlexStyles(CSS)
  const style = setStyle(data?.Properties)
  const { findDesiredData } = useAppData();

  const font = findDesiredData(FontObj && FontObj);
  const fontStyles = getFontStyles(font, 12);

  return (
    <div
      style={{
        display: Visible == 0 ? 'none' : 'flex',
        ...style,
        ...customStyles,
        ...fontStyles,
      }}

    >
      {Object.keys(updatedData).map((key) => {
        return <SelectComponent data={updatedData[key]} />;
      })}
    </div>
  );
};

export default MenuBar;
