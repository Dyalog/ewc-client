import { useEffect, useState } from 'react';

// box: 'border' (default — offsetWidth/Height) or 'content' (clientWidth/Height,
// which EXCLUDES the border). AutoConf must measure the CONTENT box: a child's
// position:absolute coordinates are relative to its container's padding box, not
// its border box, so measuring offsetWidth would make the reflow scale ≠ 1 at
// rest for any bordered container (e.g. a Groove SubForm).
const useResizeObserver = (parent, { box = 'border' } = {}) => {
  const contentBox = box === 'content';
  const [dimensions, setDimensions] = useState({
    width: parent?.clientWidth,
    height: parent?.clientHeight,
  });

  useEffect(() => {
    if (!parent) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const t = entries[0].target;

      setDimensions(
        contentBox
          ? { width: t.clientWidth, height: t.clientHeight }
          : { width: t.offsetWidth, height: t.offsetHeight }
      );
    });

    resizeObserver.observe(parent);

    return function cleanup() {
      resizeObserver.disconnect();
    };
  }, [parent, contentBox]);

  return dimensions;
};

export default useResizeObserver;
