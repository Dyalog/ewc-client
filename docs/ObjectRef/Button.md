# Button

The EWC implementation of [`⎕WC` class Button](https://docs.dyalog.com/20.0/object-reference/objects/button/) has some degree of support for:

| Properties|  |  |  |
|--|--|--|--|
 |   [Active](https://docs.dyalog.com/20.0/object-reference/properties/active/)  |   [Caption](https://docs.dyalog.com/20.0/object-reference/properties/caption/)  |  *[Posn](https://docs.dyalog.com/20.0/object-reference/properties/posn/)    |   [Visible](https://docs.dyalog.com/20.0/object-reference/properties/visible/) |
 |   [Align](https://docs.dyalog.com/20.0/object-reference/properties/align/)    |   CssClass                                                                      |  *[Size](https://docs.dyalog.com/20.0/object-reference/properties/size/)    |                                                                                |
 |   [Attach](https://docs.dyalog.com/20.0/object-reference/properties/attach/)  |   [Event](https://docs.dyalog.com/20.0/object-reference/properties/event/)      |  *[State](https://docs.dyalog.com/20.0/object-reference/properties/state/)  |                                                                                |
 |   CSS                                                                         |   [Picture](https://docs.dyalog.com/20.0/object-reference/properties/picture/)  |   [Style](https://docs.dyalog.com/20.0/object-reference/properties/style/)  |                                                                                |

\* indicates that the property can change after it has been set.


| Events|  |  |  |
|--|--|--|--|
 |  [Change](https://docs.dyalog.com/20.0/object-reference/methodorevents/change/)      |  [MouseDown](https://docs.dyalog.com/20.0/object-reference/methodorevents/mousedown/)    |  [MouseLeave](https://docs.dyalog.com/20.0/object-reference/methodorevents/mouseleave/)  |  [MouseUp](https://docs.dyalog.com/20.0/object-reference/methodorevents/mouseup/) |
 |  [KeyPress](https://docs.dyalog.com/20.0/object-reference/methodorevents/keypress/)  |  [MouseEnter](https://docs.dyalog.com/20.0/object-reference/methodorevents/mouseenter/)  |  [MouseMove](https://docs.dyalog.com/20.0/object-reference/methodorevents/mousemove/)    |  [Select](https://docs.dyalog.com/20.0/object-reference/methodorevents/select/)   |

NB: Links above are to the complete `⎕WC` documentation

## Known Limitations

The `Picture` property must refer to a file which resides in one of the folders
defined in the EWC.RESOURCES array. See [Images](../Usage/Configuration.md)
for more information.
