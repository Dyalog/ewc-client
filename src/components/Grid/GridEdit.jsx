import React, { useRef, useEffect, useState, useCallback } from "react";
import { NumericFormat } from "react-number-format";
import { useAppData } from "../../hooks";
import {
  calculateDateAfterDays,
  getObjectById,
  calculateDaysFromDate,
  handleMouseDown,
  handleMouseUp,
  handleMouseEnter,
  handleMouseMove,
  handleMouseLeave,
  handleMouseWheel,
  handleMouseDoubleClick,
} from "../../utils";
import dayjs from "dayjs";
import { values } from "lodash";

const GridEdit = ({ data, onKeyDown1 }) => {
  // console.log("grid data", {data})
  const inputRef = useRef(null);
  console.log("Inpitb reew",inputRef)
  const dateRef = useRef(null);
  const divRef = useRef(null);
  const [isEditable, setIsEditable] = useState(false);
  const [selected, setSelected] = useState(false);

  const [dateFormattedValue, setDateFormattedValue] = useState(data?.value);

  const { FieldType, Decimal, SelText, Event } = data?.typeObj?.Properties;

  // console.log({value: data.value, focused: data.focused, datatype: data?.typeObj.ID, SelText})

  const { dataRef, findDesiredData, handleData, socket, socketData } =
    useAppData();
  // data?.typeObj?.ID === "F1.Holdings.TEXT" && console.log("edit data", {data, dataRef, socketData, property: findDesiredData(data?.typeObj?.ID)})
  const dateFormat = JSON.parse(getObjectById(dataRef.current, "Locale"));
  const {
    ShortDate,
    Thousand,
    Decimal: decimalSeparator,
  } = dateFormat?.Properties;
  const [inputValue, setInputValue] = useState(
    FieldType == "Date"
      ? dayjs(calculateDateAfterDays(data?.value)).format(
          ShortDate && ShortDate
        )
      : data?.value
  );

  const [selectedDate, setSelectedDate] = useState(
    FieldType == "Date"
      ? dayjs(calculateDateAfterDays(data?.value))
      : new Date()
  );
  const [valueState, setValueState] = useState(false);

  const findFirstNonSpaceIndex = (content) => {
    // Trim leading spaces from the string
    const trimmedContent = content.trimStart();

    // Find the index of the trimmed substring in the original string
    const firstNonSpaceIndex = content.indexOf(trimmedContent[0]);

    return firstNonSpaceIndex;
  };

  useEffect(() => {
    if (
      !isEditable &&
      divRef.current &&
      SelText &&
      SelText.length === 2 &&
      data?.focused
    ) {
      const [start, end] = SelText;
      const textNode = divRef.current.firstChild;
      console.log({ textNode });

      // Check if textNode is wrapped in an object
      const actualTextNode = textNode?.nodeType ? textNode : textNode?.textNode;
      // Find the text node inside the div

      if (actualTextNode?.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        const selection = window.getSelection();

        const adjustedEnd = Math.min(end - 1, actualTextNode.length);

        const parent = actualTextNode.parentNode;
        const content = parent.textContent.trim();
        console.log("use effect238983", { content: data?.formattedValue });

        if (data?.formattedValue) {
          console.log("content", {
            index: findFirstNonSpaceIndex(data?.formattedValue),
          });
          const reqIndex = findFirstNonSpaceIndex(data?.formattedValue);
          range.setStart(
            actualTextNode,
            Math.min(start - 1 + reqIndex, actualTextNode.length)
          );
          range.setEnd(
            actualTextNode,
            Math.min(end - 1 + reqIndex, actualTextNode.length)
          );
        } else {
          range.setStart(
            actualTextNode,
            Math.min(start - 1, actualTextNode.length)
          );
          range.setEnd(actualTextNode, adjustedEnd);
        }

        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }, [SelText, isEditable, data.focused]);

  const handleSelect = (event) => {
    console.log("select");
    console.log({ event });
    const input = event.target;
    const start = input.selectionStart + 1;
    const end = input.selectionEnd + 1;
    const selectedText = input.value.substring(start, end);
    console.log({ data, input, start, end });
    setSelected(!!selectedText);

    console.log("select", !!selectedText);

    if (!!selectedText) {
      localStorage.setItem(
        data?.typeObj?.ID,
        JSON.stringify({ Event: { Info: [start, end] } })
      );
      handleData(
        {
          ID: data?.typeObj?.ID,
          Properties: {
            SelText: [start, end],
          },
        },
        "WS"
      );
    } else {
      localStorage.setItem(
        data?.typeObj?.ID,
        JSON.stringify({ Event: { Info: [1, 1] } })
      );
      handleData(
        {
          ID: data?.typeObj?.ID,
          Properties: {
            SelText: [1, 1],
          },
        },
        "WS"
      );
    }

    // setSelection(selectedText);
    // setStartIndex(start);
    // setEndIndex(end);
  };
  const handleKeyDown = (event) => {
    event.stopPropagation();
    console.log("Key down event triggered:", event.target, { event });

    const input = event.target;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    console.log("Value of event key ",event.key);
    if (event.key === "Enter") {
      setIsEditable(false);
      console.log("Value of event key",valueState);
      if (valueState) {
        setValueState(false);
        socket.send(
          JSON.stringify({
            Event: {
              EventName: "Change",
              ID: data?.typeObj?.ID,
              Info: [],
            },
          })
        );
      }
      if (onKeyDown1) {
        console.log("On key down is ")
        onKeyDown1(event);
        handleKeyPress(event);
      }
      return;
    }

    if (start !== end) {
      if (onKeyDown1) {
        onKeyDown1(event);
        handleKeyPress(event);
      }
    }
  };

  const handleDivSelect = () => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType === Node.TEXT_NODE) {
      // If textNode is wrapped in an object
      const actualTextNode = textNode.nodeType ? textNode : textNode.textNode;

      const parent = actualTextNode.parentNode;
      const content = parent.textContent.trim();
      // console.log({actualTextNode, parent, content, ac: actualTextNode.textContent})

      let start = range.startOffset;
      let end = range.endOffset;

      // Adjust the start and end based on actual content length
      const startIndex = content.indexOf(actualTextNode.textContent);
      console.log({ startIndex });
      start -= startIndex;
      end -= startIndex;

      const selectedText = content.substring(start, end);
      // console.log({ data, actualTextNode, start, end, selectedText });

      localStorage.setItem(
        data?.typeObj?.ID,
        JSON.stringify({ Event: { Info: [start + 1, end + 1] } })
      );
      handleData(
        {
          ID: data?.typeObj?.ID,
          Properties: {
            SelText: [start + 1, end + 1],
          },
        },
        "WS"
      );
    }
  };

  const triggerCellChangedEvent = () => {
    // const gridEvent = findDesiredData(data?.gridId);

    const values = data?.gridValues;
    console.log("valueeee1",data?.rown-1,data?.column)

    values[data?.row - 1][data?.column] =
      FieldType == "Date" ? dateFormattedValue : inputValue;
    // handleData(
    //   {
    //     ID: data?.gridId,
    //     Properties: {
    //       ...gridEvent.Properties,
    //       Values: values,
    //       CurCell: [data?.row, data?.column + 1],
    //     },
    //   },
    //   'WS'
    // );
    console.log("valueeee2",data?.rown-1,data?.column+1)


    const cellChangedEvent = JSON.stringify({
      Event: {
        EventName: "CellChanged",
        ID: data?.gridId,
        Row: data?.row,
        Col: data?.column,
        Value: FieldType == "Date" ? dateFormattedValue : inputValue,
      },
    });
    const updatedGridValues = JSON.stringify({
      Event: {
        EventName: "CellChanged",
        Values: values,
        CurCell: [data?.row, data?.column],
      },
    });

    const formatCellEvent = JSON.stringify({
      FormatCell: {
        Cell: [data?.row, data?.column],
        ID: data?.gridId,
        Value: FieldType == "Date" ? dateFormattedValue : inputValue,
      },
    });

    localStorage.setItem(data?.gridId, updatedGridValues);

    // localStorage.setItem(data?.gridId, cellChangedEvent);
    const exists =
      data?.gridEvent &&
      data?.gridEvent.some((item) => item[0] === "CellChanged");
    if (!exists) return;
    console.log(cellChangedEvent);
    socket.send(cellChangedEvent);
    console.log("Input value")
    localStorage.setItem(
      "isChanged",
      JSON.stringify({
        isChange: true,
        value: FieldType == "Date" ? dateFormattedValue : inputValue,
      })
    );
    if (!data?.formatString) return;

    console.log(formatCellEvent);
    socket.send(formatCellEvent);
  };

  useEffect(() => {
    if (data.focused) {
      inputRef?.current?.focus();
    }
  }, [data.focused]);

  useEffect(() => {
    console.log("select useEffect", { selected });
    if (selected) {
      return;
    }
    console.log("select useEffect 2", { selected });
    localStorage.setItem(
      data?.typeObj?.ID,
      JSON.stringify({ Event: { Info: [1, 1] } })
    );
    handleData(
      {
        ID: data?.typeObj?.ID,
        Properties: {
          SelText: [1, 1],
        },
      },
      "WS"
    );
    return () => {
      console.log("select unmount");
    };
  }, [data.focused]);

  const handleEditEvents = () => {
    if (FieldType == "Date") {
      if (data?.value == dateFormattedValue) return;
      triggerCellChangedEvent();
    } else {
      if (data?.value == inputValue) return;
      triggerCellChangedEvent();
    }
  };

  const handleKeyPress = (e) => {
    const isAltPressed = e?.altKey ? 4 : 0;
    const isCtrlPressed = e?.ctrlKey ? 2 : 0;
    const isShiftPressed = e?.shiftKey ? 1 : 0;
    const charCode = e?.key?.charCodeAt(0);
    let shiftState = isAltPressed + isCtrlPressed + isShiftPressed;

    const exists = data?.typeObj?.Properties?.Event?.some(
      (item) => item[0] === "KeyPress"
    );
    console.log(
      "Value of event is as",
      exists,
      data?.typeObj?.Properties?.Event
    );
    if (!exists) {
      console.log("Coming here in exists");
      return;
    }

    console.log(
      JSON.stringify({
        Event: {
          EventName: "KeyPress",
          ID: data?.typeObj?.ID,
          Info: [e.key, charCode, e.keyCode, shiftState],
        },
      })
    );

    socket.send(
      JSON.stringify({
        Event: {
          EventName: "KeyPress",
          ID: data?.typeObj?.ID,
          Info: [e.key, charCode, e.keyCode, shiftState],
        },
      })
    );
  };

  if (FieldType == "Date") {
    const handleTextClick = () => {
      inputRef.current.select();
      inputRef.current.showPicker();
    };
    const handleDateChange = (event) => {
      setSelectedDate(event.target.value);

      const selectedDate = dayjs(event.target.value).format(ShortDate);
      console.log("date picker", {
        input: event.target.value,
        ShortDate,
        selectedDate,
      });
      let value = calculateDaysFromDate(event.target.value) + 1;
      setInputValue(selectedDate);
      setDateFormattedValue(value);
    };

    const handleInputChange = (event) => {
      console.log("Innn nisaokdmwisjk")
      setInputValue(event.target.value);
    };

    const handleDatePickerClick = () => {
      inputRef.current.showPicker();
    };

    const handleInputBlur = () => {
      const [day, month, year] = inputValue.split("-");
      const formattedDate = `${year}-${month}-${day}`; // Convert to standard format YYYY-MM-DD
      const newDate = new Date(formattedDate);

      const parsedDate = dayjs(newDate, ShortDate, true);
      if (parsedDate.isValid()) {
        const formattedDate = parsedDate.format("YYYY-MM-DD");
        setSelectedDate(formattedDate);
        const value = calculateDaysFromDate(formattedDate) + 1;
        setDateFormattedValue(value);
      } else {
        // Handle invalid date input
        console.warn("Invalid date entered");
      }
      setIsEditable(false);
      handleEditEvents();
    };

    return (
      <>
        {!isEditable ? (
          <div
            onDoubleClick={(e) => {
              setIsEditable(true);
            }}
            style={{
              backgroundColor: data?.backgroundColor,
              outline: 0,
              paddingLeft: "5px",
              paddingRight: "5px",
            }}
          >
            {!data?.formattedValue ? inputValue : data?.formattedValue}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                ref={dateRef}
                id={`${data?.gridId}`}
                style={{
                  border: 0,
                  outline: 0,
                  width: "100%",
                  height: "100%",
                  paddingLeft: "5px",
                  paddingRight: "5px",
                }}
                value={inputValue}
                onChange={handleInputChange}
                type="text"
                // readOnly
                onClick={(e) => {
                  // e.stopPropagation();
                  // handleTextClick();
                }}
                onBlur={handleInputBlur}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
              />
              <button
                onClick={handleDatePickerClick}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                📅
              </button>
            </div>
            <input
              id={`${data?.gridId}`}
              type="date"
              value={dayjs(new Date(selectedDate)).format("YYYY-MM-DD")}
              ref={inputRef}
              onChange={handleDateChange}
              style={{
                display: "none",
              }}
            />
          </>
        )}
      </>
    );
  }
  console.log("gridEdit", Event, data);

  if (FieldType == "LongNumeric" || FieldType == "Numeric") {
    return (
      <>
        {!isEditable ? (
          <div
            ref={divRef}
            // onMouseUp={handleDivSelect}
            onDoubleClick={(e) => {
              console.log("ckckmcdkd")
              setIsEditable(true);
            }}
            // onMouseDown={(e) => {
            //   handleMouseDown(e, socket, Event,data?.gridId);
            // }}
            // onMouseUp={(e) => {
            //   handleMouseUp(e, socket, Event, data?.gridId);
            // }}
            // onMouseEnter={(e) => {
            //   handleMouseEnter(e, socket, Event, data?.gridId);
            // }}
            // onMouseMove={(e) => {
            //   handleMouseMove(e, socket, Event, data?.gridId);
            // }}
            // onMouseLeave={(e) => {
            //   handleMouseLeave(e, socket, Event, data?.gridId);
            // }}
            // onWheel={(e) => {
            //   handleMouseWheel(e, socket, Event, data?.gridId);
            // }}
            style={{
              backgroundColor: data?.backgroundColor,
              outline: 0,
              textAlign: "right",
              paddingRight: "5px",
            }}
          >
            {!data?.formattedValue ? (
              <NumericFormat
                className="currency"
                allowLeadingZeros={true}
                id={`${data?.gridId}`}
                style={{
                  width: "100%",
                  border: 0,
                  outline: 0,
                  backgroundColor: data?.backgroundColor,
                  textAlign: "right",
                  // paddingRight: '5px',
                  // paddingLeft: '5px'
                }}
                readOnly
                decimalScale={Decimal}
                value={data?.value}
                decimalSeparator={decimalSeparator}
                thousandSeparator={Thousand}
              />
            ) : (
              data?.formattedValue
            )}
          </div>
        ) : (
          <NumericFormat
            className="currency"
            allowLeadingZeros={true}
            getInputRef={inputRef}
            id={`${data?.gridId}`}
            style={{
              width: "100%",
              border: 0,
              outline: 0,
              backgroundColor: data?.backgroundColor,
              textAlign: "right",
              paddingRight: "5px",
              paddingLeft: "5px",
            }}
            onValueChange={(value) => {
              if (!value.value) return setInputValue(0);
              setInputValue(parseFloat(value?.value));
            }}
            decimalScale={Decimal}
            value={inputValue}
            onSelect={handleSelect}
            decimalSeparator={decimalSeparator}
            thousandSeparator={Thousand}
            onBlur={(e) => {
              setIsEditable(false);
              handleEditEvents();
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              handleKeyPress(e);
            }}
            onMouseDown={(e) => {
              handleMouseDown(e, socket, Event, data?.typeObj?.ID);
            }}
            onMouseUp={(e) => {
              handleMouseUp(e, socket, Event, data?.typeObj?.ID);
            }}
            onMouseEnter={(e) => {
              handleMouseEnter(e, socket, Event, data?.typeObj?.ID);
            }}
            onMouseMove={(e) => {
              handleMouseMove(e, socket, Event, data?.typeObj?.ID);
            }}
            onMouseLeave={(e) => {
              handleMouseLeave(e, socket, Event, data?.typeObj?.ID);
            }}
            onWheel={(e) => {
              handleMouseWheel(e, socket, Event, data?.typeObj?.ID);
            }}
            onDoubleClick={(e) => {
              handleMouseDoubleClick(e, socket, Event, data?.typeObj?.ID);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      {!isEditable ? (
        <div
          ref={divRef}
          // onMouseUp={handleDivSelect}
          onDoubleClick={(e) => {
            setIsEditable(true);
          }}
          autoFocus
          onKeyDown={(e) => console.log({ e })}
          // onDoubleClick={(e) => setShowInput(true)}
          style={{
            display: "flex",
            align: data?.align,
            backgroundColor: data?.backgroundColor,
            outline: 0,
            height: "100%",
            width: "100%",
            paddingLeft: "5px",
            paddingRight: "5px",
          }}
          // onMouseDown={(e) => {
          //   handleMouseDown(e, socket, Event,data?.gridId);
          // }}
          // onMouseUp={(e) => {
          //   handleMouseUp(e, socket, Event, data?.gridId);
          // }}
          // onMouseEnter={(e) => {
          //   handleMouseEnter(e, socket, Event, data?.gridId);
          // }}
          // onMouseMove={(e) => {
          //   handleMouseMove(e, socket, Event, data?.gridId);
          // }}
          // onMouseLeave={(e) => {
          //   handleMouseLeave(e, socket, Event, data?.gridId);
          // }}
          // onWheel={(e) => {
          //   handleMouseWheel(e, socket, Event, data?.gridId);
          // }}
        >
          {!data?.formattedValue ? data?.value : data?.formattedValue}
        </div>
      ) : (
        <input
          type="text"
          id={`${data?.gridId}`}
          ref={inputRef}
          style={{
            outline: 0,
            border: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            backgroundColor: data?.backgroundColor,
            align: data?.align,
            paddingLeft: "5px",
            paddingRight: "5px",
          }}
          onSelect={handleSelect}
          onDoubleClick={(e) => {
            handleMouseDoubleClick(e, socket, Event, data?.typeObj?.ID);
            e.stopPropagation();
            // setIsEditable(true);
          }}
          value={inputValue}
          // onKeyDown={(e) => {
          //   e.stopPropagation();
          //   handleKeyPress(e);
          // }}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            e.stopPropagation();
            setValueState(true);
            setInputValue(e.target.value);
          }}
          onBlur={(e) => {
            setIsEditable(false);
            handleEditEvents();
          }}
          autoFocus
          onMouseDown={(e) => {
            handleMouseDown(e, socket, Event, data?.typeObj?.ID);
          }}
          onMouseUp={(e) => {
            handleMouseUp(e, socket, Event, data?.typeObj?.ID);
          }}
          onMouseEnter={(e) => {
            handleMouseEnter(e, socket, Event, data?.typeObj?.ID);
          }}
          onMouseMove={(e) => {
            handleMouseMove(e, socket, Event, data?.typeObj?.ID);
          }}
          onMouseLeave={(e) => {
            handleMouseLeave(e, socket, Event, data?.typeObj?.ID);
          }}
          onWheel={(e) => {
            handleMouseWheel(e, socket, Event, data?.typeObj?.ID);
          }}
        />
      )}
    </>
  );
};

export default GridEdit;
