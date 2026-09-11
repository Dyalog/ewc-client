import React from 'react';

import * as utils from './utils';
import hasEventCallback from './utils/hasEventCallback';
import wgResponse from './utils/wgResponse';
import { getBorderStyles } from './styles/edgeStyles';
import { useAttachStyle, useResizeObserver, useWindowDimensions } from './hooks';

if (!window.EWC) window.EWC = {};

const components = Object.create(null);

// Bit of a dance, but all we want is the component in the components object
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

const url = (path) => new URL(path, utils.getCurrentUrl()).href;

window.EWC.React = React;
window.EWC.components = components;
window.EWC.registerComponent = registerComponent;
window.EWC.url = url;

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
