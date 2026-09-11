import { useAppData } from '../../hooks';
import { handleMouseDoubleClick, handleContextMenu,
  handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel, parseFlexStyles, rgbColor, setStyle } from '../../utils';

const TabButton = ({ data, handleTabClick, activeTab, bgColor, fontColor, activebgColor }) => {
  const { socket } = useAppData();
  const { Caption, Event , CSS} = data?.Properties;

  const emitEvent = Event && Event[0];
  const customStyles = parseFlexStyles(CSS)

  const isActive = activeTab == data?.ID;
  const accent = rgbColor(activebgColor) || '#2b579a';

  return (
    <div
      id={data.ID}
      className={isActive ? 'ewc-tab ewc-tab--active' : 'ewc-tab'}
      onContextMenu={(e) => handleContextMenu(e, Event)}
      onMouseDown={(e) => {
        handleMouseDown(e, socket, Event,data?.ID);
      }}
      onMouseUp={(e) => {
        handleMouseUp(e, socket, Event, data?.ID);
      }}
      onMouseEnter={(e) => {
        handleMouseEnter(e, socket, Event, data?.ID);
      }}
      onMouseMove={(e) => {
        handleMouseMove(e, socket, Event, data?.ID);
      }}
      onMouseLeave={(e) => {
        handleMouseLeave(e, socket, Event, data?.ID);
      }}
      onWheel={(e) => {
        handleMouseWheel(e, socket, Event, data?.ID);
      }}
      onDoubleClick={(e)=>{
        handleMouseDoubleClick(e, socket, Event,data?.ID);
      }}
      style={{
        '--tab-accent': accent,
        ...customStyles,
      }}
      onClick={() => {
//         console.log(
//           JSON.stringify({
//             Event: {
//               EventName: emitEvent && emitEvent[0],
//               ID: data?.ID,
//               Info: [data?.ID],
//             },
//           })
//         );

        localStorage.setItem(
          'lastEvent',
          JSON.stringify({
            Event: {
              EventName: emitEvent && emitEvent[0],
              ID: data?.ID,
              Info: [data?.ID],
            },
          })
        );

        socket.send(
          JSON.stringify({
            Event: {
              EventName: emitEvent && emitEvent[0],
              ID: data?.ID,
              Info: [data?.ID],
            },
          })
        );

        handleTabClick(data.ID);
      }}
    >
      {Caption}
      {/* <button
      
      >
        {Caption}
      </button> */}
    </div>
  );
};
export default TabButton;
