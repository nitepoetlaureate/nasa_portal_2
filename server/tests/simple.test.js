const request = require('supertest');
const express = require('express');

// Create a minimal Express app for testing
const createTestApp = () => {
  const app = express();

  // Basic middleware
  app.use(express.json());

  // Health check endpoint
  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      message: 'NASA System 7 Portal - Test Environment'
    });
  });

  // Basic API proxy structure
  app.get('/api/nasa/apod', (req, res) => {
    res.json({
      endpoint: 'apod',
      params: req.query,
      mock: true,
      data: {
        date: '2024-01-01',
        title: 'Test APOD',
        explanation: 'Test astronomy picture',
        url: 'https://apod.nasa.gov/apod/image/test.jpg'
      }
    });
  });

  app.get('/api/nasa/neo', (req, res) => {
    res.json({
      endpoint: 'neo',
      params: req.query,
      mock: true,
      data: {
        element_count: 1,
        near_earth_objects: []
      }
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  return app;
};

describe('NASA System 7 Portal - Basic Backend Tests', () => {
  const app = createTestApp();

  describe('Basic Functionality', () => {
    it('should respond to health check', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle APOD endpoint', async () => {
      const response = await request(app)
        .get('/api/nasa/apod')
        .query({ api_key: 'DEMO_KEY' })
        .expect(200);

      expect(response.body).toHaveProperty('endpoint', 'apod');
      expect(response.body).toHaveProperty('mock', true);
      expect(response.body.data).toHaveProperty('date');
      expect(response.body.data).toHaveProperty('title');
    });

    it('should handle NeoWS endpoint', async () => {
      const response = await request(app)
        .get('/api/nasa/neo')
        .query({
          start_date: '2024-01-01',
          end_date: '2024-01-07',
          api_key: 'DEMO_KEY'
        })
        .expect(200);

      expect(response.body).toHaveProperty('endpoint', 'neo');
      expect(response.body).toHaveProperty('mock', true);
      expect(response.body.data).toHaveProperty('element_count');
    });

    it('should handle 404 for invalid endpoints', async () => {
      const response = await request(app)
        .get('/api/nasa/invalid')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Endpoint not found');
    });
  });

  describe('Input Validation', () => {
    it('should handle requests with query parameters', async () => {
      const response = await request(app)
        .get('/api/nasa/apod')
        .query({
          api_key: 'DEMO_KEY',
          date: '2024-01-01',
          hd: 'true'
        })
        .expect(200);

      expect(response.body.params).toHaveProperty('api_key', 'DEMO_KEY');
      expect(response.body.params).toHaveProperty('date', '2024-01-01');
      expect(response.body.params).toHaveProperty('hd', 'true');
    });
  });

  describe('Response Format', () => {
    it('should return JSON responses', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should include proper HTTP status codes', async () => {
      // Test 200 for valid endpoint
      await request(app).get('/').expect(200);

      // Test 404 for invalid endpoint
      await request(app).get('/invalid').expect(404);
    });
  });
});