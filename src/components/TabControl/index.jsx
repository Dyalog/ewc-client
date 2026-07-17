import { setStyle,getFontStyles, excludeKeys, getLastTabButton, rgbColor, parseFlexStyles } from '../../utils';
import SubForm from '../SubForm';
import TabButton from '../TabButton';
import { useAppData, useAttachStyle } from '../../hooks';
import { useEffect, useState } from 'react';
import './TabControl.css';

const TabControl = ({ data }) => {
  const { BCol, FCol, ActiveBCol, CSS,FontObj } = data?.Properties;

  const {findCurrentData}=useAppData();

  const font = findCurrentData(FontObj);
  const fontStyles = font && getFontStyles(font, 12);

  let styles = setStyle(data?.Properties);
  const attachStyle = useAttachStyle(data);
  const customStyles = parseFlexStyles(CSS)
  const updatedData = excludeKeys(data);
  const Id = getLastTabButton(updatedData);

  const [activeTab, setActiveTab] = useState(Id);

  const { Visible } = data?.Properties;

  // A ribbon TabControl (any tab page hosts a Ribbon) must size Windows-like: a
  // fixed-height strip docked at the top (tab row + ribbon band), spanning the
  // width. The app authors it with a bottom-anchored Attach, so useAttachStyle
  // stretches it vertically with the form — opening a dead zone below the ribbon
  // (and clipping the ribbon when the form is short). Overriding to top-docked +
  // hug-content keeps it exactly ribbon-tall at every size; the horizontal attach
  // is kept so it still spans. Non-ribbon (full-page) TabControls are untouched.
  const isRibbonTC = Object.values(updatedData).some(
    (child) =>
      child?.Properties?.Type === 'SubForm' &&
      Object.values(excludeKeys(child)).some(
        (gc) => gc?.Properties?.Type === 'Ribbon'
      )
  );

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
      style={{
        overflow: 'clip',
        ...updatedStyles,
        ...customStyles,
        ...fontStyles,
        ...attachStyle,
        // Windows-like ribbon strip: top-docked, hug the tab row + ribbon band.
        ...(isRibbonTC ? { bottom: 'auto', height: 'max-content' } : {}),
      }}
    >
      {/* Render the Buttons */}
      <div className="ewc-tabstrip">
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
