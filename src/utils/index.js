export * from "./imageStyles";
export * from "./deleteForm";
export * from "./flexStyles";
export * from "./getType";
export * from "./getLastTabButton";
export * from "./locateInDataRef";


export const  handleMouseDown = (e, socket, Event, ID) => {
  const shiftState = (e.shiftKey ? 1 : 0) + (e.ctrlKey ? 2 : 0); // Shift + Ctrl state
  const rect = e.currentTarget.getBoundingClientRect();
  const x = Math.round(e.clientX - rect.left);
  const y = Math.round(e.clientY - rect.top);
  const button = e.button;

  const mousedownEvent = JSON.stringify({
    Event: {
      EventName: "MouseDown",
      ID: ID,
      Info: [y, x, button, shiftState],
    },
  });
 
  const exists = Event && Event.some((item) => item[0] === "MouseDown");
  if (!exists) return;
  console.log(mousedownEvent);
  socket.send(mousedownEvent);
};

export const handleMouseUp = (e, socket, Event, ID) => {
  const shiftState = (e.shiftKey ? 1 : 0) + (e.ctrlKey ? 2 : 0);
  const rect = e.currentTarget.getBoundingClientRect();
  const x = Math.round(e.clientX - rect.left);
  const y = Math.round(e.clientY - rect.top);

  const button = e.button;

  const mouseUpEvent = JSON.stringify({
    Event: {
      EventName: "MouseUp",
      ID,
      Info: [y, x, button, shiftState],
    },
  });

  const exists = Event && Event.some((item) => item[0] === "MouseUp");
  if (!exists) return;
  console.log(mouseUpEvent);
  socket.send(mouseUpEvent);
};


export const handleMouseDoubleClick = (e, socket, Event, ID) => {
  const shiftState = (e.shiftKey ? 1 : 0) + (e.ctrlKey ? 2 : 0);
  const rect = e.currentTarget.getBoundingClientRect();
  const x = Math.round(e.clientX - rect.left);
  const y = Math.round(e.clientY - rect.top);
  const button = e.button;

  const mouseUpEvent = JSON.stringify({
    Event: {
      EventName: "MouseDblClick",
      ID,
      Info: [y, x, button, shiftState],
    },
  });

  const exists = Event && Event.some((item) => item[0] === "MouseDblClick");
  if (!exists) return;
  console.log(mouseUpEvent);
  socket.send(mouseUpEvent);
};

export const handleMouseEnter = (e, socket, Event, ID) => {
  const previousObjectName = e.relatedTarget ? e.relatedTarget.id : ""; 

  const mouseEnterEvent = JSON.stringify({
    Event: {
      EventName: "MouseEnter",
      ID,
      Info: [previousObjectName], 
    },
  });

  const exists = Event && Event.some((item) => item[0] === "MouseEnter");
  if (!exists) return;
  console.log("mouseEnter",mouseEnterEvent);
  socket.send(mouseEnterEvent);
};

export const handleMouseLeave = (e, socket, Event, ID) => {
  const newObjectName = e.relatedTarget ? e.relatedTarget.id : ""; 

  const mouseLeaveEvent = JSON.stringify({
    Event: {
      EventName: "MouseLeave",
      ID,
      Info: [newObjectName], 
    },
  });

  const exists = Event && Event.some((item) => item[0] === "MouseLeave");
  if (!exists) return;
  console.log(mouseLeaveEvent);
  socket.send(mouseLeaveEvent);
};

export const handleMouseMove = (e, socket, Event, ID) => {
  const shiftState = (e.shiftKey ? 1 : 0) + (e.ctrlKey ? 2 : 0);
  const rect = e.currentTarget.getBoundingClientRect();
  const x = Math.round(e.clientX - rect.left);
  const y = Math.round(e.clientY - rect.top);
  const button = e.buttons;
  
  const mouseMoveEvent = JSON.stringify({
    Event: {
      EventName: "MouseMove",
      ID,
      Info: [y, x, button, shiftState], 
    },
  });
  
  // console.log("mouseMove1", mouseMoveEvent);
  const exists = Event && Event.some((item) => item[0] === "MouseMove");
  if (!exists) return;
  // console.log(mouseMoveEvent);
  // console.log("mouseMove2", mouseMoveEvent);
  socket.send(mouseMoveEvent);
};

