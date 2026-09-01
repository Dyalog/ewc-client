// Everything has a default, even if it gets undefined or wasn't defined in the
// JS world. These can be defined as a Defaults property on the component.
// - Merge the defaults with the given properties, to guarantee they all exist.
// It's often easier for calling code to generate all values, but this isn't
// expected.
// - Now filter properties based on the request.
// We need to feed back any properties that were unexpected by the JS.
// - Diff defaults with the request

// Anything not in defaults is alerted to
const notSupported = (serverEvent, component) => {
  const desired = serverEvent.Properties || [];
  const notInDefaults = desired.filter((k) => !component.Defaults.hasOwnProperty(k));
  return notInDefaults.length == 0 ? null : {NotSupported: notInDefaults};
};

// We should only ever return what was asked for, but it's sometimes easier to
// create a full list of all properties we know about. In which case, just filter.
const filterProps = (serverEvent, properties) => {
  const ret = {};
  serverEvent.Properties.forEach((k) => {
    if (properties.hasOwnProperty(k)) {
      ret[k] = properties[k];
    }
  });
  return ret;
};

const wgResponse = (serverEvent, component, properties) => {
  return {
    WG: {
      ID: serverEvent.ID,
      WGID: serverEvent.WGID,
      Properties: filterProps(serverEvent, {...component.Defaults, ...properties}),
      ...notSupported(serverEvent, component),
    },
  };
};

export default wgResponse;