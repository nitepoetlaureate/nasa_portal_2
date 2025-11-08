// NASA System 7 Portal Server Test Helper
// Provides isolated test environment with proper mocking

const express = require('express');
const request = require('supertest');

// Mock external dependencies before importing server modules
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue(),
    end: jest.fn().mockResolvedValue(),
  })),
}));

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    flushall: jest.fn().mockResolvedValue('OK'),
    quit: jest.fn().mockResolvedValue(),
    connect: jest.fn().mockResolvedValue(),
  })),
}));

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(function() {
    return this;
  }),
}));

// Mock NASA API responses
const mockNasaResponses = {
  apod: {
    date: '2024-01-01',
    title: 'Test APOD',
    explanation: 'Test explanation for Astronomy Picture of the Day',
    url: 'https://apod.nasa.gov/apod/image/2401/test.jpg',
    hdurl: 'https://apod.nasa.gov/apod/image/2401/test_hd.jpg',
    media_type: 'image',
    service_version: 'v1',
    copyright: 'Test Copyright',
  },
  neo: {
    links: { next: null, prev: null, self: 'http://api.nasa.gov/neo/rest/v1/feed' },
    element_count: 2,
    near_earth_objects: {
      '2024-01-01': [
        {
          id: '12345',
          neo_reference_id: '12345',
          name: '(12345) Test Asteroid',
          name_limited: '(12345) Test Asteroid',
          designation: '12345',
          nasa_jpl_url: 'http://ssd.jpl.nasa.gov/sbdb.cgi?sstr=12345',
          absolute_magnitude_h: 20.5,
          estimated_diameter: {
            kilometers: { estimated_diameter_min: 0.1, estimated_diameter_max: 0.2 },
            meters: { estimated_diameter_min: 100, estimated_diameter_max: 200 },
            miles: { estimated_diameter_min: 0.06, estimated_diameter_max: 0.12 },
            feet: { estimated_diameter_min: 328, estimated_diameter_max: 656 },
          },
          is_potentially_hazardous_asteroid: false,
          close_approach_data: [
            {
              close_approach_date: '2024-01-01',
              close_approach_date_full: '2024-Jan-01 00:00',
              epoch_date_close_approach: 1704067200000,
              relative_velocity: { kilometers_per_second: '10.5', kilometers_per_hour: '37800' },
              miss_distance: { kilometers: '1000000', lunar: '2.6', miles: '621371' },
              orbiting_body: 'Earth',
            },
          ],
          is_sentry_object: false,
        },
      ],
    },
  },
  resource: {
    title: 'Test Resource',
    description: 'Test resource description',
    media_type: 'image',
    media_url: 'https://images-assets.nasa.gov/test/test.jpg',
    location: 'NASA Headquarters',
    keywords: ['test', 'nasa', 'space'],
    date_created: '2024-01-01T00:00:00Z',
  },
};

// Create isolated test app
function createTestApp() {
  const app = express();

  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3002';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/nasa_system7_test';
  process.env.NASA_API_KEY = 'DEMO_KEY';
  process.env.LOG_LEVEL = 'error';
  process.env.ENABLE_FALLBACK_MODE = 'true';

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mock routes for testing
  app.get('/', (req, res) => {
    res.send('NASA System 7 Portal Backend is running.');
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', services: { database: 'connected', cache: 'connected' } });
  });

  // Mock NASA API proxy routes
  app.get('/planetary/apod', async (req, res) => {
    try {
      const axios = require('axios');
      axios.get.mockResolvedValue({ data: mockNasaResponses.apod });
      res.json(mockNasaResponses.apod);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch APOD data' });
    }
  });

  app.get('/neo/rest/v1/feed', async (req, res) => {
    try {
      const axios = require('axios');
      axios.get.mockResolvedValue({ data: mockNasaResponses.neo });
      res.json(mockNasaResponses.neo);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch NEO data' });
    }
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // Error handler
  app.use((err, req, res, next) => {
    // Handle JSON parsing errors specifically
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Malformed JSON' });
    }

    console.error('Test app error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}

// Test helper functions
const testHelpers = {
  // Create mock NASA API response
  createNasaMockResponse: (endpoint, data = null) => {
    const response = data || mockNasaResponses[endpoint] || {};
    return { data: response, status: 200 };
  },

  // Create mock database response
  createDbMockResponse: (rows = [], rowCount = rows.length) => ({
    rows,
    rowCount,
  }),

  // Test helper for NASA API errors
  createNasaErrorResponse: (status = 500, message = 'NASA API Error') => ({
    response: { status, data: { error: message } },
  }),

  // Helper to wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to create mock request with auth
  createAuthenticatedRequest: (app, token = 'test-token') => {
    return request(app).set('Authorization', `Bearer ${token}`);
  },
};

// Global test setup
beforeAll(async () => {
  // Suppress console output during tests
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Cleanup after all tests
afterAll(async () => {
  jest.restoreAllMocks();
});

module.exports = {
  createTestApp,
  mockNasaResponses,
  testHelpers,
};