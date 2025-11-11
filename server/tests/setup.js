// Global test setup
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'mock://localhost:6379';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Increase test timeout for API calls
jest.setTimeout(10000);
