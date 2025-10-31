import { excludeKeys, parseFlexStyles, getFontStyles, rgbColor } from "../../utils";
import StatusField from "../StatusField";
import { useAppData } from "../../hooks";

const StatusBar = ({ data }) => {
    const { Align = 'Bottom', Size, CSS } = data?.Properties;

    if (Align != 'Bottom') {
        console.error("StatusBar with Align other than Bottom is not supported yet.");
    }
    const { findCurrentData, inheritedProperties } = useAppData();
    let { BCol, FCol, FontObj } = inheritedProperties(data, 'BCol', 'FCol', 'FontObj');
    const font = findCurrentData(FontObj);
    const fontStyles = getFontStyles(font, 12);

    if (Array.isArray(BCol)) {
        BCol = rgbColor(BCol);
    }

    if (Array.isArray(FCol)) {
        FCol = rgbColor(FCol);
    }

    const styles = {
        position: 'absolute',
        display: 'flex',
        alignItems: 'left',
        padding: '0 8px',
        backgroundColor: BCol,
        color: FCol,
        borderTop: '1px solid #ccc',
        bottom: 0,
        left: 0,
        right: 0,
        width: !Size ? '100%' : Size[1],
        height: !Size ? '22px' : Size[0],
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
