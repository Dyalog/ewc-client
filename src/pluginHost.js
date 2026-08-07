/**
 * The surface a server-injected plugin can reach.
 *
 * Plugin JS arrives through the EvalJS WX method (App.jsx), which uses indirect
 * eval and so runs in global scope - it can see no module binding of ours. The
 * split between what lives on `window` and what does not follows from that:
 *
 *   Load time  - the bundle is evaluated globally and must be able to *define*
 *                React components. It needs React (plugin components must share
 *                this app's instance or their hooks break) and somewhere to put
 *                the result. Those two have no other route in, so they are the
 *                only globals.
 *   Render time - hooks, utils, rendering children. By then the component is
 *                inside React and is simply handed `ewc`, built by
 *                pluginContext() and passed as a prop.
 *
 * A registered component is called as ({ data, location, ewc }).
 */
import React from 'react';

import * as utils from './utils';
import hasEventCallback from './utils/hasEventCallback';
import wgResponse from './utils/wgResponse';
import { getBorderStyles } from './styles/edgeStyles';
import { useAttachStyle, useResizeObserver, useWindowDimensions } from './hooks';

if (!window.EWC) window.EWC = {};

const components = Object.create(null);

/**
 * Register a component for an EWC class. `entry` is either the component
 * itself or an object mirroring the static-method convention core components
 * already use (Upload.Defaults, Upload.WG, StatusField.WS):
 *
 *   { component, Defaults?, WG?, WS?, defaultProperties? }
 *
 * No re-render is triggered. EWC injects a plugin from within ⎕WC, before the
 * WC message is sent, and the client holds every later frame until the
 * injection resolves - so registration always precedes the first WC of the
 * type. A plugin that needs to repaint later can call ewc.handleData().
 */
const registerComponent = (type, entry) => {
  if (typeof type !== 'string' || !type) {
    throw new Error('EWC.registerComponent: type must be a non-empty string');
  }
  const resolved = typeof entry === 'function' ? { component: entry } : entry;
  if (typeof resolved?.component !== 'function') {
    throw new Error(`EWC.registerComponent("${type}"): entry needs a component`);
  }
  components[type] = resolved;
  return type;
};

window.EWC.React = React;
window.EWC.components = components;
window.EWC.registerComponent = registerComponent;

export const pluginEntry = (type) => (type ? components[type] : undefined);

const pluginUtils = {
  setStyle: utils.setStyle,
  parseFlexStyles: utils.parseFlexStyles,
  getFontStyles: utils.getFontStyles,
  getAttachStyle: utils.getAttachStyle,
  getImageStyles: utils.getImageStyles,
  excludeKeys: utils.excludeKeys,
  parentId: utils.parentId,
  rgbColor: utils.rgbColor,
  getBorderStyles,
  hasEventCallback,
  wgResponse,
  handleMouseDown: utils.handleMouseDown,
  handleMouseUp: utils.handleMouseUp,
  handleMouseDoubleClick: utils.handleMouseDoubleClick,
  handleMouseEnter: utils.handleMouseEnter,
  handleMouseLeave: utils.handleMouseLeave,
  handleMouseMove: utils.handleMouseMove,
  handleMouseWheel: utils.handleMouseWheel,
  handleKeyPressUtils: utils.handleKeyPressUtils,
};

const pluginHooks = { useAttachStyle, useResizeObserver, useWindowDimensions };

/**
 * SelectComponent is passed in rather than imported, so that it can reach a
 * plugin's children without this module depending on the component tree.
 */
export const pluginContext = (appData, SelectComponent) => ({
  ...appData,
  utils: pluginUtils,
  hooks: pluginHooks,
  SelectComponent,
});
