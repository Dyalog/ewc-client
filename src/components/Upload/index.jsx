import { useEffect } from 'react';
import { setStyle } from '../../utils';

const Upload = ({ data }) => {

  const style = setStyle(data.Properties)
  useEffect(() => {
    const fileInput = document.getElementById(data.ID);
    if (fileInput) {
      fileInput.value = "";
    }
  }, [data])

  return (
    <div>
      <input
        style={{
          ...style
        }}
        id={data.ID}
        type="file"
      />
    </div>
  );
};

export default Upload;
