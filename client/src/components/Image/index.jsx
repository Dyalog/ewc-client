import { useAppData } from '../../hooks';
import { handleMouseDoubleClick, handleContextMenu,
  handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel, parseFlexStyles, renderImage, setStyle } from '../../utils';
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

        // Points are ABSOLUTE positions within the parent, so they have to win
        // over whatever setStyle produced — which was spread last and set
        // `position: relative`, since a multi-point Image has no Posn of its
        // own. left/top then became offsets from the FLOW position instead of
        // from the parent, so each image was displaced by the accumulated
        // width of the ones before it: point 58px apart plus a 54px card
        // rendered 112px apart.
        //
        // Visible in Arachnid's Show Stack, where DISPCARDS lays a row out at
        // `PTS×CardWidth` and sizes the window to fit exactly four of them —
        // so at double spacing the window showed two cards and clipped the
        // rest.
        // Order is the point of this. setStyle's output is EWC's own DERIVED
        // default and must not beat the Points; customStyles is the CSS the
        // application asked for explicitly and must beat everything.
        const positionStyle = {
          pointerEvents: 'auto',
          ...style,
          position: 'absolute',
          top: `${imagePoints[1]}px`,
          left: `${imagePoints[0]}px`,
          ...customStyles,
        };

        const mouseHandlers = {
          onContextMenu: (e) => handleContextMenu(e, Event),
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
