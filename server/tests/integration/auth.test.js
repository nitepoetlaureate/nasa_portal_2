const request = require('supertest');
const app = require('../../server');

describe('Authentication Integration Tests', () => {
  describe('Session Management', () => {
    it('should create session on login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testpass123'
        });

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('set-cookie');
    });

    it('should protect authenticated routes', async () => {
      const response = await request(app)
        .get('/api/user/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const requests = [];
      
      // Send multiple rapid login requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({ username: `user${i}`, password: 'wrong' })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
