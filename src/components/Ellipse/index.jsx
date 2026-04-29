import { useAppData } from '../../hooks';
import { handleMouseDoubleClick, handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel, parseFlexStyles, rgbColor } from '../../utils';

const Ecllipse = ({ data }) => {
  const { FillCol, Start, FCol, Size, End, Points, Event, CSS, Visible } = data?.Properties;
  const customStyles = parseFlexStyles(CSS);
  const { socket } = useAppData();

  // Points is the top-left corner of the ellipse
  const x = Points && Points[1][0];
  const y = Points && Points[0][0];
  const rx = Size && Size[1][0] / 2;
  const ry = Size && Size[0][0] / 2;

  // Center is at Points + Size/2
  const cx = x + rx;
  const cy = y + ry;

  // Bounding box
  const minX = x;
  const minY = y;
  const width = rx * 2;
  const height = ry * 2;

  const generatePieChartPaths = (startAngles) => {

    const paths = [];

    for (let i = 0; i < startAngles?.length; i++) {
      const startAngle = -startAngles[i];
      const endAngle = i === startAngles?.length - 1 ? 2 * Math.PI : -startAngles[i + 1];

      const startX = cx + rx * Math.cos(startAngle);
      const startY = cy + ry * Math.sin(startAngle);
      const endX = cx + rx * Math.cos(endAngle);
      const endY = cy + ry * Math.sin(endAngle);

      const path = `
                M ${cx},${cy}
                L ${startX},${startY}
                A ${rx},${ry} 0 0,0 ${endX},${endY}
                Z
            `;

      paths.push({
        d: path,
        fill: rgbColor(FillCol && FillCol[i]),
        stroke: 'black',
        strokeWidth: '1',
      });
    }

    return paths;
  };

  const generatePieChartPathsWithEnd = (startAngles, endAngles) => {
    const paths = [];

    for (let i = 0; i < startAngles.length; i++) {
      const startAngle = -startAngles[i];
      const endAngle = -endAngles[i];

      const startX = cx + rx * Math.cos(startAngle);
      const startY = cy + ry * Math.sin(startAngle);
      const endX = cx + rx * Math.cos(endAngle);
      const endY = cy + ry * Math.sin(endAngle);

      const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1'; // Determine large arc flag

      const path = `
      M ${cx},${cy}
      L ${startX},${startY}
      A ${rx},${ry} 0 ${largeArcFlag},0 ${endX},${endY}
      Z
    `;

      paths.push({
        d: path,
        fill: rgbColor(FillCol && FillCol[i]),
        stroke: 'black',
        strokeWidth: '1',
      });
    }

    return paths;
  };




  const paths = !End
    ? generatePieChartPaths(Start)
    : generatePieChartPathsWithEnd(Start, End);

  return (
    <div
      style={{
        position: 'absolute',
        display: Visible == 0 ? 'none' : 'block',
      }}
    >
      <svg
        id={data?.ID}
        viewBox={`${minX} ${minY} ${width} ${height}`}
        style={{
          position: 'absolute',
          top: `${minY}px`,
          left: `${minX}px`,
          pointerEvents: 'auto',
          overflow: 'visible',
          ...customStyles,
        }}
        height={height}
        width={width}
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
        {paths.map((path, index) => (
          <path
            key={index}
            d={path.d}
            fill={path.fill}
            stroke={path.stroke}
            strokeWidth={path.strokeWidth}
          />
        ))}
      </svg>
    </div>
  );
};
export default Ecllipse;

// Correct value for the Pie Chart
/* <path
          d='M 210,160 L 410,160 A 200,150 0 0,0 357.682,53.097 Z'
          fill='#ff0000'
          stroke='black'
          strokeWidth='1'
        />
        <path
          d='M 210,160 L 357.682,53.097 A 200,150 0 0,0 70.757,59.502 Z'
          fill='#00ff00'
          stroke='black'
          strokeWidth='1'
        />
        <path
          d='M 210,160 L  70.757,59.502 A 200,150 0 0,0 151.36,309.94 Z'
          fill='#ffff00'
          stroke='black'
          strokeWidth='1'
        />
        <path
          d='M 210,160 L 151.36,309.94 A 200,150 0 0,0 410,160 Z'
          fill='#0000ff'
          stroke='black'
          strokeWidth='1'
        /> */
