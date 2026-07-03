import {
  setStyle,
  getFontStyles,
  extractStringUntilLastPeriod,
  handleMouseMove,
  handleMouseLeave,
  handleMouseEnter,
  handleMouseDown,
  handleMouseUp,
  parseFlexStyles,
  handleMouseWheel,
  handleMouseDoubleClick,
  handleKeyPressUtils,
} from "../utils";
import { useAppData, useAttachStyle } from "../hooks";
import { useGridContext } from "./Grid/GridContext";
import { useEffect, useState } from "react";
import { useRef } from "react";
import { getObjectById, getImageStyles } from "../utils";

const Button = ({
  data,
}) => {

  const styles = setStyle(data?.Properties);
  const attachStyle = useAttachStyle(data);
  const { socket, findCurrentData, dataRef, handleData, inheritedProperties } = useAppData();

  // Check if we're inside a Grid cell
  const gridContext = useGridContext();
  const isInGrid = !!gridContext;
  const { Picture, State, Visible, Event, Caption, Align, Posn, Size, CSS, Active, TabIndex } = data?.Properties;
  const { FontObj } = inheritedProperties(data, 'FontObj');

//   console.log("data Button", data);

  const customStyles = parseFlexStyles(CSS);

  const font = findCurrentData(FontObj);
  const fontStyles = getFontStyles(font, 12);

  const inputRef = useRef();
  const buttonRef = useRef();

  const [checkInput, setCheckInput] = useState(false);

  const [radioValue, setRadioValue] = useState(State ? State : 0);

  const hasCaption = data.Properties.hasOwnProperty("Caption");

  const isCheckBox =
    data?.Properties?.Style && data?.Properties?.Style == "Check";

  const isRadio = data?.Properties?.Style && data?.Properties?.Style == "Radio";

  const ImageData = findCurrentData(Picture && Picture[0]);

  const buttonEvent = data.Properties.Event && data?.Properties?.Event[0];

  const imageStyles = getImageStyles(Picture && Picture[1], ImageData);
  const [position, setPosition] = useState({
    top: Posn && Posn[0],
    left: Posn && Posn[1],
  });

  const decideInput = () => {
    // When in Grid, use cellValue from context (0 or 1)
    if (isInGrid && gridContext) {
      return setCheckInput(gridContext.cellValue === 1);
    }
    // Ensure we always set a boolean (not undefined) to avoid controlled/uncontrolled warning
    setCheckInput(State === 1 || State === true);
  };

  useEffect(() => {
    decideInput();
    setPosition({ top: Posn && Posn[0], left: Posn && Posn[1] });
  }, [data, gridContext?.cellValue]);

  const shortcutKey = Caption?.includes("&")
    ? Caption?.charAt(Caption.indexOf("&") + 1).toLowerCase()
    : null;

  useEffect(() => {
    const handleShortcut = (event) => {
      if (shortcutKey && event.altKey && event.key.toLowerCase() === shortcutKey) {
       
            handleButtonClick(e); 
      }
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [shortcutKey]);

  useEffect(() => {
    if (data?.Properties?.Default === 1) {
      const handleKeyPress = (e) => {
        if (e.key === "Enter") {
          handleButtonClick(e);
        }
      };
      document.addEventListener("keydown", handleKeyPress);
      return () => document.removeEventListener("keydown", handleKeyPress);
    }
  }, [data, buttonEvent]);


  const handleButtonClick = (e) => {
    if (Active === 0) {
      e.preventDefault();
      return;
    }
    document.getElementById(localStorage.getItem("current-focus"))?.blur();
    if (buttonEvent) {
//       console.log(
//         JSON.stringify({
//           Event: {
//             EventName: buttonEvent[0],
//             ID: data?.ID,
//           },
//         })
//       );
      if (
        localStorage.getItem("current-focus") &&
        localStorage.getItem("shouldChangeEvent") === "true"
      ) {
//         console.log( 
//           JSON.stringify({
//             Event: {
//               EventName: "Change",
//               ID: localStorage.getItem("current-focus"),
//               Info: [data?.ID],
//             },
//           })
//         );

        socket.send(
          JSON.stringify({
            Event: {
              EventName: "Change",
              ID: localStorage.getItem("current-focus"),
              Info: [data?.ID],
            },
          })
        );
      }

      socket.send(
        JSON.stringify({
          Event: {
            EventName: buttonEvent[0],
            ID: data?.ID,
          },
        })
      );

      handleGotFocus();
    }
  };

  const handleSelectEvent = (value) => {
    const newState = value ? 1 : 0;
    handleData(
      { ID: data?.ID, Properties: { State: newState } },
      "WS"
    );
    const triggerEvent = JSON.stringify({
      Event: {
        EventName: "Select",
        ID: data?.ID,
        Value: newState,
        Posn: [position?.top, position?.left],
        Size: [Size && Size[0], Size && Size[1]],
      },
    });
    localStorage.setItem(data?.ID, triggerEvent);
    const exists = Event && Event.some((item) => item[0] === "Select");
    if (!exists) return;
//     console.log(triggerEvent);
    const event = JSON.stringify({
      Event: {
        EventName: "Select",
        ID: data?.ID,
      },
    });
    socket.send(event);
  };

  const handleCheckBoxEvent = (value) => {
    // When in Grid, report change via context callback
    if (isInGrid && gridContext) {
      gridContext.onCellChange(value ? 1 : 0);
      return;
    }
    handleSelectEvent(value);
  };

  const handleKeyPress = (e) => {
    handleKeyPressUtils(e, socket, Event, data?.ID);
  };

  //handle got focus event on all controls
  const handleGotFocus = () => {
    const previousFocusedId = localStorage.getItem("current-focus");
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

  if (isCheckBox) {
    // When in Grid, render a centered checkbox without labels
    if (isInGrid) {
      return (
        <div
          id={data.ID + ".$CONTAINER"}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <input
            onFocus={handleGotFocus}
            ref={inputRef}
            onKeyDown={(e) => handleKeyPress(e)}
            id={data?.ID}
            type="checkbox"
            checked={checkInput}
            disabled={Active === 0}
            onChange={(e) => {
              setCheckInput(e.target.checked);
              handleCheckBoxEvent(e.target.checked);
            }}
          />
        </div>
      );
    }

    return (
      <div
        id={data.ID + ".$CONTAINER"}
        onKeyDown={(e) => handleKeyPress(e)}
        style={{
          ...styles,
          zIndex: 1,
          display: Visible == 0 ? "none" : "flex",
          alignItems: "center",
          gap: 4,
          flexDirection: Align == "Left" ? "row-reverse" : "row",
          justifyContent: Align == "Left" ? "flex-end" : "flex-start",
          ...customStyles,
          ...fontStyles,
          ...attachStyle,
        }}
      >
        <input
          onFocus={handleGotFocus}
          ref={inputRef}
          onKeyDown={(e) => handleKeyPress(e)}
          id={data?.ID}
          tabIndex={TabIndex}
          type="checkbox"
          style={{ margin: 0, marginLeft: 0, flexShrink: 0 }}
          checked={checkInput}
          disabled={Active === 0}
          onChange={(e) => {
            setCheckInput(e.target.checked);
            handleCheckBoxEvent(e.target.checked);
          }}
        />
        <label style={{ whiteSpace: "nowrap", ...customStyles }} htmlFor={data?.ID}>{Caption}</label>
      </div>
    );
  }

  if (isRadio) {
    const handleRadioSelectEvent = (value) => {
      const emitEvent = JSON.stringify({
        Event: {
          EventName: "Select",
          ID: data?.ID,
          Value: value,
        },
      });
      const exists = Event && Event.some((item) => item[0] === "Select");
      if (!exists) return;

      const event = JSON.stringify({
        Event: {
          EventName: "Select",
          ID: data?.ID,
        },
      });
//       console.log(emitEvent);

      socket.send(event);
    };

    const handleRadioButton = (id, value) => {
      const parentElement = document.getElementById(
        extractStringUntilLastPeriod(data?.ID)
      );
      var radioInputs = parentElement.getElementsByTagName("input");

      // TODO! I don't know why, but this works when we set all states to 0 and
      // then update the desired radio to 1 afterwards.
      for (var i = 0; i < radioInputs.length; i++) {
        if (radioInputs[i].type !== "radio") {
          continue;
        }
        var radioId = radioInputs[i].id;
        const button = JSON.parse(getObjectById(dataRef.current, radioId));
        handleData(
          {
            ID: button.ID,
            Properties: {
              ...button?.Properties,
              State: 0,
            },
          },
          "WS"
        );
      }

      // See above comment: all radios have been zero'd, so now we set the one
      // we want.
      const button = JSON.parse(getObjectById(dataRef.current, data.ID));
      handleData(
        {
          ID: data.ID,
          Properties: {
            ...button?.Properties,
            State: 1,
          },
        },
        "WS"
      );

      handleRadioSelectEvent(value);
    };

    useEffect(() => {
      setRadioValue(State);
    }, [data]);

    return (
      <div
        id={data?.ID + ".$CONTAINER"}
        style={{
          ...styles,
          zIndex: 1,
          display: Visible == 0 ? "none" : "flex",
          alignItems: "center",
          gap: 4,
          flexDirection: Align == "Left" ? "row-reverse" : "row",
          justifyContent: Align == "Left" ? "flex-end" : "flex-start",
          ...customStyles,
          ...fontStyles,
          ...attachStyle,
        }}
      >
        <input
          onFocus={handleGotFocus}
          name={extractStringUntilLastPeriod(data?.ID)}
          id={data?.ID}
          tabIndex={TabIndex}
          checked={radioValue}
          type="radio"
          value={Caption}
          disabled={Active === 0}
          style={{ margin: 0, flexShrink: 0 }}
          onChange={(e) => {
            handleRadioButton(data?.ID, e.target.checked);
          }}
        />
        <label style={{ whiteSpace: "nowrap", ...customStyles }} htmlFor={data?.ID}>{Caption}</label>
      </div>
    );
  }

  return (
    <div
      id={data?.ID}
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
        handleMouseDoubleClick(e, socket, Event, data?.ID);
      }}
      ref={buttonRef}
      tabIndex={TabIndex}
      onClick={(e) => {
        handleButtonClick(e)
      }}
      style={{
        ...styles,
        border: "1px solid black",
        textAlign: "center",
        alignItems: "center",
        justifyContent: "center",
        background: "white",
        borderRadius: "4px",
        borderColor: "#ccc",
        fontSize: "12px",
        color: Active === 0 ? "#838383" : "black",
        // fontSize: '11px',
        cursor: "pointer",
        zIndex: 1,
        paddingLeft: '3px',
        paddingRight: '3px',
        display: Visible == 0 ? "none" : "flex",
        ...(data?.Properties?.hasOwnProperty("Posn")
          ? { top: position?.top }
          : {}),
        ...(data?.Properties?.hasOwnProperty("Posn")
          ? { left: position?.left }
          : {}),
        ...customStyles,
        ...fontStyles,
        ...attachStyle,
      }}
    >
      {ImageData ? (
        <div style={{ ...imageStyles, width: "100%", height: "100%" }}></div>
      ) : null}

      {hasCaption ? (
        data?.Properties?.Caption?.includes("&") ? (
          <span
            dangerouslySetInnerHTML={{
              __html: data?.Properties?.Caption.replace(/&(\w)/, "<u>$1</u>")
            }}
          ></span>
        ) : (
          <span>{data?.Properties?.Caption}</span>
        )
      ) : null}
    </div>
  );
};

export default Button;
