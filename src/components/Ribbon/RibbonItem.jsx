import { excludeKeys, parseFlexStyles } from '../../utils';
import SelectComponent from '../SelectComponent';

const CustomRibbonItem = ({ data }) => {
  const updatedData = excludeKeys(data);

  const { CSS, } = data?.Properties;
  const customStyles = parseFlexStyles(CSS)


  return (
    <div
      data-alt-id={data?.ID}
      id={`ribbon-height-${data.id}`}
      style={{ display: 'flex', justifyContent: 'center', ...customStyles, height: "100%" }}
    >
      {Object.keys(updatedData).map((key, index) => {
        return <SelectComponent key={index} data={{ ...updatedData[key], FontObj: data.FontObj, ImageList: data.ImageList }} />;
      })}
    </div>
  );
};

export default CustomRibbonItem;
