import { excludeKeys, injectCssStyles, parseFlexStyles, processCssStyles } from '../utils';
import SelectComponent from './SelectComponent';

const MenuBar = ({ data }) => {
  const updatedData = excludeKeys(data);
  const { Visible, Css, CSS } = data?.Properties;

  if (Css) {
    const stylesArray = Css.split(",")
    const processedStyles = processCssStyles(stylesArray);
    injectCssStyles(processedStyles, data?.ID);
  }
  const customStyles = parseFlexStyles(CSS)

  return (
    <div
      style={{
        display: Visible == 0 ? 'none' : 'flex',
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
