# ImageList

The EWC implementation of [`⎕WC` class ImageList](https://docs.dyalog.com/20.0/object-reference/objects/imagelist/) has some degree of support for:

| Properties|  |  |  |
|--|--|--|--|
 |   Files  |   [ImageCount](https://docs.dyalog.com/20.0/object-reference/properties/imagecount/)  |   [Masked](https://docs.dyalog.com/20.0/object-reference/properties/masked/)  |   [Size](https://docs.dyalog.com/20.0/object-reference/properties/size/) |

NB: Links above are to the complete `⎕WC` documentation

## Known Limitations

In EWC, ImageLists are defined using the `Files` property must refer to files which reside in one of the folders
defined in the EWC.RESOURCES array. See [Images](../Discussion/Images.md)
for more information.
