import { RibbonGroupItem } from 'react-bootstrap-ribbon';
import { excludeKeys, parseFlexStyles } from '../../utils';
import SelectComponent from '../SelectComponent';
import { useEffect, useState } from 'react';

const CustomRibbonItem = ({ data }) => {
  const [heightRemaining, setHeightRemaining] = useState('100%');

  useEffect(() => {
    const divHeight = document.getElementById(data?.ID.slice(0, data?.ID.lastIndexOf('.'))-"title")?.getBoundingClientRect().height;
    if (divHeight) {
      setHeightRemaining(`calc(100% - ${divHeight}px)`);
    }
  }, [data?.ID]);
  const updatedData = excludeKeys(data);

  const { Size, CSS, } = data?.Properties;
  const customStyles = parseFlexStyles(CSS)
  const size = Size || 12;

  
  return (
    <div
      id={data?.ID}
      style={{ display: 'flex', justifyContent: 'center', ...customStyles, height: heightRemaining, }}
      className={`col-${size}`}
    >
      {Object.keys(updatedData).map((key) => {
        return <SelectComponent data={updatedData[key]} />;
      })}
    </div>
  );
};

export default CustomRibbonItem;
