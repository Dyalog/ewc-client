import { parseFlexStyles, getFontStyles, rgbColor, handleMouseDown, handleMouseUp, handleMouseMove } from "../../utils";
import { useAppData } from "../../hooks";

const StatusField = ({ data }) => {
    const { Caption, Text, Size, CSS, Event } = data?.Properties;

    const { socket, findCurrentData, inheritedProperties } = useAppData();
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
        padding: '0 16px 0 4px',
        borderRight: '1px solid #ccc',
        backgroundColor: BCol,
        color: FCol,
        width: !Size ? 'auto' : Size[1],
        height: !Size ? '100%' : Size[0],
        ...fontStyles,
        ...parseFlexStyles(CSS)
    };

    return (
        <div
            id={data?.ID}
            style={styles}
            onMouseUp={(e) => {
                console.log("Mouse up in status field");
                handleMouseUp(e, socket, Event, data?.ID);
            }}
            onMouseDown={(e) => {
                console.log("Mouse down in status field");
                handleMouseDown(e, socket, Event, data?.ID);
            }}
            onMouseMove={(e) => {
                console.log("Mouse move in status field");
                handleMouseMove(e, socket, Event, data?.ID);
            }}
            >
            {Caption}{Text}
        </div>
    );
}

export default StatusField;
