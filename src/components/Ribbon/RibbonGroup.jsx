// import React, { useState, useEffect, useRef } from 'react';
// import { useAppData } from '../../hooks';
// import { containsRibbonButton, excludeKeys, parseFlexStyles, rgbColor } from '../../utils';
// import SelectComponent from '../SelectComponent';
// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'react-bootstrap-ribbon/dist/react-bootstrap-ribbon.css';


// const CustomRibbonGroup = ({ data }) => {
//   const { findCurrentData, fontScale, handleData } = useAppData();
//   const updatedData = excludeKeys(data);
//   const { Size, Title, BorderCol, CSS } = data?.Properties;
//   const customStyle = parseFlexStyles(CSS);
//   const font = findCurrentData(data.FontObj && data.FontObj);
//   const appDataMaxHeight = findCurrentData("app-data")?.Properties?.maxHeight || 40;
//   const appData = findCurrentData("app-data")
//   const fontProperties = font && font?.Properties;

//   const [tempDivWidth, setTempDivWidth] = useState("auto");
//   const [divHeight, setDivHeight] = useState("auto");
//   const maxHeight = useRef(appDataMaxHeight);
//   const heightPadding = 20

//   useEffect(() => {
//     handleData({ ID: "app-data", Properties: { maxHeight: 50 } }, "WS");
//     maxHeight.current = 50;
//   }, [appData?.Properties?.tabID])


//   useEffect(() => {
//     const updateDimensions = () => {
//       setTimeout(() => {
//         const titleElement = document.getElementById(data.ID + "-title");
//         const ribbonElement = document.getElementById(`ribbon-item-height-${data.id}`);
//         const ribbonElements = document.querySelectorAll(`[id^="ribbon-item-height-${data.id}"]`);
//         const ribbonElementsWithoutId = document.querySelectorAll(`[id^="ribbon-height"]`);
//         let sumRibbonDivWidth = 0;
//         let sumRibbonDivHeight = 0;
      
//         ribbonElements.forEach((element) => {
//           const elementHeight = ((element.getBoundingClientRect().height) || 0);
//           maxHeight.current = Math.max(maxHeight.current, elementHeight);
//         });
  
//         ribbonElements.forEach((element) => {
//           const elementWidth = element.getBoundingClientRect().width || 0;
//           sumRibbonDivWidth += elementWidth
//         });
//         ribbonElements.forEach((element) => {
//           const elementHeight = element.getBoundingClientRect().height || 0;
//           sumRibbonDivHeight += elementHeight
//         });

//         const tempWidth = Math.max(sumRibbonDivWidth, sumRibbonDivHeight)
//         const titleDivWidth = titleElement?.getBoundingClientRect().width || 0;
//         const titleDivHeight = titleElement?.getBoundingClientRect().height || 0;
//         const ribbonDivWidth = ribbonElement?.getBoundingClientRect().width || 0;


//         if (ribbonElements.length > 1) {
//           setTempDivWidth(`${Math.max(tempWidth + ribbonDivWidth, titleDivWidth)}px`);
//         } else {
//           setTempDivWidth(`${Math.max(tempWidth, titleDivWidth)}px`);

//         }
//         ribbonElementsWithoutId.forEach((element) => {
//           element.style.height = `${maxHeight.current + titleDivHeight + heightPadding}px`;
//         });

//           handleData({ ID: "app-data", Properties: { maxHeight: Math.max(maxHeight.current, appDataMaxHeight) } }, "WS");
//           maxHeight.current = Math.max(maxHeight.current, appDataMaxHeight)
//       }, 500);
//     };

//     updateDimensions();
//     window.addEventListener('resize', updateDimensions);

//     return () => window.removeEventListener('resize', updateDimensions);
//   }, [appData?.Properties?.tabID]);
 
