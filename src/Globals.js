// TODO HACK
// This is a stopgap solution to handle situations where localStorage has been
// abused in the past for global state. It results in eg different tabs sharing
// the same state.
// We also choose not to use sessionStorage as that will still survive a page
// refresh. A browser refresh should remove all state.
// The TODO is to find a better way for sharing state - for now, this is a way
// of fixing all uses localStorage everywhere.
// Always import it as follows, so that it can be easily grepped for:
//   import * as Globals from "./Globals";

const defaults = () => {
  return {
    fontScale: 1,
  }
}

let globals = defaults()

export function get(k)    { return globals[k] }
export function set(k, v) { const prev = globals[k]; globals[k] = v; return prev }
export function reset()   { globals = defaults() }
