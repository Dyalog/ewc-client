import { useAppData } from '../../hooks';
import { excludeKeys, findLongestID, parseFlexStyles, rgbColor } from '../../utils';
import SelectComponent from '../SelectComponent';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-bootstrap-ribbon/dist/react-bootstrap-ribbon.css';

const CustomRibbonGroup = ({ data }) => {
  const { findCurrentData, fontScale } = useAppData()
  const updatedData = excludeKeys(data);
  const { Size, Title, BorderCol, CSS } = data?.Properties;
  const customStyle = parseFlexStyles(CSS)
  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;



  const dataAltId = "ribbon-height";



  const divWidth = document.getElementById(data.ID + "-title")?.getBoundingClientRect().width;
  const titleDivHeight = document.getElementById(data.ID + "-title")?.getBoundingClientRect().height;
  const divHeight = document.getElementById("ribbon-height")?.getBoundingClientRect().height;
  // useEffect(() => {
  //   setWidthRemaining(divWidth)
  //   if (divHeight) {
  //     console.log({ divHeight })
  //     setHeightRemaining(`${divHeight + titleDivHeight}px`);
  //   }
  // }, [data?.ID]);

  const size = Size || 2;

  console.log("ribbon", data, findLongestID(data))

  console.log(divWidth)

  return (
    <div id={data?.ID} style={{ width: divWidth + "px" }}>
      <div
        style={{
          border: `1px solid ${rgbColor(BorderCol)}`,
          borderTop: 0,
          position: 'relative',
          width: divWidth + "px",
          alignItems: 'start',
          ...customStyle,
          height: (divHeight + titleDivHeight + 10) + "px",
        }}
        id={data?.ID + "-ribbon"}
        className='row'
      >
        {Object.keys(updatedData).map((key, index) => {
          return <SelectComponent key={index} data={{ ...updatedData[key], FontObj: data.FontObj }} />;
        })}

        <div
        >
          <p id={data.ID + "-title"} style={{
            position: 'absolute',
            bottom: 0,
            backgroundColor: 'rgb(204, 204, 204)',
            margin: 0, fontWeight: 'bolder', fontFamily: fontProperties?.PName,
            fontSize: fontProperties?.Size
              ? `${fontProperties.Size * fontScale}px`
              : `${12 * fontScale}px`,
            minWidthidth: "min-content",
            paddingLeft: "10px",
            paddingRight: "10px"
          }} className='text-center'>
            {Title}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomRibbonGroup;
