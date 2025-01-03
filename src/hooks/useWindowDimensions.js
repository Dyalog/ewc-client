import { useState, useEffect, useRef } from 'react';
import useAppData from './useAppData';

const useWindowDimensions = () => {
  const { socket,isDesktop } = useAppData();

  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  console.log("New height is",viewport);


  const resizeTimeoutRef = useRef(null);

  useEffect(() => {

    const handleResize = () => {
      const newViewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let zoom = Math.round(window.devicePixelRatio * 100);
      setViewport(newViewport);

      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      // const name=dataRef?.current?.Mode?.Properties?.Desktop
      if(!isDesktop)
      {

      resizeTimeoutRef.current = setTimeout(() => {
        let event = JSON.stringify({
          DeviceCapabilities: {
            ViewPort: [newViewport.height, newViewport.width],
            ScreenSize: [window.screen.height, window.screen.width],
            DPR: zoom / 100,
            PPI: 200,
          },
        });
        console.log({ event });
        socket.send(event);

      }, 1000);
    }

    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []); // Only run the effect once during component mount

  return viewport;
};

export default useWindowDimensions;
