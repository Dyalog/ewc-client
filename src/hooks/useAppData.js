import { AppDataContext } from '../context';
import { useContext } from 'react';
import { flattenJsonToArray } from './../utils/index';
import { parentId } from "../utils";

// Generate a single windowId for this app instance
const windowId = Math.random().toString(16).substr(2, 6);

const useAppData = () => {

  const {
    socketData, dataRef, socket, handleData, focusedElement, reRender, proceed, setProceed, proceedEventArray,
    setProceedEventArray, pendingKeypressEventRef, colors, fontScale, nqEvents, setNqEvents , updateCurrentEvent,
    currentEventRef, isDesktop,
  } = useContext(AppDataContext);

  const findDesiredData = (ID) => {
    const findData = socketData?.find((obj) => obj.ID == ID);
    return findData;
  };
  
  const findCurrentData = (ID) => {
    if (!ID) return null;
    const findData = flattenJsonToArray(dataRef.current).find((obj) => obj.ID == ID);
    return findData;
  };

  const inheritedProperty = (data, prop, allowedTypes = null) => {
    // Check if current component has the property
    if (data?.Properties.hasOwnProperty(prop)) {
      // If allowedTypes is specified, only return if this component's type is allowed
      if (allowedTypes) {
        const currentType = data.Properties?.Type;
        if (allowedTypes.includes(currentType)) {
          return data.Properties[prop];
        }
      } else {
        // No type restriction, return the property
        return data.Properties[prop];
      }
    }
    
    // Look up the parent hierarchy
    const pid = parentId(data.ID);
    if (pid) {
      const parentData = findCurrentData(pid);
      if (parentData) {
        return inheritedProperty(parentData, prop, allowedTypes);
      }
    }
    
    return null;
  };

  const inheritedProperties = (data, ...props) => {
    const ret = {};
    for (const prop of props) {
      const v = inheritedProperty(data, prop);
      if (v) {
        ret[prop] = v;
        continue;
      }
    }
    return ret;
  };

  const findAggregatedPropertiesData = (ID) => {
    const findAllData = socketData.filter((obj) => obj.ID === ID)
    const reqObj = {
      ID: ID,
      Properties: {}
    }
    findAllData.forEach(element => {
      reqObj.Properties = {
        ...reqObj.Properties,
        ...element.Properties
      }
    });
    return reqObj
  }

  const getObjType = (ID) => {
    const findData = socketData?.find((obj) => obj.ID == ID);
    return findData?.Properties?.Type;
  };

  const sendLog = (...args) => {
    if (socket && socket.readyState === 1 /* WebSocket.OPEN */) {
      const logMessage = JSON.stringify({
        Log: {
          windowId: windowId,
          Info: args
        }
      });
      socket.send(logMessage);
    }
  };

  

  return {
    socketData,
    findDesiredData,
    getObjType,
    dataRef,
    socket,
    handleData,
    focusedElement,
    reRender,
    proceed,
    setProceed,
    proceedEventArray,
    setProceedEventArray,
    pendingKeypressEventRef,
    colors,
    findAggregatedPropertiesData,
    fontScale,
    nqEvents,
    setNqEvents,
    findCurrentData,
    updateCurrentEvent,currentEventRef,
    isDesktop,
    inheritedProperty,
    inheritedProperties,
    sendLog
  };
};
export default useAppData;
