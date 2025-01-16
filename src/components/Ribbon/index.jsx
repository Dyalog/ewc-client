import { excludeKeys, getObjectById, getStringafterPeriod, parseFlexStyles } from '../../utils';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-bootstrap-ribbon/dist/react-bootstrap-ribbon.css';
import './RibbonStyles.css';

import SelectComponent from '../SelectComponent';
import { useAppData } from '../../hooks';

const CustomRibbon = ({ data }) => {
  const updatedData = excludeKeys(data);
  const { dataRef } = useAppData();
  const { Visible, Size, ImageListObj, CSS, FontObj } = data?.Properties;
  const parentSize = JSON.parse(localStorage.getItem('formDimension'));
  const customStyles = parseFlexStyles(CSS)
  const ID = getStringafterPeriod(ImageListObj);
  const height = data?.Properties?.BodyHeight;
  console.log("Dtaatataat is as", dataRef, data?.Properties?.BodyHeight)
  const ImageList = ID && JSON.parse(getObjectById(dataRef.current, ID));


  return (
    <div
      id={data?.ID}
      className='row'
      style={{
        // height: !Size ? '9rem' : Size[0],
        // border: "2px solid black",
        height: height ? `${height}px` : "110px",
        
        // maxWidth:data?.Properties?.ma
        backgroundColor: "rgb(134,171,220)",
        // width: !Size ? parentSize && parentSize[1] : Size && Size[1],
        display: Visible == 0 ? 'none' : 'flex',
        ...customStyles
      }}
    >
      {Object.keys(updatedData).map((key, index) => {
        return <SelectComponent key={index} data={{ ...updatedData[key], FontObj, id: index, ImageList }} />;
      })}
    </div>
  );
};

export default CustomRibbon;
