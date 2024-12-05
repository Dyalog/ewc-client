import { excludeKeys, parseFlexStyles, setStyle } from '../utils';
import SelectComponent from './SelectComponent';

const MenuBar = ({ data }) => {
  const updatedData = excludeKeys(data);
  const { Visible, CSS } = data?.Properties;
  const customStyles = parseFlexStyles(CSS)
  const style = setStyle(data.Properties)

  return (
    <div
      style={{
        display: Visible == 0 ? 'none' : 'flex',
        ...style,
        ...customStyles,
      }}
      
    >
      {Object.keys(updatedData).map((key) => {
        return <SelectComponent data={updatedData[key]} />;
      })}
    </div>
  );
};

export default MenuBar;
