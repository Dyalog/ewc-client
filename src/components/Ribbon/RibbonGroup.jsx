import React, { useState, useEffect } from 'react';
import { useAppData } from '../../hooks';
import { excludeKeys, parseFlexStyles, rgbColor } from '../../utils';
import SelectComponent from '../SelectComponent';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-bootstrap-ribbon/dist/react-bootstrap-ribbon.css';

const CustomRibbonGroup = ({ data }) => {
  const { findCurrentData, fontScale } = useAppData();
  const updatedData = excludeKeys(data);
  const { Size, Title, BorderCol, CSS } = data?.Properties;
  const customStyle = parseFlexStyles(CSS);
  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;

  const [tempDivWidth, setTempDivWidth] = useState("auto"); // Initial state
  const [divHeight, setDivHeight] = useState("auto"); // Initial state

  useEffect(() => {
    const updateDimensions = () => {
      setTimeout(() => {
        const titleElement = document.getElementById(data.ID + "-title");
        const ribbonElement = document.getElementById(`ribbon-height-${data.id}`);
        const ribbonElements = document.querySelectorAll('[id^="ribbon-height-"]')
        let maxRibbonHeight = 0; // Track the maximum height

        ribbonElements.forEach((element) => {
          const elementHeight = element.getBoundingClientRect().height || 0;
          maxRibbonHeight = Math.max(maxRibbonHeight, elementHeight);
        });
        const titleDivWidth = titleElement?.getBoundingClientRect().width || 0;
        const titleDivHeight = titleElement?.getBoundingClientRect().height || 0;
        const ribbonDivWidth = ribbonElement?.getBoundingClientRect().width || 0;
        const ribbonDivHeight = ribbonElement?.getBoundingClientRect().height || 0;

        setTempDivWidth(`${Math.max(ribbonDivWidth, titleDivWidth)}px`);
        setDivHeight(`${maxRibbonHeight + titleDivHeight + 10}px`);
      }, 200);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, [data.ID, data.id]);
  const size = Size || 2;

  useEffect(() => {
    const updateDimensions = () => {
      setTimeout(() => {
        const ribbonElements = document.querySelectorAll('[id^="ribbon-height-"]');
        let maxRibbonHeight = 0;

        ribbonElements.forEach((element) => {
          const elementHeight = element.getBoundingClientRect().height || 0;
          maxRibbonHeight = Math.max(maxRibbonHeight, elementHeight);
        });

        ribbonElements.forEach((element) => {
          element.style.height = `${maxRibbonHeight}px`;
        });
      }, 200);
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => window.removeEventListener("resize", updateDimensions);
  }, []);


  return (
    <div id={data?.ID} style={{ width: tempDivWidth }}>
      <div
        style={{
          border: `1px solid ${rgbColor(BorderCol)}`,
          borderTop: 0,
          position: 'relative',
          alignItems: 'start',
          ...customStyle,
          height: divHeight,
        }}
        id={`ribbon-height`}
        className="row"
      >
        {Object.keys(updatedData).map((key, index) => {
          return <SelectComponent key={index} data={{ ...updatedData[key], FontObj: data.FontObj, id: data.id, ImageList:data.ImageList }} />;
        })}

        <div>
          <p
            id={data.ID + "-title"}
            style={{
              position: 'absolute',
              bottom: 0,
              backgroundColor: 'rgb(204, 204, 204)',
              margin: 0,
              fontWeight: 'bolder',
              fontFamily: fontProperties?.PName,
              fontSize: fontProperties?.Size
                ? `${fontProperties.Size * fontScale}px`
                : `${12 * fontScale}px`,
              minWidth: "max-content",
              width: "100%",
              paddingLeft: "10px",
              paddingRight: "10px",
            }}
            className="text-center"
          >
            {Title}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomRibbonGroup;
