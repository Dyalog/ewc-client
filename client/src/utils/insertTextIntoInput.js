// Programmatically type into a React-controlled <input>.
//
// Used by the ⎕NQ KeyPress path: a synthetic KeyboardEvent is untrusted, so the
// browser never performs its default action and no text is inserted. Assigning
// el.value directly does not work either — React tracks the last value it wrote
// on the node and would swallow the resulting change event. Going through the
// prototype's value setter defeats that tracker, so the bubbling 'input' event
// reaches React's onChange and component state stays in step with the DOM.
export const insertTextIntoInput = (el, text) => {
  if (!el || !text) return;

  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setValue = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (!setValue) return;

  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const caret = start + text.length;

  setValue.call(el, el.value.slice(0, start) + text + el.value.slice(end));
  el.dispatchEvent(new Event("input", { bubbles: true }));
  // After React re-renders the caret sits at the end of the new value, so put
  // it back where the insertion finished.
  if (el.type !== "date") el.setSelectionRange(caret, caret);
};
