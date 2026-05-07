import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

test.describe('DemoButtons', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;

    // Navigate to Buttons demo - this returns a NEW page since demos open in new windows
    page = await navigateToDemo(result.page, 'Buttons', 'input[type="radio"]', 10000);
  });

  test.beforeEach(async () => {
    // Small delay before each test to let EWC server settle
    await new Promise(r => setTimeout(r, 100));
  });

  test('shows radio buttons', async () => {
    const radioButtons = page.locator('input[type="radio"]');
    await expect(radioButtons.first()).toBeVisible({ timeout: 5000 });
  });

  test('has fruit radio buttons', async () => {
    // Fruit names appear as text next to radio buttons
    const apple = page.locator('text=Apple').first();
    const banana = page.locator('text=Banana').first();
    const pear = page.locator('text=Pear').first();

    await expect(apple).toBeVisible();
    await expect(banana).toBeVisible();
    await expect(pear).toBeVisible();
  });

  test('can select fruit radio buttons and status updates', async () => {
    const statusLabel = page.locator('#F1\\.STATUS');

    // Click on Apple radio button
    const appleRadio = page.locator('input[type="radio"]').first();
    await appleRadio.click();
    await expect(appleRadio).toBeChecked();
    await expect(statusLabel).toHaveText('You selected Apple');

    // Click on Banana
    const bananaRadio = page.locator('input[type="radio"]').nth(1);
    await bananaRadio.click();
    await expect(bananaRadio).toBeChecked();
    await expect(appleRadio).not.toBeChecked();
    await expect(statusLabel).toHaveText('You selected Banana');

    // Click on Pear
    const pearRadio = page.locator('input[type="radio"]').nth(2);
    await pearRadio.click();
    await expect(pearRadio).toBeChecked();
    await expect(statusLabel).toHaveText('You selected Pear');
  });

  test('has checkboxes for Ice Cream and Chocolate', async () => {
    const iceCream = page.locator('text=Ice Cream');
    const chocolate = page.locator('text=Chocolate');

    await expect(iceCream).toBeVisible();
    await expect(chocolate).toBeVisible();
  });

  test('can toggle checkboxes', async () => {
    const checkboxes = page.locator('input[type="checkbox"]');
    const firstCheckbox = checkboxes.first();

    // Get initial state
    const wasChecked = await firstCheckbox.isChecked();

    // Toggle
    await firstCheckbox.click();
    await expect(firstCheckbox).toBeChecked({ checked: !wasChecked });

    // Toggle back
    await firstCheckbox.click();
    await expect(firstCheckbox).toBeChecked({ checked: wasChecked });
  });

  test('visual regression - buttons demo', async () => {
    // Reset to known state: select Apple
    const appleRadio = page.locator('input[type="radio"]').first();
    await appleRadio.click();
    await expect(appleRadio).toBeChecked();

    await expect(page).toHaveScreenshot('buttons-demo.png');
  });
});
