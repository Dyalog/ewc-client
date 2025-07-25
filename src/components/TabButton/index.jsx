import { useAppData } from '../../hooks';
import { handleMouseDoubleClick, handleMouseDown, handleMouseEnter, handleMouseLeave, handleMouseMove, handleMouseUp, handleMouseWheel, parseFlexStyles, rgbColor, setStyle } from '../../utils';

const TabButton = ({ data, handleTabClick, activeTab, bgColor, fontColor, activebgColor }) => {
  const { socket } = useAppData();
  const { Caption, Event , CSS} = data?.Properties;

  const emitEvent = Event && Event[0];
  const customStyles = parseFlexStyles(CSS)
  const style = setStyle(data.Properties)

  
  return (
    <div
      id={data.ID}
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
        border: '1px solid #DFDFDF',
        fontSize: '12px',
        // fontSize: '11px',
        paddingTop: '2px',
        paddingBottom: '2px',
        paddingLeft: '4px',
        paddingRight: '4px',
        cursor: 'pointer',
        borderRadius: '2px',
        background:
          activeTab == data?.ID
            ? rgbColor(!activebgColor ? [255, 255, 255] : activebgColor)
            : rgbColor(bgColor),
        height: '20px',
        borderBottom: activeTab == data?.ID ? '0px' : '1px solid  #DFDFDF',
        color: !fontColor ? 'black' : rgbColor(fontColor),
        fontWeight: 600,
        ...style,
        ...customStyles
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
