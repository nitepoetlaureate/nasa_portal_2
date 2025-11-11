module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!tests/**',
    '!**/*.config.js',
    '!db/migrations/**',
    '!scripts/**',
    '!enhanced-apis/**',
    '!services/**',
    '!websocket/**'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js',
    '!**/analytics.test.js',
    '!**/enhanced-*.test.js',
    '!**/security*.test.js',
    '!**/gdpr*.test.js'
  ],
  moduleFileExtensions: ['js', 'json'],
  moduleNameMapper: {
    '^redis$': '<rootDir>/tests/__mocks__/redis.js'
  },
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 10000
};
