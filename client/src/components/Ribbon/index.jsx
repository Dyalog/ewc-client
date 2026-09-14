import { useState, useEffect, useCallback } from 'react';
import { excludeKeys, getObjectById, getStringafterPeriod, parseFlexStyles } from '../../utils';
import './RibbonStyles.css';

import SelectComponent from '../SelectComponent';
import { useAppData } from '../../hooks';
import { measureGroup, computeStates } from './ribbonLayout';

const CustomRibbon = ({ data }) => {
  const updatedData = excludeKeys(data);
  const { dataRef, fontScale, findCurrentData } = useAppData();
  const { Visible, ImageListObj, CSS, FontObj } = data?.Properties || {};
  const customStyles = parseFlexStyles(CSS);
  const ID = getStringafterPeriod(ImageListObj);
  const height = data?.Properties?.BodyHeight;
  const ImageList = ID && JSON.parse(getObjectById(dataRef.current, ID));

  const [node, setNode] = useState(null);
  // Start unconstrained (Infinity → everything Large) until the observer fires.
  const [available, setAvailable] = useState(Infinity);

  const groupKeys = Object.keys(updatedData);
  const fontPx = 12 * (fontScale || 1);

  // Each group's [w0,w1,w2,w3] natural widths, computed fresh every render
  const widths = groupKeys.map((k) => {
    const g = updatedData[k];
    const t = g?.Properties?.Title;
    const title = Array.isArray(t) ? t[0] : t;
    // Slightly hacky: findCurrentData lets ustell small (16x16) buttons from
    // large
    return measureGroup(g, title, fontPx, findCurrentData);
  });

  // Recomputes the available property - how much is on the right of the Form
  const recompute = useCallback(() => {
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const parentW = node.parentElement ? node.parentElement.clientWidth : window.innerWidth;
    const room = window.innerWidth - rect.left - 12;
    setAvailable(Math.max(140, Math.min(parentW, room)));
  }, [node]);

  useEffect(() => {
    if (!node) return;
    recompute();
    const ro = new ResizeObserver(() => recompute());
    ro.observe(node);
    if (node.parentElement) ro.observe(node.parentElement);
    window.addEventListener('resize', recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [node, recompute]);

  const states = computeStates(widths, available - 4);

  return (
    <div
      id={data?.ID}
      className="ewc-ribbon"
      ref={setNode}
      style={{
        height: height ? `${height}px` : undefined,
        width: '100%',
        overflowX: 'auto',
        display: Visible == 0 ? 'none' : 'flex',
        ...customStyles,
      }}
    >
      {groupKeys.map((key, i) => (
        <SelectComponent
          key={updatedData[key]?.ID || key}
          data={{ ...updatedData[key], FontObj, ImageList, groupState: states[i] }}
        />
      ))}
    </div>
  );
};

export default CustomRibbon;
