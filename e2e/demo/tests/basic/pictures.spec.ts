import { test, expect, Browser, Page } from '@playwright/test';
import { connectAndFindEWCPage } from '../helpers/cdp-helper';
import { navigateToDemo } from '../helpers/navigation';

const CDP_PORT = parseInt(process.env.CDP_PORT || '8080', 10);

test.describe('DemoPictures', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    const result = await connectAndFindEWCPage(CDP_PORT);
    browser = result.browser;
    page = await navigateToDemo(result.page, 'Pictures', '#F1', 10000);
  });

  test.beforeEach(async () => {
    // Small delay before each test to let EWC server settle
    await new Promise(r => setTimeout(r, 100));
  });

  test('displays tiled picture subform', async () => {
    const tiledSubform = page.locator('#F1\\.TILE');
    await expect(tiledSubform).toBeVisible();

    const tiledLabel = page.locator('#F1\\.TILE\\.L');
    await expect(tiledLabel).toContainText('Tiled');
  });

  test('displays scaled picture subform', async () => {
    const scaledSubform = page.locator('#F1\\.SCALED');
    await expect(scaledSubform).toBeVisible();

    const scaledLabel = page.locator('#F1\\.SCALED\\.L');
    await expect(scaledLabel).toContainText('Scaled');
  });

  test('displays centered picture subform', async () => {
    const centeredSubform = page.locator('#F1\\.CENTER');
    await expect(centeredSubform).toBeVisible();

    const centeredLabel = page.locator('#F1\\.CENTER\\.L');
    await expect(centeredLabel).toContainText('Centered');
  });

  test('has clickable yes/no buttons with pictures', async () => {
    const yesButton = page.locator('#F1\\.YES');
    const noButton = page.locator('#F1\\.NO');

    await expect(yesButton).toBeVisible();
    await expect(noButton).toBeVisible();

    // Buttons should be clickable (no error thrown)
    await yesButton.click();
    await noButton.click();
  });

  test('has group with icon', async () => {
    const group = page.locator('#F1\\.GRP');
    await expect(group).toBeVisible();
  });

  test('displays flag images', async () => {
    const flags = page.locator('#F1\\.FLAGS');
    await expect(flags).toBeVisible();
  });

  test('visual regression - pictures demo', async () => {
    await expect(page).toHaveScreenshot('pictures-demo.png');
  });
});
