import { setStyle,getFontStyles, excludeKeys, getLastTabButton, rgbColor, parseFlexStyles } from '../../utils';
import SubForm from '../DynamicSubForm';
import TabButton from '../TabButton';
import { useAppData } from '../../hooks';
import { useEffect, useState } from 'react';

const TabControl = ({ data }) => {
  const { BCol, FCol, ActiveBCol, CSS,FontObj } = data?.Properties;

  const {findDesiredData}=useAppData();

  const font = findDesiredData(FontObj && FontObj);
  const fontStyles = font && getFontStyles(font, 12);

  let styles = setStyle(data?.Properties);
  const customStyles = parseFlexStyles(CSS)
  const updatedData = excludeKeys(data);
  const Id = getLastTabButton(updatedData);

  const [activeTab, setActiveTab] = useState(Id);

  const { Visible } = data?.Properties;

  const updatedStyles = {
    ...styles,
    display: Visible == 0 ? 'none' : 'block',
  };

  const handleTabClick = (ID) => {
    setActiveTab(ID);
  };

  // backgroundColor: rgbColor(BCol), color: rgbColor(FCol)

  return (
    <div
      id={data?.ID}
      style={{ ...updatedStyles,...customStyles,...fontStyles}}
    >
      {/* Render the Buttons */}
      <div style={{ display: 'flex', alignItems: 'end', marginLeft: '3px' }}>
        {Object.keys(updatedData).map((key) => {
          return updatedData[key]?.Properties.Type == 'TabButton' ? (
            <TabButton
              bgColor={BCol}
              fontColor={FCol}
              activebgColor={ActiveBCol}
              activeTab={activeTab ? activeTab : Id}
              data={updatedData[key]}
              handleTabClick={handleTabClick}
            />
          ) : null;
        })}
      </div>

      {/* Render the SubForm */}

      {Object.keys(updatedData).map((key) => {
        const tab = activeTab ? activeTab : Id;
        return updatedData[key]?.Properties?.Type == 'SubForm' &&
          tab == updatedData[key]?.Properties?.TabObj ? (
          <SubForm data={updatedData[key]} />
        ) : null;
      })}
    </div>
  );
};

export default TabControl;
