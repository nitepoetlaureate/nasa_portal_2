const request = require('supertest');
const app = require('../../server');

describe('NASA API Integration Tests', () => {
  describe('APOD Endpoint', () => {
    it('should fetch APOD data successfully', async () => {
      const response = await request(app)
        .get('/api/nasa/apod')
        .query({ date: '2024-01-01' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('explanation');
    });

    it('should handle invalid date parameters', async () => {
      const response = await request(app)
        .get('/api/nasa/apod')
        .query({ date: 'invalid-date' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should cache APOD responses', async () => {
      // First request
      const response1 = await request(app).get('/api/nasa/apod');
      expect(response1.status).toBe(200);

      // Second request should be faster (cached)
      const response2 = await request(app).get('/api/nasa/apod');
      expect(response2.status).toBe(200);
      expect(response2.body).toEqual(response1.body);
    });
  });

  describe('NeoWS Endpoint', () => {
    it('should fetch near-earth objects', async () => {
      const response = await request(app)
        .get('/api/nasa/neows')
        .query({ start_date: '2024-01-01', end_date: '2024-01-07' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('near_earth_objects');
      expect(Array.isArray(response.body.near_earth_objects)).toBe(true);
    });

    it('should validate date range parameters', async () => {
      const response = await request(app)
        .get('/api/nasa/neows')
        .query({ start_date: '2024-01-07', end_date: '2024-01-01' }); // Invalid range

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    it('should handle NASA API errors gracefully', async () => {
      // Mock a NASA API failure
      process.env.NASA_API_KEY = 'invalid-key';
      
      const response = await request(app).get('/api/nasa/apod');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
      
      // Reset API key
      delete process.env.NASA_API_KEY;
    });
  });
});
