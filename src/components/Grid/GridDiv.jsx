import { parseFlexStyles, setStyle } from "../../utils";

const GridDiv = ({ data }) => {
  // Combine various sources of CSS, but Div's wins
  const {CSS} = data.typeObj.Properties;
  const fontProperties = data?.cellFont && data?.cellFont?.Properties;
  let fontStyles = {
    fontFamily: fontProperties?.PName,
    fontSize: fontProperties?.Size ? fontProperties?.Size : '12px',
    textDecoration: !fontProperties?.Underline
      ? 'none'
      : fontProperties?.Underline == 1
      ? 'underline'
      : 'none',
    fontStyle: !fontProperties?.Italic ? 'none' : fontProperties?.Italic == 1 ? 'italic' : 'none',
    fontWeight: !fontProperties?.Weight ? 0 : fontProperties?.Weight,
  };
  const style = {
    width: '100%',
    height: '100%',
    ...setStyle(data.Properties),
    ...fontStyles,
    ...parseFlexStyles(CSS)
  };

  const HTML = data.gridValues[data.row-1][data.column-1];

  const fillBox = {width: '100%', height: '100%', position: 'absolute', top: 0, left: 0};
  return (
      <div id={data.ID} style={style}>
          <div id={data.ID+'.$INNERHTML'} dangerouslySetInnerHTML={{__html: HTML}} style={fillBox}/>
      </div>
  );
};

export default GridDiv;
