import { parseFlexStyles, setStyle, excludeKeys } from "../../utils";
import SelectComponent from "../SelectComponent";

const Div = ({data}) => {
    const {HTML, CSS, Flex} = data.Properties;
    const style = {...setStyle(data.Properties, "absolute", Flex), ...parseFlexStyles(CSS)};
    
    // If Flex is present, make both containers flex containers and don't use
    // any defaults - we expect the APL user to know what they're doing here.
    // CSS affects outer div, innerHtml is up to them and likewise with children
    const innerHtmlStyle = Flex ? {display: 'flex'} : {width: '100%', height: '100%', position: 'absolute', top: 0, left: 0};
    const childrenStyle = Flex ? {display: 'flex'} : {width: '100%', height: '100%', position: 'absolute', top: 0, left: 0};
    const updatedData = excludeKeys(data);
    
    return (
        <div id={data.ID} style={style}>
            <div id={data.ID+'.$INNERHTML'} dangerouslySetInnerHTML={{__html: HTML}} style={innerHtmlStyle}/>
            <div id={data.ID+'.$CHILDREN'} style={childrenStyle}>
                {Object.keys(updatedData).map((key) => (
                    <SelectComponent key={key} data={updatedData[key]} />
                ))}
            </div>
        </div>
    );
};

export default Div;
