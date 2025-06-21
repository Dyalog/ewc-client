import { useCallback, useEffect, useRef, useState } from "react";
import { AppDataContext } from "./context";
import { SelectComponent } from "./components";
import {
  getObjectById,
  getObjectByIdObject,
  checkSupportedProperties,
  findFormParentID,
  deleteFormAndSiblings,
  getCurrentUrl,
  locateParentByPath,
  excludeKeys,
  extractStringFromLastPeriod,
} from "./utils";
import "./App.css";
import * as _ from "lodash";
import Text from "./components/Text";
import version from "../version.json";
import Upload from "./components/Upload";
import MsgBox from "./components/MessageBox";
import { getGrid } from "./components/Grid/getGrid";
import { setGrid } from "./components/Grid/setGrid";
import * as Globals from "./Globals";
import keypressHandlers from "./utils/keypressHandlers";
import hasEventCallback from "./utils/hasEventCallback";
import {size, posn} from "./utils/sizeposn"

function useForceRerender() {
  const [_state, setState] = useState(true);
  const reRender = () => {
    setState((prev) => !prev);
  };
  return { reRender };
}

const App = () => {
  const [socketData, setSocketData] = useState([]);
  const [socket, setSocket] = useState(null);
  const [proceed, setProceed] = useState(false);
  const [proceedEventArray, setProceedEventArray] = useState([]);
  const [pendingKeypressEvent, setPendingKeypressEvent] = useState(null);
  const [nqEvents, setNqEvents] = useState([]);
  const [layout, setLayout] = useState("Initialise");
  const webSocketRef = useRef(null);
  const [focusedElement, setFocusedElement] = useState(null);
  const { reRender } = useForceRerender();
  const [messageBoxData, setMessageBoxData] = useState(null);
  const [options, setOptions] = useState(null);
  const [fontScale, setFontScale] = useState(null);
  let colors = {};
  const currentEventRef = useRef({ curEvent: "", eventID: "", keyEvent: "" });

  const updateCurrentEvent = (newEvent) => {
    currentEventRef.current = { ...currentEventRef.current, ...newEvent };
  };


  const dataRef = useRef({});
  // Convenience for being able to check the current state of the tree in the
  // browser console.
  window.ewcDataRef = dataRef;
  window.ewcSocketData = socketData;
  window.ewcProceedArray = proceedEventArray;
  const appRef = useRef(null);

  const wsSend = (d) => webSocketRef.current.send(JSON.stringify(d));

  // Container for global EWC we want to be able to inspect
  if (!window.EWC) window.EWC = {};

  // ping only gets set up once. It's a simple Ping to the server but
  // requires no response. This is to keep the connection alive when faced with
  // a proxy or gateway that closes connections with no traffic. In our
  // experience, this happens at 1min.
  if (!window.EWC?.ping) {
    window.EWC.pingMS = 0;
    window.EWC.ping = () => {
      window.setTimeout(
        () => {
          if (window.EWC.pingMS > 0)
            webSocketRef.current.send('{"Event":{"EventName":"Ping","ID":""}}');
          window.EWC.ping();
        },
        window.EWC.pingMS == 0 ? 1000 : window.EWC.pingMS
      );
    };
    window.EWC.ping();
  }

  useEffect(() => {
    console.log("Valuuuuu",layout)
    dataRef.current = {};
    setSocketData([]);
    // localStorage.clear();
    fetchData();

    const handleBeforeUnload = () => {
      // Attempt to send a closing message before the tab is closed
      console.log("kksksksksksk",webSocketRef.current)
      if (webSocketRef.current) {
        webSocketRef.current.send(
          JSON.stringify({ Signal: { Name: "Close" } })
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // Remove the event listener when the component is unmounted
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Close the WebSocket if it's still open
      if (
        webSocketRef.current &&
        webSocketRef.current.readyState === WebSocket.OPEN
      ) {
        webSocketRef.current.close();
      }
    };
  }, [layout]);

  useEffect(() => {
    const container = appRef.current;

    if (container) {
      // container.addEventListener('focusin', handleFocus);
      container.addEventListener("click", handleFocus);
    }
    return () => {
      if (container) {
        // container.removeEventListener('focusin', handleFocus);
        container.removeEventListener("click", handleFocus);
      }
    };
  }, []);

  if (fontScale) {
    Globals.set('fontScale', fontScale);
  }

  // Helper function to get color from the index
  function getColor(index, defaultColor) {
    // console.log("property getcolor",colors, index, colors?.[index])
    return colors?.[index] || defaultColor; // Fallback to default if not found
  }

  function getRequiredRGBChannel(val) {
    // console.log("compare initial value", val);
    if (typeof val === "number") {
      val = [val];
    }

    const newValue = val?.map((value) => {
      // console.log("property_map1", value);

      // Check if the value is an array of arrays or an array of numbers
      if (
        Array.isArray(value) &&
        value?.every((item) => typeof item === "number" && item >= 0)
      ) {
        // console.log("property condition 2")
        // Case 3: Array of numbers (e.g., [-1, 0])
        return value;
      }

      if (typeof value === "number" && value < 0) {
        return getColor(value);
      }

      if (typeof value === "number" && value >= 0) {
        return value;
      }

      // console.log("compare property here", value)
      const modifiedValue = value?.map((nestVal) => {
        // console.log("property here")
        if (Array.isArray(nestVal)) {
          // Nested array (e.g., [-5, [255, 0, 0]])
          return nestVal.map((item) =>
            typeof item === "number" && item < 0 ? getColor(item) : item
          );
        } else if (typeof nestVal === "number" && nestVal < 0) {
          // Single negative number (e.g., -6)
          return getColor(nestVal);
        } else {
          // Otherwise, return the value as is
          // console.log("property else")
          return nestVal;
        }
      });

      // console.log("property_modified", modifiedValue);
      return modifiedValue;
    });
    // console.log('compare final', newValue)
    return newValue;
  }

  const handleData = (data, mode) => {
    console.log("handleData", data, mode);
    const splitID = data.ID.split(".");
    const currentLevel = locateParentByPath(dataRef.current, data.ID);
   

    // Check if the key already exists at the final level
    const finalKey = splitID[splitID.length - 1];
    if (currentLevel.hasOwnProperty(finalKey)) {
      if (mode === "WC") {
        if (data.Properties && data.Properties.Type === "Form") {
          localStorage.clear();
        }
        // Overwrite the existing object with new properties

        currentLevel[finalKey] = {
          ID: data.ID,
          ...data,
        };
      } else if (mode === "WS") {
        // TODO move to a new home and organise it better!
        // Catch if we're moving outside of bounds and bring us back in
        if (currentLevel[finalKey]?.Properties?.Type === 'Grid') {
          setGrid({
            data,
            currentLevel,
            finalKey,
          });
        }

        // Special logic for radio buttons! This goes up to the parent, and sets
        // all other radio buttons within the container to false.
        // N.B. the assumption is that radios are always within a container of
        // some sort with its own ID - all examples I've seen so far, satisfy
        // that.
        const isRadio = (node) => {
          return (
            node.Properties?.Type == "Button" &&
            node.Properties?.Style == "Radio"
          );
        };
        if (isRadio(currentLevel[finalKey])) {
          const parent = locateParentByPath(dataRef.current, data.ID);
          const givenKey = extractStringFromLastPeriod(data.ID);
          Object.keys(excludeKeys(parent)).forEach((k) => {
            if (isRadio(parent[k])) {
              parent[k].Properties.State = 0;
            }
          });
          parent[givenKey].Properties.State = data.Properties.State;
        }

        // Merge the existing object with new properties
        currentLevel[finalKey] = {
          ID: data.ID,
          ...currentLevel[finalKey],
          Properties: {
            ...(currentLevel[finalKey].Properties || {}),
            ...(data.Properties || {}),
          },
        };

        // Emit something for anything that needs to know about a WS. This is a
        // hack to allow updating the internal state of components for
        // *rendering purposes only*. As much as possible must rely on the above
        // logic.
        // List uses this.
        document.dispatchEvent(new CustomEvent('EWC-WS-'+data.ID, {detail: data.Properties}));
      }
    } else {
      let newData = JSON.parse(JSON.stringify(data));
      console.log("New data is assss", newData)
      // Create a new object at the final level
      try {
        if (
          data.Properties.hasOwnProperty("FillCol") ||
          data.Properties.hasOwnProperty("FCol") ||
          data.Properties.hasOwnProperty("BCol") ||
          data.Properties.hasOwnProperty("BodyHeight") ||
          data.Properties.hasOwnProperty("MaxButtonWidth")

        ) {
          // console.log('compare', {_property_before: data?.Properties, colors})
          newData = {
            ...data,
            Properties: {
              ...data?.Properties,
              ...(data?.Properties?.FillCol && {
                FillCol: getRequiredRGBChannel(data.Properties.FillCol),
              }),
              ...(data?.Properties?.FCol && {
                FCol: getRequiredRGBChannel(data.Properties.FCol),
              }),
              ...(data?.Properties?.BCol && {
                BCol: getRequiredRGBChannel(data.Properties.BCol),
              }),
              ...(data?.Properties?.BodyHeight && {
                BodyHeight: getRequiredRGBChannel(data.Properties.BodyHeight),
              }),
              ...(data?.Properties?.MaxButtonWidth && {
                MaxButtonWidth: getRequiredRGBChannel(data.Properties.MaxButtonWidth),
              }),
            },

          };

          // console.log('compare', {_property_after: newData?.Properties})
        }

        else if (data?.Properties?.Type === "TabControl") {
     
          const tabControlData = {
            Size: data?.Properties?.Size||data?.Properties?.TabSize,
            Posn: data?.Properties?.Posn ||[0,0],
          };
          // console.log("Valuueueueueuueue",tabControlData,data?.Properties);

          // // Store the combined object as a JSON string
          localStorage.setItem("TabControlData", JSON.stringify(tabControlData));
        }
        else if (data?.Properties?.Type === "Form") {
          const tabControlData1 = {
            Size: data?.Properties?.Size,
            Posn: data?.Properties?.Posn,
          };

          //   // Store the combined object as a JSON string
          localStorage.setItem("FormData", JSON.stringify(tabControlData1));
        }
        else if (data?.Properties?.Type === "SubForm" && data?.Properties?.TabObj) {
          console.log("Data we are geting is as", data, localStorage.getItem("FormData"), localStorage.getItem("TabControlData"))
          
          let name = JSON.parse(localStorage.getItem("TabControlData"))
          let name1 = JSON.parse(localStorage.getItem("FormData"))
          console.log("Datta id isssss",data?.ID,name.Size,name.Posn)
          localStorage.setItem("TabControlInSubForm", 1);
          newData = {
            ...data,
            Properties: {
              ...data.Properties,
              Size: name.Size || name1.Size,
              Posn: name.Posn || [0, 0]

            }
          }
          console.log("Newwwwwwwwwwwwwwssss",newData)
        }


      } catch (error) {
        console.log({ error });
      }

      currentLevel[finalKey] = {
        ID: data.ID,
        ...newData,
      };
      console.log('compare', { data, newData })
    }

    reRender();
  };

  // const deleteObjectsById = (data, idsToDelete) => {
  //   //  reRender();
  //   function deleteById(obj, id) {
  //     for (const key in obj) {
  //       if (obj[key].ID === id) {
  //         delete obj[key];
  //         return true;
  //       }
  //       if (typeof obj[key] === 'object') {
  //         if (deleteById(obj[key], id)) {
  //           return true;
  //         }
  //       }
  //     }
  //     return false;
  //   }
  //   idsToDelete?.forEach((id) => {
  //     deleteById(data, id);
  //   });

  //   dataRef.current = data;
  //   // socketData.filter((item) => idsToDelete.some((id) => item.ID.startsWith(id)));
  // };

  function deleteObjectsById(obj, ids) {
    ids.forEach((id) => {
      const deleteKey = (data, key) => {
        if (data.hasOwnProperty(key)) {
          delete data[key];
        } else {
          const nestedKeys = key.split(".");
          let nestedObj = data;
          for (let i = 0; i < nestedKeys.length; i++) {
            const nestedKey = nestedKeys[i];
            if (nestedObj.hasOwnProperty(nestedKey)) {
              if (i === nestedKeys.length - 1) {
                delete nestedObj[nestedKey];
              } else {
                nestedObj = nestedObj[nestedKey];
              }
            } else {
              break;
            }
          }
        }
      };

      deleteKey(obj, id);
    });

    console.log("obj is as", { obj });
    dataRef.current = obj;

    reRender();
  }

  const fetchData = () => {
    let zoom = Math.round(window.devicePixelRatio * 100);
    const envUrl = getCurrentUrl();
    const url = URL.parse(envUrl);

    const protocol = url.protocol === "https:" ? "wss" : "ws";
    const urlPort = url.port && url.protocol !== "https:" ? `:${url.port}` : "";
    const path = url.pathname || "/";

    webSocketRef.current = new WebSocket(
      `${protocol}://${url.hostname}${urlPort}${path}`
    );

    const webSocket = webSocketRef.current;
    setSocket(webSocket);
    webSocket.onopen = () => {
      let event = JSON.stringify({
        DeviceCapabilities: {
          ViewPort: [window.innerHeight, window.innerWidth],
          ScreenSize: [window.screen.height, window.screen.width],
          DPR: zoom / 100,
          PPI: 200,
        },
      });
      webSocket.send(event);
      // webSocket.send(layout);

      const eventInit = JSON.stringify({
        [layout]: {
          Version: version.version,
          Name: version.name,
          URL: window.location.href,
        },
      });

      webSocket.send(eventInit);
      // webSocket.send('Initialise')
    };
    webSocket.onmessage = (event) => {
      const evData = JSON.parse(event.data);
      const keys = Object.keys(evData);
      
      // Handle WX messages immediately - APL expects immediate response
      if (keys[0] == "WX") {
        const serverEvent = evData.WX;
        const { Method, Info, WGID, ID } = serverEvent;
        console.log("WX Method Call (immediate):", Method, Info);

        if (Method == "GetTextSize") {
          // Certain code re-encloses Info - if we can get to two values, we do that
          // A real example: [[[["This is a text","This is a text"],"#.FntSys"]]]
          let myInfo = Info;
          while (Array.isArray(myInfo) && myInfo.length === 1) {
            myInfo = myInfo[0];
          }
          // We failed to get to 2, so we have to just trust whatever the original was:
          if (myInfo.length !== 2) {
            myInfo = Info;
          }
          const strings = myInfo && myInfo[0];
          const font = JSON.parse(
            getObjectById(dataRef.current, myInfo && myInfo[1])
          );
          const textDimensions = Text.calculateTextDimensions(strings, font);
          const event = JSON.stringify({ WX: { Info: textDimensions, WGID } });
          console.log("WX Response (immediate):", event);
          return webSocket.send(event);
        } else if (Method == "OnlyDQ") {
          let event;
          if (!!Info?.[0]) {
            event = JSON.stringify({
              WX: { Info: [[ID, 150, 300]], WGID: WGID },
            });
          } else {
            event = JSON.stringify({ WX: { Info: [], WGID: WGID } });
          }
          return webSocket.send(event);
        } else if (Method == "GetFocus") {
          const focusedID = localStorage.getItem("current-focus");
          const event = JSON.stringify({
            WX: { Info: !focusedID ? [] : [focusedID], WGID },
          });
          return webSocket.send(event);
        } else if (Method == "SetCookie") {
          Info.forEach((c) => {
            document.cookie = c;
          });
          return webSocket.send(JSON.stringify({ WX: { Info: [], WGID } }));
        } else if (Method == "GetCookie") {
          const found = document.cookie
            .split("; ")
            .map((c) => c.split("="))
            .filter((c) => Info.includes(c[0]));
          return webSocket.send(JSON.stringify({ WX: { Info: found, WGID } }));
        } else if (Method == "SetTitle") {
          document.title = Info[0];
          return webSocket.send(JSON.stringify({ WX: { Info: [], WGID } }));
        } else if (Method == "GetTitle") {
          return webSocket.send(
            JSON.stringify({ WX: { Info: [document.title], WGID } })
          );
        } else if (Method == "EvalJS") {
          // Here be dragons!
          const results = Info.map((code) => {
            try {
              return [0, eval?.(code)];
            } catch (e) {
              return [-1, e.toString()];
            }
          });
          return webSocket.send(JSON.stringify({ WX: { Info: results, WGID } }));
        } else {
          // Default response for unknown methods
          return webSocket.send(JSON.stringify({ WX: { Info: [], WGID } }));
        }
      }
      
      const handleMessage = function() {
        console.log('ECDBG: Processing message:', keys[0], evData);
        if (keys[0] == "WC") {
          let windowCreationEvent = evData.WC;
          if (windowCreationEvent?.Properties?.Type == "Form") {
            localStorage.clear();
            const updatedData = deleteFormAndSiblings(dataRef.current);
            dataRef.current = {};
            dataRef.current = updatedData;

            handleData(evData.WC, "WC");
            return;
          }

          // Handle Message Box separately
          if (windowCreationEvent?.Properties?.Type == "MsgBox") {
            setMessageBoxData(windowCreationEvent);
            // handleData(evData.WC, 'WC');
            return;
          }

          // TODO move to a new home!
          const defaultProperties = {
            Grid: { CurCell: [1, 1] },
          };
          const dflts = defaultProperties[evData.WC?.Properties?.Type];
          if (dflts) {
            evData.WC.Properties = { ...dflts, ...evData.WC.Properties };
          }

          // console.log('event from server WC', evData.WC);
          setSocketData((prevData) => [...prevData, evData.WC]);
          handleData(evData.WC, "WC");
        } else if (keys[0] == "WS") {
          const serverEvent = evData.WS;

          let value = null;
          // @Todo Check that the Edit is Already Present or not if it is Present just change the value we are getting from the server
          const data = JSON.parse(getObjectById(dataRef.current, serverEvent.ID));

          console.log("WSSocket", { serverEvent, data });
          if (data?.Properties?.Type == "Edit") {
            if (serverEvent?.Properties.hasOwnProperty("Text")) {
              value = serverEvent?.Properties.Text;
            } else if (serverEvent?.Properties.hasOwnProperty("Value")) {
              value = serverEvent?.Properties.Value;
            } else if (serverEvent?.Properties.hasOwnProperty("SelText")) {
              value = serverEvent?.Properties.SelText;
            }

            const updatedProperties = {
              ...data?.Properties,
              ...serverEvent?.Properties,
            };

            return handleData(
              {
                ID: serverEvent.ID,
                Properties: updatedProperties,
              },
              "WS"
            );
            // Check that the Already Present Data have Text Key or Value Key
            if (data?.Properties.hasOwnProperty("Text")) {
              setSocketData((prevData) => [
                ...prevData,
                evData.WS,
              ]);
              return handleData(
                {
                  ID: serverEvent.ID,

                  Properties: {
                    Event: serverEvent.Properties.Event,
                    Text: serverEvent?.Properties.Text,
                  },
                },
                "WS"
              );
            } else if (data?.Properties.hasOwnProperty("Value")) {
              setSocketData((prevData) => [
                ...prevData,
                evData.WS,
              ]);
              return handleData(
                {
                  ID: serverEvent.ID,
                  Properties: {
                    Value: serverEvent?.Properties.Value,
                  },
                },
                "WS"
              );
            } else if (data?.Properties.hasOwnProperty("SelText")) {
              setSocketData((prevData) => [
                ...prevData,
                evData.WS,
              ]);
              return handleData(
                {
                  ID: serverEvent.ID,
                  Properties: {
                    SelText: serverEvent?.Properties.SelText,
                  },
                },
                "WS"
              );
            } else {
            }
          }

          if (data?.Properties?.Type == "Combo") {
            if (serverEvent?.Properties.hasOwnProperty("SelItems")) {
              setSocketData((prevData) => [
                ...prevData,
                evData.WS,
              ]);
              value = serverEvent?.Properties.SelItems;
              const indextoFind = value.indexOf(1);
              let Text = data?.Properties?.Items[indextoFind];
              return handleData(
                {
                  ID: serverEvent.ID,
                  Properties: {
                    ...data?.Properties,
                    SelItems: value,
                    Text,
                  },
                },
                "WS"
              );
            }
          }

          setSocketData((prevData) => [...prevData, evData.WS]);
          // serverEvent.ID == "F1.LEFTRIGHT" && console.log("horizontal ws ", {WSThumbValue: evData.WS.Properties.Thumb})
          handleData(evData.WS, "WS");
        } else if (keys[0] == "WG") {
          console.log("Data is as", evData.WG);
          const serverEvent = evData.WG;

          const updateAndStringify = (resp) => {
            if (!resp.WG?.Properties) return JSON.stringify(resp);
            const error = () => webSocket.send(JSON.stringify({
              WG: {
                ID: serverEvent?.ID,
                Error: {
                  Code: 2,
                  Message: "ID '" + serverEvent?.ID + "' has no Size or Posn. Is this a non-rendering component?",
                  WGID: serverEvent?.WGID,
                },
              },
            }));
            if (serverEvent.Properties.includes('Posn') && resp.WG.Properties['Posn'] === undefined) {
              const p = resp.WG.Properties['Posn'] = posn(serverEvent.ID);
              // if (p === null) return error();
            }
            if (serverEvent.Properties.includes('Size') && resp.WG.Properties['Size'] === undefined) {
              const s = resp.WG.Properties['Size'] = size(serverEvent.ID);
              // if (s === null) return error();
            }
            return JSON.stringify(resp);
          };

          try {
            // console.log({serverEvent})

            const refData = JSON.parse(
              getObjectById(dataRef.current, serverEvent?.ID)
            );
            // serverEvent.ID == "F1.LEFTRIGHT" &&  console.log("horizontal wg", serverEvent.ID, getObjectById(dataRef.current, serverEvent?.ID))
            const Type = refData?.Properties?.Type;
            // console.log("issue refData", {refData, Type})

            // If didn't have any type on WG then return an ErrorMessage

            const errorEvent = JSON.stringify({
              WG: {
                ID: serverEvent?.ID,
                Error: {
                  Code: 1,
                  Message: "ID not found",
                  WGID: serverEvent?.WGID,
                },
              },
            });

            if (!Type) return webSocket.send(errorEvent);
            // Get Data from the Ref

            const { Properties } = refData;
            console.log("Reference adata a", refData, Properties);
            console.log("Reffffffff", Properties);

            if (Type == "Grid") {
              return getGrid({ Properties, serverEvent, setSocketData, handleData, webSocket, checkSupportedProperties, refData })
            }
            if (Type == "Form") {
              const supportedProperties = ["Posn", "Size"];
              const result = checkSupportedProperties(
                supportedProperties,
                serverEvent?.Properties
              );
              const serverPropertiesObj = {};
              const Form = JSON.parse(localStorage.getItem(serverEvent.ID));

              if (!localStorage.getItem(serverEvent.ID)) {
                const serverPropertiesObj = {};

                serverEvent.Properties.map((key) => {
                  return (serverPropertiesObj[key] = Properties[key]);
                });

                const event = updateAndStringify({
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

                webSocket.send(event);
                return;
              }
              serverEvent.Properties.map((key) => {
                return (serverPropertiesObj[key] = Form[key]);
              });

              const event = updateAndStringify({
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

              webSocket.send(event);
              return;
            } else if (Type == "Edit") {
              const { Text, Value, SelText } = Properties;
              const supportedProperties = ["Text", "Value", "SelText"];

              console.log("edit", {
                serverEvent,
                Properties,
                Text,
                local: localStorage.getItem(serverEvent.ID),
              });

              const result = checkSupportedProperties(
                supportedProperties,
                serverEvent?.Properties
              );

              // Read from global tree (refData) instead of DOM
              const globalText = refData?.Properties?.Text;
              const globalValue = refData?.Properties?.Value;
              const globalSelText = refData?.Properties?.SelText;

              // Also check what DOM says for comparison
              const input = document.getElementById(serverEvent.ID);
              const domCursor = input ? [input.selectionStart + 1, input.selectionEnd + 1] : null;

              console.log('ARGH WG reading - global tree:', { globalText, globalValue, globalSelText });
              console.log('ARGH WG reading - DOM cursor (1-indexed):', domCursor);

              if (!localStorage.getItem(serverEvent.ID)) {
                // Prefer global tree data over component props
                let editValue = globalText !== undefined ? globalText :
                  globalValue !== undefined ? globalValue :
                    Text !== undefined ? Text : Value;
                editValue = editValue !== undefined ? editValue : "";

                const isNumber = refData?.Properties?.hasOwnProperty("FieldType");

                const serverPropertiesObj = {};
                serverEvent.Properties.forEach((key) => {
                  if (key === "Text") {
                    serverPropertiesObj[key] = globalText !== undefined ? globalText.toString() :
                      editValue ? editValue.toString() : "";
                  } else if (key === "Value") {
                    const valueToUse = globalValue !== undefined ? globalValue : editValue;
                    serverPropertiesObj[key] = isNumber && valueToUse != ''
                      ? parseInt(valueToUse)
                      : valueToUse;
                  } else if (key === "SelText") {
                    // Prefer global tree SelText, fallback to component props, fallback to [1,1]
                    serverPropertiesObj[key] = globalSelText || SelText || [1, 1];
                  } else {
                    serverPropertiesObj[key] = editValue;
                  }
                });

                console.log(
                  updateAndStringify({
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
                return webSocket.send(
                  updateAndStringify({
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

              const { Event } = JSON.parse(localStorage.getItem(serverEvent?.ID));
              const { Info } = Event;
              const serverPropertiesObj = {};
              serverEvent.Properties.forEach((key) => {
                if (key === "Value") {
                  serverPropertiesObj[key] = Info;
                } else if (key === "SelText") {
                  serverPropertiesObj[key] = SelText || [1, 1];
                } else if (key === "Text") {
                  const storedText = JSON.parse(
                    localStorage.getItem(serverEvent?.ID)
                  )?.Text;
                  const txt = Text !== undefined ? Text : storedText;
                  serverPropertiesObj[key] = txt !== undefined ? txt : '';
                } else {
                  serverPropertiesObj[key] = Info.toString();
                }
              });

              console.log(
                updateAndStringify({
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
              webSocket.send(
                updateAndStringify({
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
            } else if (Type == "Combo") {
              console.log("Properties are", Properties);
              const { SelItems, Items, Text } = Properties;
              const supportedProperties = ["Text", "SelItems", "Posn", "Size"];

              const result = checkSupportedProperties(
                supportedProperties,
                serverEvent?.Properties
              );

              if (!localStorage.getItem(serverEvent.ID)) {

                let newSelItems = SelItems || new Array(Items.length).fill(0);

                if (Text) {
                  const indexToChange = Items.indexOf(Text);
                  if (indexToChange >= 0) {
                    newSelItems.fill(0);
                    newSelItems[indexToChange] = 1;
                  }
                }

                const serverPropertiesObj = {};
                serverEvent.Properties.map((key) => {
                  serverPropertiesObj[key] =
                    key === "SelItems"
                      ? newSelItems
                      : key === "Text"
                        ? Text
                        : Properties[key];
                });
                // serverEvent.Properties.map((key) => {
                //   serverPropertiesObj[key] =
                //     key === "SelItems"
                //       ? newSelItems
                //       : key === "Text"
                //       ? Text
                //       : key === "Size" || key === "Posn"
                //       ? Properties[key] || Event[key] // Prioritize current Properties or fallback to Event
                //       : key === "Items"
                //       ? Items[Info]
                //       : Event[key];
                // });

                const message = {
                  WG: {
                    ID: serverEvent.ID,
                    Properties: serverPropertiesObj,
                    WGID: serverEvent.WGID,
                    ...(result?.NotSupported?.length > 0
                      ? { NotSupported: result.NotSupported }
                      : null),
                  },
                };

                return webSocket.send(updateAndStringify(message));
              }

              // Parse the event data from localStorage
              const { Event } = JSON.parse(localStorage.getItem(serverEvent?.ID));
              const { Info, Size, Posn } = Event;

              let newSelItems = SelItems || new Array(Items.length).fill(0);

              if (Text) {
                const indexToChange = Items.indexOf(Text);
                if (indexToChange >= 0) {
                  newSelItems.fill(0);
                  newSelItems[indexToChange] = 1;
                }
              }

              const serverPropertiesObj = {};
              serverEvent.Properties.map((key) => {
                serverPropertiesObj[key] =
                  key === "SelItems"
                    ? newSelItems
                    : key === "Text"
                      ? Text
                      : key === "Items"
                        ? Items[Info]
                        : Event[key];
              });
              // serverEvent.Properties.map((key) => {
              //   serverPropertiesObj[key] =
              //     key === "SelItems"
              //       ? newSelItems
              //       : key === "Text"
              //       ? Text
              //       : key === "Size" || key === "Posn"
              //       ? Properties[key] || Event[key] // Prioritize current Properties or fallback to Event
              //       : key === "Items"
              //       ? Items[Info]⌈
              //       : Event[key];
              // });

              const message = {
                WG: {
                  ID: serverEvent.ID,
                  Properties: serverPropertiesObj,
                  WGID: serverEvent.WGID,
                  ...(result?.NotSupported?.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),
                },
              };

              return webSocket.send(updateAndStringify(message));
            } else if (Type == "List") {
              let { SelItems, Items } = Properties;
              // If nothing has been selected yet, return all 0s
              if (SelItems === undefined) {
                SelItems = Array(Items.length).fill(0);
              }

              const supportedProperties = ["SelItems"];

              const result = checkSupportedProperties(
                supportedProperties,
                serverEvent?.Properties
              );

              if (!localStorage.getItem(serverEvent.ID)) {
                console.log(
                  updateAndStringify({
                    WG: {
                      ID: serverEvent.ID,
                      Properties: {
                        SelItems,
                      },
                      ...(result &&
                        result.NotSupported &&
                        result.NotSupported.length > 0
                        ? { NotSupported: result.NotSupported }
                        : null),

                      WGID: serverEvent.WGID,
                    },
                  })
                );
                return webSocket.send(
                  updateAndStringify({
                    WG: {
                      ID: serverEvent.ID,
                      Properties: {
                        SelItems,
                      },
                      ...(result &&
                        result.NotSupported &&
                        result.NotSupported.length > 0
                        ? { NotSupported: result.NotSupported }
                        : null),

                      WGID: serverEvent.WGID,
                    },
                  })
                );
              }

              const { Event } = JSON.parse(localStorage.getItem(serverEvent?.ID));
              console.log(
                updateAndStringify({
                  WG: {
                    ID: serverEvent.ID,
                    Properties: {
                      SelItems: Event["SelItems"],
                    },
                    ...(result &&
                      result.NotSupported &&
                      result.NotSupported.length > 0
                      ? { NotSupported: result.NotSupported }
                      : null),

                    WGID: serverEvent.WGID,
                  },
                })
              );
              return webSocket.send(
                updateAndStringify({
                  WG: {
                    ID: serverEvent.ID,
                    Properties: {
                      SelItems: Event["SelItems"],
                    },
                    ...(result &&
                      result.NotSupported &&
                      result.NotSupported.length > 0
                      ? { NotSupported: result.NotSupported }
                      : null),

                    WGID: serverEvent.WGID,
                  },
                })
              );
            } else if (Type == "Scroll") {
              const { Thumb = 1 } = Properties;
              const supportedProperties = ["Thumb"];

              console.log("300", Thumb);

              const result = checkSupportedProperties(
                supportedProperties,
                serverEvent?.Properties
              );

              if (!localStorage.getItem(serverEvent.ID)) {
                console.log(
                  updateAndStringify({
                    WG: {
                      ID: serverEvent.ID,
                      Properties: {
                        Thumb,
                      },
                      WGID: serverEvent.WGID,
                      ...(result &&
                        result.NotSupported &&
                        result.NotSupported.length > 0
                        ? { NotSupported: result.NotSupported }
                        : null),
                    },
                  })
                );
                return webSocket.send(
                  updateAndStringify({
                    WG: {
                      ID: serverEvent.ID,
                      Properties: {
                        Thumb,
                      },
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

              const { Event } = JSON.parse(localStorage.getItem(serverEvent?.ID));
              const { Info } = Event;

              console.log(
                updateAndStringify({
                  WG: {
                    ID: serverEvent.ID,
                    Properties: {
                      Thumb: Info[1],
                    },
                    WGID: serverEvent.WGID,
                    ...(result &&
                      result.NotSupported &&
                      result.NotSupported.length > 0
                      ? { NotSupported: result.NotSupported }
                      : null),
                  },
                })
              );
              return webSocket.send(
                updateAndStringify({
                  WG: {
                    ID: serverEvent.ID,
                    Properties: {
                      Thumb: Thumb,
                    },
                    WGID: serverEvent.WGID,
                    ...(result &&
                      result.NotSupported &&
                      result.NotSupported.length > 0
                      ? { NotSupported: result.NotSupported }
                      : null),
                  },
                })
              );
            } else if (Type == "Splitter") {
              console.log("Coming in form but splitter");

              const { Posn } = Properties;
              const supportedProperties = ["Posn", "Size"];

              const result = checkSupportedProperties(
                supportedProperties,
                serverEvent?.Properties
              );

              if (!localStorage.getItem(serverEvent.ID)) {
                const serverPropertiesObj = {};
                serverEvent.Properties.map((key) => {
                  return (serverPropertiesObj[key] = Properties[key]);
                });

                console.log(
                  updateAndStringify({
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
                return webSocket.send(
                  updateAndStringify({
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

              const { Event } = JSON.parse(localStorage.getItem(serverEvent.ID));
              const { Info, Size } = Event;

              const serverPropertiesObj = {};
              serverEvent.Properties.map((key) => {
                return (serverPropertiesObj[key] = key == "Posn" ? Info : Size);
              });

              console.log(
                updateAndStringify({
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
              return webSocket.send(
                updateAndStringify({
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
            } else if (Type == "SubForm") {
              console.log("Coming in form but suss");
              const supportedProperties = ["Posn", "Size"];

              const result = checkSupportedProperties(
                supportedProperties,
                serverEvent?.Properties
              );
              console.log("Valuuuuuuuu", result);
              console.log("Servere event is ", serverEvent, serverEvent.ID)
              const sanitizedID = serverEvent.ID.split('.')[0]; // Get 'FsCShSpec' from 'FsCShSpec.O'

              console.log("Sanitized ID:", sanitizedID);



              if (!localStorage.getItem(serverEvent.ID)) {
                console.log("Coming in form but su1");

                const serverPropertiesObj = {};
                console.log("Properiessss", serverEvent.Properties, Properties)

                serverEvent.Properties.map((key) => {
                  console.log("Propertiesss2", Properties[key])
                  return (serverPropertiesObj[key] = Properties[key]);
                });
                console.log("Server propertoes aew,", serverPropertiesObj)

                console.log(
                  updateAndStringify({
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
                return webSocket.send(
                  updateAndStringify({
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
              console.log("Coming in form but su2");

              const serverPropertiesObj = {};
              console.log("Serverrrrrr", serverEvent.ID)
              const SubForm = JSON.parse(localStorage.getItem(serverEvent.ID));
              // const storedSubForm = JSON.parse(localStorage.getItem(serverEvent.ID));

              // const baseID = serverEvent.ID.split('.')[0];

              console.log("Value of subform is as", SubForm);
              // let SubForm = JSON.parse(localStorage.getItem(serverEvent.ID));
              // console.log("+====>", !SubForm, SubForm)

              // if (SubForm.length === 0) {
              //   console.log("+====>1", SubForm.length)

              // }


              // if (SubForm) {
              //   // Retrieve data from "TabControlData" if SubForm is empty
              //   const tabControlData = JSON.parse(localStorage.getItem("TabControlData"));

              //   if (tabControlData) {
              //     SubForm = tabControlData;
              //     console.log("SubForm was empty. Assigned TabControlData to SubForm.");
              //   } else {
              //     console.warn("Both SubForm and TabControlData are empty.");
              //   }
              // } else {
              //   console.log("Value of SubForm is:", SubForm);
              // }

              serverEvent.Properties.map((key) => {
                console.log("Keyyy", key)
                return (serverPropertiesObj[key] = SubForm[key]);
              });
              console.log("Server properties are", serverPropertiesObj)
              // console.log("Server properties are1", localStorage.getItem("formDimension"));

              console.log(
                updateAndStringify({
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

              return webSocket.send(
                updateAndStringify({
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
            } else if (Type == "Button") {
              console.log("Coming here in buttons")
              const { State } = Properties;
              const supportedProperties = ["State", "Posn", "Size"];

              const result = checkSupportedProperties(
                supportedProperties,
                serverEvent?.Properties
              );

              if (!localStorage.getItem(serverEvent.ID)) {
                const serverPropertiesObj = {};
                serverEvent.Properties.map((key) => {
                  return (serverPropertiesObj[key] =
                    key == "State" ? (State ? State : 0) : Properties[key]);
                });

                delete serverPropertiesObj['Size'];
                delete serverPropertiesObj['Posn'];

                const event = updateAndStringify({
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

                console.log(event);
                return webSocket.send(event);
              }

              const { Event } = JSON.parse(localStorage.getItem(serverEvent.ID));
              const { Value } = Event;

              const serverPropertiesObj = {};

              serverEvent.Properties.map((key) => {
                return (serverPropertiesObj[key] =
                  key == "State" ? Value : Event[key]);
              });

              delete serverPropertiesObj['Size'];
              delete serverPropertiesObj['Posn'];
              const event = updateAndStringify({
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

              console.log(event);

              return webSocket.send(event);
            } else if (Type == "TreeView") {
              const supportedProperties = ["SelItems"];
              const result = checkSupportedProperties(
                supportedProperties,
                serverEvent?.Properties
              );
              const { Event } = JSON.parse(localStorage.getItem(serverEvent.ID));
              const { SelItems } = Event;

              const event = updateAndStringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: {
                    SelItems,
                  },
                  WGID: serverEvent.WGID,
                  ...(result &&
                    result.NotSupported &&
                    result.NotSupported.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),
                },
              });

              console.log(event);
              return webSocket.send(event);
            } else if (Type == "Timer") {
              const supportedProperties = ["FireOnce"];
              const result = checkSupportedProperties(
                supportedProperties,
                serverEvent?.Properties
              );
              const { Event } = JSON.parse(localStorage.getItem(serverEvent.ID));
              const { FireOnce } = Event;

              const event = updateAndStringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: {
                    FireOnce,
                  },
                  WGID: serverEvent.WGID,
                  ...(result &&
                    result.NotSupported &&
                    result.NotSupported.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),
                },
              });
              console.log(event);
              return webSocket.send(event);
            } else if (Type == "ListView") {
              const supportedProperties = ["SelItems"];
              const result = checkSupportedProperties(
                supportedProperties,
                serverEvent?.Properties
              );
              const { Event } = JSON.parse(localStorage.getItem(serverEvent.ID));

              const { SelItems } = Event;
              const event = updateAndStringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: {
                    SelItems,
                  },
                  WGID: serverEvent.WGID,
                  ...(result &&
                    result.NotSupported &&
                    result.NotSupported.length > 0
                    ? { NotSupported: result.NotSupported }
                    : null),
                },
              });

              console.log(event);
              return webSocket.send(event);
            } else if (Type === "ApexChart") {
              const supportedProperties = ["SVG"];
              const { SVG } = Properties;
              const data = JSON.parse(
                getObjectById(dataRef.current, serverEvent.ID)
              );

              const event = updateAndStringify({
                WG: {
                  ID: serverEvent.ID,
                  WGID: serverEvent.WGID,
                  Properties: {
                    SVG: SVG,
                  },
                },
              });

              // console.log(event);
              return webSocket.send(event);

            } else if (Type === "Upload") {
              // TODO size and posn
              return Upload.WG(wsSend, serverEvent);
            } else {
              const replyProps = {};
              for (const prop in serverEvent.Properties) {
                if (refData.Properties[prop]) {
                  replyProps[prop] = refData[prop];
                }
              }

              return webSocket.send(updateAndStringify({
                WG: {
                  ID: serverEvent.ID,
                  Properties: replyProps,
                  WGID: serverEvent.WGID,
                }
              }));
            }
          } catch (e) {
            // There should be a proper error response here, but for now, we just log.
            // This is because we know something failed, but APL doesn't and
            // just waits 3s to mark the WG as failed.
            console.error("WG Error: ", e);
            // wsSend({...});
          }
        } else if (keys[0] == "NQ") {
          const nqEvent = evData.NQ;
          console.log("300", nqEvent, nqEvent.ID, nqEvent.Event, nqEvent.Info);
          const { Event, ID, Info, NoCallback = 0 } = nqEvent;

          const existingData = JSON.parse(getObjectById(dataRef.current, ID));

          const appElement = getObjectById(dataRef.current, ID);

          // Do nothing unless NoCallback=0 (default)
          const nqCallback = NoCallback !== 0 ? () => { } : (ev) => { webSocket.send(JSON.stringify({ Event: ev })) };
          const prevSuppressingCallbacks = Globals.set('suppressingCallbacks', NoCallback === 1);

          try {
            if (Event && Event == "Configure") {
              handleData(
                {
                  ID: ID,
                  Properties: {
                    ...appElement?.Properties,
                    Posn: [Info[0], Info[1]],
                    Size: [Info[2], Info[3]],
                  },
                },
                "WS"
              );
              nqCallback({
                EventName: Event,
                ID: ID,
                Info: Info,
              });
            } else if (Event == "SetPing") {
              window.EWC.pingMS = Info[0] * 1000;
              return;
            } else if (
              (Event && Event == "ItemDown") ||
              (Event && Event == "GotFocus")
            ) {
              if (Event && Event == "GotFocus") {
                localStorage.setItem("current-focus", ID);
                const el = document.getElementById(ID);
                if (el) el.focus();
              }

              const existingData = JSON.parse(getObjectById(dataRef.current, ID));

              const exists =
                existingData?.Properties?.Event &&
                existingData?.Properties?.Event.some((item) => item[0] === Event);

              if (!exists) return; // TODO shouldn't this still report back?!
              nqCallback({
                EventName: Event,
                ID,
                Info,
              });
            } else if (Event == "KeyPress") {
              // ch is often going to be a character, but it may be a code such as
              // 'LC' for ArrowLeft
              // There should be only one element
              // IMPORTANT:
              // We try to imitate ⎕WC as much as possible, but this behaves in a
              // slightly odd fashion, so this is done largely from experimentation.
              // 
              // Example of keycodes:
              //   * DB (Delete backspace)
              //   * DI (Delete Item) *does* do forward delete or deletes the selection
              //   * DK (Delete blocK) will remove to the end of the line
              //   * HT (Horizontal tab) which needs to be able to move from element
              //     to element
              // Some keycodes have no noticeable effect in ⎕WC...
              // ...so we blindly echo any KeyPress event to the server, and we
              // implement handlers for the subset of codes we are interested in.
              const ch = Info[0];

              if (ch.length == 1) {
                // Single character insert
                const el = document.getElementById(ID);
                el.dispatchEvent(new KeyboardEvent("keydown", { key: ch }));
              } else {
                const kph = keypressHandlers[ch];
                if (kph) {
                  const globalState = {
                    pendingKeypressEvent,
                    socketData,
                    nqEvents,
                    proceed,
                    proceedEventArray
                  };
                  kph(handleData, ID, existingData?.Properties, globalState);
                }
              }

              nqCallback({
                EventName: "KeyPress",
                ID: ID,
                Info: Info,
              });
            } else if (Event == "CellMove") {
              console.log("296", { nqEvent });
              setNqEvents([...nqEvents, nqEvent]);
              localStorage.setItem(
                ID,
                JSON.stringify({
                  Event: {
                    CurCell: [Info[0], Info[1]],
                  },
                })
              );
              localStorage.setItem(
                "nqCurCell",
                JSON.stringify({
                  ID,
                  Info,
                })
              );
            } else if (Event == "Select") {
              const element = document.getElementById(nqEvent.ID);
              if (element) element.click();
              nqCallback({
                EventName: "Select",
                ID: ID,
              });
            } else if (Event == "Scroll") {
              const thumbValue = Info[1];
              console.log("300", { thumbValue });
              handleData({ ID: ID, Properties: { Thumb: thumbValue } }, "WS");
              const element = document.getElementById(nqEvent.ID);
              element && element.focus();
              nqCallback({
                EventName: "Scroll",
                ID: ID,
                Info: [Info[0], Info[1]],
              });
            } else {
              // All other NoCallback = 0 events should be echoed!
              nqCallback({
                EventName: Event,
                ID: ID,
                Info: Info,
              });
            }
            return;
          } finally {
            Globals.set('suppressingCallbacks', prevSuppressingCallbacks);
          }
        } else if (keys[0] == "EC") {
          const serverEvent = evData.EC;

          const { EventID, Proceed } = serverEvent;
          setProceedEventArray((prev) => {
            console.log("use effect", currentEventRef.current);
            // console.log("hello 1", currentEvent.curEvent)
            const hasEventID = Object.keys(prev).some((key) =>
              key.includes(EventID)
            );
            return {
              ...prev,
              [`${EventID}${currentEventRef.current.curEvent}`]: Proceed,
            };
          });
          // setProceedEventArray((prev, index) => ({...prev, [EventID+index]: Proceed}));
          setProceed(Proceed);

          // Handle pending keypress based on Proceed value
          console.log('ECDBG: EC handler - EventID =', EventID, 'Proceed =', Proceed, 'pendingKeypressEvent =', pendingKeypressEvent);
          if (pendingKeypressEvent && pendingKeypressEvent.eventId === EventID) {
            if (Proceed === 1) {
              // Apply the pending keystroke to the Edit field
              const editElement = document.getElementById(pendingKeypressEvent.componentId);
              if (editElement) {
                const componentData = JSON.parse(getObjectById(dataRef.current, pendingKeypressEvent.componentId));
                
                // Map JavaScript key names to keypressHandler names
                const keyMap = {
                  'Tab': 'HT',
                  'ArrowLeft': pendingKeypressEvent.shiftKey ? 'Lc' : 'LC',
                  'ArrowRight': pendingKeypressEvent.shiftKey ? 'Rc' : 'RC', 
                  'Backspace': 'DB',
                  'Delete': 'DI'
                };
                
                const handlerKey = keyMap[pendingKeypressEvent.key];
                
                if (handlerKey && keypressHandlers[handlerKey]) {
                  // Use the appropriate keypress handler for special keys
                  console.log('ECDBG: Applying special key handler:', handlerKey, 'for key:', pendingKeypressEvent.key);
                  keypressHandlers[handlerKey](handleData, pendingKeypressEvent.componentId, componentData);
                } else if (pendingKeypressEvent.key.length === 1) {
                  // Handle regular character input
                  const start = editElement.selectionStart;
                  const end = editElement.selectionEnd;
                  const currentValue = editElement.value;
                  const newValue = currentValue.slice(0, start) + pendingKeypressEvent.key + currentValue.slice(end);
                  
                  // Update the DOM
                  editElement.value = newValue;
                  editElement.setSelectionRange(start + 1, start + 1);
                  
                  // Update the global tree so WG requests see the new value
                  handleData({
                    ID: pendingKeypressEvent.componentId,
                    Properties: {
                      Text: newValue,
                      Value: newValue,
                      SelText: [start + 2, start + 2], // 1-indexed for APL
                    },
                  }, "WS");
                  
                  console.log('ECDBG: Applied character keystroke:', pendingKeypressEvent.key, 'new value:', newValue);
                } else {
                  console.log('ECDBG: Unknown key, not applying:', pendingKeypressEvent.key);
                }
              }
            } else {
              console.log('ECDBG: Keystroke rejected by APL, not applying:', pendingKeypressEvent.key);
            }
            setPendingKeypressEvent(null);
          }

          // localStorage.setItem(`${EventID}${currentEvent.curEvent}`, Proceed);
        } else if (keys[0] == "EX") {
          const serverEvent = evData.EX;

          deleteObjectsById(dataRef.current, serverEvent?.ID);
        } else if (keys[0] == "Options") {
          handleData(evData.Options, "WC");
          console.log("label", evData.Options);

          evData.Options.ID == "Fonts" &&
            setFontScale(evData.Options.Properties.Scale);
          evData.Options.ID == "Fonts" &&
            console.log("label", evData.Options.Properties.Scale);
          evData.Options.ID == "Mode" &&
            setOptions(evData.Options.Properties);
          if (evData.Options.ID == "Colors")
            setColorFunc(evData.Options.Properties.Standard);
        } else if (keys[0] == "FormatCell") {
          const formatCellEvent = evData;
          const { FormatCell } = formatCellEvent;
          const refData = JSON.parse(
            getObjectById(dataRef.current, FormatCell?.ID)
          );
          const { Properties } = refData;
          const updatedFormattedValues = Properties?.FormattedValues;
          updatedFormattedValues[FormatCell.Cell[0] - 1][FormatCell.Cell[1] - 1] =
            FormatCell?.FormattedValue;
          handleData(
            {
              ID: FormatCell?.ID,
              Properties: {
                ...refData?.Properties,
                FormattedValues: updatedFormattedValues,
              },
            },
            "WS"
          );
        }
      }
      requestAnimationFrame(() => {
        setTimeout(handleMessage, 1);
      });
    };
  };

  const handleFocus = (element) => {
    const formParentID = findFormParentID(dataRef.current);
    if (localStorage.getItem("change-event")) {
      const { Event } = JSON.parse(localStorage.getItem("change-event"));
      const updatedEvent = {
        ...Event,
        Info: [!element.target.id ? formParentID : element.target.id],
      };

      let webSocket = webSocketRef.current;

      webSocket.send(JSON.stringify({ Event: { ...updatedEvent } }));
      localStorage.removeItem("change-event");
    }
  };

  // const updatedData = _.cloneDeep(dataRef.current);
  console.log("App", dataRef.current);

  const setColorFunc = (colorStandardArray) => {
    const reqColors = colorStandardArray?.reduce((prev, current) => {
      return { ...prev, [current?.[0]]: current[2] };
    }, {});
    colors = { ...reqColors };
  };

  const formParentID = findFormParentID(dataRef.current);

  const handleMsgBoxClose = (button, ID) => {
    // console.log(`Button pressed: ${button}`);
    setMessageBoxData(null);
    // Send event back to server via WebSocket
    socket.send(JSON.stringify({ Event: { EventName: button, ID: ID } }));
  };

  return (
    <div>
      <AppDataContext.Provider
        value={{
          socketData,
          dataRef,
          socket,
          handleData,
          focusedElement,
          reRender,
          proceed,
          setProceed,
          proceedEventArray,
          setProceedEventArray,
          pendingKeypressEvent,
          setPendingKeypressEvent,
          colors,
          fontScale,
          nqEvents,
          setNqEvents,
          currentEventRef: currentEventRef.current,
          updateCurrentEvent,
          isDesktop: dataRef?.current?.Mode?.Properties?.Desktop
        }}
      >
        {dataRef && formParentID && (
          <SelectComponent data={dataRef.current[formParentID]} />
        )}
      </AppDataContext.Provider>
      {messageBoxData && (
        <MsgBox
          data={messageBoxData}
          options={options}
          onClose={handleMsgBoxClose}
          isDesktop={dataRef?.current?.Mode?.Properties?.Desktop}
        />
      )}
    </div>
  );
};

export default App;

// {
//   JSON.stringify(updatedData[formParentID]?.['LEFT']?.Properties);
