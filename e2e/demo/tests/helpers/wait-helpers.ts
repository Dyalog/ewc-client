import { expect, Page } from '@playwright/test';

type ElementState = 'visible' | 'hidden' | 'attached' | 'detached';

// Wait for an element to contain specific text (inspired by Dyalog's WaitFor pattern)
export async function waitForText(
  page: Page,
  selector: string,
  expectedText: string,
  timeout: number = 5000
): Promise<void> {
  const locator = page.locator(selector);
  await expect(locator).toContainText(expectedText, { timeout });
}

// Wait for an element to be in a specific state
export async function waitForElement(
  page: Page,
  selector: string,
  state: ElementState = 'visible',
  timeout: number = 5000
): Promise<void> {
  const locator = page.locator(selector);

  switch (state) {
    case 'visible':
      await expect(locator).toBeVisible({ timeout });
      break;
    case 'hidden':
      await expect(locator).toBeHidden({ timeout });
      break;
    case 'attached':
      await expect(locator).toBeAttached({ timeout });
      break;
    case 'detached':
      await expect(locator).not.toBeAttached({ timeout });
      break;
    default:
      throw new Error(`Unknown state: ${state}`);
  }
}

// Wait for an element property to change to a specific value (useful for WebSocket updates)
export async function waitForPropertyChange(
  page: Page,
  selector: string,
  property: string,
  expectedValue: string,
  timeout: number = 5000
): Promise<void> {
  await page.waitForFunction(
    ({ sel, prop, val }) => {
      const element = document.querySelector(sel);
      return element && (element as any)[prop] === val;
    },
    { sel: selector, prop: property, val: expectedValue },
    { timeout }
  );
}

// Wait for a checkbox or radio button to be checked
export async function waitForChecked(
  page: Page,
  selector: string,
  checked: boolean = true,
  timeout: number = 5000
): Promise<void> {
  const locator = page.locator(selector);
  if (checked) {
    await expect(locator).toBeChecked({ timeout });
  } else {
    await expect(locator).not.toBeChecked({ timeout });
  }
}

// Wait for an element attribute to have a specific value
export async function waitForAttribute(
  page: Page,
  selector: string,
  attribute: string,
  value: string | RegExp,
  timeout: number = 5000
): Promise<void> {
  const locator = page.locator(selector);
  await expect(locator).toHaveAttribute(attribute, value, { timeout });
}

// Wait for network idle (no network requests for specified duration)
export async function waitForNetworkIdle(page: Page, duration: number = 500): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: duration + 5000 });
}

// Smart wait that combines multiple conditions (visible AND contains text)
export async function waitForVisibleText(
  page: Page,
  selector: string,
  expectedText: string,
  timeout: number = 5000
): Promise<void> {
  const locator = page.locator(selector);
  await expect(locator).toBeVisible({ timeout });
  await expect(locator).toContainText(expectedText, { timeout });
}
