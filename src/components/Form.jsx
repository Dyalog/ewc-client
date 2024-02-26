import { setStyle, excludeKeys, rgbColor, getImageStyles } from '../utils';
import SelectComponent from './SelectComponent';
import { useAppData, useResizeObserver } from '../hooks';
import { useEffect, useState } from 'react';

const Form = ({ data }) => {
  const PORT = localStorage.getItem('PORT');
  const { findDesiredData, socket } = useAppData();
  const [formStyles, setFormStyles] = useState({});

  const dimensions = useResizeObserver(document.getElementById(data?.ID));

  const styles = setStyle(data?.Properties, 'relative');

  const { BCol, Picture, Size, Visible, Posn, Flex = 0, Event } = data?.Properties;
  const updatedData = excludeKeys(data);
  const ImageData = findDesiredData(Picture && Picture[0]);

  let imageStyles = getImageStyles(Picture && Picture[1], PORT, ImageData);

  const sendConfigureEvent = () => {
    const event = JSON.stringify({
      Event: {
        EventName: 'Configure',
        ID: data?.ID,
        Info: [Posn && Posn[0], Posn && Posn[1], Size && Size[0], Size && Size[1]],
      },
    });
    const exists = Event && Event.some((item) => item[0] === 'Configure');
    console.log(event);
    if (!exists) return;
    socket.send(event);
  };

  const sendDeviceCapabilities = () => {
    let zoom = Math.round(window.devicePixelRatio * 100);
    let event = JSON.stringify({
      DeviceCapabilities: {
        ViewPort: [window.innerHeight, window.innerWidth],
        ScreenSize: [window.screen.height, window.screen.width],
        DPR: zoom / 100,
        PPI: 200,
      },
    });
    console.log(event);
    socket.send(event);
  };

  // Set the current Focus
  useEffect(() => {
    localStorage.setItem('current-focus', data.ID);
  }, []);

  // useEffect to check the size is present otherwise Viewport half height and width

  useEffect(() => {
    const hasSize = data?.Properties?.hasOwnProperty('Size');

    const halfViewportWidth = Math.round(window.innerWidth / 2);

    const halfViewportHeight = Math.round(window.innerHeight / 2);

    localStorage.setItem(
      'formDimension',
      JSON.stringify(hasSize ? Size : [halfViewportHeight, halfViewportWidth])
    );

    localStorage.setItem(
      data?.ID,
      JSON.stringify({
        Size: hasSize ? Size : [halfViewportHeight, halfViewportWidth],
        Posn,
      })
    );

    setFormStyles(
      setStyle(
        {
          ...data?.Properties,
          ...(hasSize ? { Size } : { Size: [halfViewportHeight, halfViewportWidth] }),
        },
        'relative',
        Flex
      )
    );
  }, [data]);

  useEffect(() => {
    console.log('FormResized');
    sendConfigureEvent();
    sendDeviceCapabilities();
  }, [dimensions]);

  return (
    <div
      id={data?.ID}
      style={{
        ...formStyles,
        // width: '1000px',
        background: BCol ? rgbColor(BCol) : '#F0F0F0',
        position: 'relative',
        border: '1px solid #F0F0F0',
        display: Visible == 0 ? 'none' : 'block',
        ...imageStyles,
        overflow: 'hidden',
      }}
    >
      {Object.keys(updatedData).map((key) => {
        return <SelectComponent data={updatedData[key]} />;
      })}
    </div>
  );
};

export default Form;
