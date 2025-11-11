// Mock Redis client for testing
class MockRedisClient {
  constructor() {
    this.store = new Map();
    this.isConnected = true;
  }

  async connect() {
    this.isConnected = true;
    return Promise.resolve();
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async set(key, value, options) {
    this.store.set(key, value);
    return Promise.resolve('OK');
  }

  async del(key) {
    return this.store.delete(key) ? 1 : 0;
  }

  async disconnect() {
    this.isConnected = false;
    return Promise.resolve();
  }

  on() {
    return this;
  }
}

module.exports = {
  createClient: () => new MockRedisClient()
};
