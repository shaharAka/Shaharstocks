/**
 * Test utilities and helpers
 * Provides common functions for writing tests
 */

import { vi } from 'vitest';

/**
 * Create a mock logger for testing
 */
export function createMockLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => createMockLogger()),
  };
}

/**
 * Create a mock storage interface for testing
 */
export function createMockStorage() {
  return {
    getUser: vi.fn(),
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    getStocks: vi.fn(),
    getStock: vi.fn(),
    createStock: vi.fn(),
    updateStock: vi.fn(),
    deleteStock: vi.fn(),
    // Add more methods as needed for specific tests
  };
}

/**
 * Wait for a specified amount of time (useful for testing async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock request object for Express route testing
 */
export function createMockRequest(overrides: any = {}) {
  return {
    body: {},
    params: {},
    query: {},
    session: {},
    headers: {},
    ip: '127.0.0.1',
    ...overrides,
  };
}

/**
 * Create a mock response object for Express route testing
 */
export function createMockResponse() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    getHeader: vi.fn(),
  };
  return res;
}

/**
 * Create a mock next function for Express middleware testing
 */
export function createMockNext() {
  return vi.fn();
}

/**
 * Helper to reset all mocks in a mock object
 */
export function resetMock(mock: any) {
  Object.values(mock).forEach((value: any) => {
    if (typeof value === 'function' && 'mockReset' in value) {
      value.mockReset();
    }
  });
}

