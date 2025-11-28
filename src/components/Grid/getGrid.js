// HACK this is a make-shift way to pull some logic out from App.jsx. It's not
// intended as a template for a general solution, but more to feel out the right
// direction to go...
export function getGrid({
  Properties,
  serverEvent,
  setSocketData,
  handleData,
  webSocket,
  checkSupportedProperties,
  refData,
}) {
  const { Values, CurCell } = Properties;

  const supportedProperties = ["Values", "CurCell"];

  const result = checkSupportedProperties(
    supportedProperties,
    serverEvent?.Properties
  );

  if (!localStorage.getItem(serverEvent.ID)) {
    const serverPropertiesObj = {};
    serverEvent.Properties.map((key) => {
      if (key === "Values") {
        // Ensure Values is returned from the current grid state
        serverPropertiesObj[key] = Values || Properties[key] || [];
      } else {
        serverPropertiesObj[key] = Properties[key];
      }
    });

    const event = JSON.stringify({
      WG: {
        ID: serverEvent.ID,
        Properties: serverPropertiesObj,
        WGID: serverEvent.WGID,
        ...(result &&
          result.NotSupported &&
          result.NotSupported.length > 0
          ? { NotSupported: result.NotSupported }
          : null),
      },
    });

    return webSocket.send(event);
  }

  const { Event } = JSON.parse(localStorage.getItem(serverEvent.ID));
  const serverPropertiesObj = {};
  serverEvent.Properties.map((key) => {
    if (key === "CurCell") {
      serverPropertiesObj[key] = CurCell;
    } else if (key === "Values") {
      // Ensure Values is returned from the current grid state
      serverPropertiesObj[key] = Values || refData?.Properties?.Values || [];
    } else {
      serverPropertiesObj[key] =
        Event[key] || refData?.Properties?.[key];
    }
  });

  // Modify the data store in the ref to get the updated value

  setSocketData((prevData) => [
    ...prevData,
    {
      ID: serverEvent.ID,
      Properties: {
        ...Properties,
        Values,
      },
    },
  ]);

  handleData({
    ID: serverEvent.ID,
    Properties: {
      ...Properties,
      Values,
    },
  });

  webSocket.send(
    JSON.stringify({
      WG: {
        ID: serverEvent.ID,
        Properties: serverPropertiesObj,
        WGID: serverEvent.WGID,
        ...(result &&
          result.NotSupported &&
          result.NotSupported.length > 0
          ? { NotSupported: result.NotSupported }
          : null),
      },
    })
  );
}