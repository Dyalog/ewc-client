import { useState } from 'react';
import { useAppData } from '../../hooks';

// EWC Trackbar (⎕WC 'trackbar') → a native range slider. The app reads
// `.Thumb` (its current value); we push Thumb into the central tree on drag so
// a WG read returns the live value (the Scroll WG branch in App.jsx answers
// Thumb for 'Trackbar' too). Posn = [top,left], Size = [height,width], pixels.
const TrackBar = ({ data }) => {
  const { Posn, Size, Limits, Thumb, Visible, TabIndex, Active } = data?.Properties || {};
  const { handleData } = useAppData();
  const [min, max] = Limits && Limits.length === 2 ? Limits : [1, 100];
  const [value, setValue] = useState(Thumb ?? min);

  if (Visible === 0) return null;

  const [top, left] = Posn || [0, 0];
  const [height, width] = Size || [30, 200];

  return (
    <input
      type="range"
      id={data?.ID}
      min={min}
      max={max}
      value={value}
      tabIndex={TabIndex}
      disabled={Active === 0}
      style={{ position: 'absolute', top, left, width, height, margin: 0 }}
      onChange={(e) => {
        const v = Number(e.target.value);
        setValue(v);
        // local-only update to the tree, so a later WG read of Thumb is current
        handleData({ ID: data.ID, Properties: { Thumb: v } }, 'WS');
      }}
    />
  );
};

export default TrackBar;
