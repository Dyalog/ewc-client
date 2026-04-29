import { useAppData } from "../../hooks";
import { handleMouseDoubleClick, handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel, parseFlexStyles, rgbColor, setStyle } from "../../utils";

const Poly = ({ data }) => {
  const { FCol, FillCol, LWidth, Points, FStyle, Visible, Event, CSS } = data?.Properties;
  const { socket } = useAppData();
  const customStyles = parseFlexStyles(CSS);
  const style = setStyle(data.Properties);

  const hasFCol = data?.Properties.hasOwnProperty("FCol");

  return (
    <div
      id={data?.ID}
      style={{
        position: "absolute",
        display: Visible == 0 ? "none" : "block",
      }}
    >
      {Points?.map((polygonPoints, index) => {
        const flatArray =
          polygonPoints &&
          polygonPoints[0].map((x, i) => [polygonPoints[1][i], x]);

        // Calculate bounding box for this polygon
        const xCoords = polygonPoints && polygonPoints[1];
        const yCoords = polygonPoints && polygonPoints[0];
        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);
        const width = maxX - minX;
        const height = maxY - minY;

        return (
          <svg
            key={index}
            id={`${data?.ID}-p${index + 1}`}
            viewBox={`${minX} ${minY} ${width} ${height}`}
            style={{
              position: "absolute",
              top: `${minY}px`,
              left: `${minX}px`,
              pointerEvents: "auto",
              overflow: "visible",
              ...style,
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
            <polygon
              points={flatArray && flatArray.flat().join(" ")}
              fill={
                FStyle && FStyle[index] == "-1"
                  ? "none"
                  : FillCol && rgbColor(FillCol[index])
              }
              stroke={hasFCol ? FCol && rgbColor(FCol[index]) : "rgb(0,0,0)"}
              strokeWidth={LWidth && LWidth[index]}
            />
          </svg>
        );
      })}
    </div>
  );
};

export default Poly;
