import { AppDataContext } from '../context';
import { useContext } from 'react';
import { flattenJsonToArray } from './../utils/index';

const useAppData = () => {

  const { socketData, dataRef, socket, handleData, focusedElement, reRender, proceed, setProceed, proceedEventArray, setProceedEventArray, colors, fontScale, nqEvents, setNqEvents , updateCurrentEvent,currentEventRef, isDesktop} =

    useContext(AppDataContext);

  const findDesiredData = (ID) => {
    const findData = socketData?.find((obj) => obj.ID == ID);
    return findData;
  };
  
  const findCurrentData = (ID) => {
    const findData = flattenJsonToArray(dataRef.current).find((obj) => obj.ID == ID);
    return findData;
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
    colors,
    findAggregatedPropertiesData,
    fontScale,
    nqEvents,
    setNqEvents,
    findCurrentData,
    updateCurrentEvent,currentEventRef,
    isDesktop
  };
};
export default useAppData;
