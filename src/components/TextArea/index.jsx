import React, { useEffect, useRef, useState } from "react";
import {
  handleMouseDoubleClick,
  handleMouseDown,
  handleMouseEnter,
  handleMouseLeave,
  handleMouseMove,
  handleMouseUp,
  handleMouseWheel,
  parseFlexStyles,
  setStyle,
} from "../../utils";
import "./textArea.css";
import "../../styles/font.css";
import { useAppData } from "../../hooks";

const TextArea = ({ data }) => {
  const { handleData, socket,dataRef } = useAppData();
  const textareaRef = useRef(null);


  // Safe initialization of localText
  const initialText = () => {
    if (data?.Properties?.Text) {
      return Array.isArray(data.Properties.Text)
        ? data.Properties.Text.join("\n")
        : data.Properties.Text;
    } else {
      const stored = localStorage.getItem(data.ID);
      return stored ? JSON.parse(stored).Text || "" : "";
    }
  };

  const [localText, setLocalText] = useState(initialText);

  let styles = setStyle(data?.Properties);
  const { Font, CSS, Event } = data?.Properties;
  const customStyles = parseFlexStyles(CSS);

  // Update localText when external Text changes
  useEffect(() => {
    if (data?.Properties?.Text) {
      localStorage.setItem(
        data.ID,
        JSON.stringify(data.Properties)
      );
      const text = data?.Properties.Text
      handleData(
        {
          ID: data.ID,
          Properties: {
            Text: text,
          },
        },
        "WS"
      );
      const newText = Array.isArray(data.Properties.Text)
        ? data.Properties.Text.join("\n")
        : data.Properties.Text;
      if (newText !== localText) {
        setLocalText(newText);
      }
    }
  }, [data?.Properties?.Text]);

  let updatedStyles = {
    ...styles,
    scrollbarWidth: "thin",
    scrollbarColor: "transparent transparent",
    fontFamily: Font && Font[0],
    fontSize: Font && `${Font[1]}px`,
    ...customStyles,
  };

  const handleChange = (e) => {
    const newText = e.target.value;
    setLocalText(newText);
    localStorage.setItem(
      data.ID,
      JSON.stringify({ ...data.Properties, Text: newText })
    );

    handleData(
      {
        ID: data.ID,
        Properties: {
          Text: newText,
        },
      },
      "WS"
    );
  };

  const textString = localText;

  const handleMouseUpLocal = (e, type) => {
    // Handle specific mouse events
    console.log("mousedown", Event)
    switch (type) {
      case "mouseUp":
        handleMouseUp(e, socket, Event, data?.ID);
        break;
      case "mouseDown":
        handleMouseDown(e, socket, Event, data?.ID);
        break;
      case "mouseLeave":
        handleMouseLeave(e, socket, Event, data?.ID);
        break;
      case "mouseEnter":
        handleMouseEnter(e, socket, Event, data?.ID);
        break;
      case "mouseMove":
        handleMouseMove(e, socket, Event, data?.ID);
        break;
      case "mouseWheel":
        handleMouseWheel(e, socket, Event, data?.ID);
        break;
      case "dblclick":
        handleMouseDoubleClick(e, socket, Event, data?.ID);
        break;
      default:
        break;
    }

    // Selection handling
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const textLines = textString.split("\n");

    const offsetToLineColumn = (offset, lines) => {
      let totalChars = 0;
      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length;
        const lineEnd = totalChars + lineLength;
        if (offset <= lineEnd) {
          const lineNumber = i + 1;
          const columnNumber = offset - totalChars + 1;
          return [lineNumber, columnNumber];
        }
        totalChars += lineLength + 1; // +1 for newline
      }
      // If offset exceeds total characters, return end of text
      const lineNumber = lines.length;
      const columnNumber = lines[lines.length - 1].length + 1;
      return [lineNumber, columnNumber];
    };

    const startLineCol = offsetToLineColumn(selectionStart, textLines);
    const endLineCol = offsetToLineColumn(selectionEnd, textLines);

    const selText = [startLineCol, endLineCol];

    // Debugging logs
    console.log("Selection Start:", selectionStart, "End:", selectionEnd);
    console.log("Selection Line/Column:", selText);

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

  return (
    <div style={{ overflow: "hidden" }}>
      <textarea
        ref={textareaRef}
        className="textArea"
        style={updatedStyles}
        value={textString}
        onChange={handleChange}
        onMouseUp={(e) => handleMouseUpLocal(e, "mouseUp")}
        onMouseDown={(e) => handleMouseUpLocal(e, "mouseDown")}
        onMouseEnter={(e) => handleMouseUpLocal(e, "mouseEnter")}
        onMouseLeave={(e) => handleMouseUpLocal(e, "mouseLeave")}
        onMouseMove={(e) => handleMouseUpLocal(e, "mouseMove")}
        onWheel={(e) => handleMouseUpLocal(e, "mouseWheel")}
        onDoubleClick={(e) => handleMouseUpLocal(e, "dblclick")}
        spellCheck={false}
      />
    </div>
  );
};

export default TextArea;
