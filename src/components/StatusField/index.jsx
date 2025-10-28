import { parseFlexStyles, getFontStyles, rgbColor } from "../../utils";
import { useAppData } from "../../hooks";

const StatusField = ({ data }) => {
    const { Caption, Text, Posn, Size, CSS } = data?.Properties;

    const { findCurrentData, inheritedProperties } = useAppData();
    const { BCol, FCol, FontObj } = inheritedProperties(data, 'BCol', 'FCol', 'FontObj');

    const font = findCurrentData(FontObj);
    const fontStyles = getFontStyles(font, 12);

    const styles = {
        padding: '0 16px 0 4px',
        borderRight: '1px solid #ccc',
        backgroundColor: BCol,
        color: FCol,
        ...fontStyles,
        ...parseFlexStyles(CSS)
    };
    return (
        <div id={data?.ID} style={styles}>
            {Caption}{Text}
        </div>
    );
}

export default StatusField;
