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
    // CurCell pattern), so eWG 'InputMode' returns the user's F2-toggled mode.
    "InputMode", "InputModeKey",
  ];

  const result = checkSupportedProperties(
    supportedProperties,
    serverEvent?.Properties
  );

  // Build the response from refData in the order the server asked.
  const serverPropertiesObj = {};
  serverEvent.Properties.forEach((key) => {
    // ?? (not ||) so falsy-but-valid values like 0 or "" round-trip;
    // [] is zilde (⍬) for unset.
    serverPropertiesObj[key] = Properties[key] ?? [];
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
