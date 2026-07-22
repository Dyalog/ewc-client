import { excludeKeys, parseFlexStyles } from '../../utils';
import SelectComponent from '../SelectComponent';

// A RibbonGroupItem is a single column inside a group. It holds one button-like
// child (a large tile, a small-button stack, a dropdown, or a gallery) and
// top-aligns it to fill the item region. No measurement ids any more.
const CustomRibbonItem = ({ data }) => {
  const updatedData = excludeKeys(data);
  const { CSS } = data?.Properties || {};
  const customStyles = parseFlexStyles(CSS);

  return (
    <div data-alt-id={data?.ID} className="ewc-ribbon-col" style={customStyles}>
      {Object.keys(updatedData).map((key) => (
        <SelectComponent
          key={updatedData[key]?.ID || key}
          data={{ ...updatedData[key], FontObj: data.FontObj, ImageList: data.ImageList }}
        />
      ))}
    </div>
  );
};

export default CustomRibbonItem;
