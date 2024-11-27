// import { useAppData, useResizeObserver } from '../../hooks';
// import Cell from './Cell';
// import { useEffect, useState, useRef } from 'react';
// import { extractStringUntilSecondPeriod, setStyle, generateHeader } from '../../utils';

// const Grid = ({ data }) => {
//   const { findDesiredData, socket } = useAppData();
//   const [selectedGrid, setSelectedGrid] = useState(null);
//   const [tableProperty, setTableProperty] = useState({ row: false, column: false, body: false });
//   const dimensions = useResizeObserver(
//     document.getElementById(extractStringUntilSecondPeriod(data?.ID))
//   );

//   let size = 0;
//   const {
//     Size,
//     Values,
//     Input,
//     ColTitles,
//     RowTitles,
//     CellWidths,
//     Visible,
//     CurCell,
//     CellTypes,
//     ShowInput,
//     FormattedValues,
//     BCol,
//     CellFonts,
//     RowTitleBCol,
//     RowTitleFCol,
//     ColTitleBCol,
//     ColTitleFCol,
//     TitleHeight,
//     TitleWidth,
//     FormatString,
//     VScroll = 0,
//     HScroll = 0,
//     Attach,
//     Event,
//   } = data?.Properties;

//   const handleGridClick = (row, column, property) => {
//     if (property == 'column') {
//       setTableProperty({
//         row: false,
//         column: true,
//         body: false,
//       });
//     } else if (property == 'row') {
//       setTableProperty({
//         row: true,
//         column: false,
//         body: false,
//       });
//     } else if (property == 'body') {
//       setTableProperty({
//         row: false,
//         column: false,
//         body: true,
//       });
//     }
//     localStorage.setItem(
//       data?.ID,
//       JSON.stringify({
//         Event: {
//           CurCell: [row, column],
//           Values,
//         },+
//   useEffect(() => {
//     if (cells.current.length > 0) {
//       cells.current[0].focus(); // Set initial focus on the first cell
//     }
//   }, []);

//   if (!ColTitles) {
//     size = Values[0]?.length + 1;
//   }

//   useEffect(() => {
//     localStorage.setItem(
//       data?.ID,
//       JSON.stringify({
//         Event: {
//           CurCell: !CurCell ? [0, 0] : CurCell,
//           Values,
//         },
//       })
//     );

//     if (CurCell) {
//       setSelectedGrid({ row: CurCell[0], column: CurCell[1] });
//       setTableProperty({
//         row: false,
//         column: false,
//         body: true,
//       });
//     }
//   }, [data]);

//   useEffect(() => {
//     if (!Attach) return;
//     setWidth(dimensions?.width - 73);
//     setHeight(dimensions?.height - 73);
//   }, [dimensions]);

//   // Grid without types
//   const handleKeyPress = (e) => {
//     const exists = Event && Event.some((item) => item[0] === 'KeyPress');
//     if (!exists) return;

//     const isAltPressed = e.altKey ? 4 : 0;
//     const isCtrlPressed = e.ctrlKey ? 2 : 0;
//     const isShiftPressed = e.shiftKey ? 1 : 0;
//     const charCode = e.key.charCodeAt(0);
//     let shiftState = isAltPressed + isCtrlPressed + isShiftPressed;

//     let event = JSON.stringify({
//       Event: {
//         EventName: 'KeyPress',
//         ID: data?.ID,
//         Info: [e.key, charCode, e.keyCode, shiftState],
//       },
//     });
//     console.log(event);
//     socket.send(event);
//   };

//   return (
//     <div
//       tabIndex='0'
//       onKeyDown={handleKeyPress}
//       id={data.ID}
//       style={{
//         ...style,
//         height,
//         width,
//         border: '1px solid black',
//         overflow: !ColTitles ? 'auto' : 'hidden',
//         background: 'white',
//         display: Visible == 0 ? 'none' : 'block',
//         overflowX: HScroll == -3 ? 'scroll' : HScroll == -1 || HScroll == -2 ? 'auto' : 'hidden',
//         overflowY: VScroll == -3 ? 'scroll' : VScroll == -1 || HScroll == -2 ? 'auto' : 'hidden',
//       }}
//     >
//       {/* Table have column */}
//       {ColTitles && (
//         <div style={{ display: 'flex' }}>
//           {RowTitles?.length > 1 ? (
//             <Cell
//               key={0}
//               cellWidth={TitleWidth && TitleWidth}
//               title={''}
//               column={0}
//               row={0}
//               isColumn={tableProperty.column}
//               isRow={tableProperty.row}
//               isBody={tableProperty.body}
//               selectedGrid={selectedGrid}
//               onClick={(row, column) => handleGridClick(row, column, 'column')}
//             />
//           ) : null}

//           {ColTitles.map((heading, column) => {
//             return (
//               <Cell
//                 fontColor={ColTitleFCol}
//                 bgColor={ColTitleBCol}
//                 isColumn={tableProperty.column}
//                 isRow={tableProperty.row}
//                 isBody={tableProperty.body}
//                 selectedGrid={selectedGrid}
//                 cellWidth={CellWidths && CellWidths[column]}
//                 title={heading}
//                 column={column + 1}
//                 onClick={(row, column) => handleGridClick(row, column, 'column')}
//                 highLightMe={tableProperty.body && selectedGrid.column === column + 1}
//                 row={0}
//                 key={column + 1}
//               />
//             );
//           })}
//         </div>
//       )}