export const handleMouseWheel = (e, socket, Event, ID) => {
  const shiftState = (e.shiftKey ? 1 : 0) + (e.ctrlKey ? 2 : 0); 
  const rect = e.currentTarget.getBoundingClientRect();
  const x = Math.round(e.clientX - rect.left);
  const y = Math.round(e.clientY - rect.top);
  const button = e.buttons;
  const delta = e.deltaY;
  const lines = e.deltaMode === 1 ? e.deltaY : -1; 
  const wheelDelta = Math.sign(e.deltaY); 

  const mouseWheelEvent = JSON.stringify({
    Event: {
      EventName: "MouseWheel",
      ID,
      Info: [y, x, button, shiftState, delta, lines, wheelDelta],
    },
  });


  const exists = Event && Event.some((item) => item[0] === "MouseWheel");
  if (!exists) return;
  console.log(mouseWheelEvent);
  socket.send(mouseWheelEvent);
};



export const handleKeyPressUtils = (e, socket, Event, ID) => {
  const isAltPressed = e?.altKey ? 4 : 0;
  const isCtrlPressed = e?.ctrlKey ? 2 : 0;
  const isShiftPressed = e?.shiftKey ? 1 : 0;
  const charCode = e?.key?.charCodeAt(0);
  let shiftState = isAltPressed + isCtrlPressed + isShiftPressed;

  const exists = Event.some((item) => item[0] === 'KeyPress');
  if (!exists) return;

  console.log(
    JSON.stringify({
      Event: {
        EventName: 'KeyPress',
        ID: ID,
        Info: [e.key, charCode, e.keyCode, shiftState],
      },
    })
  );

  socket.send(
    JSON.stringify({
      Event: {
        EventName: 'KeyPress',
        ID: data?.typeObj?.ID,
        Info: [e.key, charCode, e.keyCode, shiftState],
      },
    })
  );
};


export const setStyle = (Properties, position = "absolute", Flex = 0) => {
  if (Flex == 2) {
    return {
      display: "flex",
      flex: 1,
      height: "100vh",
    };
  }
  if (Flex == 1) {
    return {
      display: "flex",
    };
  }

  if (Flex == "fill") {
    return {
      display: "flex",
      height: "100vh",
      flexDirection: "column",
      flex: 1,
    };
  }

  if (Flex === "column") {
    return {
      display: "flex",
      flexDirection: "column",
      margin: "5px",
    };
  }
  if (Flex === "row") {
    return {
      flexDirection: "row",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "5px",
      alignItems: "end",
    };
  }

  return {
    ...(Properties?.hasOwnProperty("Posn")
      ? { position: "absolute" }
      : { position: "relative" }),
    // position: Properties?.Posn ? 'absolute' : 'relative',
    height: Properties?.Size && Properties?.Size[0],
    width: Properties?.Size && Properties?.Size[1],
    top: Properties?.Posn && Properties?.Posn[0],
    left: Properties?.Posn && Properties?.Posn[1],
  };
};

export const excludeKeys = (obj) => {
  const keysToExclude = ["ID", "Properties"];
  const result = {};
  for (const key in obj) {
    if (!keysToExclude.includes(key)) {
      result[key] = obj[key];
    }
  }
  return result;
};

export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

export const checkPeriod = (ID) => {
  let count = 0;
  for (let i = 0; i < ID.length; i++) {
    if (ID[i] == ".") {
      count++;
    }
  }

  return count;
};

