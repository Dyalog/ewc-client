import React from 'react'
import { useAppData } from '../../hooks';
import { getCurrentUrl } from '../../utils';

// One gallery tile: image preview over an optional caption, fixed Office sizing.
const RibbonGalleyItem = ({ data, handleSelectEvent, ItemWidth, ItemHeight, fontProperties, selected }) => {
    const { findDesiredData, fontScale } = useAppData();
    const { Caption, Event, ImageIndex, ImageListObj } = data?.Properties || {};
    const ImageData = findDesiredData(ImageListObj);

    let imageUrl = null;
    let size = null;
    if (ImageData) {
        const { Files, Size } = ImageData.Properties;
        imageUrl = getCurrentUrl() + Files[ImageIndex - 1];
        size = Size;
    }

    return (
        <div
            className={`ewc-ribbon-gallery-tile${selected ? " selected" : ""}`}
            onClick={() => handleSelectEvent(data.ID, Event)}
            style={{ width: ItemWidth + "px", height: ItemHeight + "px" }}
            title={Caption}
        >
            {imageUrl && (
                <img src={imageUrl} alt="" style={{ width: size?.[0], height: size?.[1] }} />
            )}
            {Caption && (
                <span
                    className="ewc-ribbon-gallery-caption"
                    style={{
                        fontFamily: fontProperties?.PName,
                        fontSize: fontProperties?.Size
                            ? `${fontProperties.Size * fontScale}px`
                            : undefined,
                    }}
                >
                    {Caption}
                </span>
            )}
        </div>
    );
};

export default RibbonGalleyItem;
