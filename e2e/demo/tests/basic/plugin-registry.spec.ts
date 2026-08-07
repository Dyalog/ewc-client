import { test, expect, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

// The plugin host surface, as published by src/pluginHost.js.
declare global {
  interface Window {
    EWC?: {
      React?: { createElement: unknown; useState: unknown };
      components?: Record<string, { component?: unknown }>;
      registerComponent?: (type: string, entry: unknown) => string;
    };
  }
}

// DemoPluginRegistry (../ewc/demo/DemoPluginRegistry.aplf) registers an EWC
// class the client knows nothing about at build time. PluginBox has no branch in
// SelectComponent and no import anywhere: its React component arrives as a
// JavaScript string over the WebSocket, injected by EWC on first use of the
// class, and registers itself through window.EWC.registerComponent.
//
// The demo deliberately has no external dependency, so this runs everywhere the
// rest of the suite does.
test.describe('DemoPluginRegistry', () => {
  let page: Page;

  const box = () => page.locator('#F1\\.BOX');
  const box2 = () => page.locator('#F1\\.BOX2');
  const status = () => page.locator('#F1\\.STATUS');
  const reject = () => page.locator('#F1\\.REJECT');

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    // Wait on the plugin-rendered box itself: it only exists if injection,
    // registration and rendering all worked.
    page = await navigateToDemo(result.page, 'PluginRegistry', '#F1\\.BOX', 15000);
  });

  test('renders a component that was injected as JavaScript', async () => {
    await expect(box()).toBeVisible();
    await expect(box()).toHaveText('Click me - I am a plugin');
  });

  test('exposes React and registerComponent, and nothing else new', async () => {
    const keys = await page.evaluate(() => Object.keys(window.EWC || {}).sort());
    // React, registerComponent and url are the load-time surface: what a plugin
    // needs before it can define, publish and fetch. Everything render-time
    // arrives on the `ewc` prop instead. ping/pingMS predate plugins;
    // components is the registry itself.
    expect(keys).toEqual([
      'React', 'components', 'ping', 'pingMS', 'registerComponent', 'url',
    ]);
  });

  test('publishes a usable React whose output joins the app\'s tree', async () => {
    // A plugin bundling its own React would break hooks, so window.EWC.React
    // must be the instance the client renders with. The evidence is that
    // elements the plugin built with it were accepted by the app's reconciler
    // and mounted inside the app root.
    const surface = await page.evaluate(() => {
      const R = window.EWC?.React as any;
      return R && typeof R.createElement === 'function' && typeof R.useState === 'function';
    });
    expect(surface).toBe(true);

    expect(await page.evaluate(
      () => !!document.getElementById('root')?.contains(document.getElementById('F1.BOX'))
    )).toBe(true);
  });

  test('records the class in the registry', async () => {
    expect(await page.evaluate(
      () => typeof window.EWC?.components?.PluginBox?.component === 'function'
    )).toBe(true);
  });

  test('positions the component from Posn and Size', async () => {
    // Proves the plugin reached the client's own setStyle through the ewc prop,
    // rather than inventing its own layout.
    const geom = await page.evaluate(() => {
      const el = document.getElementById('F1.BOX')!;
      const s = getComputedStyle(el);
      return { top: s.top, left: s.left, width: s.width, height: s.height };
    });
    expect(geom).toEqual({ top: '60px', left: '10px', width: '440px', height: '55px' });
  });

  test('sends events from the plugin component back to APL', async () => {
    const before = (await status().innerText()).trim();
    await box().click();
    // The APL callback writes the originating ID back into the status label.
    await expect(status()).not.toHaveText(before);
    await expect(status()).toContainText('Select from F1.BOX');
  });

  test('reuses the loaded plugin for further objects of the class', async () => {
    // Injection is once per connection; the second object must render from the
    // registration the first one triggered.
    await expect(box2()).toBeVisible();
    await expect(box2()).toHaveText('and so am I');
  });

  test('reports a failed injection instead of hanging', async () => {
    // The demo deliberately injects an import of a URL that 404s. The client
    // must return the rejection so APL gets an error rather than waiting out
    // the timeout.
    await expect(reject()).toContainText('rc=¯1');
  });
});
