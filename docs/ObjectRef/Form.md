# Form

The EWC implementation of [`⎕WC` class Form](https://docs.dyalog.com/20.0/object-reference/objects/form/) has some degree of support for:

| Properties|  |  |  |
|--|--|--|--|
 |   [BCol](https://docs.dyalog.com/20.0/object-reference/properties/bcol/)        |   [Coord](https://docs.dyalog.com/20.0/object-reference/properties/coord/)      |  *[Posn](https://docs.dyalog.com/20.0/object-reference/properties/posn/)        |   [Visible](https://docs.dyalog.com/20.0/object-reference/properties/visible/) |
 |   CSS                                                                           |   Flex                                                                          |  *[Size](https://docs.dyalog.com/20.0/object-reference/properties/size/)        |                                                                                |
 |   [Caption](https://docs.dyalog.com/20.0/object-reference/properties/caption/)  |   [Picture](https://docs.dyalog.com/20.0/object-reference/properties/picture/)  |   [SysMenu](https://docs.dyalog.com/20.0/object-reference/properties/sysmenu/)  |                                                                                |

\* indicates that the property can change after it has been set.


| Events|  |  |  |
|--|--|--|--|
 |  [Configure](https://docs.dyalog.com/20.0/object-reference/methodorevents/configure/)  |  [MouseEnter](https://docs.dyalog.com/20.0/object-reference/methodorevents/mouseenter/)  |  [MouseMove](https://docs.dyalog.com/20.0/object-reference/methodorevents/mousemove/)  |                                                                                       |
 |  [MouseDown](https://docs.dyalog.com/20.0/object-reference/methodorevents/mousedown/)  |  [MouseLeave](https://docs.dyalog.com/20.0/object-reference/methodorevents/mouseleave/)  |  [MouseUp](https://docs.dyalog.com/20.0/object-reference/methodorevents/mouseup/)      |                                                                                       |

NB: Links above are to the complete `⎕WC` documentation

## Known Limitations

Coord defaults to Pixel, Size to 400 600 and Posn to 100 100.
The `Picture` property must refer to a file which resides in one of the folders
defined in the EWC.RESOURCES array. See [Images](../Usage/Configuration.md)
for more information.