//       {/* Table not have column */}
//       {!ColTitles ? (
//         <div style={{ display: 'flex' }}>
//           {generateHeader(size).map((letter, i) => {
//             return i < size ? (
//               <Cell
//                 isColumn={tableProperty.column}
//                 isRow={tableProperty.row}
//                 isBody={tableProperty.body}
//                 highLightMe={tableProperty.body && selectedGrid.column === i}
//                 row={0}
//                 title={letter}
//                 column={i}
//                 selectedGrid={selectedGrid}
//                 onClick={(row, column) => handleGridClick(row, column, 'column')}
//                 key={i}
//               />
//             ) : null;
//           })}
//         </div>
//       ) : null}

//       {/* Grid Body with types and without types you can find that check in the Cell component */}

//       {Values?.map((tableValues, row) => {
//         return (
//           <div
//             style={{
//               display: 'flex',
//             }}
//           >
//             {!ColTitles ? (
//               <Cell
//                 cellWidth={100}
//                 justify='start'
//                 isColumn={tableProperty.column}
//                 isRow={tableProperty.row}
//                 isBody={tableProperty.body}
//                 onClick={(row, column) => handleGridClick(row, column, 'row')}
//                 column={0}
//                 key={0}
//                 row={row + 1}
//                 title={row + 1}
//                 selectedGrid={selectedGrid}
//                 highLightMe={tableProperty.body && selectedGrid.row === row + 1}
//               />
//             ) : null}
//             {RowTitles ? (
//               <Cell
//                 fontColor={RowTitleFCol}
//                 bgColor={RowTitleBCol}
//                 cellWidth={TitleWidth && TitleWidth}
//                 title={RowTitles[row]}
//                 selectedGrid={selectedGrid}
//                 row={row + 1}
//                 isColumn={tableProperty.column}
//                 isRow={tableProperty.row}
//                 isBody={tableProperty.body}
//                 highLightMe={tableProperty.body && selectedGrid.row === row + 1}
//                 onClick={(row, column) => handleGridClick(row, column, 'row')}
//                 column={0}
//                 key={0}
//                 justify='start'
//               />
//             ) : null}
//             {tableValues.map((value, column) => {
//               let cellType = CellTypes && CellTypes[row][column];
//               const type = findDesiredData(Input && Input[cellType - 1]);
//               const event = data?.Properties?.Event && data?.Properties?.Event;
//               const backgroundColor = BCol && BCol[cellType - 1];
//               const cellFont = findDesiredData(CellFonts && CellFonts[cellType - 1]);

//               return (
//                 <Cell
//                   justify={type ? '' : typeof value == 'string' ? 'start' : 'end'}
//                   cellWidth={CellWidths && CellWidths[column]}
//                   title={value}
//                   formattedValue={FormattedValues && FormattedValues[row][column]}
//                   type={type}
//                   parent={event}
//                   row={row + 1}
//                   location='inGrid'
//                   column={column + 1}
//                   selectedGrid={selectedGrid}
//                   onClick={(row, column) => handleGridClick(row, column, 'body')}
//                   isColumn={tableProperty.column}
//                   isRow={tableProperty.row}
//                   isBody={tableProperty.body}
//                   values={Values}
//                   ShowInput={ShowInput}
//                   bgColor={backgroundColor}
//                   cellFont={cellFont}
//                   formatString={FormatString && FormatString[cellType - 1]}
//                   key={column + 1}
//                 />
//               );
//             })}
//           </div>
//         );
//       })}
//     </div>
//   );
// };

// export default Grid;

import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  setStyle,
  generateHeader,
  extractStringUntilLastPeriod,
  rgbColor,
  handleMouseDown,
  handleMouseMove,
  handleMouseLeave,
  handleMouseEnter,
  handleMouseUp,
  parseFlexStyles,
  handleMouseWheel,
  handleMouseDoubleClick,
} from "../../utils";
import { useResizeObserver, useAppData } from "../../hooks";
import GridEdit from "./GridEdit";
import GridSelect from "./GridSelect";
import GridButton from "./GridButton";
import GridCell from "./GridCell";
import Header from "./Header";
import GridLabel from "./GridLabel";

const Component = ({ data }) => {
  if (data?.type == "Edit") return <GridEdit data={data} />;
  else if (data?.type == "Button") return <GridButton data={data} />;
  else if (data?.type == "cell" || data?.type == "rowTitle") return <GridCell data={data} />;
  else if (data?.type == "header") return <Header data={data} />;
  else if (data?.type == "Combo") return <GridSelect data={data} />;
  else if (data?.type == "Label") return <GridLabel data={data} />;
};

