import { useAppData } from '../../hooks';
import { handleMouseDoubleClick, handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel, parseFlexStyles, rgbColor } from '../../utils';

const Rectangle = ({
  data,
  parentSize = JSON.parse(localStorage.getItem('formDimension')),
  posn = [0, 0],
}) => {
  const { Points, Size, FCol, Radius, Visible, FStyle, FillCol, Event, CSS } = data?.Properties;
  const { socket } = useAppData();

  const customStyles = parseFlexStyles(CSS);
  const pointsArray = Points && Points[0].map((y, i) => [Points[1][i], y]);
  const sizeArray = Size && Size[0].map((y, i) => [Size[1][i], y]);

  const hasFCol = data?.Properties.hasOwnProperty('FCol');

  return (
    <div
      id={data?.ID}
      style={{
        position: 'absolute',
        display: Visible == 0 ? 'none' : 'block',
      }}
    >
      {pointsArray?.map((rectanglePoints, index) => {
        const rectWidth = sizeArray && sizeArray[index][0] + 1;
        const rectHeight = sizeArray && sizeArray[index][1] + 1;

        return (
          <svg
            key={index}
            id={`${data?.ID}-r${index + 1}`}
            style={{
              position: 'absolute',
              top: `${rectanglePoints[1]}px`,
              left: `${rectanglePoints[0]}px`,
              pointerEvents: 'auto',
              overflow: 'visible',
              ...customStyles,
            }}
            width={rectWidth}
            height={rectHeight}
            onMouseDown={(e) => {
              handleMouseDown(e, socket, Event, data?.ID);
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
            onDoubleClick={(e) => {
              handleMouseDoubleClick(e, socket, Event, data?.ID);
            }}
          >
            <rect
              rx={Radius && Radius[index * 0]}
              ry={Radius && Radius[index * 0]}
              x="0"
              y="0"
              width={rectWidth}
              height={rectHeight}
              fill={
                !FStyle
                  ? 'none'
                  : FStyle[index] == '-1'
                  ? 'none'
                  : rgbColor(FillCol && FillCol[index])
              }
              stroke={hasFCol ? FCol && rgbColor(FCol[index]) : 'rgb(0,0,0)'}
              strokeWidth="1px"
            />
          </svg>
        );
      })}
    </div>
  );
};

export default Rectangle;
