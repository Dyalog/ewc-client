import { useAppData } from '../../hooks';
import { handleMouseDoubleClick, handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel, parseFlexStyles, renderImage, setStyle } from '../../utils';
import BitmapCanvas from './BitmapCanvas';

const Image = ({ data }) => {
  const { findDesiredData, socket } = useAppData();
  const { Points, Picture, Visible, Event, CSS } = data?.Properties;
  const customStyles = parseFlexStyles(CSS);

  // ⎕WC Points is (Y X), and either axis may be a SCALAR standing for every
  // point: `('Points'(0 (x1 x2 x3)))` means three points sharing y=0. Mapping
  // over Y alone drew only the first, so an Image asked to show a row of
  // bitmaps rendered exactly one of them.
  const asList = (v) => (Array.isArray(v) ? v : [v]);
  const ys = asList(Points?.[0]);
  const xs = asList(Points?.[1]);
  const nPoints = Math.max(ys.length, xs.length);
  const pointsArray = Points
    ? Array.from({ length: nPoints }, (_, i) => [
        xs[Math.min(i, xs.length - 1)],
        ys[Math.min(i, ys.length - 1)],
      ])
    : undefined;
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
        // Picture is one name per point, or a single name shared by all of
        // them (or a (name style) pair, where element 1 is the style).
        const picNames = Array.isArray(Picture) ? Picture : [Picture];
        const picName = typeof picNames[index] === 'string'
          ? picNames[index]
          : picNames[0];
        const imageObject = findDesiredData(picName);
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