export const extractStringUntilLastPeriod = (inputString) => {
  const lastPeriodIndex = inputString.lastIndexOf(".");

  if (lastPeriodIndex !== -1) {
    const result = inputString.slice(0, lastPeriodIndex);
    return result;
  }

  return inputString;
};

export const extractStringFromLastPeriod = (inputString) => {
  const lastPeriodIndex = inputString.lastIndexOf(".");

  if (lastPeriodIndex !== -1) {
    const result = inputString.slice(1+lastPeriodIndex);
    return result;
  }

  return inputString;
};

export const generateHeader = (length) => {
  const result = [];
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let current = "";

  while (length > 0) {
    result.push(current);

    // Increment the current string
    let carry = 1;
    for (let i = current.length - 1; i >= 0 && carry; i--) {
      const char = current[i];
      const index = alphabet.indexOf(char);
      if (index === alphabet.length - 1) {
        current =
          current.substring(0, i) + alphabet[0] + current.substring(i + 1);
      } else {
        current =
          current.substring(0, i) +
          alphabet[index + 1] +
          current.substring(i + 1);
        carry = 0;
      }
    }

    if (carry) {
      current = "A" + current;
    }

    length--;
  }

  return result;
};

export const getObjectById = (jsonData, targetId) => {
  const data = jsonData;

  function searchObject(node, idToFind) {
    if (typeof node === "object") {
      if (node.ID === idToFind) {
        return node;
      }
      for (const key in node) {
        const result = searchObject(node[key], idToFind);
        if (result) {
          return result;
        }
      }
    } else if (Array.isArray(node)) {
      for (const item of node) {
        const result = searchObject(item, idToFind);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }

  const result = searchObject(data, targetId);
  return result ? JSON.stringify(result, null, 2) : null;
};

export const generateAsteriskString = (length) => {
  if (length <= 0) {
    return "*"; // Return an empty string if length is zero or negative.
  }

  let asteriskString = "";
  for (let i = 0; i < length; i++) {
    asteriskString += "*";
  }

  return asteriskString;
};

export const getStringafterPeriod = (ID) => {
  const parts = ID?.split(".");
  if (parts?.length > 1) {
    return parts[1];
  } else {
    return ID;
  }
};

//  Find Parent Index from the tree View

export const calculateSumFromString = (inputString) => {
  const numbers = inputString[0].split("-").map(Number);
  if (numbers.length === 2) {
    const sum = numbers[0] + numbers[1];
    return sum;
  } else {
    return null; // Invalid input
  }
};

export const findParentIndex = (depthArray, parentNumber) => {
  let parentCount = 0;
  let parentIndex = -1;

  for (let i = 0; i < depthArray.length; i++) {
    if (depthArray[i] === 0) {
      parentCount++;
      if (parentCount === parentNumber) {
        parentIndex = i;
        break;
      }
    }
  }

  return parentIndex;
};

export const rgbColor = (rgbArray) => {
  try {
    // Check if the input is a valid RGB array
    if (
      !Array.isArray(rgbArray) ||
      (rgbArray.length !== 3 &&
        !(Array.isArray(rgbArray[0]) && rgbArray[0].length === 3))
    ) {
      // console.log("Invalid RGB array");
      return null;
    }

    // Handle nested RGB array case
    if (Array.isArray(rgbArray[0]) && rgbArray[0].length === 3) {
      rgbArray = rgbArray[0];
    }

    // console.log("Processed RGB array", { rgbArray });
    const [r, g, b] = rgbArray;

    // Ensure all values are within the valid RGB range (0-255)
    if ([r, g, b].some((color) => color < 0 || color > 255)) {
      // console.log("RGB values out of range");
      return null;
    }

    return `rgb(${r}, ${g}, ${b})`;
  } catch (error) {
    console.log("rgb error", error);
    return null;
  }
};

export const calculateDateAfterDays = (days) => {
  // Start date: 1900-1-1
  var startDate = new Date(1900, 0, 1);

  // Calculate the target date
  var targetDate = new Date(startDate?.getTime() + days * 24 * 60 * 60 * 1000);

  // Format the date as YYYY-MM-DD
  var formattedDate = targetDate?.toISOString().split("T")[0];

  return formattedDate;
};

export const calculateDaysFromDate = (inputDate) => {
  // Parse the input date string in the "YYYY-MM-DD" format
  const [year, month, day] = inputDate.split("-");
  const inputDateObj = new Date(year, month - 1, day); // month is 0-based in JavaScript Dates

  // Start date: 1900-1-1 at midnight
  const startDate = new Date(1900, 0, 1, 0, 0, 0, 0);

  // Calculate the difference in milliseconds
  const timeDifference = inputDateObj.getTime() - startDate.getTime();

  // Calculate the number of days
  const daysDifference = timeDifference / (24 * 60 * 60 * 1000);

  return Math.round(daysDifference);
};

export const replaceDanishToNumber = (number) => {
  const cleanedNumberString = number.replace(/\./g, "").replace(",", ".");
  const originalNumber = parseFloat(cleanedNumberString);
  return originalNumber;
};

// Check for the supported Properties of WG or not

export const checkSupportedProperties = (supportedProperties, array) => {
  const notSupportedProperties = array.filter(
    (item) => !supportedProperties.includes(item)
  );
  if (notSupportedProperties.length > 0) {
    const result = {
      NotSupported: notSupportedProperties,
    };
    return result;
  } else {
    return null; // No unsupported properties found
  }
};

export const deleteObjectsById = (data, idsToDelete) => {
  // Recursive function to delete objects by ID
  function deleteById(obj, id) {
    for (const key in obj) {
      if (obj[key].ID === id) {
        delete obj[key];
        return true;
      }
      if (typeof obj[key] === "object") {
        if (deleteById(obj[key], id)) {
          return true;
        }
      }
    }
    return false;
  }

  // Loop through the array of IDs to delete
  idsToDelete.forEach((id) => {
    deleteById(data, id);
  });

  return data;
};

export const getElementPosition = (
  Properties,
  position = "absolute",
  background
) => {
  return {
    position: Properties?.Posn ? "absolute" : "relative",
    top: Properties?.Posn && Properties?.Posn[0],
    left: Properties?.Posn && Properties?.Posn[1],
  };
};

export const findFormParentID = (data) => {
  // Replace the condition inside the find function with your specific criteria⌈
  const formParentID = Object.keys(data).find((key) => {
    const item = data[key];
    return item && item.Properties && item.Properties.Type === "Form";
  });

  return formParentID;
};

export const createListViewObjects = (
  images,
  codes,
  descriptions,
  imagesIndexes
) => {
  const result = codes.map((code, index) => ({
    index: index + 1,
    title: code,
    description: descriptions && descriptions[index][0],
    image: (images && images[imagesIndexes[index] - 1]) || "",
  }));

  return result;
};

export const getCurrentUrl = () => {
  const currentUrl = window.location.origin;
  const path = window.location.pathname !== "/" ? window.location.pathname : "";

  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return import.meta.env.VITE_APL_URL;
  } else {
    return currentUrl + path;
  }
};

export const injectCssStyles = (cssStyles, id = 'dynamic-css-styles') => {
  if (!cssStyles || !cssStyles.length) return;

  // Check if the style tag with the given ID already exists
  if (document.getElementById(id)) {
    console.warn(`Style tag with id "${id}" already exists. Skipping injection.`);
    return;
  }

  const styleTag = document.createElement('style');
  styleTag.id = id;

  // Append CSS rules
  styleTag.appendChild(document.createTextNode(cssStyles.join('\n')));

  // Append the style tag to the document head
  document.head.appendChild(styleTag);
};


const appendImportantToCss = (cssRule) => {
  return cssRule.replace(/:\s*([^;]+);/g, (match, p1) => `: ${p1.trim()} !important;`);
};


export const processCssStyles = (cssStyles) => {
  return cssStyles.map(rule => appendImportantToCss(rule));
};