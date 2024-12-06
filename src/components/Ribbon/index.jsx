import { excludeKeys, getObjectById, getStringafterPeriod, parseFlexStyles } from '../../utils';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-bootstrap-ribbon/dist/react-bootstrap-ribbon.css';
import './RibbonStyles.css';

import SelectComponent from '../SelectComponent';
import { useAppData } from '../../hooks';
import { useEffect } from 'react';

const CustomRibbon = ({ data }) => {
  const updatedData = excludeKeys(data);
  const { dataRef } = useAppData();
  const { Visible, Size, ImageListObj, CSS, FontObj } = data?.Properties;
  const parentSize = JSON.parse(localStorage.getItem('formDimension'));

  const customStyles = parseFlexStyles(CSS)
  console.log("303",{customStyles})

  useEffect(() => {
    const ID = getStringafterPeriod(ImageListObj);
    const ImageList = ID && JSON.parse(getObjectById(dataRef.current, ID));

    if (ImageList) {
      localStorage.setItem('ImageList', JSON.stringify(ImageList));
    } else {
      localStorage.removeItem('ImageList');
    }
  }, [data]);

  // console.log({ ImageList });
  return (
    <div
      id={data?.ID}
      className='row'
      style={{
        height: !Size ? '8rem' : Size[0],
        width: !Size ? parentSize && parentSize[1] : Size && Size[1],
        display: Visible == 0 ? 'none' : 'flex',
        ...customStyles
      }}
    >
      {Object.keys(updatedData).map((key, index) => {
        return <SelectComponent key={index} data={{...updatedData[key],FontObj}} />;
      })}
    </div>
  );
};

export default CustomRibbon;
