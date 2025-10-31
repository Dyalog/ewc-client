import { parseFlexStyles, getFontStyles, rgbColor, handleMouseDown, handleMouseUp, handleMouseMove } from "../../utils";
import { useAppData } from "../../hooks";
import { useState } from "react";

const StatusField = ({ data }) => {
    const { Caption, Text, Size, CSS, Event, HTML } = data?.Properties;

    let html=useState(HTML);

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
                handleMouseUp(e, socket, Event, data?.ID);
            }}
            onMouseDown={(e) => {
                handleMouseDown(e, socket, Event, data?.ID);
            }}
            onMouseMove={(e) => {
                handleMouseMove(e, socket, Event, data?.ID);
            }}
        >
            {
                html!=[] ? (
                    <div dangerouslySetInnerHTML={{ __html: HTML }} />
                ) : <div>{Caption}{Text}</div>
            }
        </div>
    );
}

export default StatusField;
