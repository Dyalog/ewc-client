import { AppDataContext } from '../context';
import { useContext } from 'react';
import { flattenJsonToArray } from './../utils/index';
import { parentId } from "../utils";

const useAppData = () => {

  const { socketData, dataRef, socket, handleData, focusedElement, reRender, proceed, setProceed, proceedEventArray, setProceedEventArray, pendingKeypressEvents, setPendingKeypressEvents, colors, fontScale, nqEvents, setNqEvents , updateCurrentEvent,currentEventRef, isDesktop} =

    useContext(AppDataContext);

  const findDesiredData = (ID) => {
    const findData = socketData?.find((obj) => obj.ID == ID);
    return findData;
  };
  
  const findCurrentData = (ID) => {
    if (!ID) return null;
    const findData = flattenJsonToArray(dataRef.current).find((obj) => obj.ID == ID);
    return findData;
  };

  const inheritedProperty = (data, prop) => {
    if (data?.Properties.hasOwnProperty(prop)) {
      return data.Properties[prop];
    } else {
      const pid = parentId(data.ID);
      if (pid) {
        return inheritedProperty(findCurrentData(pid), prop);
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
    pendingKeypressEvents,
    setPendingKeypressEvents,
    colors,
    findAggregatedPropertiesData,
    fontScale,
    nqEvents,
    setNqEvents,
    findCurrentData,
    updateCurrentEvent,currentEventRef,
    isDesktop,
    inheritedProperty,
    inheritedProperties
  };
};
export default useAppData;
