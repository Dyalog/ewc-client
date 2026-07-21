import { useEffect, useRef } from 'react';

// Naive BitMap renderer.
//
// A ⎕WC BitMap hands us CBits: a matrix (rows = height, cols = width) whose
// elements are packed 24-bit colours (R×65536 + G×256 + B), exactly as Dyalog
// builds them. We decode straight into an ImageData buffer and blit it onto a
// canvas. The effect re-runs whenever CBits changes (every draw/colorize frame)
// — deliberately naive: the whole raster is re-sent and repainted each time.
const BitmapCanvas = ({ cbits, id, style, handlers }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cbits?.length) return;

    const height = cbits.length;
    const width = cbits[0].length;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(width, height);
    const buf = image.data;

    let p = 0;
    for (let y = 0; y < height; y++) {
      const row = cbits[y];
      for (let x = 0; x < width; x++) {
        const v = row[x];
        buf[p++] = (v >> 16) & 255; // R
        buf[p++] = (v >> 8) & 255; // G
        buf[p++] = v & 255; // B
        buf[p++] = 255; // A
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [cbits]);

  return <canvas ref={canvasRef} id={id} style={style} {...handlers} />;
};

export default BitmapCanvas;
