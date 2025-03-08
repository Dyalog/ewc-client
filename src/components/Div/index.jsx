import { parseFlexStyles, setStyle } from "../../utils";

const Div = ({data}) => {
    const {HTML, CSS} = data.Properties;
    const style = {...setStyle(data.Properties), ...parseFlexStyles(CSS)};
    const fillBox = {width: '100%', height: '100%', position: 'absolute', top: 0, left: 0};
    return (
        <div id={data.ID} style={style}>
            <div id={data.ID+'.$INNERHTML'} dangerouslySetInnerHTML={{__html: HTML}} style={fillBox}/>
            <div id={data.ID+'.$CHILDREN'} style={fillBox}>
                
            </div>
        </div>
    );
};

export default Div;
