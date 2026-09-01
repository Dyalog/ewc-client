import React from 'react'
import { useAppData } from '../../hooks';
import { getCurrentUrl } from '../../utils';

// One row of a dropdown menu: a left icon gutter + caption, Office popup chrome.
const RibbonDropDownItem = ({ data, handleSelectEvent, fontProperties }) => {
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
            className="ewc-ribbon-menu-item"
            onClick={() => handleSelectEvent(data.ID, Event)}
        >
            <span className="ewc-ribbon-menu-gutter">
                {imageUrl && (
                    <img src={imageUrl} alt="" style={{ width: size?.[0], height: size?.[1] }} />
                )}
            </span>
            <span
                className="ewc-ribbon-menu-caption"
                style={{
                    fontFamily: fontProperties?.PName,
                    fontSize: fontProperties?.Size
                        ? `${fontProperties.Size * fontScale}px`
                        : undefined,
                }}
            >
                {Caption}
            </span>
        </div>
    );
};

export default RibbonDropDownItem;
