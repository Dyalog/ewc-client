import { useRef } from 'react';
import { useAppData } from '../../hooks';

// EWC ColorButton (⎕WC 'colorbutton') → a native colour-picker swatch. The app
// sets CurrentColor ([r,g,b], 0-255) and reads the chosen colour via a
// ColorChange event; picking one fires that event with the new [r,g,b]. Native
// <input type="color"> opens the OS picker on click. (The app also NQs
// 'GotFocus' to pop the picker; browsers only open it from a user gesture, so
// that path focuses the swatch rather than auto-opening — a known limitation.)
const clamp = (c) => Math.max(0, Math.min(255, Math.round(c || 0)));
const rgbToHex = (rgb) =>
  Array.isArray(rgb) && rgb.length === 3
    ? '#' + rgb.map((c) => clamp(c).toString(16).padStart(2, '0')).join('')
    : '#000000';
const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const ColorButton = ({ data }) => {
  const { Posn, Size, CurrentColor, Visible, Active, TabIndex } = data?.Properties || {};
  const { socket } = useAppData();
  const ref = useRef(null);

  if (Visible === 0) return null;

  const [top, left] = Posn || [0, 0];
  const [height, width] = Size || [50, 70];

  return (
    <input
      ref={ref}
      type="color"
      id={data?.ID}
      value={rgbToHex(CurrentColor)}
      tabIndex={TabIndex}
      disabled={Active === 0}
      style={{ position: 'absolute', top, left, width, height, margin: 0, padding: 0 }}
      onChange={(e) => {
        const rgb = hexToRgb(e.target.value);
        socket?.send(JSON.stringify({ Event: { EventName: 'ColorChange', ID: data.ID, Info: rgb } }));
      }}
    />
  );
};

export default ColorButton;
