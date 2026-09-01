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
  keyShiftState,
  isModifierKey,
} from "../../utils";
import { getBorderStyles } from "../../styles/edgeStyles";
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { useAppData, useAttachStyle } from "../../hooks";
import { useGridContext, useGridMode } from "../Grid/GridContext";
import { normalizeAplFormatted } from "../Grid/useNumericFormatter";
import dayjs from "dayjs";
import { NumericFormat } from "react-number-format";
import * as Globals from "../../Globals";

// How long to wait for an EC{Proceed} verdict before assuming the keystroke was
// accepted. Only a safety net — APL normally answers within the round-trip.
const VERDICT_TIMEOUT_MS = 2000;

// Every SelText array this client has written to the data model. The observer
// below moves the caret for an APL-sent SelText but must ignore its own echo,
// and a "last written" reference cannot tell them apart: the effect reads
// SelText from the props of the render it belongs to, so when two writes land
// close together the effect for the earlier render still holds the older array
// while the reference has moved on — and the caret gets dragged back to where
// it was before the keystroke. Set membership does not care which snapshot the
// effect is holding. Weak, so entries go when the arrays do.
const clientWrittenSelText = new WeakSet();

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
    keypressVerdictsRef
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
  const attachStyle = useAttachStyle(data);
  const [inputType, setInputType] = useState("text");
  const [inputValue, setInputValue] = useState("");
  const [emitValue, setEmitValue] = useState("");
  const [prevFocused, setprevFocused] = useState("⌈");
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
  // Caret to apply after the next commit, as [start, end] (0-indexed). Set this
  // rather than calling setSelectionRange inline: React captures the selection
  // of the focused element *before* it mutates a controlled input and re-applies
  // it afterwards (prepareForCommit → restoreSelection), so anything set before
  // the commit is undone. useLayoutEffect runs after that restore, before paint.
  const caretRef = useRef(null);
  // KeyPress events sent to APL that are still awaiting an EC{Proceed} verdict,
  // keyed by EventID → the pre-keystroke snapshot needed to undo a veto. The
  // browser has already applied the key; we only rewind if APL says no. A map,
  // not a single slot: typing beats the round-trip.
  const inFlightRef = useRef(new Map());
  // Latest value committed to local state, so a flush triggered from outside
  // the effect that tracks it still writes the current text.
  const latestValueRef = useRef("");
  // What the data model holds as far as this component is concerned: the value
  // it last wrote, or the last APL value it applied. Anything else showing up
  // in Properties is a genuine APL instruction. Without this the observer below
  // cannot tell "APL changed the text" from "the DOM has run ahead of the model
  // while a keystroke awaits its verdict", and pushes the lagging value — and
  // the pre-keystroke caret — back into the input on the next render.
  const modelValueRef = useRef(undefined);
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

  // Record a locally-edited value. latestValueRef is updated here rather than
  // only in the effect below, because a verdict can land before React has
  // flushed that effect and the flush must write what the user actually typed.
  const commitLocalValue = (value) => {
    latestValueRef.current = value;
    setInputValue(value);
    setEmitValue(value);
  };

  const applyCaret = (start, end) => {
    const el = inputRef.current;
    if (!el || el.type === "date") return;
    const len = el.value?.length ?? 0;
    el.setSelectionRange(Math.min(start, len), Math.min(end, len));
  };

  useLayoutEffect(() => {
    const caret = caretRef.current;
    if (!caret) return;
    caretRef.current = null;
    applyCaret(caret[0], caret[1]);
  });

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
    const selText = [clampedStart, clampedEnd];
    clientWrittenSelText.add(selText);
    handleData(
      {
        ID: data?.ID,
        Properties: {
          SelText: selText,
        },
      },
      "WS"
    );
  };

  // Push Text/Value plus the caret to the data model in one write, so a ⎕WG of
  // either sees them in step. caret is [start, end] 0-indexed; omit it to read
  // the live selection. Grid cells never call this — data.Properties there is
  // the column template shared by every cell in the column.
  const writeValueToModel = (value, caret) => {
    if (isInGrid) return;
    const el = inputRef.current;
    const properties = { Text: value, Value: value };
    if (el && el.type !== "date") {
      const len = String(value ?? "").length;
      const [start, end] = caret ?? [el.selectionStart ?? 0, el.selectionEnd ?? 0];
      const selText = [
        Math.max(1, Math.min(start + 1, len + 1)),
        Math.max(1, Math.min(end + 1, len + 1)),
      ];
      clientWrittenSelText.add(selText);
      properties.SelText = selText;
    }
    modelValueRef.current = value;
    handleData({ ID: data?.ID, Properties: properties }, "WS");
  };

  // Settle one outstanding KeyPress. Proceed:1 (or the failsafe below) needs no
  // work beyond releasing the model write — the browser applied the key when it
  // was pressed. Proceed:0 is ⎕WC's veto: rewind the field to how it looked at
  // that keystroke, which also discards anything typed during its round-trip,
  // so the rest of the queue is dropped rather than left to flush a value that
  // no longer exists.
  const resolveVerdict = (eventId, proceed) => {
    const entry = inFlightRef.current.get(eventId);
    if (!entry) return;
    clearTimeout(entry.timeout);
    inFlightRef.current.delete(eventId);
    keypressVerdictsRef.current.delete(eventId);

    if (proceed === 0 && entry.snapshot) {
      inFlightRef.current.forEach((queued, id) => {
        clearTimeout(queued.timeout);
        keypressVerdictsRef.current.delete(id);
      });
      inFlightRef.current.clear();

      const { value, start, end } = entry.snapshot;
      const valueChanged = latestValueRef.current !== value;
      commitLocalValue(value);
      prevInputValueRef.current = value;
      // A vetoed cursor key leaves the text alone, so no commit follows and the
      // layout effect would never fire — put the caret back directly instead.
      if (valueChanged) caretRef.current = [start, end];
      else applyCaret(start, end);
      writeValueToModel(value, [start, end]);
      return;
    }

    if (inFlightRef.current.size !== 0) return;

    // Nothing left in flight, so the model can catch up — unless APL changed
    // Text/Value itself while we were waiting, in which case its value wins and
    // ours is discarded (⎕WC applies the keystroke to whatever the callback
    // left behind). Read the tree live: the copy captured at keydown is stale.
    const live = findCurrentData(data?.ID);
    const modelValue = live?.Properties?.Text ?? live?.Properties?.Value;
    if (modelValue !== undefined && modelValue !== modelValueRef.current) {
      modelValueRef.current = modelValue;
      commitLocalValue(modelValue);
      return;
    }
    writeValueToModel(latestValueRef.current);
  };

  // Settle every outstanding keystroke as accepted and let the model catch up.
  // Used on blur: the user has moved on, and triggerChangeEvent writes Value
  // straight to the model — it must not do that while Text is still a keystroke
  // behind, or a ⎕WG would report the two disagreeing. A verdict arriving after
  // this finds nothing to act on, so a veto that late is dropped rather than
  // rewinding a field the user has already left.
  const settleInFlight = () => {
    if (inFlightRef.current.size === 0) return;
    inFlightRef.current.forEach((entry, id) => {
      clearTimeout(entry.timeout);
      keypressVerdictsRef.current.delete(id);
    });
    inFlightRef.current.clear();
    writeValueToModel(latestValueRef.current);
  };

  // Drop this instance's claims on unmount so a late EC can't call into a
  // component that no longer exists.
  useEffect(() => {
    const inFlight = inFlightRef.current;
    const verdicts = keypressVerdictsRef.current;
    return () => {
      inFlight.forEach((entry, id) => {
        clearTimeout(entry.timeout);
        verdicts.delete(id);
      });
      inFlight.clear();
    };
  }, [keypressVerdictsRef]);

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
    // Nor while a keystroke awaits its verdict: the model is knowingly a
    // keystroke behind the DOM then (see the write effect below), and re-seeding
    // from it would undo what the user just typed. Any change APL made during
    // that window is picked up by resolveVerdict when the last verdict lands.
    if (inFlightRef.current.size > 0) return;
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

    // Only an APL-originated SelText should move the caret; our own echoes are
    // skipped (see clientWrittenSelText above).
    const serverSelText =
      Array.isArray(selTextFromProperties)
      && selTextFromProperties.length === 2
      && !clientWrittenSelText.has(selTextFromProperties)
        ? [Math.max(0, selTextFromProperties[0] - 1), Math.max(0, selTextFromProperties[1] - 1)]
        : null;

    // Determine what text value to use
    let newTextValue = undefined;
    if (textFromProperties !== undefined) {
      newTextValue = textFromProperties;
    } else if (valueFromProperties !== undefined) {
      newTextValue = valueFromProperties;
    }

    // Text/Value, but only when APL genuinely changed them. A value matching
    // what we last put in the model is either our own echo or the model still
    // catching up with an in-flight keystroke — pushing either back into the
    // input would undo what the user just typed and move their caret with it.
    if (newTextValue !== undefined && newTextValue !== modelValueRef.current) {
      modelValueRef.current = newTextValue;
      const currentDOMValue = input.value;

      if (currentDOMValue === newTextValue) {
        // DOM is already correct, just update React state without re-render
        if (inputValue !== newTextValue) commitLocalValue(newTextValue);
      } else {
        // Save current cursor position before React re-render (not for date inputs)
        const savedStart = input.type !== 'date' ? input.selectionStart : 0;
        const savedEnd = input.type !== 'date' ? input.selectionEnd : 0;

        commitLocalValue(newTextValue);

        // A commit is coming, so hand the caret to the layout effect — it runs
        // after React restores the pre-commit selection and would otherwise win.
        if (input.type !== 'date') {
          caretRef.current = serverSelText ?? [savedStart, savedEnd];
        }
        return;
      }
    }

    // An APL SelText moves the caret whether or not the text changed with it.
    // Handled separately because an Edit almost always carries Text as well,
    // and while this sat in the else-branch of the test above it could never be
    // reached for one. No demo drives ⎕WS 'SelText' at a standalone Edit, so
    // this path is reachable now but not covered by a test.
    if (serverSelText && input.type !== 'date' && !caretRef.current) {
      if (input.selectionStart !== serverSelText[0] || input.selectionEnd !== serverSelText[1]) {
        applyCaret(serverSelText[0], serverSelText[1]);
      }
    }
  }, [data?.Properties?.Text, data?.Properties?.Value, data?.Properties?.SelText]);

  // Update global tree when input changes (for WG requests)
  // Skip when in Grid - the grid handles value updates through onCellChange
  useEffect(() => {
    if (isInGrid) return;
    latestValueRef.current = inputValue;

    if (inputValue !== undefined && inputValue !== prevInputValueRef.current) {
      prevInputValueRef.current = inputValue;
      // While a KeyPress is awaiting its verdict the model deliberately lags the
      // DOM by that keystroke, so a ⎕WG of Text/Value inside the callback reports
      // the pre-keystroke value, as ⎕WC does. resolveVerdict flushes the catch-up
      // write once the last verdict lands.
      if (inFlightRef.current.size > 0) return;
      writeValueToModel(inputValue);
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
    // Ignore shift etc
    if (isModifierKey(e)) return;
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

    const eventId = crypto.randomUUID();

    // No preventDefault: the browser applies the keystroke itself. That is what
    // keeps the caret right — a value React writes for us is followed by React
    // restoring the selection it captured *before* the write, so any character
    // we inject after a round-trip lands with the caret behind it (issue #471).
    //
    // ⎕WC still lets a KeyPress callback veto a keystroke by returning 0, so
    // snapshot the field as it stands now — we are inside keydown, before the
    // character lands — and register for the EC{Proceed} verdict. resolveVerdict
    // rewinds to this snapshot if APL rejects the key, and releases the deferred
    // model write if it accepts.
    const inp = inputRef.current;
    // The value comes from state, not the DOM: LongNumeric renders through
    // NumericFormat, whose DOM value is formatted ("8,500") while state holds
    // the raw digits. The caret is a DOM concern, so that part is read live.
    const snapshot = inp
      ? {
          value: inputValue,
          start: inp.selectionStart ?? inp.value.length,
          end: inp.selectionEnd ?? inp.value.length,
        }
      : null;
    // processEvent.aplf reaches END without sending EC on several paths (unknown
    // object, a key that resolves to nothing, no callback defined), so a verdict
    // may never arrive. Time out as an accept rather than strand the model write.
    const timeout = setTimeout(() => resolveVerdict(eventId, 1), VERDICT_TIMEOUT_MS);
    inFlightRef.current.set(eventId, { snapshot, timeout });
    keypressVerdictsRef.current.set(eventId, {
      onVerdict: (proceed) => resolveVerdict(eventId, proceed),
    });

    // Character code [4] of the Dyalog KeyPress event: the Unicode code point of
    // the character entered, or 0 when the key resolves to no character (e.g.
    // Cursor Up => 0, per the object-reference KeyPress doc). Named keys => 0;
    // the server (processEvent.aplf) refines Enter/Tab/Backspace to 13/9/8.
    const charCode = e.key.length === 1 ? e.key.charCodeAt(0) : 0;
    const shiftState = keyShiftState(e);

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
    settleInFlight();
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
        commitLocalValue(seed);
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
            ...attachStyle,
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
            commitLocalValue(e.target.value);
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
            ...attachStyle,
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
          ...attachStyle,
        }}
        onValueChange={(value) => {
          commitLocalValue(value.value);
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
        if (FieldType == "Char" || !FieldType) {
          commitLocalValue(e.target.value);
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
        ...attachStyle,
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
