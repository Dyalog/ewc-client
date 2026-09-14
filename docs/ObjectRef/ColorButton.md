# ColorButton

The EWC implementation of [`⎕WC` class ColorButton](https://docs.dyalog.com/20.0/object-reference/objects/colorbutton/) has some degree of support for:

| Properties|  |  |  |
|--|--|--|--|
 |   [Active](https://docs.dyalog.com/20.0/object-reference/properties/active/)  |   [Caption](https://docs.dyalog.com/20.0/object-reference/properties/caption/)            |   [Event](https://docs.dyalog.com/20.0/object-reference/properties/event/)              |  *[Size](https://docs.dyalog.com/20.0/object-reference/properties/size/)       |
 |   [Align](https://docs.dyalog.com/20.0/object-reference/properties/align/)    |   CssClass                                                                                |   [OtherButton](https://docs.dyalog.com/20.0/object-reference/properties/otherbutton/)  |  *[State](https://docs.dyalog.com/20.0/object-reference/properties/state/)     |
 |   [Attach](https://docs.dyalog.com/20.0/object-reference/properties/attach/)  |   [CurrentColor](https://docs.dyalog.com/20.0/object-reference/properties/currentcolor/)  |   [Picture](https://docs.dyalog.com/20.0/object-reference/properties/picture/)          |   [Style](https://docs.dyalog.com/20.0/object-reference/properties/style/)     |
 |   CSS                                                                         |   [Data](https://docs.dyalog.com/20.0/object-reference/properties/data/)                  |  *[Posn](https://docs.dyalog.com/20.0/object-reference/properties/posn/)                |   [Visible](https://docs.dyalog.com/20.0/object-reference/properties/visible/) |

\* indicates that the property can change after it has been set.


| Events|  |  |  |
|--|--|--|--|
 |  [Change](https://docs.dyalog.com/20.0/object-reference/methodorevents/change/)            |  [KeyPress](https://docs.dyalog.com/20.0/object-reference/methodorevents/keypress/)      |  [MouseLeave](https://docs.dyalog.com/20.0/object-reference/methodorevents/mouseleave/)  |  [Select](https://docs.dyalog.com/20.0/object-reference/methodorevents/select/) |
 |  [ColorChange](https://docs.dyalog.com/20.0/object-reference/methodorevents/colorchange/)  |  [MouseDown](https://docs.dyalog.com/20.0/object-reference/methodorevents/mousedown/)    |  [MouseMove](https://docs.dyalog.com/20.0/object-reference/methodorevents/mousemove/)    |                                                                                 |
 |  [GotFocus](https://docs.dyalog.com/20.0/object-reference/methodorevents/gotfocus/)        |  [MouseEnter](https://docs.dyalog.com/20.0/object-reference/methodorevents/mouseenter/)  |  [MouseUp](https://docs.dyalog.com/20.0/object-reference/methodorevents/mouseup/)        |                                                                                 |

NB: Links above are to the complete `⎕WC` documentation

## Known Limitations

The `Picture` property must refer to a file which resides in one of the folders
defined in the EWC.RESOURCES array. See [Images](../Usage/Configuration.md)
for more information.
