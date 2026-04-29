import { useAppData } from '../../hooks';
import { handleMouseDoubleClick, handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel, parseFlexStyles, renderImage, setStyle } from '../../utils';

const Image = ({ data }) => {
  const { findDesiredData, socket } = useAppData();
  const { Points, Picture, Visible, Event, CSS } = data?.Properties;
  const customStyles = parseFlexStyles(CSS);

  const pointsArray = Points && Points[0].map((y, i) => [Points[1][i], y]);
  const style = setStyle(data.Properties);

  return (
    <div
      id={data?.ID}
      style={{
        position: 'absolute',
        display: Visible == 0 ? 'none' : 'block',
      }}
    >
      {pointsArray?.map((imagePoints, index) => {
        const imageObject = findDesiredData(Picture && Picture[index]);
        const ImageUrl = renderImage(imageObject);

        return (
          <img
            key={index}
            id={`${data?.ID}-i${index + 1}`}
            src={ImageUrl}
            style={{
              position: 'absolute',
              top: `${imagePoints[1]}px`,
              left: `${imagePoints[0]}px`,
              pointerEvents: 'auto',
              ...style,
              ...customStyles,
            }}
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
          />
        );
      })}
    </div>
  );
};

export default Image;
