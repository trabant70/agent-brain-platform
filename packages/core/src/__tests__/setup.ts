// Global test setup for Jest
import { jest } from '@jest/globals';

// Increase test timeout for integration tests
jest?.setTimeout(30000);

// Mock console methods to reduce noise during tests
global?.beforeEach(() => {
  // Keep console?.error for important test failures
  // jest?.spyOn(console, 'log').mockImplementation(() => {});
  // jest?.spyOn(console, 'warn').mockImplementation(() => {});
});

global?.afterEach(() => {
  // Clean up any remaining timers
  jest?.clearAllTimers();
  jest?.restoreAllMocks();
});

// Handle unhandled promise rejections in tests
process?.on('unhandledRejection', (reason) => {
  console?.error('Unhandled Rejection in test:', reason);
});

// Clean exit for tests
process?.on('SIGINT', () => {
  process?.exit(0);
});

export {};