import React from 'react'
import { useAppData } from '../../hooks';
import { getCurrentUrl } from '../../utils';

const RibbonGalleyItem = ({ data, startIndex, handleSelectEvent, className, ItemHeight, ItemWidth }) => {
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
            className={className}
            onClick={() =>
                handleSelectEvent(data.ID, Event)
            }
            title={Caption}
        >
            <div className="item-preview" style={{
                width: ItemWidth + "px",
                height: ItemHeight + "px"
            }}>
                {imageUrl && (
                    <img src={imageUrl} style={{
                        width: size[0],
                        height: size[1],
                    }} />
                )}
                <div className="">{Caption}</div>
            </div>
        </div>
    )
}

export default RibbonGalleyItem
