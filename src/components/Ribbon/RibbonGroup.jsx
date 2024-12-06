import { useAppData } from '../../hooks';
import { excludeKeys, parseFlexStyles, rgbColor, setStyle } from '../../utils';
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

 
  const size = Size || 1;

  return (
    <div id={data?.ID} className={`col-${size === 3 ? 6 : size}`}>
      <div
        style={{
          border: `1px solid ${rgbColor(BorderCol)}`,
          borderTop: 0,
          position: 'relative',
          height: '100%',
          alignItems: 'center',
          ...customStyle
        }}
        className='row'
      >
        {Object.keys(updatedData).map((key, index) => {
          return <SelectComponent key={index} data={{...updatedData[key], FontObj: data.FontObj}} />;
        })}

        <div
          style={{
            backgroundColor: 'rgb(204, 204, 204)',
            position: 'absolute',
            bottom: 0,
            width: '100%',

          }}
        >
          <p style={{
            margin: 0, fontWeight: 'bolder', fontFamily: fontProperties?.PName,
            fontSize: fontProperties?.Size
              ? `${fontProperties.Size * fontScale}px`
              : `${12 * fontScale}px`,
          }} className='text-center'>
            {Title}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomRibbonGroup;
