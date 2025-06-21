// Return true/false, in order to decide on sending a default response
// Return an object to send a customised response

// function startEnd(el, selText)

export default {
  // Left Cursor
  'LC': function(handleData, id, data) {
    const el = document.getElementById(id);
    if (el.selectionStart > 0) {
      el.selectionStart = el.selectionEnd = el.selectionStart - 1;
    }
    // Update global tree with new cursor position
    const textLength = el.value.length;
    const clampedStart = Math.max(1, Math.min(el.selectionStart + 1, textLength + 1));
    const clampedEnd = Math.max(1, Math.min(el.selectionEnd + 1, textLength + 1));
    handleData({
      ID: id,
      Properties: {
        SelText: [clampedStart, clampedEnd],
      },
    }, "WS");
    return true;
  },
  // Right Cursor  
  'RC': function(handleData, id, data) {
    const el = document.getElementById(id);
    if (el.selectionStart < el.value.length) {
      el.selectionStart = el.selectionEnd = el.selectionStart + 1;
    }
    // Update global tree with new cursor position
    handleData({
      ID: id,
      Properties: {
        SelText: [el.selectionStart + 1, el.selectionEnd + 1], // Convert to 1-indexed
      },
    }, "WS");
    return true;
  },
  // Left Cursor with Shift (extend selection left)
  'Lc': function(handleData, id, data) {
    const el = document.getElementById(id);
    if (el.selectionStart > 0) {
      el.selectionStart = el.selectionStart - 1;
      // Don't change selectionEnd - this extends the selection
    }
    // Update global tree with new cursor position
    handleData({
      ID: id,
      Properties: {
        SelText: [el.selectionStart + 1, el.selectionEnd + 1], // Convert to 1-indexed
      },
    }, "WS");
    return true;
  },
  // Right Cursor with Shift (extend selection right)
  'Rc': function(handleData, id, data) {
    const el = document.getElementById(id);
    if (el.selectionEnd < el.value.length) {
      el.selectionEnd = el.selectionEnd + 1;
      // Don't change selectionStart - this extends the selection
    }
    // Update global tree with new cursor position
    handleData({
      ID: id,
      Properties: {
        SelText: [el.selectionStart + 1, el.selectionEnd + 1], // Convert to 1-indexed
      },
    }, "WS");
    return true;
  },
  // Horizontal Tab
  'HT': function(_, id) {
    document.getElementById(id).dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", code: "Tab", keyCode: 9, bubbles: true }));
    return false;
  },
  // Delete Item
  'DI': function(handleData, id, data) {
    const el = document.getElementById(id);
    let value = el.value;
    const cursorPos = el.selectionStart; // Save cursor position
    
    if (el.selectionStart == el.selectionEnd) {
      if (value.length > el.selectionStart) {
        // Delete forward one - cursor stays at same position
        value = value.slice(0, el.selectionStart)+value.slice(el.selectionStart+1);
      }
    } else {
      // Delete selected - cursor moves to start of selection
      value = value.slice(0, el.selectionStart)+value.slice(el.selectionEnd);
    }
    // Update everywhere
    el.value = value;
    el.selectionStart = el.selectionEnd = cursorPos; // Restore cursor position
    // TODO requires fixes to Edit fields for setting Value and Text!!!
    const textLength = el.value.length;
    const clampedStart = Math.max(1, Math.min(el.selectionStart + 1, textLength + 1));
    const clampedEnd = Math.max(1, Math.min(el.selectionEnd + 1, textLength + 1));
    handleData({
      ID: id,
      Properties: {
        ...data,
        Value: value,
        Text: value,
        SelText: [clampedStart, clampedEnd],
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
    console.log('ARGH DB handler: initial SelText from APL:', data.SelText, 'converted to:', start, end);
    if (start < 0) start = 0;
    if (end < 0) end = 0;
    
    console.log('ARGH DB handler: before deletion, value:', el.value, 'cursor:', el.selectionStart, el.selectionEnd);
    
    if (start === end && start > 0) {
      el.value = el.value.slice(0, start - 1) + el.value.slice(end);
      el.selectionStart = el.selectionEnd = start - 1;
      console.log('ARGH DB handler: single cursor case, set cursor to:', start - 1);
    } else {
      el.value = el.value.slice(0, start) + el.value.slice(end);
      el.selectionStart = el.selectionEnd = start;
      console.log('ARGH DB handler: selection case, set cursor to:', start);
    }
    
    console.log('ARGH DB handler: after deletion, value:', el.value, 'cursor:', el.selectionStart, el.selectionEnd);
    
    // Update internal model too
    const textLength = el.value.length;
    const clampedStart = Math.max(1, Math.min(el.selectionStart + 1, textLength + 1));
    const clampedEnd = Math.max(1, Math.min(el.selectionEnd + 1, textLength + 1));
    handleData(
      {
        ID: id,
        Properties: {
          ...data,
          Text: el.value,
          Value: el.value,
          SelText: [clampedStart, clampedEnd],
        },
      },
      "WS"
    );

    console.log('ARGH DB handler: after handleData, cursor:', el.selectionStart, el.selectionEnd);
    
    // Add a delayed check to see if cursor gets moved after we return
    setTimeout(() => {
      console.log('ARGH DB handler: cursor 10ms later:', el.selectionStart, el.selectionEnd);
    }, 10);
    setTimeout(() => {
      console.log('ARGH DB handler: cursor 50ms later:', el.selectionStart, el.selectionEnd);
    }, 50);
    
    return true;
  },
};