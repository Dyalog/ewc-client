import { useEffect, useState } from 'react';

// Watch for resizes, but be box dimensions-aware
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
