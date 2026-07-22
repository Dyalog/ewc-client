import { useAppData } from '../hooks';
import { getFontStyles, parseFlexStyles } from '../utils';
import './Menu/Menu.css';

// A ⎕WC MenuItem parented directly on a MenuBar rather than inside a Menu.
//
// That is legal ⎕WC and legacy applications use it for commands that need no
// submenu — Arachnid's "Deal Row" is one. It behaves as a top-level button:
// clicking it fires Select straight away, with nothing to drop down.
//
// MenuItems *inside* a Menu never reach here; DropDown renders those itself.
const MenuBarItem = ({ data }) => {
  const { socket, findCurrentData } = useAppData();
  const { Caption, Event, Active = 1, CSS, FontObj } = data?.Properties || {};

  const font = findCurrentData(FontObj);
  const fontStyles = getFontStyles(font, 12);
  const customStyles = CSS ? parseFlexStyles(CSS) : {};

  const select = () => {
    if (Active == 0) return;
    const exists = Event &&
      Event.some((item) => item[0]?.toLowerCase() === 'select');
    if (!exists) return;
    socket.send(JSON.stringify({
      Event: { EventName: 'Select', ID: data?.ID },
    }));
  };

  return (
    <div
      id={data?.ID}
      className="menu-item"
      onClick={select}
      style={{
        fontSize: '12px',
        marginLeft: '7px',
        cursor: Active == 0 ? 'default' : 'pointer',
        display: 'inline-block',
        zIndex: '1000',
        // ⎕WS'Active' 0 is how applications grey out a command — Arachnid
        // disables Undo/Redo/Deal Row this way — so it has to be visible.
        opacity: Active == 0 ? 0.4 : 1,
        ...fontStyles,
        ...customStyles,
      }}
    >
      {Caption?.replace('&', '')}
    </div>
  );
};

export default MenuBarItem;
