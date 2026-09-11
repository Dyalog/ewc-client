import { setStyle, getImageStyles } from '../../utils';
import { useAppData, useAttachStyle } from '../../hooks';
import { useEffect } from 'react';

const ImageSubForm = ({ data }) => {

  const { findDesiredData } = useAppData();

  const styles = setStyle(data?.Properties);
  const attachStyle = useAttachStyle(data);
  const { Size, Picture, Posn } = data?.Properties;

  const ImageData = findDesiredData(Picture && Picture[0]);

  const imageStyles = getImageStyles(Picture && Picture[1], ImageData);

  const parentSize = JSON.parse(localStorage.getItem('formDimension'));

  useEffect(() => {
    localStorage.setItem(
      data.ID,
      JSON.stringify({
        Size: !Size ? [parentSize[0], parentSize[1]] : Size,
        Posn: !Posn ? [0, 0] : Posn,
      })
    );
  }, []);

  let updatedStyles = { ...styles, ...imageStyles, ...attachStyle };

  return <div style={updatedStyles}></div>;
};

export default ImageSubForm;
