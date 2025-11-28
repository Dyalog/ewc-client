import { useAppData } from '../../hooks';
import { handleMouseDoubleClick, handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel, parseFlexStyles, rgbColor } from '../../utils';

const Circle = ({ data }) => {
  const { FillCol, Start, FCol, Points, Radius, Event, CSS, Visible } = data?.Properties;
  const customStyles = parseFlexStyles(CSS);
  const { socket } = useAppData();

  const cx = Points && Points[1][0];
  const cy = Points && Points[0][0];
  const rx = Radius && Radius[0];
  const ry = Radius && Radius[0];

  // Calculate bounding box
  const minX = cx - rx;
  const minY = cy - ry;
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
        fill: 'none',
        stroke: FCol && rgbColor(FCol[i]),
        strokeWidth: '1',
      });
    }

    return paths;
  };

  const paths = generatePieChartPaths(Start);

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

export default Circle;
