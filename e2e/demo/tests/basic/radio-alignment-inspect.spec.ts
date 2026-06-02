import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

test.describe('Alignment demo capture', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Alignment', '#F1\\.OUT\\.R1', 10000);
  });

  test('capture screenshot and geometry', async () => {
    // Geometry check: one outside-SF radio and one inside-SF radio
    const geom = await page.evaluate(() => {
      const measure = (id: string) => {
        const container = document.getElementById(id + '.$CONTAINER');
        const input = document.getElementById(id) as HTMLInputElement | null;
        const label = container?.querySelector('label');
        if (!container || !input || !label) return { id, error: 'missing' };
        const c = container.getBoundingClientRect();
        const i = input.getBoundingClientRect();
        const l = label.getBoundingClientRect();
        return {
          id,
          inputCenterY: +(i.top + i.height / 2 - c.top).toFixed(2),
          labelCenterY: +(l.top + l.height / 2 - c.top).toFixed(2),
          deltaY: +((i.top + i.height / 2) - (l.top + l.height / 2)).toFixed(2),
        };
      };
      return [
        measure('F1.OUT.R1'),    // outside, default
        measure('F1.OUT.RL1'),   // outside, Align=Left
        measure('F1.OUT.C1'),    // outside, checkbox default
        measure('F1.OUT.CL1'),   // outside, checkbox Align=Left
        measure('F1.SF.IN.R1'),  // inside SF, default
        measure('F1.SF.IN.RL1'), // inside SF, Align=Left
        measure('F1.SF.IN.C1'),  // inside SF, checkbox default
        measure('F1.SF.IN.CL1'), // inside SF, checkbox Align=Left
      ];
    });
    console.log('ALIGNMENT_GEOMETRY ' + JSON.stringify(geom, null, 2));

    await page.screenshot({ path: 'e2e/demo/tests/_inspect/alignment-demo.png', fullPage: false });
  });
});
