import { parseFlexStyles, getFontStyles, rgbColor, handleMouseDown, handleMouseUp, handleMouseMove } from "../../utils";
import { useAppData } from "../../hooks";
import { useState } from "react";

const StatusField = ({ data }) => {
    const { Caption, Text, Size, CSS, Event, HTML } = data?.Properties;
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
                !HTML ? (
                    <div>{Caption}{Text}</div>
                )
                    :
                    (<div dangerouslySetInnerHTML={{ __html: HTML }} />)
            }
        </div>
    );
}

StatusField.WS = (send, serverEvent, data) => {
    if (serverEvent?.Properties.HTML) {
        data.Properties.HTML = serverEvent.Properties.HTML;
        delete data?.Properties?.Caption;
        delete data?.Properties?.Text;
        delete serverEvent?.Properties?.Caption;
        delete serverEvent?.Properties?.Text;

        data.Properties = {
            ...data?.Properties,
            ...serverEvent?.Properties
        };
    } else {
        delete data?.Properties?.HTML;

        data.Properties = {
            ...data?.Properties,
            ...serverEvent?.Properties
        };
    }
    return
}

export default StatusField;
