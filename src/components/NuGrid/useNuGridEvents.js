import { useCallback } from 'react';

// Event handling hook for NuGrid
// Fires CellMove, KeyPress, and manages event registration checks
const useNuGridEvents = (socket, Event, gridId) => {
  // Check if an event is registered
  const hasEvent = useCallback((eventName) => {
    return Event && Event.some((item) => item[0] === eventName);
  }, [Event]);

  // Fire CellMove event when navigation occurs
  // Info per Dyalog docs: [row, col, scrollFlag, selectionFlag, mouseFlag, changedFlag, newValue]
  // See: https://help.dyalog.com/17.0/Content/GUI/MethodOrEvents/CellMove.htm
  const fireCellMove = useCallback((row, col, mouseFlag, cellChanged = 0, cellValue = '') => {
    if (!hasEvent('CellMove')) return false;

    const eventId = crypto.randomUUID();
    const info = [
      row,           // 1-based row
      col,           // 1-based column
      0,             // Scroll flag: 1 if would cause scroll (not implemented yet)
      0,             // Selection flag: 1 if extending selection, 2 if row/col selected
      mouseFlag,     // Mouse flag: 1 if mouse used to switch to new cell
      cellChanged,   // Changed flag: 1 if user typed in current cell before moving
      cellValue,     // New value of current cell or empty
    ];

    socket.send(JSON.stringify({
      Event: {
        EventName: 'CellMove',
        ID: gridId,
        EventID: eventId,
        Info: info,
      },
    }));

    return true;
  }, [socket, gridId, hasEvent]);

  // Fire KeyPress event
  // Info: [key, charCode, keyCode, shiftState]
  const fireKeyPress = useCallback((event) => {
    if (!hasEvent('KeyPress')) return false;

    const eventId = crypto.randomUUID();
    const isAltPressed = event.altKey ? 4 : 0;
    const isCtrlPressed = event.ctrlKey ? 2 : 0;
    const isShiftPressed = event.shiftKey ? 1 : 0;
    const shiftState = isAltPressed + isCtrlPressed + isShiftPressed;
    const charCode = event.key.charCodeAt(0);

    socket.send(JSON.stringify({
      Event: {
        EventName: 'KeyPress',
        ID: gridId,
        EventID: eventId,
        Info: [event.key, charCode, event.keyCode, shiftState],
      },
    }));

    return true;
  }, [socket, gridId, hasEvent]);

  // Fire CellChanged event when a cell value is modified
  // Info: [row, col, newValue] - matches existing Grid CellChanged pattern
  const fireCellChanged = useCallback((row, col, newValue) => {
    if (!hasEvent('CellChanged')) return false;

    const eventId = crypto.randomUUID();

    socket.send(JSON.stringify({
      Event: {
        EventName: 'CellChanged',
        ID: gridId,
        EventID: eventId,
        Info: [row, col, newValue],
      },
    }));

    return true;
  }, [socket, gridId, hasEvent]);

  return {
    hasEvent,
    fireCellMove,
    fireKeyPress,
    fireCellChanged,
  };
};

export default useNuGridEvents;
