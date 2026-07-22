import { useAppData } from '../../hooks';
import { handleMouseDoubleClick, handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel, parseFlexStyles, renderImage, setStyle } from '../../utils';
import BitmapCanvas from './BitmapCanvas';

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
        const cbits = imageObject?.Properties?.CBits;

        const positionStyle = {
          position: 'absolute',
          top: `${imagePoints[1]}px`,
          left: `${imagePoints[0]}px`,
          pointerEvents: 'auto',
          ...style,
          ...customStyles,
        };

        const mouseHandlers = {
          onMouseDown: (e) => handleMouseDown(e, socket, Event, data?.ID),
          onMouseUp: (e) => handleMouseUp(e, socket, Event, data?.ID),
          onMouseEnter: (e) => handleMouseEnter(e, socket, Event, data?.ID),
          onMouseMove: (e) => handleMouseMove(e, socket, Event, data?.ID),
          onMouseLeave: (e) => handleMouseLeave(e, socket, Event, data?.ID),
          onWheel: (e) => handleMouseWheel(e, socket, Event, data?.ID),
          onDoubleClick: (e) => handleMouseDoubleClick(e, socket, Event, data?.ID),
        };

        // A BitMap object carries CBits (a matrix of packed 24-bit RGB values)
        // rather than a File; blit it straight onto a canvas. File-backed
        // bitmaps have no (or empty) CBits and keep the <img> path below.
        if (cbits?.length) {
          return (
            <BitmapCanvas
              key={index}
              id={`${data?.ID}-i${index + 1}`}
              cbits={cbits}
              style={positionStyle}
              handlers={mouseHandlers}
            />
          );
        }

        const ImageUrl = renderImage(imageObject);

        return (
          <img
            key={index}
            id={`${data?.ID}-i${index + 1}`}
            src={ImageUrl}
            style={positionStyle}
            {...mouseHandlers}
          />
        );
      })}
    </div>
  );
};

export default Image;
