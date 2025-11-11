module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!tests/**',
    '!**/*.config.js',
    '!db/migrations/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  moduleFileExtensions: ['js', 'json'],
  moduleNameMapper: {
    '^redis$': '<rootDir>/tests/__mocks__/redis.js'
  },
  clearMocks: true,
  restoreMocks: true
};
