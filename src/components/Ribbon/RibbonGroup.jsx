import { useAppData } from "../../hooks";
import { excludeKeys, parseFlexStyles } from "../../utils";
import SelectComponent from "../SelectComponent";

// A ribbon group (Office "page group"): a fixed-height column made of an item
// region (row of columns) above a centred caption strip. The vertical hairline
// to the next group is a CSS border — there is no group box border.
//
// Milestone 1: ALL the old imperative measurement is gone (the setTimeout /
// getBoundingClientRect loops / element.remove() / stale-dep resize listener).
// Sizing is owned entirely by RibbonStyles.css.
const CustomRibbonGroup = ({ data }) => {
  const { findCurrentData, fontScale } = useAppData();

  const updatedData = excludeKeys(data);
  const { Title, CSS } = data?.Properties || {};
  const customStyle = parseFlexStyles(CSS);
  const font = findCurrentData(data.FontObj && data.FontObj);
  const fontProperties = font && font?.Properties;

  // Title may arrive as a bare string or a 1-element vector (["File"]).
  const caption = Array.isArray(Title) ? Title[0] : Title;

  return (
    <div id={data?.ID} className="ewc-ribbon-group" style={customStyle}>
      <div className="ewc-ribbon-group-items">
        {Object.keys(updatedData).map((key) => (
          <SelectComponent
            key={updatedData[key]?.ID || key}
            data={{
              ...updatedData[key],
              FontObj: data.FontObj,
              ImageList: data.ImageList,
            }}
          />
        ))}
      </div>

      <div className="ewc-ribbon-group-caption">
        <span
          id={data.ID + "-title"}
          className="ewc-ribbon-group-caption-text"
          style={{
            fontFamily: fontProperties?.PName,
            fontSize: fontProperties?.Size
              ? `${fontProperties.Size * fontScale}px`
              : undefined,
          }}
        >
          {caption}
        </span>
      </div>
    </div>
  );
};

export default CustomRibbonGroup;
