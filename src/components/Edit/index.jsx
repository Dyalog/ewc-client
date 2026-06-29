import {
  setStyle,
  generateAsteriskString,
  calculateDateAfterDays,
  calculateDaysFromDate,
  rgbColor,
  handleMouseDown,
  handleMouseUp,
  handleMouseEnter,
  handleMouseMove,
  handleMouseLeave,
  parseFlexStyles,
  handleMouseWheel,
  handleMouseDoubleClick,
  getFontStyles,
} from "../../utils";
import { getBorderStyles } from "../../styles/edgeStyles";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAppData } from "../../hooks";
import { useGridContext, useGridMode } from "../Grid/GridContext";
import { normalizeAplFormatted } from "../Grid/useNumericFormatter";
import dayjs from "dayjs";
import { NumericFormat } from "react-number-format";
import * as Globals from "../../Globals";

const Edit = ({
  data,
  value,
  location = "",
  T = "",
}) => {
  const {
    socket,
    findCurrentData,
    handleData,
    fontScale,
    inheritedProperties,
    pendingKeypressEventRef
  } = useAppData();

  // Check if we're inside a Grid cell
  const gridContext = useGridContext();
  const isInGrid = !!gridContext;
  // Grid-wide editing mode ('Scroll' default | 'InCell'). Drives cursor-key
  // handling and the on-focus caret/selection below. 'Scroll' outside a grid.
  const inputMode = useGridMode()?.inputMode || "Scroll";

  // findCurrentData is an O(depth) path walk; the old getObjectById did a
  // full-tree DFS + JSON round-trip every render. Locale is static after startup.
  const dateFormat = findCurrentData("Locale");

  const {
    ShortDate,
    Thousand,
    Decimal: decimalSeparator,
  } = dateFormat?.Properties;

  let styles = { ...setStyle(data?.Properties) };
  const [inputType, setInputType] = useState("text");
  const [inputValue, setInputValue] = useState("");
  const [emitValue, setEmitValue] = useState("");
  const [prevFocused, setprevFocused] = useState("⌈");
  const [eventId, setEventId] = useState(null);
  const prevInputValueRef = useRef("");
  // Track when user is actively editing to prevent decideInputValue from overwriting
  const [isEditing, setIsEditing] = useState(false);
  // Focus state — drives the standalone Edit's blue underline indicator.
  const [isFocused, setIsFocused] = useState(false);

  const {
    FieldType,
    MaxLength,
    FCol,
    Decimal,
    Visible,
    Event,
    Size,
    EdgeStyle,
    Border = 0,
    CSS,
    Active,
    TabIndex,
  } = data?.Properties;
  const { FontObj } = inheritedProperties(data, 'FontObj');

  const hasTextProperty = data?.Properties.hasOwnProperty("Text");
  const hasValueProperty = data?.Properties.hasOwnProperty("Value");
  const isPassword = data?.Properties.hasOwnProperty("Password");
  const inputRef = useRef(null);
  const font = findCurrentData(FontObj);
  const fontProperties = font && font?.Properties;
  const customStyles = parseFlexStyles(CSS);
  const fontStyles = getFontStyles(font, 12);

//   console.log("291", {dateFormat, emitValue, parse:parseInt(emitValue), data})
  // Extract cellValue to avoid stale closure issues
  const cellValue = gridContext?.cellValue;
  const formattedValue = gridContext?.formattedValue;

  const decideInputValue = useCallback(() => {
    // When in Grid, use the cellValue from context
    if (isInGrid && cellValue !== undefined) {
      const cellVal = cellValue;
      if (FieldType === "Date" && cellVal !== undefined && cellVal !== "") {
        setEmitValue(cellVal);
        const date = calculateDateAfterDays(cellVal);
        return setInputValue(dayjs(date).format(ShortDate));
      }
      if (FieldType === "LongNumeric" || FieldType === "Numeric") {
        setEmitValue(cellVal);
        return setInputValue(isEditing ? cellVal : (formattedValue ?? cellVal));
      }
      setEmitValue(cellVal);
      return setInputValue(formattedValue ?? cellVal);
    }

    let propsValue = data?.Properties?.Value;
    if (propsValue === undefined) {
      propsValue = data?.Properties?.Text;
    }

    // Handle Date fields outside of grids
    if (FieldType === "Date" && propsValue !== undefined && propsValue !== "") {
      setEmitValue(propsValue);
      // If the value is a number (days since epoch), convert it to a formatted date
      if (typeof propsValue === 'number' || !isNaN(propsValue)) {
        const date = calculateDateAfterDays(propsValue);
        return setInputValue(dayjs(date).format(ShortDate));
      }
      // Otherwise assume it's already a formatted date string
      return setInputValue(propsValue);
    }

    if (!data?.Properties?.FieldType?.includes("Numeric")) {
      setEmitValue(propsValue);
      return setInputValue(propsValue);
    }

    if (data?.Properties?.FieldType?.includes("Numeric")) {
      if (isPassword) {
        setEmitValue(propsValue);
        return setInputValue(
          generateAsteriskString(propsValue.length)
        );
      } else {
        setEmitValue(propsValue);
        return setInputValue(propsValue);
      }
    }
  }, [
    location,
    FieldType,
    value,
    ShortDate,
    hasTextProperty,
    isPassword,
    data,
    hasValueProperty,
    isInGrid,
    cellValue, // The extracted cellValue from context
    formattedValue,
    isEditing,
  ]);

  // We need to update SelText whenever we can
  const updateSelText = () => {
    const el = document.getElementById(data.ID);
    if (!el) return;
    
    // Date inputs don't support selection
    if (el.type === 'date') return;
    
    const textLength = el.value.length;
    const rawStart = el.selectionStart + 1; // Convert to 1-indexed
    const rawEnd = el.selectionEnd + 1;     // Convert to 1-indexed
    
    // Clamp to valid range [1, textLength+1] like native APL controls
    const clampedStart = Math.max(1, Math.min(rawStart, textLength + 1));
    const clampedEnd = Math.max(1, Math.min(rawEnd, textLength + 1));
    
    
    // Update global tree for WG requests
    handleData(
      {
        ID: data?.ID,
        Properties: {
          SelText: [clampedStart, clampedEnd],
        },
      },
      "WS"
    );
  };

  // check that the Edit is in the Grid or not

  const handleInputClick = () => {
    // Don't auto-select all text - let user click to position cursor normally
    // if (inputRef.current) {
    //   inputRef.current.select();
    // }
  };

  const decideInputType = useCallback(() => {
    if (FieldType === "Numeric") {
      setInputType("number");
    } else if (FieldType === "Date") {
      setInputType("date");
    } else if (isPassword) {
      setInputType("password");
    }
  }, [FieldType, isPassword]);

  useEffect(() => {
    decideInputType();
  }, [decideInputType]);

  useEffect(() => {
    // Don't overwrite user input while actively editing (Grid sets isEditing on focus)
    if (isEditing) return;
    decideInputValue();
    // isEditing intentionally excluded: it should guard, not trigger.
    // When ShowInput=1 and Edit stays mounted after deselection, isEditing
    // changing to false would fire this before cellValue updates, reverting
    // the user's edit. Instead, the cellValue update from onCellChange
    // naturally retriggers decideInputValue with the correct value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decideInputValue]);


  // Single Properties observer to handle all property changes atomically
  // Skip when in Grid - values come from grid context, not the shared Input component
  useEffect(() => {
    if (isInGrid) return;

    const textFromProperties = data?.Properties?.Text;
    const valueFromProperties = data?.Properties?.Value;
    const selTextFromProperties = data?.Properties?.SelText;


    const input = inputRef.current;
    if (!input) return;
    
    // Determine what text value to use
    let newTextValue = undefined;
    if (textFromProperties !== undefined) {
      newTextValue = textFromProperties;
    } else if (valueFromProperties !== undefined) {
      newTextValue = valueFromProperties;
    }
    
    // Handle text changes
    if (newTextValue !== undefined) {
      const currentDOMValue = input.value;
      
      if (currentDOMValue === newTextValue) {
        // DOM is already correct, just update React state without re-render
        if (inputValue !== newTextValue) {
          setInputValue(newTextValue);
          setEmitValue(newTextValue);
        }
      } else {
        
        // Save current cursor position before React re-render (not for date inputs)
        const savedStart = input.type !== 'date' ? input.selectionStart : 0;
        const savedEnd = input.type !== 'date' ? input.selectionEnd : 0;
        
        setInputValue(newTextValue);
        setEmitValue(newTextValue);
        
        // Schedule cursor restoration after React updates DOM
        if (input.type !== 'date') {
          setTimeout(() => {
            if (selTextFromProperties && Array.isArray(selTextFromProperties) && selTextFromProperties.length === 2) {
              // Use SelText from Properties if available
              const start = Math.max(0, selTextFromProperties[0] - 1);
              const end = Math.max(0, selTextFromProperties[1] - 1);
              const textLength = input.value.length;
              const clampedStart = Math.min(start, textLength);
              const clampedEnd = Math.min(end, textLength);
              
              input.setSelectionRange(clampedStart, clampedEnd);
            } else {
              // Restore previous cursor position
              input.setSelectionRange(savedStart, savedEnd);
            }
          }, 0);
        }
      }
    } else if (selTextFromProperties && Array.isArray(selTextFromProperties) && selTextFromProperties.length === 2 && input.type !== 'date') {
      // Handle SelText-only updates (no text change) - not for date inputs
      const start = Math.max(0, selTextFromProperties[0] - 1);
      const end = Math.max(0, selTextFromProperties[1] - 1);
      const textLength = input.value.length;
      const clampedStart = Math.min(start, textLength);
      const clampedEnd = Math.min(end, textLength);
      
      const currentStart = input.selectionStart;
      const currentEnd = input.selectionEnd;
      
      if (currentStart !== clampedStart || currentEnd !== clampedEnd) {
        input.setSelectionRange(clampedStart, clampedEnd);
      } else {
      }
    }
  }, [data?.Properties?.Text, data?.Properties?.Value, data?.Properties?.SelText]);

  // Update global tree when input changes (for WG requests)
  // Skip when in Grid - the grid handles value updates through onCellChange
  useEffect(() => {
    if (isInGrid) return;

    if (inputValue !== undefined && inputValue !== prevInputValueRef.current) {
      prevInputValueRef.current = inputValue;
      handleData(
        {
          ID: data?.ID,
          Properties: {
            Text: inputValue,
            Value: inputValue,
          },
        },
        "WS"
      );
    }
  }, [inputValue]); // isInGrid is constant - no need to track it


  // Checks for the Styling of the Edit Field

  if (isInGrid) {
    // Inside Grid: fill the cell, no border
    styles = {
      ...styles,
      position: 'relative',
      width: '100%',
      height: '100%',
      border: "none",
      color: FCol ? rgbColor(FCol) : "black",
    };
  } else {
    styles = {
      ...styles,
      borderTop: 0,
      borderLeft: 0,
      borderRight: 0,
      borderBottom: "1px solid black",
      color: FCol ? rgbColor(FCol) : "black",
    };
  }

  const handleKeyPress = (e) => {
    updateSelText(); // Update global tree with current selection
    // Cursor-movement keys stay in the input; Up/Down/Tab/Enter still bubble
    // to Grid for Excel-style commit + cell move.
    if (isInGrid && isEditing) {
      // InputMode decides who owns the cursor keys. InCell: arrows + Home/End move
      // within the text, so keep them in the input (stopPropagation). Scroll: every
      // cursor key ends editing and moves the cell, so stop nothing — let them all
      // bubble to the Grid. Enter/Tab always bubble (commit + move) in both modes.
      if (inputMode === "InCell"
          && (e.key === "ArrowLeft" || e.key === "ArrowRight"
              || e.key === "ArrowUp" || e.key === "ArrowDown"
              || e.key === "Home" || e.key === "End")) {
        e.stopPropagation();
      }
    }
    const exists = Event && Event.some((item) => item[0] === "KeyPress");
    if (!exists) return;
    // We utilise the browser for certain events (eg HT is just a dispatchEvent)
    // - the problem is that we can end up in a loop here, with certain code,
    // so we set a global flag for the duration of an NQ'd KeyPress with
    // NoCallback set to 1.
    if (Globals.get('suppressingCallbacks')) {
      return;
    }

    // Prevent default behavior for keys that APL might handle
    e.preventDefault();
    
    const eventId = crypto.randomUUID();
    setEventId(eventId);
    
    // Register a per-instance callback so the EC=1 (Proceed=1) replay path
    // in App.jsx can apply the typed character to *this* input's own state
    // — never to data.Properties.Text. data.Properties is the per-column
    // template shared across every Grid cell, so writing to it from EC
    // replay contaminates every cell in the column. Mutating local state
    // via setInputValue keeps the change scoped to this Edit instance.
    // For standalone (non-Grid) Edits, the useEffect on [inputValue]
    // still propagates to data.Properties via handleData WS, so behavior
    // is preserved.
    pendingKeypressEventRef.current = {
      key: e.key,
      eventId,
      componentId: data?.ID,
      shiftKey: e.shiftKey,
      applyKey: (k) => {
        const inp = inputRef.current;
        if (!inp) return;
        const start = inp.selectionStart ?? inp.value.length;
        const end = inp.selectionEnd ?? inp.value.length;
        const newVal = inp.value.slice(0, start) + k + inp.value.slice(end);
        setInputValue(newVal);
        setEmitValue(newVal);
        requestAnimationFrame(() => {
          inputRef.current?.setSelectionRange(start + k.length, start + k.length);
        });
      },
    };
    const isAltPressed = e.altKey ? 4 : 0;
    const isCtrlPressed = e.ctrlKey ? 2 : 0;
    const isShiftPressed = e.shiftKey ? 1 : 0;
    // Character code [4] of the Dyalog KeyPress event: the Unicode code point of
    // the character entered, or 0 when the key resolves to no character (e.g.
    // Cursor Up => 0, per the object-reference KeyPress doc). Named keys => 0;
    // the server (processEvent.aplf) refines Enter/Tab/Backspace to 13/9/8.
    const charCode = e.key.length === 1 ? e.key.charCodeAt(0) : 0;
    let shiftState = isAltPressed + isCtrlPressed + isShiftPressed;

//     console.log(
//       JSON.stringify({
//         Event: {
//           EventName: "KeyPress",
//           ID: data?.ID,
//           EventID: eventId,
//           Info: [e.key, charCode, e.keyCode, shiftState],
//         },
//       })
//     );

    socket.send(
      JSON.stringify({
        Event: {
          EventName: "KeyPress",
          ID: data?.ID,
          EventID: eventId,
          Info: [e.key, charCode, e.keyCode, shiftState],
        },
      })
    );
  };

  const triggerChangeEvent = () => {
    // TODO as far as I can tell, this is how we are storing the last value, so
    // we can fetch it again for WG.
    // *Not* setting this value in localStorage causes problems.
    let event2;

    if (FieldType === "Date") {
      event2 = JSON.stringify({
        Event: {
          EventName: "Change",
          ID: data?.ID,
          Info: emitValue,
        },
      });
      handleData(
        {
          ID: data?.ID,
          Properties: {
            Value: emitValue,
            Text: inputValue,
          },
        },
        "WS"
      )
    } else {
      event2 = JSON.stringify({
        Event: {
          EventName: "Change",
          ID: data?.ID,
          Info:
            (FieldType && FieldType == "LongNumeric") || FieldType == "Numeric"
              ? parseInt(emitValue)
              : emitValue,
        },
      });
      // console.log({event2})
      handleData(
        {
          ID: data?.ID,
          Properties: {
            ...(FieldType === "LongNumeric" || FieldType === "Numeric"
              ? { Value: parseInt(emitValue) }
              : { Text: emitValue })
          },
        },
        "WS"
      );
    }
    localStorage.setItem(data?.ID, event2);
    localStorage.setItem(
      "shouldChangeEvent",
      data.Properties.hasOwnProperty("Event")
    );

    const prevFocusedID = JSON.parse(localStorage.getItem(prevFocused));

    // TODO I'm pretty sure this change logic is wrong
    if (!!data.Properties.hasOwnProperty("Event")) {
      const event1 = JSON.stringify({
        Event: {
          EventName: "Change",
          ID: prevFocused,
          Info: [data?.ID],
        },
      });
      const originalValue =
        data?.Properties?.Text || data?.Properties?.Value || "";

//       console.log(
//         "value focused",
//         { value, emitValue, originalValue },
//         prevFocusedID,
//         prevFocusedID.Event.EventName !== "Select",
//         originalValue !== emitValue
//       );

      if (
        prevFocused &&
        prevFocusedID &&
        prevFocusedID.Event.EventName !== "Select" &&
        originalValue !== emitValue &&
        prevFocused !== data.ID
      ) {
//         console.log(
//           "focused",
//           prevFocusedID,
//           prevFocusedID.Event.EventName !== "Select",
//           originalValue !== emitValue
//         );
        socket.send(event1);
      }
    }
    const exists = Event && Event.some((item) => item[0] === "Change");
    if (!exists) return;

    const event = JSON.stringify({
      Event: {
        EventName: "Change",
        ID: data?.ID,
        Info: [],
      },
    });

    localStorage.setItem("change-event", event);
  };

  const handleBlur = () => {
    // Clear editing flag first so decideInputValue can run after blur if needed
    if (isInGrid) setIsEditing(false);
    setIsFocused(false);

    updateSelText(); // Update global tree with final selection
    if (Event && Event.some((item) => item[0] === "LostFocus")) {
      socket.send(JSON.stringify({
        Event: {
          EventName: "LostFocus",
          ID: data?.ID,
          Info: [], // TODO?
        },
      }));
    }

    // Check if we're inside a Grid cell
    if (isInGrid && gridContext) {
      // Convert APL ¯→'-' and trim only at commit, so editing stays verbatim.
      const committedEmit = normalizeAplFormatted(emitValue);
      // Compare with original value from context
      const originalValue = gridContext.cellValue;
      const currentValue = (FieldType === "LongNumeric" || FieldType === "Numeric")
        ? (committedEmit !== "" ? Number(committedEmit) : committedEmit)
        : committedEmit;
      if (originalValue !== currentValue) {
        gridContext.onCellChange(currentValue);
      }
      return;
    }

    triggerChangeEvent();
  };

  const handleGotFocus = () => {
    setIsFocused(true);
    // Mark editing so decideInputValue stops overwriting user input.
    if (isInGrid) {
      setIsEditing(true);
      // Seed the editor from the authoritative cell value as editing begins.
      // decideInputValue is guarded off once isEditing is true, and editing now
      // starts immediately on cell select (InputMode), so without this the field
      // can start blank. Numeric uses the raw value (so Number() can parse after
      // edits, not the formatted "8,500"); text/other use the displayed value.
      if (FieldType !== "Date"
          && gridContext?.cellValue !== undefined
          && gridContext?.cellValue !== "") {
        const isNumericField = FieldType === "LongNumeric" || FieldType === "Numeric";
        const seed = isNumericField
          ? String(gridContext.cellValue)
          : String(gridContext.formattedValue ?? gridContext.cellValue);
        setInputValue(seed);
        setEmitValue(seed);
      }
      // Position the caret per InputMode, after React applies any value swap above.
      // Scroll selects all (so the first keystroke replaces, and SelText reports the
      // whole field); InCell places the caret at the end, ready to edit in place.
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el || el.type === "date") return;
        const len = el.value?.length ?? 0;
        if (inputMode === "InCell") el.setSelectionRange(len, len);
        else el.select();
        updateSelText();
      });
    }

    const previousFocusedId = localStorage.getItem("current-focus");
    setprevFocused(previousFocusedId);
    const gotFocusEvent = JSON.stringify({
      Event: {
        EventName: "GotFocus",
        ID: data?.ID,
        Info: !previousFocusedId ? [""] : [previousFocusedId],
      },
    });
    localStorage.setItem("current-focus", data?.ID);
    const exists = Event && Event.some((item) => item[0] === "GotFocus");

    if (!exists || previousFocusedId == data?.ID) return;
//     console.log(gotFocusEvent);
    socket.send(gotFocusEvent);
  };

  // updating the styles depending upon the FontObj
  styles = {
    ...styles,
    fontFamily: fontProperties?.PName,
    fontSize: fontProperties?.Size
      ? `${fontProperties.Size * fontScale}px`
      : `${12 * fontScale}px`,
    // fontSize: fontProperties?.Size ? `${fontProperties.Size * fontScale}px` : `${11 * fontScale}px`,
    textDecoration: !fontProperties?.Underline
      ? "none"
      : fontProperties?.Underline == 1
      ? "underline"
      : "none",
    fontStyle: !fontProperties?.Italic
      ? "none"
      : fontProperties?.Italic == 1
      ? "italic"
      : "none",
    fontWeight: !fontProperties?.Weight ? 0 : fontProperties?.Weight,
  };

  // Date Picker component

  if (inputType == "date") {
    const handleTextClick = () => {
      inputRef.current.select();
      inputRef.current.showPicker();
    };

    const handleDateChange = (event) => {
      const selectedDate = dayjs(event.target.value).format(ShortDate);
      let value = calculateDaysFromDate(event.target.value) + 1;
      setInputValue(selectedDate);
      setEmitValue(value);
    };

    return (
      <>
        <input
          id={data?.ID}
          tabIndex={TabIndex}
          style={{
            ...styles,
            borderRadius: "2px",
            border: "0px",
            zIndex: 1,
            display: Visible == 0 ? "none" : "block",
            paddingLeft: "5px",
            ...customStyles,
            ...fontStyles,
          }}
          value={inputValue}
          type="text"
          readOnly
          onClick={handleTextClick}
          onBlur={() => {
            handleBlur();
          }}
          onKeyDown={(e) => handleKeyPress(e)}
          onMouseDown={(e) => {
            handleMouseDown(e, socket, Event,data?.ID);
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
          onDoubleClick={(e)=>{
            handleMouseDoubleClick(e, socket, Event,data?.ID);
          }}
        />
        <input
          id={data?.ID + '.Picker'}
          type="date"
          ref={inputRef}
          onChange={handleDateChange}
          disabled={Active === 0}
          style={{
            ...styles,
            position: "absolute",
            zIndex: 1,
            display: "none",
          }}
        />
      </>
    );
  }


  if (FieldType == "LongNumeric" || FieldType == "Numeric") {
    // Inside Grid: plain input (not NumericFormat) so ⎕FMT strings survive.
    // inputValue holds raw value while editing, formatted string otherwise.
    // Plain right-aligned <input> for Numeric (and all grid numerics). The
    // NumericFormat "currency" component is the wrong tool for plain integers
    // and clipped them vertically — reserve it for LongNumeric (thousands seps).
    if (isInGrid || FieldType === "Numeric") {
      return (
        <input
          id={data?.ID}
          ref={inputRef}
          value={inputValue}
          readOnly={isInGrid && !isEditing}
          onChange={(e) => {
            // Local-only; commit via handleBlur. Never write data.Properties
            // (shared column template). ¯→'-' conversion is in handleBlur.
            setInputValue(e.target.value);
            setEmitValue(e.target.value);
          }}
          style={{
            ...styles,
            width: !Size ? "100%" : Size[1],
            zIndex: 1,
            display: Visible == 0 ? "none" : "block",
            textAlign: "right",
            ...(isInGrid
              ? { border: 0, outline: 0, background: 'transparent', padding: '0 4px', verticalAlign: 'middle' }
              : {
                  borderRadius: "2px",
                  paddingRight: "2px",
                  ...getBorderStyles(EdgeStyle, Border, "#6A6A6A"),
                  ...(isFocused ? { borderBottom: '2px solid blue' } : {}),
                }),
            ...customStyles,
            ...fontStyles,
          }}
          onFocus={handleGotFocus}
          onBlur={handleBlur}
          onKeyDown={(e) => handleKeyPress(e)}
          onMouseDown={(e) => handleMouseDown(e, socket, Event, data?.ID)}
          onMouseUp={(e) => handleMouseUp(e, socket, Event, data?.ID)}
          onMouseEnter={(e) => handleMouseEnter(e, socket, Event, data?.ID)}
          onMouseMove={(e) => handleMouseMove(e, socket, Event, data?.ID)}
          onMouseLeave={(e) => handleMouseLeave(e, socket, Event, data?.ID)}
          onWheel={(e) => handleMouseWheel(e, socket, Event, data?.ID)}
          onDoubleClick={(e) => handleMouseDoubleClick(e, socket, Event, data?.ID)}
        />
      );
    }
    return (
      <NumericFormat
        className="currency"
        allowLeadingZeros={true}
        // ref={inputRef}
        getInputRef={inputRef}
        onClick={handleInputClick}
        id={data?.ID}
        tabIndex={TabIndex}
        disabled={Active === 0}
        style={{
          ...styles,
          width: !Size ? "100%" : Size[1],
          zIndex: 1,
          display: Visible == 0 ? "none" : "block",
          // In Grid: borderless, no extra padding
          ...(isInGrid
            ? { border: 0, outline: 0, background: 'transparent', padding: '0 4px', verticalAlign: 'middle' }
            : {
              borderRadius: "2px",
              paddingRight: "2px",
              ...getBorderStyles(EdgeStyle, Border, "#6A6A6A"),
              // Focus underline — placed after getBorderStyles so borderBottom wins.
              ...(isFocused ? { borderBottom: '2px solid blue' } : {}),
            }),


          textAlign: "right",
          ...customStyles,
          ...fontStyles,
        }}
        onValueChange={(value) => {
          const { formattedValue } = value;
          setInputValue(value.value);
          setEmitValue(value.value);
        }}
        decimalScale={Decimal}
        value={inputValue}
        decimalSeparator={decimalSeparator}
        thousandSeparator={FieldType == "LongNumeric" && Thousand}
        onBlur={handleBlur}
        onKeyDown={(e) => handleKeyPress(e)}
        onFocus={handleGotFocus}
        onMouseDown={(e) => {
          handleMouseDown(e, socket, Event,data?.ID);
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
        onDoubleClick={(e)=>{
          handleMouseDoubleClick(e, socket, Event,data?.ID);
        }}
      />
    );
  }

  return (
    <input
      id={data.ID}
      ref={inputRef}
      tabIndex={TabIndex}
      value={inputValue}
      onClick={handleInputClick}
      type={inputType}
      disabled={Active === 0}
      onChange={(e) => {
        if (FieldType == "Char") {
          setEmitValue(e.target.value);
          setInputValue(e.target.value);
        }
        if (!FieldType) {
          setEmitValue(e.target.value);
          setInputValue(e.target.value);
        }
      }}
      onBlur={handleBlur}
      onKeyDown={(e) => handleKeyPress(e)}
      style={{
        ...styles,
        width: !Size ? "100%" : Size[1],
        zIndex: 1,
        display: Visible == 0 ? "none" : "block",
        // In Grid: borderless, consistent padding
        ...(isInGrid
          ? { border: 0, outline: 0, background: 'transparent', borderRadius: 0, padding: '0 4px' }
          : {
            borderRadius: "2px",
            paddingLeft: "5px",
            ...getBorderStyles(EdgeStyle, Border, "#6A6A6A"),
            // Focus underline — placed after getBorderStyles so borderBottom wins.
            ...(isFocused ? { borderBottom: '2px solid blue' } : {}),
          }),
        ...(Active === 0 ? {
          backgroundColor: "field",
          color: "#838383",
        } : {}),
        ...customStyles,
        ...fontStyles,
      }}
      maxLength={MaxLength}
      onFocus={handleGotFocus}
      onMouseDown={(e) => {
        handleMouseDown(e, socket, Event,data?.ID);
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
      onDoubleClick={(e)=>{
        handleMouseDoubleClick(e, socket, Event,data?.ID);
      }}
    />
  );
};

export default Edit;