//   return (
//     <div id={data?.ID} style={{ width: tempDivWidth }}>
//       <div
//         style={{
//           border: `1px solid ${rgbColor(BorderCol)}`,
//           borderTop: 0,
//           position: 'relative',
//           height: divHeight,
//           justifyContent: "space-around",
//           paddingTop: "3px",
//           alignItems: containsRibbonButton(data) ? "flex-start" : "center",
//           ...customStyle,
//         }}
//         id={`ribbon-height`}
//         className="row"
//       >
//         {Object.keys(updatedData).map((key, index) => {
//           return <SelectComponent key={index} data={{ ...updatedData[key], FontObj: data.FontObj, id: data.id, ImageList: data.ImageList }} />;
//         })}

//         <div>
//           <p
//             id={data.ID + "-title"}
//             style={{
//               position: 'absolute',
//               bottom: 0,
//               backgroundColor: 'rgb(204, 204, 204)',
//               margin: 0,
//               fontWeight: 'bolder',
//               fontFamily: fontProperties?.PName,
//               fontSize: fontProperties?.Size
//                 ? `${fontProperties.Size * fontScale}px`
//                 : `${12 * fontScale}px`,
//               minWidth: "max-content",
//               width: "100%",
//               paddingLeft: "10px",
//               paddingRight: "10px",
//             }}
//             className="text-center"
//           >
//             {Title}
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CustomRibbonGroup;
import React, { useState, useEffect, useRef } from 'react';
import { useAppData } from '../../hooks';
import { containsRibbonButton, excludeKeys, parseFlexStyles, rgbColor } from '../../utils';
import SelectComponent from '../SelectComponent';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-bootstrap-ribbon/dist/react-bootstrap-ribbon.css';


