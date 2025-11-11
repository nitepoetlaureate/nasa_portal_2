const express = require('express');
const request = require('supertest');

// Create a test app with minimal setup
function createTestApp() {
  const app = express();
  app.use(express.json());
  
  // Add basic routes for testing
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  return app;
}

// Test helpers
const testHelpers = {
  async makeRequest(app, method, path, data = null) {
    const req = request(app)[method.toLowerCase()](path);
    if (data) {
      req.send(data);
    }
    return req;
  }
};

module.exports = {
  createTestApp,
  testHelpers,
  request
};
