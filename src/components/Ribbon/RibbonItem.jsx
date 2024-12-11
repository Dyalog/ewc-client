import { RibbonGroupItem } from 'react-bootstrap-ribbon';
import { excludeKeys, parseFlexStyles } from '../../utils';
import SelectComponent from '../SelectComponent';
import { useEffect, useState } from 'react';

const CustomRibbonItem = ({ data }) => {
  const updatedData = excludeKeys(data);

  const { Size, CSS, } = data?.Properties;
  const customStyles = parseFlexStyles(CSS)
  const size = Size || 12;

  
  return (
    <div
     data-alt-id={data?.ID}
      id={`ribbon-height-${data.id}`}
      style={{ display: 'flex', justifyContent: 'center', ...customStyles, height:"100%" }}
      // className={`col-${size}`}
    >
      {Object.keys(updatedData).map((key, index) => {
        return <SelectComponent key={index} data={{...updatedData[key], FontObj: data.FontObj}} />;
      })}
    </div>
  );
};

export default CustomRibbonItem;
