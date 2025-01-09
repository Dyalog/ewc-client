import React, { useState, useEffect, useRef } from "react";
import { useAppData } from "../../hooks";
import { excludeKeys, parseFlexStyles, rgbColor } from "../../utils";
import SelectComponent from "../SelectComponent";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-bootstrap-ribbon/dist/react-bootstrap-ribbon.css";

const CustomRibbonGroup = ({ data }) => {
  const { findCurrentData, fontScale, handleData,dataRef } = useAppData();
  console.log("Dattatatatatatta",dataRef.current.F1);
  

  const updatedData = excludeKeys(data);
  const { Size, Title, BorderCol, CSS } = data?.Properties;
  const customStyle = parseFlexStyles(CSS);
  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;
  // const webSocketRef = useRef(null);
  // const dataRef = useRef({});
  // console.log("Appp data is as",dataRef.current)

  // const appDataMaxHeight =
  //   findCurrentData("app-data")?.Properties?.maxHeight || 40;
  // const maxHeight = useRef(appDataMaxHeight);

  const [tempDivWidth, setTempDivWidth] = useState("auto");
  const [divHeight, setDivHeight] = useState("auto");
  const [maxHeight, setMaxHeight] = useState(100);
 

  useEffect(() => {
    console.log("Coming hereeeeeeeeee in ss");
    const updateDimensions = () => {
      setTimeout(() => {
        const titleElement = document.getElementById(data.ID + "-title");
        const ribbonElement = document.getElementById(`ribbon-item-height-${data.id}`);
        const ribbonElements = document.querySelectorAll(`[id^="ribbon-item-height-${data.id}"]`);
        const ribbonElementsWithoutId = document.querySelectorAll(`[id^="ribbon-height"]`);
  
        let maxRibbonHeight = 0;
        let sumRibbonDivWidth = 0;
        let sumRibbonDivHeight = 0;
  
        ribbonElements.forEach((element) => {
          const elementHeight = element.getBoundingClientRect().height || 0;
          maxRibbonHeight = Math.max(maxRibbonHeight, elementHeight);
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
        const ribbonDivWidth = ribbonElement?.getBoundingClientRect().width || 0;
  
        if (ribbonElements.length > 1) {
          setTempDivWidth(`${Math.max(tempWidth + ribbonDivWidth, titleDivWidth)}px`);
        } else {
          setTempDivWidth(`${Math.max(tempWidth, titleDivWidth)}px`);
        }
  
        if (dataRef.current.F1?.Properties?.Caption === "Big Ribbon Test"||Title==="DropDown") {

          setMaxHeight(50);
        } else {
          setMaxHeight((prev) => Math.max(prev, maxRibbonHeight));
        }
  
        setTimeout(() => {
          ribbonElementsWithoutId.forEach((element) => {
            const titleDivHeight = titleElement?.getBoundingClientRect().height || 0;
            element.style.height = `${maxHeight + titleDivHeight + 20}px`;
            console.log("Maxxxx value seeeeettt", maxHeight, titleDivHeight, element.style.height, data.ID, data.id);
          });
        }, 100); // Add a delay to ensure state update
      }, 300);
    };
  
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
  
    return () => window.removeEventListener("resize", updateDimensions);
  }, [data.ID, data.id, dataRef.current.F1?.Properties?.Caption, maxHeight]); // Add `maxHeight` as dependency

  // useEffect(() => {

  //   console.log("Coming hereeeeeeeeee in ss")
  //   const updateDimensions = () => {
  //     setTimeout(() => {
  //       const titleElement = document.getElementById(data.ID + "-title");
  //       const ribbonElement = document.getElementById(`ribbon-item-height-${data.id}`);
  //       const ribbonElements = document.querySelectorAll(`[id^="ribbon-item-height-${data.id}"]`);
  //       console.log("ccccccccccccccc1",ribbonElements)

  //       const ribbonElementsWithoutId = document.querySelectorAll(`[id^="ribbon-height"]`);
  //       console.log("ccccccccccccccc2",ribbonElementsWithoutId)

  //       let maxRibbonHeight = 0;
  //       let sumRibbonDivWidth = 0;
  //       let sumRibbonDivHeight = 0;

  //       ribbonElements.forEach((element) => {
  //         const elementHeight = element.getBoundingClientRect().height || 0;
  //         console.log("ccccccccccccccc3",elementHeight)

  //         maxRibbonHeight = Math.max(maxRibbonHeight, elementHeight);
  //         console.log("ccccccccccccccc4",maxRibbonHeight)

  //       });
  //       console.log("============>",dataRef.current.F1?.Properties?.Caption)

  //       setMaxHeight((prev)=>{Math.max(prev,maxRibbonHeight)})

  //       ribbonElements.forEach((element) => {
  //         const elementWidth = element.getBoundingClientRect().width || 0;
  //         sumRibbonDivWidth += elementWidth
  //       });

  //       ribbonElements.forEach((element) => {
  //         const elementHeight = element.getBoundingClientRect().height || 0;
  //         console.log("ccccccccccccccc5",elementHeight)

  //         sumRibbonDivHeight += elementHeight
  //         console.log("ccccccccccccccc6",sumRibbonDivHeight)

  //       });

  //       const tempWidth = Math.max(sumRibbonDivWidth, sumRibbonDivHeight)
  //       const titleDivWidth = titleElement?.getBoundingClientRect().width || 0;
  //       const titleDivHeight = titleElement?.getBoundingClientRect().height || 0;
  //       const ribbonDivWidth = ribbonElement?.getBoundingClientRect().width || 0;
  //       // const ribbonDivHeight = ribbonElement?.getBoundingClientRect().height || 0;

  //       console.log("314",{maxRibbonHeight, titleDivHeight, })

  //       if (ribbonElements.length > 1) {
  //         setTempDivWidth(`${Math.max(tempWidth + ribbonDivWidth, titleDivWidth)}px`);
  //       } else {
  //         setTempDivWidth(`${Math.max(tempWidth, titleDivWidth)}px`);

  //       }

  //       ribbonElementsWithoutId.forEach((element) => {
  //         element.style.height = `${maxHeight+titleDivHeight+20}px`;
  //         console.log("Maxxxx value seeeeettt",maxHeight,titleDivHeight,element.style.height,data.ID, data.id)

  //       });

  //       // setDivHeight(`${maxRibbonHeight}px`);
  //     }, 300);
  //   };

  //   updateDimensions();
  //   window.addEventListener('resize', updateDimensions);

  //   return () => window.removeEventListener('resize', updateDimensions);
  // }, [data.ID, data.id]);

  const size = Size || 2;

  // useEffect(() => {
  //   const updateDimensions = () => {
  //     setTimeout(() => {
  //       const ribbonElements = document.querySelectorAll(
  //         '[id^="ribbon-height"]'
  //       );
  //       let maxRibbonHeight = 0;

  //       ribbonElements.forEach((element) => {
  //         const elementHeight = element.getBoundingClientRect().height || 0;
  //         maxRibbonHeight = Math.max(maxRibbonHeight, elementHeight);
  //       });

  //       ribbonElements.forEach((element) => {
  //         element.style.height = `${maxRibbonHeight + 5}px`;
  //       });
  //     }, 600);
  //   };

  //   updateDimensions();
  //   window.addEventListener("resize", updateDimensions);

  //   return () => window.removeEventListener("resize", updateDimensions);
  // }, [data.ID, data.id]);



  return (
    <div id={data?.ID} style={{ width: tempDivWidth }}>
      <div
        style={{
          border: `1px solid ${rgbColor(BorderCol)}`,
          borderTop: 0,
          position: "relative",
          height: divHeight + 18,
          // border:"2px solid-black",
          justifyContent: "space-around",
          paddingTop: "3px",
          ...customStyle,
        }}
        id={`ribbon-height`}
        className="row"
      >
        {Object.keys(updatedData).map((key, index) => {
          return (
            <SelectComponent
              key={index}
              data={{
                ...updatedData[key],
                FontObj: data.FontObj,
                id: data.id,
                ImageList: data.ImageList,
              }}
            />
          );
        })}

        <div>
          <p
            id={data.ID + "-title"}
            style={{
              position: "absolute",
              bottom: 0,
              backgroundColor: "rgb(204, 204, 204)",
              margin: 0,
              fontWeight: "bolder",
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
            {Title}nsnjisnjsnjksnjk
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomRibbonGroup;
