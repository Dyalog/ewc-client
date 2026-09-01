import wgResponse from "../../utils/wgResponse";
import { setStyle, getFontStyles, parseFlexStyles } from "../../utils";
import { useAppData } from "../../hooks";

const Upload = ({ data }) => {
  const { findCurrentData, inheritedProperties } = useAppData();

  const styles = setStyle(data?.Properties);
  const { CSS, Visible, TabIndex } = data?.Properties || {};
  const { FontObj } = inheritedProperties(data, 'FontObj');

  const customStyles = parseFlexStyles(CSS);
  const font = findCurrentData(FontObj);
  const fontStyles = getFontStyles(font, 12);

  return (
    <div
      id={data.ID + ".$CONTAINER"}
      style={{
        ...styles,
        display: Visible === 0 ? "none" : "block",
        ...customStyles,
        ...fontStyles,
      }}
    >
      <input
        id={data.ID}
        tabIndex={TabIndex}
        type="file"
        style={{
          width: "100%",
          height: "100%",
          font: "inherit",
        }}
      />
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
  let file = document.getElementById(serverEvent.ID)?.files[0];
  if (!file) return send(wgResponse(serverEvent, Upload, {}));

  // This whole function needs to use the async FileReader. The desired
  // behaviour is that when the file is unreadable, we return the defaults, even
  // though file.name and such exist.
  // To do that, we read the file. If FileBytes is *not* requested, we read 1
  // byte, otherwise the whole file.
  const fileProps = {
    LastModified: file.lastModified,
    FileName: file.name,
    FileSize: file.size,
    FileType: file.type,
  };

  if (!serverEvent.Properties.includes('FileBytes')) file = file.slice(0, 1);

  const reader = new FileReader();
  reader.onload = (event) => {
    fileProps.FileBytes = btoa(event.target.result)
    send(wgResponse(serverEvent, Upload, fileProps));
  };
  reader.onerror = (_event) => {
    send(wgResponse(serverEvent, Upload, {}));
  };
  reader.readAsBinaryString(file);
};

export default Upload;
