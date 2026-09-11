 DemoList connected;Items
 EWC.CONNECTED←connected
 ⎕PW←1000

 Items←5 5⍴⎕A
 'F1'eWC'Form' 'List'(50 50)(300 300)('Coord' 'Pixel')('Event' 'Close' 'CBUpdateList')
 'F1.LIST1'eWC'LIST'('ITEMS'Items)('POSN'(10 10))('SELITEMS'(0 1 0 0 0))('SIZE'(200 150))('STYLE' 'MULTI')('Border' 1)
 'F1.LIST1'eWS'Event'('Select' 'ItemDown' 'ItemDblClick' 'KeyPress' 'GotFocus')'CBUpdateList'

 eNQ'F1.LIST1' 'GotFocus' 'F1'
⍝ eNQ'F1.LIST1' 'ItemDown' 1 1 0 4
