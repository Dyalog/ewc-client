import { setStyle, getFontStyles, extractStringUntilLastPeriod, handleMouseDown, handleMouseUp, handleMouseEnter, handleMouseMove, handleMouseLeave, parseFlexStyles, handleMouseWheel, handleMouseDoubleClick, handleKeyPressUtils } from '../utils';

import { createPortal } from 'react-dom';
import { useAppData, useResizeObserver } from '../hooks';
import { useGridContext } from './Grid/GridContext';
import { useState, useRef, useEffect, useCallback } from 'react';

const Combo = ({ data, value }) => {
  // Check if we're inside a Grid cell
  const gridContext = useGridContext();
  const isInGrid = !!gridContext;
  const parentSize = JSON.parse(localStorage.getItem(extractStringUntilLastPeriod(data?.ID)));

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

  const { socket, handleData, findCurrentData, reRender, inheritedProperties } = useAppData();

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
    // When in Grid, use cellValue from context
    if (isInGrid && gridContext) {
      return gridContext.cellValue || '';
    }
    const index = SelItems?.findIndex((element) => element == 1);
    if (index !== undefined && index !== -1 && Items) {
      return Items[index];
    }
    // No selection - use Text property if set, otherwise first item
    return data?.Properties?.Text || (Items?.[0]) || '';
  };
  const [comboInput, setComboInput] = useState(initialSelected);

  // Update combo input when Grid cellValue changes
  useEffect(() => {
    if (isInGrid && gridContext) {
      setComboInput(gridContext.cellValue || '');
    }
  }, [isInGrid, gridContext?.cellValue]);
  const [position, setPosition] = useState({ top: Posn && Posn[0], left: Posn && Posn[1] });

  const [parentOldDimensions, setParentOldDimensions] = useState(parentSize?.Size);

  // Sync selection from SelItems - skip when in Grid (values come from grid context)
  useEffect(() => {
    if (isInGrid) return;

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

  // Close dropdown on outside click, or when the USER scrolls (the dropdown is
  // portalled and position:fixed, so a page scroll would otherwise leave it
  // floating detached from its trigger — native <select> collapses on scroll).
  useEffect(() => {
    const handleClickOutside = (event) => {
      const inTrigger = dropdownRef.current?.contains(event.target);
      const inPortal = portalRef.current?.contains(event.target);
      if (!inTrigger && !inPortal) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    // Listen for the user's scroll GESTURE (wheel/touch), NOT the generic
    // 'scroll' event. Opening the dropdown programmatically scrolls things —
    // clicking/focusing the trigger nudges its scroll-parent (e.g. a Grid cell
    // scrolls a pixel to reveal it) and scrollIntoView reveals the highlighted
    // option — and a generic 'scroll' listener can't tell those apart from a
    // user scroll, so it slammed the dropdown shut the instant it opened.
    // wheel/touchmove fire only on real user input, so the dropdown survives
    // its own opening while still closing when the user actually scrolls away.
    const handleUserScroll = (event) => {
      // Allow scrolling the dropdown's own (long) list; close on any other scroll.
      if (portalRef.current?.contains(event.target)) return;
      setIsOpen(false);
      setHighlightedIndex(-1);
    };
    if (isOpen) {
      // Use capture phase so we see the event before any stopPropagation
      // in other Combos' bubble-phase handlers — ensures only one is open.
      document.addEventListener('mousedown', handleClickOutside, true);
      // Capture so gestures over ANY ancestor scroll container (form, grid,
      // page) are caught — these events don't usefully bubble to window.
      window.addEventListener('wheel', handleUserScroll, { capture: true, passive: true });
      window.addEventListener('touchmove', handleUserScroll, { capture: true, passive: true });
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
        window.removeEventListener('wheel', handleUserScroll, true);
        window.removeEventListener('touchmove', handleUserScroll, true);
      };
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

    // When in Grid, report change via context callback
    if (isInGrid && gridContext) {
      gridContext.onCellChange(item);
      return;
    }

    // ALWAYS fire Select event, even when reselecting same value
    handleSelectEvent(index);
  }, [handleSelectEvent, isInGrid, gridContext]);

  // Calculate dropdown position (fixed positioning for grid context)
  const getDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return {};

    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 8;
    const itemHeight = 24;
    const contentHeight = Rows
      ? Rows * itemHeight
      : (Items?.length || 1) * itemHeight;

    // Measure against the viewport, not the containing Form: in Browser mode
    // the Form rarely fills the window, so constraining the dropdown to the
    // Form's height needlessly clips it (a combo in a small SubForm or a
    // one-row grid had almost no room). Harmless on Desktop, where the Form
    // fills the window anyway. (#459)
    // Use documentElement.clientHeight (excludes scrollbars) rather than
    // window.innerHeight, so it matches the position:fixed containing block —
    // otherwise a horizontal scrollbar leaves a gap when rendering above.
    const viewportHeight = document.documentElement.clientHeight;
    const spaceBelow = viewportHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;

    // Determine if dropdown should appear above or below
    const showAbove = spaceBelow < contentHeight && spaceAbove > spaceBelow;
    // Cap at the available space only — let the list size to its REAL content.
    // The itemHeight estimate undercounts the rendered row height, so capping
    // maxHeight to contentHeight showed a scrollbar even when every item would
    // fit (e.g. a 2-item "Last/First" combo).
    const maxHeight = showAbove ? spaceAbove : spaceBelow;

      // Always use fixed positioning so the dropdown escapes any
      // ancestor overflow:clip/hidden (e.g. SubForm's overflow:"clip").
    return {
      position: 'fixed',
      top: showAbove ? 'auto' : rect.bottom,
      bottom: showAbove ? (viewportHeight - rect.top) : 'auto',
      left: rect.left,
      width: rect.width,
      maxHeight,
      zIndex: 9999
    };
  }, [Rows, Items]);

  const handleKeyPress = (e) => {
    // In a Grid, a CLOSED combo must not trap horizontal cell navigation:
    // Left/Right have no meaning for the combo itself, so let them bubble to the
    // Grid's keydown handler, which moves CurCell and refocuses the grid (its
    // curCell effect blurs this trigger). Mirrors Edit, which lets boundary
    // Left/Right bubble for the same Excel-style cell movement. Returning before
    // stopPropagation is what frees the event to reach the grid.
    if (isInGrid && !isOpen && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      return;
    }
    e.stopPropagation();
    handleKeyPressUtils(e, socket, Event, data?.ID);

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

  return (
    <div
      style={{
        ...(isInGrid ? {} : styles),
        borderColor: '#ccc',
        display: Visible == 0 ? 'none' : 'block',
        ...(isInGrid ? {
          position: 'relative',
          width: '100%',
          height: '100%',
        } : {
          top: Posn?.[0],
          left: Posn?.[1],
        }),
      }}
      onMouseDown={(e) => {
        // In Grid, let the mousedown bubble to the grid cell so it can move
        // CurCell + fire CellMove; standalone, keep it contained as before.
        if (!isInGrid) e.stopPropagation();
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
            // Size to the button's own content (font height), NOT the wrapper's
            // height. GAMA sends inconsistent combo Size heights (16 vs 24);
            // native ⎕WC ignores them and snaps to a uniform font-based height,
            // so content-sizing the trigger gives the same uniform result.
            height: 'auto',
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
