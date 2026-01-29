import { setStyle, getFontStyles, extractStringUntilLastPeriod, getObjectTypeById, handleMouseDown, handleMouseUp, handleMouseEnter, handleMouseMove, handleMouseLeave, parseFlexStyles, handleMouseWheel, handleMouseDoubleClick, handleKeyPressUtils } from '../utils';

import { createPortal } from 'react-dom';
import { useAppData, useResizeObserver } from '../hooks';
import { useNuGridContext } from './NuGrid/NuGridContext';
import { useState, useRef, useEffect, useCallback } from 'react';

const Combo = ({ data, value, event = '', row = '', column = '', location = '', values = [] }) => {
  // Check if we're inside a NuGrid cell
  const nuGridContext = useNuGridContext();
  const isInNuGrid = !!nuGridContext;
  const parentSize = JSON.parse(localStorage.getItem(extractStringUntilLastPeriod(data?.ID)));

  const inputRef = useRef();

  // Custom dropdown state and refs
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [searchString, setSearchString] = useState('');
  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);
  const portalRef = useRef(null);
  const listRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);

  const { socket, handleData, findCurrentData, reRender, dataRef, inheritedProperties } = useAppData();

  const { CSS } = data.Properties;
  const { FontObj } = inheritedProperties(data, 'FontObj');

  const customStyles = parseFlexStyles(CSS)
  const styles = setStyle(data?.Properties);

  const { Items, SelItems, Event, Visible, Posn, Size, Rows, TabIndex } = data?.Properties;

  const dimensions = useResizeObserver(
    document.getElementById(extractStringUntilLastPeriod(data?.ID))
  );

  const font = findCurrentData(FontObj);
  const fontStyles = getFontStyles(font, 12);

  // Initialize with selected item, or Text property, or first item
  const initialSelected = () => {
    // When in NuGrid, use cellValue from context
    if (isInNuGrid && nuGridContext) {
      return nuGridContext.cellValue || '';
    }
    const index = SelItems?.findIndex((element) => element == 1);
    if (index !== undefined && index !== -1 && Items) {
      return Items[index];
    }
    // No selection - use Text property if set, otherwise first item
    return data?.Properties?.Text || (Items?.[0]) || '';
  };
  const [comboInput, setComboInput] = useState(initialSelected);

  // Update combo input when NuGrid cellValue changes
  useEffect(() => {
    if (isInNuGrid && nuGridContext) {
      setComboInput(nuGridContext.cellValue || '');
    }
  }, [isInNuGrid, nuGridContext?.cellValue]);
  const [position, setPosition] = useState({ top: Posn && Posn[0], left: Posn && Posn[1] });

  const [parentOldDimensions, setParentOldDimensions] = useState(parentSize?.Size);

  // Sync selection from SelItems - skip when in NuGrid (values come from grid context)
  useEffect(() => {
    if (isInNuGrid) return;

    const index = SelItems?.findIndex((element) => element == 1);
    if (index == undefined || index == -1) {
      return;
    }
    setComboInput(Items[index]);
    const triggerEvent = JSON.stringify({
      Event: {
        EventName: 'Select',
        ID: data?.ID,
        Info: index + 1,
        Text: Items && Items[index],
        Posn: [position?.top, position?.left],
        Size: [Size && Size[0], Size && Size[1]],
      },
    });
    localStorage.setItem(data?.ID, triggerEvent);
  }, [data]);

  const handleCellChangeEvent = (value) => {
    const gridEvent = findCurrentData(extractStringUntilLastPeriod(data?.ID));
    values[parseInt(row) - 1][parseInt(column) - 1] = value;
    handleData(
      {
        ID: extractStringUntilLastPeriod(data?.ID),
        Properties: {
          ...gridEvent.Properties,
          Values: values,
          CurCell: [row, column],
        },
      },
      'WS'
    );

    // Info array: [Row, Col, Value] - APL callback receives (ID Event),Info
    const triggerEvent = JSON.stringify({
      Event: {
        EventName: 'CellChanged',
        ID: extractStringUntilLastPeriod(data?.ID),
        Info: [parseInt(row), parseInt(column), value],
      },
    });

    const updatedGridValues = JSON.stringify({
      Event: {
        EventName: 'CellChanged',
        Values: values,
        CurCell: [row, column],
      },
    });

    localStorage.setItem(extractStringUntilLastPeriod(data?.ID), updatedGridValues);
    const exists = event && event.some((item) => item[0] === 'CellChanged');
    if (!exists) return;

//     console.log(triggerEvent);
    socket.send(triggerEvent);
  };

  const handleSelectEvent = (value) => {
    const NewSelItems = new Array(Items.length).fill(0);
    NewSelItems[value] = 1;
    // Because of the way state is handled, we fake a WS command and pass it to
    // handleData. Ideally this would not be the way to do it, but it works as
    // the system is currently.
    handleData(
      {
        ID: data?.ID,
        Properties: {
          ...data?.Properties,
          SelItems: NewSelItems,
          Text: Items && Items[value],
        },
      },
      "WS"
    );
    // Info array: [index, text] - APL callback receives (ID Event),Info
    // So args = ID Event index text
    const triggerEvent = JSON.stringify({
      Event: {
        EventName: "Select",
        ID: data?.ID,
        Info: [parseInt(value + 1), Items ? Items[value] : ''],
      },
    });

    localStorage.setItem(data?.ID, triggerEvent);
    const exists = Event && Event.some((item) => item[0] === "Select");
    if (!exists) return;
    socket.send(triggerEvent);
  };

  useEffect(() => {
    // TODO B1: Fix up resize logic!
    return;
    if (!position) return;
    if (!parentOldDimensions) return;

    let calculateLeft =
      position && position.left && parentOldDimensions && parentOldDimensions[1]
        ? (position.left / parentOldDimensions[1]) * dimensions.width
        : 0;

    calculateLeft = Math.max(0, Math.min(calculateLeft, dimensions.width));

    let calculateTop =
      position && position.top && parentOldDimensions && parentOldDimensions[0]
        ? (position.top / parentOldDimensions[0]) * dimensions.height
        : 0;

    calculateTop = Math.max(0, Math.min(calculateTop, dimensions.height));

    setPosition({ top: calculateTop, left: calculateLeft });

    handleData(
      {
        ID: data?.ID,
        Properties: {
          Posn: [calculateTop, calculateLeft],
        },
      },
      'WS'
    );
    setParentOldDimensions([dimensions?.height, dimensions?.width]);

    // if (!localStorage.getItem(data?.ID)) {
    //   const index = SelItems?.findIndex((element) => element == 1);
    //   // setComboInput(Items[index]);
    //   const event = JSON.stringify({
    //     Event: {
    //       EventName: 'Select',
    //       ID: data?.ID,
    //       Info: index + 1,
    //       Posn: [calculateTop, calculateLeft],
    //       Size: [Size && Size[0], Size && Size[1]],
    //       Text: Items && Items[index],
    //     },
    //   });

    //   localStorage.setItem(data?.ID, event);
    // } else {
    //   const { Event } = JSON.parse(localStorage.getItem(data?.ID));
    //   const { Info, Text } = Event;
    //   const index = SelItems?.findIndex((element) => element == 1);
    //   const event = JSON.stringify({
    //     Event: {
    //       EventName: 'Select',
    //       ID: data?.ID,
    //       Info: index + 1,
    //       Posn: [calculateTop, calculateLeft],
    //       Size: [Size && Size[0], Size && Size[1]],
    //       Text: Items && Items[index],
    //     },
    //   });

    //   localStorage.setItem(data?.ID, event);
    // }

    reRender();
  }, [dimensions]);

  // Click-outside detection to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const inTrigger = dropdownRef.current?.contains(event.target);
      const inPortal = portalRef.current?.contains(event.target);
      if (!inTrigger && !inPortal) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    if (isOpen) {
      // Use capture phase so we see the event before any stopPropagation
      // in other Combos' bubble-phase handlers — ensures only one is open.
      document.addEventListener('mousedown', handleClickOutside, true);
      return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }
  }, [isOpen]);

  // Reset highlighted index when opening dropdown
  useEffect(() => {
    if (isOpen) {
      const currentValue = value || comboInput;
      const currentIndex = Items?.indexOf(currentValue) ?? -1;
      setHighlightedIndex(currentIndex);
    }
  }, [isOpen]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [highlightedIndex, isOpen]);

  // Toggle dropdown open/close
  const toggleDropdown = useCallback((e) => {
    e?.stopPropagation();
    setIsOpen(prev => !prev);
    // Ensure button keeps focus for keyboard events
    triggerRef.current?.focus();
  }, []);

  // Handle option click - fires event EVERY time including reselect
  const handleOptionClick = useCallback((item, index, e) => {
    e?.stopPropagation();
    setComboInput(item);
    setIsOpen(false);
    setHighlightedIndex(-1);

    // When in NuGrid, report change via context callback
    if (isInNuGrid && nuGridContext) {
      nuGridContext.onCellChange(item);
      return;
    }

    // ALWAYS fire Select event, even when reselecting same value
    if (location === 'inGrid') {
      handleSelectEvent(index);
      handleCellChangeEvent(item);
    } else {
      handleSelectEvent(index);
    }
  }, [location, handleSelectEvent, handleCellChangeEvent, isInNuGrid, nuGridContext]);

  // Calculate dropdown position (fixed positioning for grid context)
  const getDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return {};

    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 8;
    const itemHeight = 24;
    const contentHeight = Rows
      ? Rows * itemHeight
      : (Items?.length || 1) * itemHeight;

    // Constrain to the containing Form rather than the full viewport,
    // so the dropdown doesn't overflow the form's visible area.
    const parentId = extractStringUntilLastPeriod(data?.ID);
    const formEl = document.getElementById(parentId);
    const container = formEl ? formEl.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };

    const spaceBelow = container.bottom - rect.bottom - margin;
    const spaceAbove = rect.top - container.top - margin;

    // Determine if dropdown should appear above or below
    const showAbove = spaceBelow < contentHeight && spaceAbove > spaceBelow;
    // Fit content or fill available space, whichever is smaller
    const maxHeight = Math.min(contentHeight, showAbove ? spaceAbove : spaceBelow);

      // Always use fixed positioning so the dropdown escapes any
      // ancestor overflow:clip/hidden (e.g. SubForm's overflow:"clip").
    return {
      position: 'fixed',
      top: showAbove ? 'auto' : rect.bottom,
      bottom: showAbove ? (window.innerHeight - rect.top) : 'auto',
      left: rect.left,
      width: rect.width,
      maxHeight,
      zIndex: 9999
    };
  }, [location, Rows, Items]);

  const triggerCellMoveEvent = (row, column, mouseClick, value) => {
//     console.log("265 combo")
    const isKeyboard = !mouseClick ? 1 : 0;
    const Event = JSON.stringify({
      Event: {
        ID: extractStringUntilLastPeriod(data?.ID),
        EventName: 'CellMove',
        Info: [row, column, isKeyboard, 0, mouseClick, value],
      },
    });

    const exists = event && event.some((item) => item[0] === 'CellMove');
    if (!exists) return;
//     console.log(Event);
    socket.send(Event);
  };

  const handleRightArrow = (value) => {
    if (location !== 'inGrid') return;
//     console.log(inputRef);
    const parent = inputRef.current.parentElement;
    const grandParent = parent.parentElement;
    const nextSibling = grandParent.nextSibling;
    const querySelector = getObjectTypeById(dataRef.current, nextSibling?.id);

    triggerCellMoveEvent(row, column + 1, 0, value);
    const element = nextSibling?.querySelectorAll(querySelector);
//     console.log({ element });

    if (querySelector == 'select') return element && element[0].focus();

    return element && element[0].select();
  };
  const handleLeftArrow = (value) => {
    if (location !== 'inGrid') return;
//     console.log(inputRef);
    const parent = inputRef.current.parentElement;
    const grandParent = parent.parentElement;
    const nextSibling = grandParent.previousSibling;
    const querySelector = getObjectTypeById(dataRef.current, nextSibling?.id);
    triggerCellMoveEvent(row, column - 1, 0, value);
    const element = nextSibling?.querySelectorAll(querySelector);

    if (querySelector == 'select') return element && element[0].focus();

    return element && element[0].select();
  };
  const handleUpArrow = (value) => {
    if (location !== 'inGrid') return;
    const parent = inputRef.current.parentElement;
    const grandParent = parent.parentElement;
    const superParent = grandParent.parentElement;
    const nextSibling = superParent.previousSibling;
    const element = nextSibling?.querySelectorAll('select');
    triggerCellMoveEvent(row - 1, column, 0, value);
    element &&
      element.forEach((inputElement) => {
        if (inputElement.id === data?.ID) {
          inputElement.focus();
        }
      });
  };
  const handleCellMove = (value) => {
    if (location !== 'inGrid') return;
    const parent = inputRef.current.parentElement;
    const grandParent = parent.parentElement;
    const superParent = grandParent.parentElement;
    const nextSibling = superParent.nextSibling;
    triggerCellMoveEvent(row + 1, column, 0, value);
    const element = nextSibling?.querySelectorAll('select');
    element &&
      element.forEach((inputElement) => {
        if (inputElement.id === data?.ID) {
          inputElement.focus();
        }
      });
  };

  const handleKeyPress = (e) => {
    e.stopPropagation();
    handleKeyPressUtils(e, socket, Event, data?.ID);

    const currentValue = value || comboInput;

    // Type-to-search: handle printable characters
    const handleTypeSearch = (char) => {
      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Append character to search string
      const newSearch = searchString + char.toLowerCase();
      setSearchString(newSearch);

      // Find first matching item
      if (Items) {
        const matchIndex = Items.findIndex(item =>
          item.toLowerCase().startsWith(newSearch)
        );
        if (matchIndex !== -1) {
          setHighlightedIndex(matchIndex);
          if (!isOpen) {
            // Select the item if dropdown is closed
            handleOptionClick(Items[matchIndex], matchIndex, e);
          }
        }
      }

      // Clear search string after 500ms of no typing
      searchTimeoutRef.current = setTimeout(() => {
        setSearchString('');
      }, 500);
    };

    // Alt+Down opens dropdown, Alt+Up closes (standard accessibility shortcut)
    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      return;
    }
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    // Number of items to jump for PageUp/PageDown
    const pageSize = 5;

    if (isOpen) {
      // Dropdown is open - navigate options
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < (Items?.length ?? 0) - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Home') {
        // Jump to first item
        e.preventDefault();
        setHighlightedIndex(0);
      } else if (e.key === 'End') {
        // Jump to last item
        e.preventDefault();
        setHighlightedIndex((Items?.length ?? 1) - 1);
      } else if (e.key === 'PageDown') {
        // Jump down by pageSize items
        e.preventDefault();
        setHighlightedIndex(prev =>
          Math.min(prev + pageSize, (Items?.length ?? 1) - 1)
        );
      } else if (e.key === 'PageUp') {
        // Jump up by pageSize items
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - pageSize, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && Items?.[highlightedIndex]) {
          handleOptionClick(Items[highlightedIndex], highlightedIndex, e);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        setSearchString('');
      } else if (e.key === 'Tab') {
        setIsOpen(false);
        setHighlightedIndex(-1);
        setSearchString('');
        // Let Tab propagate for focus management
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Printable character - type-to-search
        e.preventDefault();
        handleTypeSearch(e.key);
      }
    } else {
      // Dropdown is closed
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      } else if (location === 'inGrid') {
        // In grid context, arrow keys navigate cells when closed
        e.preventDefault();
        if (e.key === 'ArrowRight') handleRightArrow(currentValue);
        else if (e.key === 'ArrowLeft') handleLeftArrow(currentValue);
        else if (e.key === 'ArrowDown') handleCellMove(currentValue);
        else if (e.key === 'ArrowUp') handleUpArrow(currentValue);
      } else {
        // Not in grid - arrow keys open dropdown
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          setIsOpen(true);
        } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          // Printable character - type-to-search (selects immediately when closed)
          e.preventDefault();
          handleTypeSearch(e.key);
        }
      }
    }
  };

  // In NuGrid: render a native select like old Grid (borderless, simple)
  if (isInNuGrid) {
    return (
      <select
        ref={inputRef}
        id={data?.ID}
        value={comboInput}
        style={{
          border: 0,
          outline: 0,
          width: '100%',
          height: '100%',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: '12px',
          ...fontStyles,
        }}
        onChange={(e) => {
          const newValue = e.target.value;
          setComboInput(newValue);
          if (nuGridContext) {
            nuGridContext.onCellChange(newValue);
          }
        }}
        onKeyDown={(e) => {
          // Let arrow keys work for dropdown navigation, don't propagate
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.stopPropagation();
          }
        }}
      >
        {Items && Items.map((item, index) => (
          <option key={index} value={item}>{item}</option>
        ))}
      </select>
    );
  }

  return (
    <div
      style={{
        ...(isInNuGrid ? {} : styles),
        borderColor: '#ccc',
        display: Visible == 0 ? 'none' : 'block',
        ...(isInNuGrid ? {
          position: 'relative',
          width: '100%',
          height: '100%',
        } : {
          top: Posn?.[0],
          left: Posn?.[1],
        }),
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        handleMouseDown(e, socket, Event, data?.ID);
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
        handleMouseUp(e, socket, Event, data?.ID);
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
        handleMouseEnter(e, socket, Event, data?.ID);
      }}
      onMouseMove={(e) => {
        e.stopPropagation();
        handleMouseMove(e, socket, Event, data?.ID);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        handleMouseLeave(e, socket, Event, data?.ID);
      }}
      onWheel={(e) => {
        handleMouseWheel(e, socket, Event, data?.ID);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        handleMouseDoubleClick(e, socket, Event, data?.ID);
      }}
      onKeyDown={(e) => { handleKeyPressUtils(e, socket, Event, data?.ID); }}
    >
      {/* Custom dropdown wrapper */}
      <div
        ref={dropdownRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      >
        {/* Trigger button - displays current value and dropdown arrow */}
        <button
          ref={triggerRef}
          id={data?.ID}
          type="button"
          tabIndex={TabIndex}
          onClick={toggleDropdown}
          onKeyDown={handleKeyPress}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${data?.ID}-listbox`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: '1px solid #6A6A6A',
            borderRadius: 0,
            padding: '0 20px 0 4px',
            margin: 0,
            fontSize: '12px',
            lineHeight: 'normal',
            textAlign: 'left',
            backgroundColor: '#fff',
            cursor: 'pointer',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            ...customStyles,
            ...fontStyles
          }}
        >
          {value || comboInput || ''}
          {/* Dropdown arrow */}
          <span
            style={{
              position: 'absolute',
              right: 4,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid #606060',
              pointerEvents: 'none'
            }}
          />
        </button>

      </div>

      {/* Dropdown list - portalled to document.body to escape overflow:clip */}
      {isOpen && createPortal(
        <div
          ref={portalRef}
          style={{
            ...getDropdownPosition(),
            backgroundColor: '#fff',
            border: '1px solid #6A6A6A',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
        >
          <ul
            ref={listRef}
            id={`${data?.ID}-listbox`}
            role="listbox"
            aria-label="Options"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0
            }}
          >
            {Items && Items.length > 0 ? (
              Items.map((item, index) => {
                const isSelected = item === (value || comboInput);
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={index}
                    ref={el => optionRefs.current[index] = el}
                    role="option"
                    aria-selected={isSelected}
                    onClick={(e) => handleOptionClick(item, index, e)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      padding: '4px 8px',
                      cursor: 'pointer',
                      backgroundColor: isHighlighted
                        ? '#0078D7'
                        : isSelected
                          ? '#E5F3FF'
                          : '#fff',
                      color: isHighlighted ? '#fff' : '#000',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      ...fontStyles
                    }}
                  >
                    {item}
                  </li>
                );
              })
            ) : (
              <li
                style={{
                  padding: '4px 8px',
                  color: '#888',
                  fontStyle: 'italic',
                  fontSize: '12px'
                }}
              >
                No options
              </li>
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Combo;

//  console.log(
//    event == 'CellChanged'
//      ? JSON.stringify({
//          Event: {
//            EventName: event,
//            ID: extractStringUntilSecondPeriod(data?.ID),
//            Row: parseInt(row),
//            Col: parseInt(column),
//            Value: e.target.value,
//          },
//        })
//      : JSON.stringify({
//          Event: {
//            EventName: data?.Properties?.Event[0],
//            ID: data?.ID,
//            Info: parseInt(index + 1),
//          },
//        })
//  );

//  if (event == 'CellChanged') {
//    localStorage.setItem(
//      extractStringUntilSecondPeriod(data?.ID),
//      JSON.stringify({
//        Event: {
//          EventName: event,
//          ID: extractStringUntilSecondPeriod(data?.ID),
//          Row: parseInt(row),
//          Col: parseInt(column),
//          Value: e.target.value,
//        },
//      })
//    );
//  } else {
//    localStorage.setItem(
//      data?.ID,
//      JSON.stringify({
//        Event: {
//          EventName: emitEvent && emitEvent[0],
//          ID: data?.ID,
//          Info: parseInt(index + 1),
//        },
//      })
//    );
//  }

//  socket.send(
//    event == 'CellChanged'
//      ? JSON.stringify({
//          Event: {
//            EventName: event,
//            ID: extractStringUntilSecondPeriod(data?.ID),
//            Row: parseInt(row),
//            Col: parseInt(column),
//            Value: e.target.value,
//          },
//        })
//      : JSON.stringify({
//          Event: {
//            EventName: emitEvent && emitEvent[0],
//            ID: data?.ID,
//            Info: parseInt(index + 1),
//          },
//        })
//  );
