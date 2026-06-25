import { useState, useEffect, useMemo, useCallback } from 'react';
import { excludeKeys, getObjectById, getStringafterPeriod, parseFlexStyles } from '../../utils';
import './RibbonStyles.css';

import SelectComponent from '../SelectComponent';
import { useAppData } from '../../hooks';
import { measureGroup, computeStates } from './ribbonLayout';

// The ribbon band (Office Fluent "page content area"). Renders its child
// RibbonGroups left-to-right and owns the responsive priority-reduction ladder
// (spec §7): a single ResizeObserver reads the *available* width, each group's
// natural width per state is precomputed analytically (ribbonLayout.js), and a
// deterministic shrink pass assigns each group a state. Layout is CSS-owned.
const CustomRibbon = ({ data }) => {
  const updatedData = excludeKeys(data);
  const { dataRef, fontScale } = useAppData();
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

  // Precompute each group's [w0,w1,w2,w3] natural widths. Recomputed only when
  // the data tree or font changes — not per frame.
  const widths = useMemo(
    () =>
      groupKeys.map((k) => {
        const g = updatedData[k];
        const t = g?.Properties?.Title;
        const title = Array.isArray(t) ? t[0] : t;
        return measureGroup(g, title, fontPx);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, fontPx]
  );

  // Available width = how much horizontal room there is before the viewport
  // edge, capped by the band's actual container. This is what must not be
  // exceeded; reading the band's viewport-left here is a one-shot position
  // read, not the banned measure-own-output-and-resize feedback loop.
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

  const states = useMemo(
    () => computeStates(widths, available - 4),
    [widths, available]
  );

  return (
    <div
      id={data?.ID}
      className="ewc-ribbon"
      ref={setNode}
      style={{
        height: height ? `${height}px` : '94px',
        width: isFinite(available) ? `${available}px` : '100%',
        // Final safety net: if even all-collapsed overflows, scroll instead of
        // clipping. While the ladder keeps content within `available`, no
        // scrollbar appears.
        overflowX: 'auto',
        display: Visible == 0 ? 'none' : 'flex',
        ...customStyles,
      }}
    >
      {groupKeys.map((key, i) => (
        // Stable key = the child object id/key (server order). NEVER the index.
        <SelectComponent
          key={updatedData[key]?.ID || key}
          data={{ ...updatedData[key], FontObj, ImageList, groupState: states[i] }}
        />
      ))}
    </div>
  );
};

export default CustomRibbon;
