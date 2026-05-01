// WG response handler for NuGrid. Mirrors the pattern of Grid/getGrid.js.
// CurCell is kept in sync with the data tree by NuGrid's click/keyboard
// handlers via handleData, so reads are satisfied directly from refData
// without any DOM/state inspection.
export const getNuGrid = ({
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