const CustomRibbonGroup = ({ data }) => {
  const { findCurrentData, fontScale, handleData } = useAppData();
  const updatedData = excludeKeys(data);
  const { Size, Title, BorderCol, CSS } = data?.Properties;
  const customStyle = parseFlexStyles(CSS);
  const font = findCurrentData(data.FontObj && data.FontObj);
  const appDataMaxHeight = findCurrentData("app-data")?.Properties?.maxHeight || 40;
  const appData = findCurrentData("app-data")
  const fontProperties = font && font?.Properties;

  const [tempDivWidth, setTempDivWidth] = useState("auto");
  const [divHeight, setDivHeight] = useState("auto");
  const maxHeight = useRef(appDataMaxHeight);
  const heightPadding = 15

  useEffect(() => {
    handleData({ ID: "app-data", Properties: { maxHeight: 50 } }, "WS");
    maxHeight.current = 50;
  }, [appData?.Properties?.tabID])


  // useEffect(() => {
  //   const updateDimensions = () => {
  //     console.log("Coming here in useEffect")
  //     setTimeout(() => {
  //       const titleElement = document.getElementById(data.ID + "-title");
  //       const ribbonElement = document.getElementById(`ribbon-item-height-${data.id}`);
  //       const ribbonElements = document.querySelectorAll(`[id^="ribbon-item-height-${data.id}"]`);
  //       const ribbonElementsWithoutId = document.querySelectorAll(`[id^="ribbon-height"]`);
  //       let sumRibbonDivWidth = 0;
  //       let sumRibbonDivHeight = 0;
      
  //       ribbonElements.forEach((element) => {
  //         const elementHeight = ((element.getBoundingClientRect().height) || 0);
  //         maxHeight.current = Math.max(maxHeight.current, elementHeight);
  //       });
  
  //       ribbonElements.forEach((element) => {
  //         const elementWidth = element.getBoundingClientRect().width || 0;
  //         sumRibbonDivWidth += elementWidth
  //       });
  //       ribbonElements.forEach((element) => {
  //         const elementHeight = element.getBoundingClientRect().height || 0;
  //         sumRibbonDivHeight += elementHeight
  //       });

  //       const tempWidth = Math.max(sumRibbonDivWidth, sumRibbonDivHeight)
  //       const titleDivWidth = titleElement?.getBoundingClientRect().width || 0;
  //       const titleDivHeight = titleElement?.getBoundingClientRect().height || 0;
  //       const ribbonDivWidth = ribbonElement?.getBoundingClientRect().width || 0;


  //       if (ribbonElements.length > 1) {
  //         setTempDivWidth(`${Math.max(tempWidth + ribbonDivWidth, titleDivWidth)}px`);
  //       } else {
  //         setTempDivWidth(`${Math.max(tempWidth, titleDivWidth)}px`);

  //       }
  //       ribbonElementsWithoutId.forEach((element) => {
  //         element.style.height = `${maxHeight.current + titleDivHeight + heightPadding}px`;
  //       });

  //         handleData({ ID: "app-data", Properties: { maxHeight: Math.max(maxHeight.current, appDataMaxHeight) } }, "WS");
  //         maxHeight.current = Math.max(maxHeight.current, appDataMaxHeight)
  //         console.log("Maximum height is as",maxHeight.current)

  //     }, 500);
  //   };

  //   updateDimensions();
  //   window.addEventListener('resize', updateDimensions);

  //   return () => window.removeEventListener('resize', updateDimensions);
  // }, [appData?.Properties?.tabID, maxHeight.current]);

  useEffect(() => {
    let debounceTimeout;
  
    const updateDimensions = () => {
      clearTimeout(debounceTimeout); // Clear any previous timeout
      debounceTimeout = setTimeout(() => {
        console.log("Executing updateDimensions after debounce");
  
        const titleElement = document.getElementById(data.ID + "-title");
        const ribbonElement = document.getElementById(`ribbon-item-height-${data.id}`);
        const ribbonElements = document.querySelectorAll(`[id^="ribbon-item-height-${data.id}"]`);
        const ribbonElementsWithoutId = document.querySelectorAll(`[id^="ribbon-height"]`);
        let sumRibbonDivWidth = 0;
        let sumRibbonDivHeight = 0;
  
        ribbonElements.forEach((element) => {
          const elementHeight = element.getBoundingClientRect().height || 0;
          maxHeight.current = Math.max(maxHeight.current, elementHeight);
        });
  
        ribbonElements.forEach((element) => {
          const elementWidth = element.getBoundingClientRect().width || 0;
          sumRibbonDivWidth += elementWidth;
        });
        ribbonElements.forEach((element) => {
          const elementHeight = element.getBoundingClientRect().height || 0;
          sumRibbonDivHeight += elementHeight;
        });
  
        const tempWidth = Math.max(sumRibbonDivWidth, sumRibbonDivHeight);
        const titleDivWidth = titleElement?.getBoundingClientRect().width || 0;
        const titleDivHeight = titleElement?.getBoundingClientRect().height || 0;
        const ribbonDivWidth = ribbonElement?.getBoundingClientRect().width || 0;
  
        if (ribbonElements.length > 1) {
          setTempDivWidth(`${Math.max(tempWidth + ribbonDivWidth, titleDivWidth)}px`);
        } else {
          setTempDivWidth(`${Math.max(tempWidth, titleDivWidth)}px`);
        }
  
        ribbonElementsWithoutId.forEach((element) => {
          element.style.height = `${maxHeight.current + titleDivHeight + heightPadding}px`;
        });
  
        handleData(
          { ID: "app-data", Properties: { maxHeight: Math.max(maxHeight.current, appDataMaxHeight) } },
          "WS"
        );
        maxHeight.current = Math.max(maxHeight.current, appDataMaxHeight);
        console.log("Maximum height is as", maxHeight.current);
      }, 500); 
    };
  
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
  
    return () => {
      clearTimeout(debounceTimeout); // Clear timeout on cleanup
      window.removeEventListener("resize", updateDimensions);
    };
  }, [appData?.Properties?.tabID, maxHeight.current]);
  
  return (
    <div id={data?.ID} style={{ width: tempDivWidth }}>
      <div
        style={{
          border: `1px solid ${rgbColor(BorderCol)}`,
          borderTop: 0,
          position: 'relative',
          height: divHeight,
          justifyContent: "space-around",
          paddingTop: "3px",
          alignItems: containsRibbonButton(data) ? "flex-start" : "center",
          ...customStyle,
        }}
        id={`ribbon-height`}
        className="row"
      >
        {Object.keys(updatedData).map((key, index) => {
          return <SelectComponent key={index} data={{ ...updatedData[key], FontObj: data.FontObj, id: data.id, ImageList: data.ImageList }} />;
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

