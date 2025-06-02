// Return true/false, in order to decide on sending a default response
// Return an object to send a customised response

// function startEnd(el, selText)

export default {
  // Horizontal Tab
  'HT': function(_, id) {
    document.getElementById(id).dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", code: "Tab", keyCode: 9, bubbles: true }));
    return true;
  },
  // Delete Item
  'DI': function(handleData, id, data) {
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
    // TODO requires fixes to Edit fields for setting Value and Text!!!
    handleData({
      ID: id,
      Properties: {
        ...data,
        Value: value,
        Text: value,
      }
    }, 'WS');
    return true;
  },
  // Delete blocK
  'DK': function(_, id) {
    const el = document.getElementById(id);
    el.value = el.value.slice(0, el.selectionStart);
    return true;
    // TODO as above, requires fixes to Edit fields for setting Value and Text!!!
  },
  // Delete Backspace
  'DB': function(handleData, id, data) {
    const el = document.getElementById(id);
    let start = data.SelText[0]-1;
    let end = data.SelText[1]-1;
    if (start < 0) start = 0;
    if (end < 0) end = 0;
    if (start === end && start > 0) {
      el.value = el.value.slice(0, start - 1) + el.value.slice(end);
      el.selectionStart = el.selectionEnd = start - 1;
    } else {
      el.value = el.value.slice(0, start) + el.value.slice(end);
      el.selectionStart = el.selectionEnd = start;
    }
    // Update internal model too
    handleData(
      {
        ID: id,
        Properties: {
          ...data,
          Text: el.value,
          Value: el.Value,
        },
      },
      "WS"
    );

    return true;
  },
};