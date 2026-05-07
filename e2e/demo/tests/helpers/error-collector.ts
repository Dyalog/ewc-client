// Error Collector - Accumulate multiple test failures before asserting
// Inspired by Dyalog's error accumulation pattern
//
// Usage:
//   const errors = createErrorCollector();
//   errors.check(await isVisible('#element'), 'Element should be visible');
//   errors.check(await hasText('expected'), 'Should have expected text');
//   await errors.assertAll(); // Throws if any checks failed

interface SoftAssert {
  equal(actual: any, expected: any, message?: string): boolean;
  truthy(value: any, message?: string): boolean;
  falsy(value: any, message?: string): boolean;
  contains(actual: string, expected: string, message?: string): boolean;
  check(condition: boolean, message: string): boolean;
}

interface ErrorCollector {
  collect(message: string): void;
  check(condition: boolean, message: string): boolean;
  hasErrors(): boolean;
  getErrorCount(): number;
  getErrors(): string[];
  clear(): void;
  assertAll(): Promise<void>;
  formatErrors(): string;
  createSoftAssert(): SoftAssert;
}

export function createErrorCollector(): ErrorCollector {
  const errors: string[] = [];

  // Add an error message to the collection
  function collect(message: string): void {
    errors.push(message);
  }

  // Check a condition and collect error if false
  function check(condition: boolean, message: string): boolean {
    if (!condition) {
      collect(message);
    }
    return condition;
  }

  // Check if an error has occurred (but don't throw yet)
  function hasErrors(): boolean {
    return errors.length > 0;
  }

  // Get the count of collected errors
  function getErrorCount(): number {
    return errors.length;
  }

  // Get all collected error messages
  function getErrors(): string[] {
    return [...errors];
  }

  // Clear all collected errors
  function clear(): void {
    errors.length = 0;
  }

  // Assert that no errors were collected (throws if any checks failed)
  async function assertAll(): Promise<void> {
    if (errors.length > 0) {
      const errorMessage = formatErrors();
      throw new Error(errorMessage);
    }
  }

  // Format all errors into a single message
  function formatErrors(): string {
    if (errors.length === 0) {
      return '';
    }

    if (errors.length === 1) {
      return errors[0];
    }

    return `Multiple errors occurred (${errors.length}):\n` +
      errors.map((error, index) => `  ${index + 1}. ${error}`).join('\n');
  }

  // Create a soft assertion helper that collects errors instead of throwing
  function createSoftAssert(): SoftAssert {
    return {
      equal(actual: any, expected: any, message?: string): boolean {
        const passed = actual === expected;
        if (!passed) {
          const msg = message || `Expected ${actual} to equal ${expected}`;
          collect(msg);
        }
        return passed;
      },

      truthy(value: any, message?: string): boolean {
        const passed = !!value;
        if (!passed) {
          const msg = message || `Expected ${value} to be truthy`;
          collect(msg);
        }
        return passed;
      },

      falsy(value: any, message?: string): boolean {
        const passed = !value;
        if (!passed) {
          const msg = message || `Expected ${value} to be falsy`;
          collect(msg);
        }
        return passed;
      },

      contains(actual: string, expected: string, message?: string): boolean {
        const passed = !!(actual && actual.includes(expected));
        if (!passed) {
          const msg = message || `Expected "${actual}" to contain "${expected}"`;
          collect(msg);
        }
        return passed;
      },

      check(condition: boolean, message: string): boolean {
        if (!condition) {
          collect(message);
        }
        return condition;
      },
    };
  }

  return {
    collect,
    check,
    hasErrors,
    getErrorCount,
    getErrors,
    clear,
    assertAll,
    formatErrors,
    createSoftAssert,
  };
}
