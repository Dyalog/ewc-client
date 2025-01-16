import React from 'react'
import { useAppData } from '../../hooks';
import { getCurrentUrl } from '../../utils';

const RibbonGalleyItem = ({ data, startIndex, handleSelectEvent, className, ItemHeight, ItemWidth, fontProperties }) => {
    const { findDesiredData, fontScale } = useAppData();

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
            style={{minWidth:"max-content",backgroundColor:"#d3e5f7"}}
            id={"gallery-Item"}
            title={Caption}
        >
            <div className="item-preview" style={{
                minWidth:"max-content",
                width: ItemWidth + "px",
                backgroundColor:"#d3e5f7",
                border:"2px #d3e5f7",
                height: (ItemHeight-10) + "px"
            }}>
                {imageUrl && (
                    <img src={imageUrl} style={{
                        width: size[0],
                        height: size[1],
                    }} />
                )}
                <div style={{
                    fontFamily: fontProperties?.PName,
                    fontSize: fontProperties?.Size
                        ? `${fontProperties.Size * fontScale}px`
                        : `${12 * fontScale}px`,
                }}>{Caption}</div>
            </div>
        </div>
    )
}

export default RibbonGalleyItem
