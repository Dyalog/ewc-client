// Return true/false, in order to decide on sending a default response
// Return an object to send a customised response

export default {
  // Left Cursor
  'LC': function(handleData, id, props) {
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
  'RC': function(handleData, id, props) {
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
  'Lc': function(handleData, id, props) {
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
  'Rc': function(handleData, id, props) {
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
  'HT': function(handleData, id, props) {
    const currentElement = document.getElementById(id);
    
    // Get commonly focusable elements plus any with explicit tabindex
    const potentialElements = document.querySelectorAll(
      'input, button, select, textarea, a, area, iframe, object, embed, [tabindex]'
    );
    // Remove duplicates and filter by what browser considers focusable
    const uniqueElements = [...new Set(potentialElements)];
    const focusableElements = uniqueElements.filter(el => 
      el.tabIndex >= 0 && !el.disabled
    );
    
    // Sort by proper tab order: tabindex > 0 first (ascending), then tabindex 0/unset in document order
    // querySelectorAll already returns elements in document order, so we preserve that
    const focusableArray = focusableElements.map((el, index) => ({ el, docIndex: index }))
      .sort((a, b) => {
        const aTabIndex = a.el.tabIndex;
        const bTabIndex = b.el.tabIndex;
        
        // First sort by tabindex value
        if (aTabIndex !== bTabIndex) {
          // Positive tabindex elements come first, sorted by tabindex value
          if (aTabIndex > 0 && bTabIndex > 0) {
            return aTabIndex - bTabIndex;
          }
          if (aTabIndex > 0 && bTabIndex === 0) return -1;
          if (aTabIndex === 0 && bTabIndex > 0) return 1;
        }
        
        // Same tabindex - maintain document order
        return a.docIndex - b.docIndex;
      })
      .map(item => item.el);
    
    const currentIndex = focusableArray.indexOf(currentElement);
    
    if (currentIndex !== -1) {
      // Move to next element (wrap to first if at end)
      const nextIndex = (currentIndex + 1) % focusableArray.length;
      focusableArray[nextIndex].focus();
    }
    
    return false;
  },
  // Delete Item
  'DI': function(handleData, id, props) {
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
        ...props,
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
  'DB': function(handleData, id, props) {
    console.log('ARGHWTF', id, props)
    const el = document.getElementById(id);
    let start = props.SelText[0]-1;
    let end = props.SelText[1]-1;
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
    const textLength = el.value.length;
    const clampedStart = Math.max(1, Math.min(el.selectionStart + 1, textLength + 1));
    const clampedEnd = Math.max(1, Math.min(el.selectionEnd + 1, textLength + 1));
    handleData(
      {
        ID: id,
        Properties: {
          ...props,
          Text: el.value,
          Value: el.value,
          SelText: [clampedStart, clampedEnd],
        },
      },
      "WS"
    );
    
    return true;
  },
};