import { useState, useEffect, useCallback } from 'react';
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

  // Each group's [w0,w1,w2,w3] natural widths, computed fresh every render. The
  // EWC tree is mutated in place (handleData), so `data` keeps its identity as
  // children stream in — memoizing on it would measure an empty tree once and
  // never refresh. Measuring a handful of captions via canvas is cheap.
  const widths = groupKeys.map((k) => {
    const g = updatedData[k];
    const t = g?.Properties?.Title;
    const title = Array.isArray(t) ? t[0] : t;
    // findCurrentData lets the estimator tell small (16x16) buttons from large
    // ones, so its Large-state width matches the band's stacked layout.
    return measureGroup(g, title, fontPx, findCurrentData);
  });

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

  const states = computeStates(widths, available - 4);

  return (
    <div
      id={data?.ID}
      className="ewc-ribbon"
      ref={setNode}
      style={{
        // The app's authored body height wins; otherwise the band takes its
        // height from the `--ribbon-band-h` token in RibbonStyles.css, so the
        // default lives with the rest of the layout instead of as a literal here.
        height: height ? `${height}px` : undefined,
        // Fill the tab-control width so the band's own background covers the tab
        // page — otherwise the page's themed (blue) colour shows as a sliver to
        // the right of the last group. `available` (window room, minus a margin)
        // still drives the priority-reduction ladder below, so groups stay within
        // the viewport; the band itself just spans its parent.
        width: '100%',
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
