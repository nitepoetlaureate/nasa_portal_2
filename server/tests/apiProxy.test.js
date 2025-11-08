const request = require('supertest');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const apiProxyRouter = require('../routes/apiProxy');

// Load test setup
require('./setup');

// Create test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/nasa', apiProxyRouter);

describe('NASA API Proxy Routes', () => {
  describe('GET /api/nasa/apod', () => {
    it('should return APOD data successfully', async () => {
      const response = await request(app)
        .get('/api/nasa/planetary/apod')
        .query({ api_key: 'DEMO_KEY' })
        .expect(200);

      expect(response.body).toHaveProperty('date');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('explanation');
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('media_type');
    });

    it('should handle missing API key', async () => {
      const response = await request(app)
        .get('/api/nasa/planetary/apod')
        .expect(200);

      // The proxy should automatically add the DEMO_KEY if none provided
      expect(response.body).toHaveProperty('date');
    });

    it('should handle NASA API errors', async () => {
      // Mock NASA API error
      global.mockAxios.get.mockRejectedValueOnce({
        response: { status: 403, data: { error: 'Invalid API key' } }
      });

      const response = await request(app)
        .get('/api/nasa/planetary/apod')
        .query({ api_key: 'INVALID_KEY' })
        .expect(500);

      expect(response.body).toHaveProperty('error');

      // Reset mock for other tests
      global.mockAxios.get.mockRestore();
    });
  });

  describe('GET /api/nasa/neo', () => {
    it('should return NEO data successfully', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-07';

      const response = await request(app)
        .get('/api/nasa/neo/rest/v1/feed')
        .query({
          start_date: startDate,
          end_date: endDate,
          api_key: 'DEMO_KEY'
        })
        .expect(200);

      expect(response.body).toHaveProperty('element_count');
      expect(response.body).toHaveProperty('near_earth_objects');
      expect(response.body.near_earth_objects).toHaveProperty(startDate);
    });

    it('should validate date parameters', async () => {
      const response = await request(app)
        .get('/api/nasa/neo/rest/v1/feed')
        .query({
          start_date: 'invalid-date',
          end_date: '2024-01-07',
          api_key: 'DEMO_KEY'
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing date range', async () => {
      const response = await request(app)
        .get('/api/nasa/neo/rest/v1/feed')
        .query({ api_key: 'DEMO_KEY' })
        .expect(200);

      // The proxy should pass through and NASA API handles missing parameters
      expect(response.body).toHaveProperty('element_count');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit requests after threshold', async () => {
      // Make multiple requests quickly
      const promises = Array(100).fill().map(() =>
        request(app)
          .get('/api/nasa/planetary/apod')
          .query({ api_key: 'DEMO_KEY' })
      );

      const responses = await Promise.all(promises);

      // At least one request should be rate limited
      const rateLimitedResponse = responses.find(res => res.status === 429);
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse.body).toHaveProperty('error');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/nasa/planetary/apod')
        .query({ api_key: 'DEMO_KEY' })
        .expect(200);

      // Check for security headers (these should be set by helmet middleware)
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('CORS Configuration', () => {
    it('should allow requests from authorized origins', async () => {
      const response = await request(app)
        .get('/api/nasa/planetary/apod')
        .set('Origin', 'http://localhost:3000')
        .query({ api_key: 'DEMO_KEY' })
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/nasa/planetary/apod')
        .set('Origin', 'http://malicious-site.com')
        .query({ api_key: 'DEMO_KEY' })
        .expect(403);
    });
  });
});