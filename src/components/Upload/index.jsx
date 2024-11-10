import wgResponse from "../../utils/wgResponse";

const Upload = ({ data }) => {
  return (
    <div>
      <input id={data.ID} type="file" />
    </div>
  );
};

Upload.Defaults = {
  LastModified: -1,
  FileName: "",
  FileSize: -1,
  FileType: "",
  FileBytes: "",
};

Upload.WG = (send, serverEvent) => {
  const file = document.getElementById(serverEvent.ID)?.files[0];
  const fileAttrs = file ? {
    LastModified: file.lastModified,
    FileName: file.name,
    FileSize: file.size,
    FileType: file.type,
  } : {};

  // We want to avoid reading bytes and using and entering the async
  // world, if possible
  if (!file || !serverEvent.Properties.includes('FileBytes')) {
    send(wgResponse(serverEvent, Upload, fileAttrs));
  } else {
    const reader = new FileReader();
    reader.onload = (event) => {
      fileAttrs.FileBytes = btoa(event.target.result)
      send(wgResponse(serverEvent, Upload, fileAttrs));
    };
    reader.onerror = (_event) => {
      // On an error reading the file, we return the defaults
      send(wgResponse(serverEvent, Upload, Upload.Defaults));
    };
    reader.readAsBinaryString(file); // TODO deprecated function
  }
};

export default Upload;