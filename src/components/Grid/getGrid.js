import { size, posn } from "../../utils/sizeposn";

// WG response handler for Grid. Mirrors the pattern of Grid/getGrid.js.
// CurCell is kept in sync with the data tree by Grid's click/keyboard
// handlers via handleData, so reads are satisfied directly from refData
// without any DOM/state inspection.
export const getGrid = ({
  Properties,
  serverEvent,
  webSocket,
  checkSupportedProperties,
}) => {
  // Properties this handler can answer. Anything else asked for shows up in
  // the response's NotSupported list so the server can warn / fall back.
  const supportedProperties = [
    "CurCell", "Values", "Posn", "Size",
    "ColTitles", "RowTitles", "VScroll", "HScroll", "Input",
    // The grid writes the live effective mode back into the data tree (the
    // CurCell pattern), so eWG 'InputMode' returns the user's live (toggled) mode.
    "InputMode", "InputModeKey",
  ];

  const result = checkSupportedProperties(
    supportedProperties,
    serverEvent?.Properties
  );

  // A grid fills its parent (Attach), so it reflows on window resize while the
  // model Size/Posn only holds what the server last set via ⎕WS — which goes
  // stale. Answer ⎕WG 'Size'/'Posn' from the live DOM (as Forms do via
  // updateAndStringify) so the app's GridConfigure sees the new width and reflows
  // the column count. Falls back to the model when the element isn't measurable.
  const measuredSize = size(serverEvent.ID);
  const measuredPosn = posn(serverEvent.ID);

  // Build the response from refData in the order the server asked.
  const serverPropertiesObj = {};
  serverEvent.Properties.forEach((key) => {
    if (key === "Size" && measuredSize) {
      serverPropertiesObj[key] = measuredSize.map(Math.round);
    } else if (key === "Posn" && measuredPosn) {
      serverPropertiesObj[key] = measuredPosn.map(Math.round);
    } else {
      // ?? (not ||) so falsy-but-valid values like 0 or "" round-trip;
      // [] is zilde (⍬) for unset.
      serverPropertiesObj[key] = Properties[key] ?? [];
    }
  });

  return webSocket.send(JSON.stringify({
    WG: {
      ID: serverEvent.ID,
      Properties: serverPropertiesObj,
      WGID: serverEvent.WGID,
      ...(result?.NotSupported?.length > 0
        ? { NotSupported: result.NotSupported }
        : null),
    },
  }));
};
