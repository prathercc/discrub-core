/**
 * Test Utilities - Helper functions for tests
 *
 * This file contains reusable helper functions and utilities for testing.
 */

import { vi } from 'vitest';

/**
 * Creates a mock fetch function with configurable responses
 */
export function createMockFetch(responses: Response[]) {
  let callCount = 0;
  return vi.fn(() => {
    const response = responses[callCount] || responses[responses.length - 1];
    callCount++;
    return Promise.resolve(response);
  });
}

/**
 * Creates a mock fetch function that resolves with data
 */
export function mockFetchSuccess<T>(data: T): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => data,
    headers: new Headers(),
  } as Response);
}

/**
 * Creates a mock fetch function that rejects with an error
 */
export function mockFetchError(status: number, message: string): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: message,
    json: async () => ({ message }),
    headers: new Headers(),
  } as Response);
}

/**
 * Creates a mock fetch function that simulates rate limiting
 */
export function mockFetchRateLimit(retryAfter: number = 1): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: false,
    status: 429,
    statusText: 'Too Many Requests',
    headers: new Headers({ 'retry-after': retryAfter.toString() }),
    json: async () => ({ message: 'Rate limited', retry_after: retryAfter }),
  } as Response);
}

/**
 * Waits for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs assertions within a time limit
 */
export async function expectWithinTime(
  fn: () => void | Promise<void>,
  maxMs: number
): Promise<void> {
  const start = performance.now();
  await fn();
  const duration = performance.now() - start;

  if (duration > maxMs) {
    throw new Error(`Expected to complete within ${maxMs}ms but took ${duration}ms`);
  }
}

/**
 * Checks if a value is within a range
 */
export function expectInRange(value: number, min: number, max: number): void {
  if (value < min || value > max) {
    throw new Error(`Expected ${value} to be between ${min} and ${max}`);
  }
}

/**
 * Creates a spy on global fetch
 */
export function spyOnFetch() {
  return vi.spyOn(global, 'fetch');
}

/**
 * Restores all mocks
 */
export function restoreAllMocks() {
  vi.restoreAllMocks();
}

/**
 * Clears all mocks
 */
export function clearAllMocks() {
  vi.clearAllMocks();
}

/**
 * Mock console methods to suppress output during tests
 */
export function mockConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  return originalConsole;
}

/**
 * Creates a mock implementation of performance.now() for deterministic timing
 */
export function mockPerformanceNow(startTime: number = 0) {
  let currentTime = startTime;

  return {
    now: vi.fn(() => currentTime),
    advance: (ms: number) => {
      currentTime += ms;
    },
    reset: () => {
      currentTime = startTime;
    },
  };
}

/**
 * Creates a mock Date for deterministic date/time testing
 */
export function mockDate(dateString: string) {
  const mockDate = new Date(dateString);
  const originalDate = Date;

  beforeEach(() => {
    vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  return { mockDate, originalDate };
}

/**
 * Asserts that a function throws with a specific message
 */
export async function expectToThrowAsync(
  fn: () => Promise<any>,
  expectedMessage?: string
): Promise<void> {
  let error: Error | undefined;

  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }

  if (!error) {
    throw new Error('Expected function to throw but it did not');
  }

  if (expectedMessage && !error.message.includes(expectedMessage)) {
    throw new Error(
      `Expected error message to include "${expectedMessage}" but got "${error.message}"`
    );
  }
}

/**
 * Type guard helper for testing
 */
export function isType<T>(value: unknown, validator: (v: any) => v is T): value is T {
  return validator(value);
}

/**
 * Creates a deep clone of an object (useful for test data)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generates a random string for testing
 */
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Generates a random Discord snowflake ID
 */
export function randomSnowflake(): string {
  return (BigInt(Date.now() - 1420070400000) << BigInt(22)).toString();
}
