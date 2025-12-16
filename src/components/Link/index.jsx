import { setStyle, getFontStyles, parseFlexStyles } from "../../utils";
import { useAppData } from "../../hooks";

const Link = ({data}) => {
    const { findCurrentData, inheritedProperties } = useAppData();

    const styles = setStyle(data?.Properties);
    const { CSS, Visible } = data?.Properties || {};
    const { FontObj } = inheritedProperties(data, 'FontObj');

    const customStyles = parseFlexStyles(CSS);
    const font = findCurrentData(FontObj);
    const fontStyles = getFontStyles(font, 12);

    return (
        <div
            id={data.ID + ".$CONTAINER"}
            style={{
                ...styles,
                display: Visible === 0 ? "none" : "block",
                ...customStyles,
                ...fontStyles,
            }}
        >
            <a
                id={data.ID}
                href={data.Properties?.Href}
                target={data.Properties?.Target || '_blank'}
                download={data.Properties?.Download === 1}
                style={{ font: 'inherit' }}
            >
                {data.Properties?.Label !== undefined ? data.Properties.Label : data.Properties?.Href}
            </a>
        </div>
    );
};

export default Link;
