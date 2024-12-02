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
    handleData, dataRef,nqEvents
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


 console.log("300", {nqEvents})
  const curCell = JSON.parse(localStorage.getItem("nqCurCell"))
  useEffect(() => {
    if (CurCell) {
      console.log("284 curcell useEffect")
      let defaultRow
      let defaultCol
      if (curCell) {
        const {Info} = curCell
        defaultRow = !curCell ? (RowTitles?.length > 0 ? 1 : 0) : Info[0];
        defaultCol = !curCell ? (TitleWidth === 0 ? 1 : 0) : Info[1];
        setSelectedRow((prev) => (prev !== Info[0] ? defaultRow : prev));
        setSelectedColumn((prev) => (prev !== Info[1] ? defaultCol : prev));
      }
      else {
        defaultRow = !CurCell ? (RowTitles?.length > 0 ? 1 : 0) : CurCell[0];
        defaultCol = !CurCell ? (TitleWidth === 0 ? 1 : 0) : CurCell[1];
        setSelectedRow((prev) => (prev !== CurCell[0] ? defaultRow : prev));
        setSelectedColumn((prev) => (prev !== CurCell[1] ? defaultCol : prev));
      }

      // localStorage.setItem(
      //   data?.ID,
      //   JSON.stringify({
      //     Event: {
      //       CurCell: [defaultRow, defaultCol],
      //     },
      //   })
      // );
    }
  }, [CurCell, curCell]);

  

  useEffect(() => {
    if (proceedEventArray[localStorage.getItem("keyPressEventId") + "KeyPress"] == 1) {
      const event = JSON.parse(localStorage.getItem("event"))
      updatePosition(event)
      setProceed(false);
      setProceedEventArray((prev) => ({ ...prev, [localStorage.getItem("keyPressEventId") + "KeyPress"]: 0 }));
    }
    else if (
      (proceedEventArray[localStorage.getItem("keyPressEventId") + "CellMove"] == 1)
    ) {
      
      if(clickData.isClicked)
      {
        handleCellClickUpdate(clickData.row, clickData.column)
        setClickData({isClicked: false})
        return
      }
      
      // let localStoragValue = JSON.parse(localStorage.getItem(data?.ID));
      
      // if (!localStoragValue) {
      //   localStorage.setItem(
      //     data?.ID,
      //     JSON.stringify({
      //       Event: {
      //         CurCell: [
      //           selectedRow,
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
      //           selectedRow,
      //           selectedColumn,
      //         ],
      //         Values: localStoragValue?.Event?.Values,
      //       },
      //     })
      //   );
      // }
      const event = JSON.parse(localStorage.getItem("event"))
      updateRowColumn(event)
    }
  }, [Object.keys(proceedEventArray).length])


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
    // let localStoragValue = JSON.parse(localStorage.getItem(data?.ID));


    // localStorage.setItem(
    //   "isChanged",
    //   JSON.stringify({
    //     isChange: false,
    //     value: "",
    //   })
    // );
  };


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

    const isNavigationKeys = [
      "ArrowRight",
      "ArrowLeft",
      "ArrowUp",
      "ArrowDown",
    ].some((key) => event.key === key);

    if (isNavigationKeys) {
      gridRef.current.focus();
    }

  
  };

  const updatePosition = (key) => {
    // let localStoragValue = JSON.parse(localStorage.getItem(data?.ID));

    if (key === "ArrowRight") {
      const updatedColumn = Math.min(selectedColumn + 1, !ColTitles ? columns - 1 : columns)
      if (selectedColumn === updatedColumn) return

      handleCellMove(
        selectedRow,
        updatedColumn,
        0
      );
    } else if (key === "ArrowLeft") {
      const updatedColumn = Math.max(selectedColumn - 1, 1)
      if (selectedColumn === updatedColumn) return
      handleCellMove(
        selectedRow,
        updatedColumn,
        0
      );
    } else if (key === "ArrowUp") {
      const updatedRow = Math.max(selectedRow - 1, 1)
      if (selectedRow === updatedRow) return
      handleCellMove(
        updatedRow,
        selectedColumn,
        0
      );
    } else if (key === "ArrowDown") {
      const updatedRow = Math.min(selectedRow + 1, rows - 1)
      if (selectedRow == rows - 1) return;
      if (selectedRow === updatedRow) return
      handleCellMove(
        updatedRow,
        selectedColumn,
        0
      );
    } else if (key === "PageDown") {
      const demoRow = Math.min(selectedRow + 9, rows - 1);
      handleCellMove(
        demoRow,
        selectedColumn,
        0
      );
    } else if (key === "PageUp") {
      const updatedRow = Math.max(selectedRow - 9, 1)
      if (selectedRow == updatedRow) return;
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
    setClickData({isClicked: true, row, column})

    if (row == selectedRow && column == selectedColumn) return;


    handleCellMove(row, column, 1);

  };
  const handleCellClickUpdate = (row, column) => {
    setSelectedColumn(column);
    setSelectedRow(row);

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

    handleData(
      {
        ID: data?.ID,
        Properties: {
          CurCell: [row, column],
        },
      },
      'WS'
    );

  };

  const gridData = modifyGridData();
  const customStyles = parseFlexStyles(CSS);
  console.log("260", rows)

  return (
    <>
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