const Grid = ({ data }) => {
  const gridId = data?.ID;
  const {
    findDesiredData,
    socket,
    proceed,
    setProceed,
    proceedEventArray,
    setProceedEventArray,
    findAggregatedPropertiesData,
    handleData
  } = useAppData();

  const [eventId, setEventId] = useState(null);

  const dimensions = useResizeObserver(
    document.getElementById(extractStringUntilLastPeriod(data?.ID))
  );


  const gridRef = useRef(null);

  const {
    Size,
    Values,
    Input,
    ColTitles,
    RowTitles,
    CellWidths,
    CellHeights,
    Visible,
    CurCell,
    CellTypes,
    ShowInput,
    FormattedValues,
    BCol,
    CellFonts,
    ColTitleBCol,
    ColTitleFCol,
    TitleHeight,
    TitleWidth,
    FormatString,
    VScroll = 0,
    HScroll = 0,
    Attach,
    Event,
    CSS,
  } = data?.Properties;

  const [height, setHeight] = useState(Size[0]);
  const [width, setWidth] = useState(Size[1]);
  const [rows, setRows] = useState(0);
  const [columns, setColumns] = useState(0);
  const [selectedRow, setSelectedRow] = useState(
    !CurCell ? (ColTitles?.length > 0 ? 1 : 0) : CurCell[0]
  );
  const [selectedColumn, setSelectedColumn] = useState(
    !CurCell ? (TitleWidth === 0 ? 1 : 0) : CurCell[1]
  );

  const [clickData, setClickData] = useState({isClicked: false, row: selectedRow, column: selectedColumn})


  console.log("284 waiting", proceed, proceedEventArray, selectedRow, selectedColumn,clickData);
  useEffect(() => {
    if (CurCell) {
      console.log("284 curcell useEffect")

      let defaultRow = !CurCell ? (RowTitles?.length > 0 ? 1 : 0) : CurCell[0];
      let defaultCol = !CurCell ? (TitleWidth === 0 ? 1 : 0) : CurCell[1];
      setSelectedRow((prev) => (prev !== CurCell[0] ? defaultRow : prev));
      setSelectedColumn((prev) => (prev !== CurCell[1] ? defaultCol : prev));

      localStorage.setItem(
        data?.ID,
        JSON.stringify({
          Event: {
            CurCell: [defaultRow, defaultCol],
          },
        })
      );
    }
  }, [CurCell]);

  useEffect(() => {
    if (proceedEventArray[localStorage.getItem("keyPressEventId") + "KeyPress"] == 1) {
      const event = JSON.parse(localStorage.getItem("event"))
      updatePosition(event)
      setProceed(false);
      setProceedEventArray((prev) => ({ ...prev, [localStorage.getItem("keyPressEventId") + "KeyPress"]: 0 }));
      localStorage.removeItem("current-event")
    }
    else if (
      (proceedEventArray[localStorage.getItem("keyPressEventId") + "CellMove"] == 1)
    ) {
      
      console.log("284 in cellmove", clickData,localStorage.getItem("keyPressEventId"),proceedEventArray[localStorage.getItem("keyPressEventId") + "CellMove"])
      localStorage.removeItem("current-event")
      if(clickData.isClicked)
      {
        handleCellClickUpdate(clickData.row, clickData.column)
        setClickData({isClicked: false})
        return
      }
      
      let localStoragValue = JSON.parse(localStorage.getItem(data?.ID));
      
      if (!localStoragValue) {
        localStorage.setItem(
          data?.ID,
          JSON.stringify({
            Event: {
              CurCell: [
                selectedRow,
                selectedColumn,
              ],
            },
          })
        );
      } else {
        localStorage.setItem(
          data?.ID,
          JSON.stringify({
            Event: {
              CurCell: [
                selectedRow,
                selectedColumn,
              ],
              Values: localStoragValue?.Event?.Values,
            },
          })
        );
      }
      const event = JSON.parse(localStorage.getItem("event"))
      updateRowColumn(event)
      // setProceedEventArray((prev) => ({ ...prev, [localStorage.getItem("keyPressEventId") + "CellMove"]: 0 }));
    }
  }, [Object.keys(proceedEventArray).length])


  // useEffect(() => {
  //   if (localStorage.getItem(data.ID)) {
  //     const { Event } = JSON.parse(localStorage.getItem(data.ID));
  //     if (Event.CurCell) {
  //       handleData(
  //         {
  //           ID: data?.ID,
  //           Properties: {
  //             CurCell: [Event.CurCell[0], Event.CurCell[1]],
  //           },
  //         },
  //         'WS'
  //       );

  //     }
  //   }

  // }, [localStorage.getItem(data.ID)]);

  // useEffect(()=>{
  //   let defaultRow = !CurCell ? (RowTitles?.length > 0 ? 1 : 0) : CurCell[0]
  //   let defaultCol =  !CurCell ? (RowTitles?.length > 0 ? 1 : 0) : CurCell[1]
  //   setSelectedRow( defaultRow === 0 ? 0: defaultRow  )
  //   setSelectedColumn( defaultCol === 0 ? 0: defaultCol -1 )

  // },[])
  // console.log("issue arrow nq", CurCell, selectedRow, selectedColumn)

  const style = setStyle(data?.Properties);

  useEffect(() => {
    if (!Attach) return;
    setWidth(dimensions?.width - 73);
    setHeight(dimensions?.height - 73);
  }, [dimensions]);

  useEffect(() => {
    if (!ColTitles) setColumns(Values[0]?.length + 1);
    else setColumns(ColTitles?.length);

    if (Values) setRows(Values?.length + 1);
  }, [data]);

  const handleCellMove = (row, column, mouseClick) => {
    localStorage.setItem("current-event", "CellMove")
    if (column > columns || column <= 0) return;
    const isKeyboard = !mouseClick ? 1 : 0;
    const eventId = uuidv4();
    setEventId(eventId);
    localStorage.setItem("keyPressEventId", eventId)
    // console.log("286 waiting handle cell move", row, column, selectedRow, selectedColumn)
    const cellChanged = JSON.parse(localStorage.getItem("isChanged"));
    const cellMoveEvent = JSON.stringify({
      Event: {
        ID: data?.ID,
        EventName: "CellMove",
        EventID: eventId,
        Info: [
          row,
          column,
          isKeyboard,
          0,
          mouseClick,
          cellChanged && cellChanged.isChange ? 1 : 0,
          cellChanged && cellChanged ? cellChanged.value : "",
        ],
      },
    });

    const exists = Event && Event?.some((item) => item[0] === "CellMove");
    if (!exists) return;
    socket.send(cellMoveEvent);
    let localStoragValue = JSON.parse(localStorage.getItem(data?.ID));

    // if (!localStoragValue) {
    //   localStorage.setItem(
    //     data?.ID,
    //     JSON.stringify({
    //       Event: {
    //         CurCell: [
    //           row,
    //           column,
    //         ],
    //       },
    //     })
    //   );
    // } else {
    //   localStorage.setItem(
    //     data?.ID,
    //     JSON.stringify({
    //       Event: {
    //         CurCell: [
    //           row,
    //           column,
    //         ],
    //         Values: localStoragValue?.Event?.Values,
    //       },
    //     })
    //   );
    // }

    localStorage.setItem(
      "isChanged",
      JSON.stringify({
        isChange: false,
        value: "",
      })
    );
  };

  // const waitForProceed = (localStorageBool) => {
  //   return new Promise((resolve) => {
  //     const checkProceed = () => {
  //       if (localStorageBool || proceed !== null) {
  //         // console.log("waiting checking proceed event",eventId, proceedEventArray[eventId], proceedEventArray, )
  //         if (localStorageBool || proceedEventArray[eventId] === 1) {
  //           resolve();
  //           setProceed(false);
  //           setProceedEventArray((prev) => ({ ...prev, [eventId]: 0 }));
  //         } else {
  //           return;
  //         }
  //       }
  //     };

  //     checkProceed();
  //     // setTimeout(() => {
  //       //   checkProceed();
  //       // }, 80);
  //     });
  //   };

  // const updatePosition = async () => {
  //   if (event.key === "ArrowRight") {
  //     if (childExists || parentExists)
  //       await waitForProceed(localStorage.getItem(eventId));
  //     const updatedColumn = Math.min(selectedColumn + 1, !ColTitles ? columns - 1 : columns)
  //     setSelectedColumn(updatedColumn);
  //     if (selectedColumn === updatedColumn) return

  //     if (!localStoragValue) {
  //       console.log(
  //         "writing local storage",
  //         JSON.stringify({
  //           Event: {
  //             CurCell: [
  //               selectedRow,
  //               updatedColumn,
  //             ],
  //           },
  //         })
  //       );


  //       localStorage.setItem(
  //         data?.ID,
  //         JSON.stringify({
  //           Event: {
  //             CurCell: [
  //               selectedRow,
  //               updatedColumn,
  //             ],
  //           },
  //         })
  //       );
  //     } else {
  //       console.log(
  //         JSON.stringify({
  //           Event: {
  //             CurCell: [
  //               selectedRow,
  //               updatedColumn,
  //             ],
  //             Values: localStoragValue?.Event?.Values,
  //           },
  //         })
  //       );

  //       localStorage.setItem(
  //         data?.ID,
  //         JSON.stringify({
  //           Event: {
  //             CurCell: [
  //               selectedRow,
  //               updatedColumn,
  //             ],
  //             Values: localStoragValue?.Event?.Values,
  //           },
  //         })
  //       );
  //     }
  //     handleCellMove(
  //       selectedRow,
  //       updatedColumn,
  //       0
  //     );
  //   } else if (event.key === "ArrowLeft") {
  //     if (childExists || parentExists)
  //       await waitForProceed(localStorage.getItem(eventId));
  //     const updatedColumn = Math.max(selectedColumn - 1, 1)
  //     setSelectedColumn(updatedColumn);
  //     if (selectedColumn === updatedColumn) return
  //     if (!localStoragValue) {
  //       localStorage.setItem(
  //         data?.ID,
  //         JSON.stringify({
  //           Event: {
  //             CurCell: [
  //               selectedRow,
  //               updatedColumn,
  //             ],
  //           },
  //         })
  //       );
  //     } else {
  //       localStorage.setItem(
  //         data?.ID,
  //         JSON.stringify({
  //           Event: {
  //             CurCell: [
  //               selectedRow,
  //               updatedColumn,
  //             ],
  //             Values: localStoragValue?.Event?.Values,
  //           },
  //         })
  //       );
  //     }
  //     handleCellMove(
  //       selectedRow,
  //       updatedColumn,
  //       0
  //     );
  //   } else if (event.key === "ArrowUp") {
  //     if (childExists || parentExists)
  //       await waitForProceed(localStorage.getItem(eventId));
  //     const updatedRow = Math.max(selectedRow - 1, 1)
  //     setSelectedRow(updatedRow);
  //     if (selectedRow === updatedRow) return
  //     if (!localStoragValue) {
  //       localStorage.setItem(
  //         data?.ID,
  //         JSON.stringify({
  //           Event: {
  //             CurCell: [
  //               updatedRow,
  //               selectedColumn,
  //             ],
  //           },
  //         })
  //       );
  //     } else {
  //       localStorage.setItem(
  //         data?.ID,
  //         JSON.stringify({
  //           Event: {
  //             CurCell: [
  //               updatedRow,
  //               selectedColumn,
  //             ],
  //             Values: localStoragValue?.Event?.Values,
  //           },
  //         })
  //       );
  //     }
  //     handleCellMove(
  //       updatedRow,
  //       selectedColumn,
  //       0
  //     );
  //   } else if (event.key === "ArrowDown") {
  //     if (childExists || parentExists)
  //       await waitForProceed(localStorage.getItem(eventId));
  //     const updatedRow = Math.min(selectedRow + 1, rows - 1)
  //     setSelectedRow(updatedRow);
  //     if (selectedRow == rows - 1) return;
  //     if (!localStoragValue) {

  //       localStorage.setItem(
  //         data?.ID,
  //         JSON.stringify({
  //           Event: {
  //             CurCell: [
  //               updatedRow,
  //               selectedColumn,
  //             ],
  //           },
  //         })
  //       );
  //     } else {

  //       localStorage.setItem(
  //         data?.ID,
  //         JSON.stringify({
  //           Event: {
  //             CurCell: [
  //               updatedRow,
  //               selectedColumn,
  //             ],
  //             Values: localStoragValue?.Event?.Values,
  //           },
  //         })
  //       );
  //     }
  //     if (selectedRow === updatedRow) return
  //     handleCellMove(
  //       updatedRow,
  //       selectedColumn,
  //       0
  //     );
  //   } else if (event.key === "PageDown") {
  //     if (childExists || parentExists)
  //       await waitForProceed(localStorage.getItem(eventId));
  //     const demoRow = Math.min(selectedRow + 9, rows - 1);
  //     setSelectedRow(demoRow);
  //     if (!localStoragValue) {
  //       if (selectedRow == rows - 1) return;
  //       localStorage.setItem(
  //         data?.ID,
  //         JSON.stringify({
  //           Event: {
  //             CurCell: [
  //               demoRow,
  //               selectedColumn,
  //             ],
  //           },
  //         })
  //       );
  //     } else {
  //       if (selectedRow == rows - 1) return;

  //       localStorage.setItem(
  //         data?.ID,
  //         JSON.stringify({
  //           Event: {
  //             CurCell: [
  //               demoRow,
  //               selectedColumn,
  //             ],
  //             Values: localStoragValue?.Event?.Values,
  //           },
  //         })
  //       );
  //     }
  //     handleCellMove(
  //       demoRow,
  //       selectedColumn,
  //       0
  //     );
  //   } else if (event.key === "PageUp") {
  //     if (childExists || parentExists)
  //       await waitForProceed(localStorage.getItem(eventId));
  //     const updatedRow = Math.max(selectedRow - 9, 1)
  //     setSelectedRow(updatedRow);
  //     if (!localStoragValue) {
  //       if (selectedRow == updatedRow) return;

  //       localStorage.setItem(
  //         data?.ID,
  //         JSON.stringify({
  //           Event: {
  //             CurCell: [
  //               updatedRow,
  //               selectedColumn,
  //             ],
  //           },
  //         })
  //       );
  //     } else {
  //       if (selectedRow == updatedRow) return;
  //       localStorage.setItem(
  //         data?.ID,
  //         JSON.stringify({
  //           Event: {
  //             CurCell: [
  //               updatedRow,
  //               selectedColumn,
  //             ],
  //             Values: localStoragValue?.Event?.Values,
  //           },
  //         })
  //       );
  //     }
  //     handleCellMove(
  //       updatedRow,
  //       selectedColumn,
  //       0
  //     );
  //   }
  // };

  const handleKeyDown = (event) => {
    localStorage.setItem("event", JSON.stringify(event.key))
    localStorage.setItem("current-event", "KeyPress")
    const isAltPressed = event.altKey ? 4 : 0;
    const isCtrlPressed = event.ctrlKey ? 2 : 0;
    const isShiftPressed = event.shiftKey ? 1 : 0;
    const charCode = event.key.charCodeAt(0);
    const eventId = uuidv4();
    setEventId(eventId);
    let shiftState = isAltPressed + isCtrlPressed + isShiftPressed;

    const parentExists =
      Event && Event?.some((item) => item[0].toLowerCase() === "keypress");

    let keys = Object.keys(data);
    let childKey;
    const checkArray = keys.reduce((prev, current) => {
      if (
        data[current]?.Properties?.Event?.some(
          (item) => item[0].toLowerCase() === "keypress"
        )
      )
        childKey = current;
      return [
        ...prev,
        data[current]?.Properties?.Event?.some(
          (item) => item[0].toLowerCase() === "keypress"
        ),
      ];
    }, []);
    const childExists = checkArray.some((item) => item === true);

    // const childExists = data?.E1?.Properties?.Event?.some((item) => item[0].toLowerCase() === "keypress")

    const parentKeyPressEvent = JSON.stringify({
      Event: {
        EventName: "KeyPress",
        ID: data?.ID,
        EventID: eventId,
        Info: [event.key, charCode, event.keyCode, shiftState],
      },
    });
    localStorage.setItem("keyPressEventId", eventId)
    const keyPressEvent = JSON.stringify({
      Event: {
        EventName: "KeyPress",
        ID: data[childKey]?.ID,
        EventID: eventId,
        Info: [event.key, charCode, event.keyCode, shiftState],
      },
    });

    if (parentExists && !!!childExists) {
      socket.send(parentKeyPressEvent);
    }

    if (childExists) {
      socket.send(keyPressEvent);
    }

    // setTimeout(()=>{
    // }, 100)

    const isNavigationKeys = [
      "ArrowRight",
      "ArrowLeft",
      "ArrowUp",
      "ArrowDown",
    ].some((key) => event.key === key);

    if (isNavigationKeys) {
      gridRef.current.focus();
    }

    // updatePosition();
    // setTimeout(() => {
    //   updatePosition();
    // }, 120);
  };

  const updatePosition = (key) => {
    let localStoragValue = JSON.parse(localStorage.getItem(data?.ID));

    if (key === "ArrowRight") {
      const updatedColumn = Math.min(selectedColumn + 1, !ColTitles ? columns - 1 : columns)
      // setSelectedColumn(updatedColumn);
      if (selectedColumn === updatedColumn) return

      handleCellMove(
        selectedRow,
        updatedColumn,
        0
      );
    } else if (key === "ArrowLeft") {
      const updatedColumn = Math.max(selectedColumn - 1, 1)
      // setSelectedColumn(updatedColumn);
      if (selectedColumn === updatedColumn) return
      // if (!localStoragValue) {
      //   localStorage.setItem(
      //     data?.ID,
      //     JSON.stringify({
      //       Event: {
      //         CurCell: [
      //           selectedRow,
      //           updatedColumn,
      //         ],
      //       },
      //     })
      //   );
      // } else {
      //   localStorage.setItem(
      //     data?.ID,
      //     JSON.stringify({
      //       Event: {
      //         CurCell: [
      //           selectedRow,
      //           updatedColumn,
      //         ],
      //         Values: localStoragValue?.Event?.Values,
      //       },
      //     })
      //   );
      // }
      handleCellMove(
        selectedRow,
        updatedColumn,
        0
      );
    } else if (key === "ArrowUp") {
      const updatedRow = Math.max(selectedRow - 1, 1)
      // setSelectedRow(updatedRow);
      if (selectedRow === updatedRow) return
      // if (!localStoragValue) {
      //   localStorage.setItem(
      //     data?.ID,
      //     JSON.stringify({
      //       Event: {
      //         CurCell: [
      //           updatedRow,
      //           selectedColumn,
      //         ],
      //       },
      //     })
      //   );
      // } else {
      //   localStorage.setItem(
      //     data?.ID,
      //     JSON.stringify({
      //       Event: {
      //         CurCell: [
      //           updatedRow,
      //           selectedColumn,
      //         ],
      //         Values: localStoragValue?.Event?.Values,
      //       },
      //     })
      //   );
      // }
      handleCellMove(
        updatedRow,
        selectedColumn,
        0
      );
    } else if (key === "ArrowDown") {
      const updatedRow = Math.min(selectedRow + 1, rows - 1)
      // setSelectedRow(updatedRow);
      if (selectedRow == rows - 1) return;
      // if (!localStoragValue) {

      //   localStorage.setItem(
      //     data?.ID,
      //     JSON.stringify({
      //       Event: {
      //         CurCell: [
      //           updatedRow,
      //           selectedColumn,
      //         ],
      //       },
      //     })
      //   );
      // } else {
      //   localStorage.setItem(
      //     data?.ID,
      //     JSON.stringify({
      //       Event: {
      //         CurCell: [
      //           updatedRow,
      //           selectedColumn,
      //         ],
      //         Values: localStoragValue?.Event?.Values,
      //       },
      //     })
      //   );
      // }
      if (selectedRow === updatedRow) return
      handleCellMove(
        updatedRow,
        selectedColumn,
        0
      );
    } else if (key === "PageDown") {
      const demoRow = Math.min(selectedRow + 9, rows - 1);
      // setSelectedRow(demoRow);
      // if (!localStoragValue) {
      //   if (selectedRow == rows - 1) return;
      //   localStorage.setItem(
      //     data?.ID,
      //     JSON.stringify({
      //       Event: {
      //         CurCell: [
      //           demoRow,
      //           selectedColumn,
      //         ],
      //       },
      //     })
      //   );
      // } else {
      //   if (selectedRow == rows - 1) return;
      //   localStorage.setItem(
      //     data?.ID,
      //     JSON.stringify({
      //       Event: {
      //         CurCell: [
      //           demoRow,
      //           selectedColumn,
      //         ],
      //         Values: localStoragValue?.Event?.Values,
      //       },
      //     })
      //   );
      // }
      handleCellMove(
        demoRow,
        selectedColumn,
        0
      );
    } else if (key === "PageUp") {
      const updatedRow = Math.max(selectedRow - 9, 1)
      // setSelectedRow(updatedRow);
      if (selectedRow == updatedRow) return;
      // if (!localStoragValue) {

      //   localStorage.setItem(
      //     data?.ID,
      //     JSON.stringify({
      //       Event: {
      //         CurCell: [
      //           updatedRow,
      //           selectedColumn,
      //         ],
      //       },
      //     })
      //   );
      // } else {
      //   if (selectedRow == updatedRow) return;
      //   localStorage.setItem(
      //     data?.ID,
      //     JSON.stringify({
      //       Event: {
      //         CurCell: [
      //           updatedRow,
      //           selectedColumn,
      //         ],
      //         Values: localStoragValue?.Event?.Values,
      //       },
      //     })
      //   );
      // }
      handleCellMove(
        updatedRow,
        selectedColumn,
        0
      );
    }
  };
  const updateRowColumn = (key) => {
    if (key === "ArrowRight") {
      const updatedColumn = Math.min(selectedColumn + 1, !ColTitles ? columns - 1 : columns)
      setSelectedColumn(updatedColumn);
      handleData(
        {
          ID: data?.ID,
          Properties: {
            CurCell: [selectedRow, updatedColumn],
          },
        },
        'WS'
      );
    } else if (key === "ArrowLeft") {
      const updatedColumn = Math.max(selectedColumn - 1, 1)
      setSelectedColumn(updatedColumn);
      handleData(
        {
          ID: data?.ID,
          Properties: {
            CurCell: [selectedRow, updatedColumn],
          },
        },
        'WS'
      );
    } else if (key === "ArrowUp") {
      const updatedRow = Math.max(selectedRow - 1, 1)
      setSelectedRow(updatedRow);
      handleData(
        {
          ID: data?.ID,
          Properties: {
            CurCell: [updatedRow, selectedColumn],
          },
        },
        'WS'
      );
    } else if (key === "ArrowDown") {
      const updatedRow = Math.min(selectedRow + 1, rows - 1)
      setSelectedRow(updatedRow);
      handleData(
        {
          ID: data?.ID,
          Properties: {
            CurCell: [updatedRow, selectedColumn],
          },
        },
        'WS'
      );
    } else if (key === "PageDown") {
      const demoRow = Math.min(selectedRow + 9, rows - 1);
      setSelectedRow(demoRow);
      handleData(
        {
          ID: data?.ID,
          Properties: {
            CurCell: [demoRow, selectedColumn],
          },
        },
        'WS'
      );
    } else if (key === "PageUp") {
      const updatedRow = Math.max(selectedRow - 9, 1)
      setSelectedRow(updatedRow);
      handleData(
        {
          ID: data?.ID,
          Properties: {
            CurCell: [updatedRow, selectedColumn],
          },
        },
        'WS'
      );
    }
   
  };

  const modifyGridData = () => {
    let data = [];
    // Push the header Information
    if (ColTitles) {
      // Add the empty cell in the header when the default Row Titles is present
      let header = [];
      let emptyobj = {
        value: "",
        type: "header",
        width: !TitleWidth ? 100 : TitleWidth,
        height: !TitleHeight ? 20 : TitleHeight,
      };
      TitleWidth === 0 ? null : header.push(emptyobj)

      // push the obj when TitleWidth is present
      // !TitleWidth && !RowTitles ? null : header.push(emptyobj);

      for (let i = 0; i < ColTitles?.length; i++) {
        let obj = {
          value: ColTitles[i],
          type: "header",
          backgroundColor: rgbColor(ColTitleBCol),
          color: rgbColor(ColTitleFCol),
          width: !CellWidths
            ? 100
            : Array.isArray(CellWidths)
              ? CellWidths[i]
              : CellWidths,
          height: !TitleHeight ? 20 : TitleHeight,
        };

        header.push(obj);
      }

      // header = RowTitles
      //   ? [
      //       {
      //         value: '',
      //         type: 'header',
      //         width: RowTitles ? (!TitleWidth ? 100 : TitleWidth) : CellWidths,
      //       },
      //       ...header,
      //     ]
      //   : [...header];

      data.push(header);
    } else if (!ColTitles) {
      let headerArray = generateHeader(columns).map((alphabet) => {
        return {
          value: alphabet,
          type: "header",
          width: !TitleWidth ? 100 : TitleWidth,
          height: !TitleHeight ? 20 : TitleHeight,
        };
      });
      data.push(headerArray);
    }

    // Make the body the Grid Like if it have Input Array that means it have types
    if (!Input) {
      for (let i = 0; i < Values?.length; i++) {
        let cellType = CellTypes && CellTypes[i][0];
        const backgroundColor = BCol && BCol[cellType - 1];
        let body = [];
        let obj = {
          type: "rowTitle",
          value: RowTitles ? RowTitles[i] : i + 1,
          width: RowTitles ? (!TitleWidth ? 100 : TitleWidth) : 100,
          height: !CellHeights
            ? 20
            : Array.isArray(CellHeights)
              ? CellHeights[i]
              : CellHeights,
          align: "end",
          backgroundColor: rgbColor(backgroundColor),
        };
        TitleWidth == undefined
          ? body.push(obj)
          : TitleWidth == 0
            ? null
            : body.push(obj);
        for (let j = 0; j <= columns; j++) {
          if (Values[i][j] === undefined) continue;
          let obj = {
            type: "cell",
            value: Values[i][j],
            width: !CellWidths
              ? 100
              : Array.isArray(CellWidths)
                ? CellWidths[j]
                : CellWidths,
            height: !CellHeights
              ? 20
              : Array.isArray(CellHeights)
                ? CellHeights[j]
                : CellHeights,
            align: !isNaN(Values[i][j]) ? "end" : "start",
            paddingLeft: !isNaN(parseInt(Values[i][j])) ? "0px" : "5px",
          };
          body.push(obj);
        }
        data.push(body);
      }
    } else if (Input) {
      for (let i = 0; i < Values?.length; i++) {
        let body = [];
        let cellType = CellTypes && CellTypes[i][0];
        const backgroundColor = BCol && BCol[cellType - 1];

        // Decide to add the RowTitles If the TitleWidth is Greater than 0
        let obj = {
          type: "rowTitle",
          value: RowTitles ? RowTitles[i] : i + 1,
          width: !TitleWidth ? 100 : TitleWidth,
          height: !CellHeights
            ? 20
            : Array.isArray(CellHeights)
              ? CellHeights[i]
              : CellHeights,
          align: "end",
          backgroundColor: rgbColor(backgroundColor),
        };

        TitleWidth == undefined
          ? body.push(obj)
          : TitleWidth == 0
            ? null
            : body.push(obj);

        for (let j = 0; j < columns; j++) {
          let cellType = CellTypes && CellTypes[i][j];
          const type = findAggregatedPropertiesData(
            Input?.length > 1 ? Input && Input[cellType - 1] : Input[0]
          );

          // findAggregatedPropertiesData(Input?.length > 1 ? Input && Input[cellType - 1] : Input[0])
          // console.log("index grid", type,  Input?.length > 1 ? Input && Input[cellType - 1] : Input[0])
          const event = data?.Properties?.Event && data?.Properties?.Event;
          const backgroundColor = BCol && BCol[cellType - 1];
          const cellFont = findDesiredData(
            CellFonts && CellFonts[cellType - 1]
          );

          let obj = {
            type: !type ? "cell" : type?.Properties?.Type,
            value: Values[i][j],
            event,
            backgroundColor: rgbColor(backgroundColor),
            cellFont,
            typeObj: type,
            formattedValue: FormattedValues && FormattedValues[i][j],
            formatString: FormatString && FormatString[cellType - 1],
            width: !CellWidths
              ? 100
              : Array.isArray(CellWidths)
                ? CellWidths[j]
                : CellWidths,
            height: !CellHeights
              ? 20
              : Array.isArray(CellHeights)
                ? CellHeights[i]
                : CellHeights,
          };
          body.push(obj);
        }
        data.push(body);
      }
    }

    return data;
  };

  const handleCellClick = (row, column) => {
    // console.log("issue cellclick", {row, column})
    // setSelectedColumn(column);
    // setSelectedRow(row);
    setClickData({isClicked: true, row, column})

    if (row == selectedRow && column == selectedColumn) return;

    // let localStoragValue = JSON.parse(localStorage.getItem(data?.ID));
    // if (!localStoragValue)
    //   localStorage.setItem(
    //     data?.ID,
    //     JSON.stringify({
    //       Event: {
    //         CurCell: [row, column],
    //       },
    //     })
    //   );
    // else {
    //   localStorage.setItem(
    //     data?.ID,
    //     JSON.stringify({
    //       Event: {
    //         CurCell: [row, column],
    //         Values: localStoragValue?.Event?.Values,
    //       },
    //     })
    //   );
    // }

    handleCellMove(row, column, 1);

    // handleData(
    //   {
    //     ID: data?.ID,
    //     Properties: {
    //       CurCell: [row, column],
    //     },
    //   },
    //   'WS'
    // );

    // reRender();
    //  handleCellMove(row, column + 1, Values[row - 1][column]);
  };
  const handleCellClickUpdate = (row, column) => {
    // console.log("issue cellclick", {row, column})
    setSelectedColumn(column);
    setSelectedRow(row);

    if (row == selectedRow && column == selectedColumn) return;

    let localStoragValue = JSON.parse(localStorage.getItem(data?.ID));
    if (!localStoragValue)
      localStorage.setItem(
        data?.ID,
        JSON.stringify({
          Event: {
            CurCell: [row, column],
          },
        })
      );
    else {
      localStorage.setItem(
        data?.ID,
        JSON.stringify({
          Event: {
            CurCell: [row, column],
            Values: localStoragValue?.Event?.Values,
          },
        })
      );
    }

    handleData(
      {
        ID: data?.ID,
        Properties: {
          CurCell: [row, column],
        },
      },
      'WS'
    );

    // handleData(
    //   {
    //     ID: data?.ID,
    //     Properties: {
    //       CurCell: [row, column],
    //     },
    //   },
    //   'WS'
    // );

    // reRender();
    //  handleCellMove(row, column + 1, Values[row - 1][column]);
  };

  const gridData = modifyGridData();
  const customStyles = parseFlexStyles(CSS);
  console.log("260", rows)

  return (
    <>
      {/* <style>
        {`
          div:focus {
            outline: none;
          }
        `}
      </style> */}
      <div
        tabIndex={0}
        ref={gridRef}
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => {
          handleMouseDown(e, socket, Event, data?.ID);
        }}
        onMouseUp={(e) => {
          handleMouseUp(e, socket, Event, data?.ID);
        }}
        onMouseEnter={(e) => {
          handleMouseEnter(e, socket, Event, data?.ID);
        }}
        onMouseMove={(e) => {
          handleMouseMove(e, socket, Event, data?.ID);
        }}
        onMouseLeave={(e) => {
          handleMouseLeave(e, socket, Event, data?.ID);
        }}
        onWheel={(e) => {
          handleMouseWheel(e, socket, Event, data?.ID);
        }}
        onDoubleClick={(e) => {
          handleMouseDoubleClick(e, socket, Event, data?.typeObj?.ID);
        }}
        id={data?.ID}
        style={{
          ...style,
          height,
          width,
          border: "1px solid black",
          overflow: !ColTitles ? "auto" : "hidden",
          background: "white",
          display: Visible == 0 ? "none" : "block",
          overflowX:
            HScroll == -3
              ? "scroll"
              : HScroll == -1 || HScroll == -2
                ? "auto"
                : "auto",
          overflowY:
            VScroll == -3
              ? "scroll"
              : VScroll == -1 || HScroll == -2
                ? "auto"
                : "auto",
          ...customStyles,
        }}
      >
        {gridData?.map((row, rowi) => {
          return (
            <div style={{ display: "flex" }} id={`row-${rowi}-cell`}>
              {row.map((data, columni) => {
                //  selectedRow === rowi && console.log("issue arrow focus", selectedRow, rowi )
                const isFocused =
                  selectedRow === rowi && selectedColumn === (TitleWidth === 0 ? columni + 1 : columni);

                return (
                  <div
                    onClick={() => {
                      if (data.type === "rowTitle" || data.type === "header") return
                      handleCellClick(rowi, TitleWidth === 0 ? columni + 1 : columni);
                      // handleCellMove(rowi, columni + 1, '');
                    }}
                    id={`${gridId}`}
                    style={{
                      borderRight: isFocused
                        ? "1px solid blue"
                        : "1px solid  #EFEFEF",
                      borderBottom: isFocused
                        ? "1px solid blue"
                        : "1px solid  #EFEFEF",
                      fontSize: "12px",
                      minHeight: `${data?.height}px`,
                      maxHeight: `${data?.height}px`,
                      minWidth: `${data?.width}px`,
                      maxWidth: `${data?.width}px`,
                      backgroundColor:
                        (selectedRow === rowi && data.type == "rowTitle") ||
                          (selectedColumn === (TitleWidth === 0 ? columni + 1 : columni) && data.type == "header")
                          ? "lightblue"
                          : rgbColor(data?.backgroundColor),
                      textAlign: data.type == "header" ? "center" : data?.align,
                      overflow: "hidden",
                      ...((data?.type !== "header" && !Array.isArray(data?.value)) && { lineHeight: `${data?.height}px` }),
                    paddingLeft: data?.paddingLeft,
                    }}
                  >
                    <Component
                      key={data?.type}
                      data={{
                        ...data,
                        row: rowi,
                        column: TitleWidth === 0 ? columni + 1 : columni,
                        gridValues: Values,
                        gridEvent: Event,
                        showInput: ShowInput,
                        gridId: gridId,
                        focused: isFocused,
                        backgroundColor: data?.backgroundColor,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default Grid;
