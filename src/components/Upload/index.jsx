import { useEffect } from 'react';

const Upload = ({ data }) => {

  useEffect(() => {
    const fileInput = document.getElementById(data.ID);
    if (fileInput) {
      fileInput.value = "";
    }
  }, [data])

  return (
    <div>
      <input
        id={data.ID}
        type="file"
      />
    </div>
  );
};

export default Upload;
