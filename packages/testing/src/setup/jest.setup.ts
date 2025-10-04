/**
 * Jest Setup Configuration
 * Global test environment setup and utilities
 */

import 'jest-extended';

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDate(): R;
      toBeValidGitHash(): R;
      toBeValidEventData(): R;
      toMatchTimelineStructure(): R;
    }
  }
}

// Custom Jest matchers for domain-specific assertions
expect.extend({
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    return {
      message: () => `expected ${received} to be a valid Date object`,
      pass
    };
  },

  toBeValidGitHash(received: any) {
    const pass = typeof received === 'string' && /^[a-f0-9]{40}$/i.test(received);
    return {
      message: () => `expected ${received} to be a valid Git hash (40 character hex string)`,
      pass
    };
  },

  toBeValidEventData(received: any) {
    const requiredFields = ['id', 'providerId', 'type', 'timestamp', 'author', 'title'];
    const hasRequiredFields = requiredFields.every(field => field in received);
    const hasValidTimestamp = received.timestamp instanceof Date ||
                             typeof received.timestamp === 'string';
    const hasValidAuthor = received.author && (typeof received.author === 'object' || typeof received.author === 'string');

    const pass = hasRequiredFields && hasValidTimestamp && hasValidAuthor;
    return {
      message: () => `expected ${JSON.stringify(received)} to be valid event data with required fields: ${requiredFields.join(', ')}`,
      pass
    };
  },

  toMatchTimelineStructure(received: any) {
    const hasEvents = Array.isArray(received.events);
    const hasStats = typeof received.stats === 'object';
    const hasMetadata = typeof received.metadata === 'object';

    const pass = hasEvents && hasStats && hasMetadata;
    return {
      message: () => `expected object to have timeline structure with events[], stats{}, and metadata{}`,
      pass
    };
  }
});

// Global test configuration
beforeEach(() => {
  // Clear all timers
  jest.clearAllTimers();

  // Clear console spies
  jest.clearAllMocks();

  // Reset module registry
  jest.resetModules();
});

afterEach(() => {
  // Clean up any remaining timers
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Fail the test if there's an unhandled rejection
  throw reason;
});

// Increase timeout for slower tests
jest.setTimeout(30000);

// Mock performance API for Node.js environment
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn()
} as any;

// Mock console methods for testing
const originalConsole = { ...console };
beforeAll(() => {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn()
  };
});

afterAll(() => {
  global.console = originalConsole;
});

export {};