import { excludeKeys, parseFlexStyles, getFontStyles, rgbColor } from "../../utils";
import StatusField from "../StatusField";
import { useAppData } from "../../hooks";

const StatusBar = ({ data }) => {
    const { Align = 'Bottom', Posn, Size, CSS } = data?.Properties;

    if (Align != 'Bottom') {
        console.error("StatusBar with Align other than Bottom is not supported yet.");
    }
    const { findCurrentData, inheritedProperties } = useAppData();
    const { BCol, FCol, FontObj } = inheritedProperties(data, 'BCol', 'FCol', 'FontObj');
    const font = findCurrentData(FontObj);
    const fontStyles = getFontStyles(font, 12);

    const styles = {
        position: 'absolute',
        display: 'flex',
        alignItems: 'left',
        padding: '0 8px',
        backgroundColor: BCol,
        color: FCol,
        borderTop: '1px solid #ccc',
        bottom: Posn?.bottom || 0,
        left: 0,
        right: 0,
        height: Size?.height || '22px',
        ...fontStyles,
        ...parseFlexStyles(CSS)
    };
    return (
        <div id={data?.ID} style={styles}>
            {Object.keys(excludeKeys(data)).map((key) => (
                <StatusField key={key} data={data[key]} />
            ))}
        </div>
    );
}

export default StatusBar;
