import React from 'react'
import { useAppData } from '../../hooks';
import { getCurrentUrl } from '../../utils';

const RibbonDropDownItem = ({ data, startIndex, menuLength, handleSelectEvent, }) => {
    const { findDesiredData } = useAppData();
    const { Caption, Event, ImageIndex, ImageListObj } = data.Properties
    const ImageData = findDesiredData(ImageListObj);

    let imageUrl = null
    let size = null
    if (ImageData) {
        const { Files, Size } = ImageData.Properties
        imageUrl = getCurrentUrl() + Files[ImageIndex - 1]
        size = Size
    }
    return (
        <div
            key={startIndex}
            className="custom-dropdown-item d-flex gap-1"
            style={{
                padding: "8px 16px",
                cursor: "pointer",
                borderBottom:
                    startIndex < menuLength - 1 ? "1px solid #ddd" : "none",
            }}
            onClick={() => handleSelectEvent(data.ID, Event)}
        >

            {imageUrl && (
                <img src={imageUrl} style={{
                    width: size[0],
                    height: size[1],
                }} />
            )}
            <div className="">{Caption}</div>

        </div>
    )
}

export default RibbonDropDownItem
