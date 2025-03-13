// Return true/false, in order to decide on sending a default response
// Return an object to send a customised response

export default {
  // Horizontal Tab
  'HT': function(_, id) {
    document.getElementById(id).dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", code: "Tab", keyCode: 9, bubbles: true }));
    return false;
  },
  // Delete Item
  'DI': function(handleData, id) {
    const el = document.getElementById(id);
    let value = el.value;
    if (el.selectionStart == el.selectionEnd) {
      if (value.length > el.selectionStart) {
        // Delete forward one
        value = value.slice(0, el.selectionStart)+value.slice(el.selectionStart+1);
      }
    } else {
      // Delete selected
      value = value.slice(0, el.selectionStart)+value.slice(el.selectionEnd);
    }
    // Update everywhere
    el.value = value;
    return true;
    // TODO requires fixes to Edit fields for setting Value and Text!!!
    handleData({
      ID: id,
      Properties: {
        Value: value,
        Text: value,
      }
    }, 'WS');
    return true;
  },
  // Delete blocK
  'DK': function(handleData, id) {
    const el = document.getElementById(id);
    el.value = el.value.slice(0, el.selectionStart);
    return true;
    // TODO as above, requires fixes to Edit fields for setting Value and Text!!!
  }
};