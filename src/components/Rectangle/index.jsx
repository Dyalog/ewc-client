import { useAppData } from '../../hooks';
import { handleMouseDoubleClick, handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel, parseFlexStyles, rgbColor } from '../../utils';
import Canvas from '../Canvas';
import { Chart, ChartSeries, ChartSeriesItem } from '@progress/kendo-react-charts';

const Rectangle = ({
  data,
  parentSize = JSON.parse(localStorage.getItem('formDimension')),
  posn = [0, 0],
}) => {
  const { Points, Size, FCol, Radius, Visible, FStyle, FillCol, Event,CSS } = data?.Properties;
  const {socket} = useAppData()

    const customStyles = parseFlexStyles(CSS)
  const pointsArray = Points && Points[0].map((y, i) => [Points[1][i], y]);
  const sizeArray = Size && Size[0].map((y, i) => [Size[1][i], y]);

  const hasFCol = data?.Properties.hasOwnProperty('FCol');

  return (
    <div
      id={data?.ID}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        display: Visible == 0 ? 'none' : 'block',
        ...customStyles
      }}
      onMouseDown={(e) => {
        handleMouseDown(e, socket, Event,data?.ID);
      }}
      onMouseUp={(e) => {
        handleMouseUp(e, socket, Event, data?.ID);
      }}
      onMouseEnter={(e) => {
        handleMouseEnter(e, socket, Event, data?.ID);
      }}
      onMouseMove={(e) => {
        handleMouseMove(e, socket, Event, data?.ID);
      }}
      onMouseLeave={(e) => {
        handleMouseLeave(e, socket, Event, data?.ID);
      }}
      onWheel={(e) => {
        handleMouseWheel(e, socket, Event, data?.ID);
      }}
      onDoubleClick={(e)=>{
        handleMouseDoubleClick(e, socket, Event,data?.ID);
      }}
      
    >
      <svg height={parentSize && parentSize[0]} width={parentSize && parentSize[1]}>
        {pointsArray?.map((rectanglePoints, index) => {
          return (
            <rect
              id={index}
              rx={Radius && Radius[index * 0]}
              ry={Radius && Radius[index * 0]}
              x={rectanglePoints[0]}
              y={rectanglePoints[1]}
              width={sizeArray && sizeArray[index][0] + 1}
              height={sizeArray && sizeArray[index][1] + 1}
              fill={
                !FStyle
                  ? 'none'
                  : FStyle[index] == '-1'
                  ? 'none'
                  : rgbColor(FillCol && FillCol[index])
              }
              stroke={hasFCol ? FCol && rgbColor(FCol[index]) : 'rgb(0,0,0)'}
              strokeWidth={'1px'}

            />
          );
        })}
      </svg>
    </div>
  );
};

export default Rectangle;
