const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

class WebSocketTest {
  constructor(serverUrl = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
    this.connections = [];
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  generateTestToken() {
    return jwt.sign(
      {
        id: `test_user_${Date.now()}`,
        email: 'test@example.com',
        role: 'user'
      },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
  }

  async runTests() {
    console.log('🧪 Starting WebSocket Connection Tests...\n');

    // Test 1: Basic Connection
    await this.testBasicConnection();

    // Test 2: Authentication
    await this.testAuthentication();

    // Test 3: NASA Data Subscriptions
    await this.testNASASubscriptions();

    // Test 4: Real-time Queries
    await this.testRealtimeQueries();

    // Test 5: Connection Management
    await this.testConnectionManagement();

    // Test 6: Error Handling
    await this.testErrorHandling();

    // Cleanup
    await this.cleanup();

    // Print results
    this.printResults();
  }

  async testBasicConnection() {
    console.log('📡 Test 1: Basic Connection');
    try {
      const socket = io(this.serverUrl);
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);

        socket.on('connect', () => {
          clearTimeout(timeout);
          console.log('✅ Basic connection successful');
          this.testResults.passed++;
          resolve();
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      socket.disconnect();
    } catch (error) {
      console.log('❌ Basic connection failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push({ test: 'Basic Connection', error: error.message });
    }
  }

  async testAuthentication() {
    console.log('\n🔐 Test 2: Authentication');
    try {
      const token = this.generateTestToken();
      const socket = io(this.serverUrl, {
        auth: { token }
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Authentication timeout')), 5000);

        socket.on('connect', () => {
          console.log('✅ Authentication successful');
          this.testResults.passed++;
          clearTimeout(timeout);
          resolve();
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      socket.disconnect();
    } catch (error) {
      console.log('❌ Authentication failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push({ test: 'Authentication', error: error.message });
    }
  }

  async testNASASubscriptions() {
    console.log('\n🛰️  Test 3: NASA Data Subscriptions');
    try {
      const token = this.generateTestToken();
      const socket = io(this.serverUrl, {
        auth: { token }
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 10000);
        let subscriptionCount = 0;
        const requiredSubscriptions = 3;

        socket.on('connect', () => {
          // Test APOD subscription
          socket.emit('subscribe:nasa:apod', { date: '2023-01-01' });

          // Test NEO subscription
          socket.emit('subscribe:nasa:neo', { feedDate: '2023-01-01' });

          // Test ISS subscription
          socket.emit('subscribe:nasa:iss');
        });

        socket.on('subscribed', (data) => {
          subscriptionCount++;
          console.log(`✅ Subscribed to ${data.stream}`);

          if (subscriptionCount >= requiredSubscriptions) {
            console.log('✅ All NASA subscriptions successful');
            this.testResults.passed++;
            clearTimeout(timeout);
            resolve();
          }
        });

        socket.on('error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Subscription error: ${error.message}`));
        });
      });

      socket.disconnect();
    } catch (error) {
      console.log('❌ NASA subscriptions failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push({ test: 'NASA Subscriptions', error: error.message });
    }
  }

  async testRealtimeQueries() {
    console.log('\n🔍 Test 4: Real-time Queries');
    try {
      const token = this.generateTestToken();
      const socket = io(this.serverUrl, {
        auth: { token }
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Query timeout')), 10000);
        let queryCount = 0;
        const requiredQueries = 2;

        socket.on('connect', () => {
          // Test latest query
          socket.emit('query:nasa:latest', { type: 'apod' });

          // Test search query
          socket.emit('query:nasa:search', { type: 'neo', query: 'asteroid' });
        });

        socket.on('query:result', (data) => {
          queryCount++;
          console.log(`✅ Query result received for ${data.type}`);

          if (queryCount >= requiredQueries) {
            console.log('✅ All real-time queries successful');
            this.testResults.passed++;
            clearTimeout(timeout);
            resolve();
          }
        });

        socket.on('query:error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Query error: ${error.message}`));
        });
      });

      socket.disconnect();
    } catch (error) {
      console.log('❌ Real-time queries failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push({ test: 'Real-time Queries', error: error.message });
    }
  }

  async testConnectionManagement() {
    console.log('\n🔄 Test 5: Connection Management');
    try {
      const token = this.generateTestToken();
      const socket = io(this.serverUrl, {
        auth: { token }
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection management timeout')), 10000);

        socket.on('connect', () => {
          console.log('✅ Connected for management test');

          // Test ping/pong
          socket.emit('ping', { timestamp: Date.now() });
        });

        socket.on('pong', (data) => {
          console.log('✅ Ping/Pong successful');

          // Test session heartbeat
          socket.emit('session:heartbeat', { sessionId: 'test_session' });
        });

        socket.on('session:heartbeat:response', (data) => {
          console.log('✅ Session heartbeat successful');
          console.log('✅ Connection management test passed');
          this.testResults.passed++;
          clearTimeout(timeout);
          resolve();
        });

        socket.on('error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Connection management error: ${error.message}`));
        });
      });

      socket.disconnect();
    } catch (error) {
      console.log('❌ Connection management test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push({ test: 'Connection Management', error: error.message });
    }
  }

  async testErrorHandling() {
    console.log('\n⚠️  Test 6: Error Handling');
    try {
      // Test invalid token
      const socket1 = io(this.serverUrl, {
        auth: { token: 'invalid_token' }
      });

      await new Promise((resolve) => {
        socket1.on('connect_error', () => {
          console.log('✅ Invalid token properly rejected');
        });
        setTimeout(resolve, 2000);
      });

      // Test invalid subscription
      const token = this.generateTestToken();
      const socket2 = io(this.serverUrl, {
        auth: { token }
      });

      await new Promise((resolve) => {
        socket2.on('connect', () => {
          socket2.emit('subscribe:nasa:invalid');
        });

        socket2.on('error', () => {
          console.log('✅ Invalid subscription properly handled');
          console.log('✅ Error handling test passed');
          this.testResults.passed++;
        });

        setTimeout(resolve, 2000);
      });

      socket1.disconnect();
      socket2.disconnect();
    } catch (error) {
      console.log('❌ Error handling test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push({ test: 'Error Handling', error: error.message });
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up connections...');
    this.connections.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });
    this.connections = [];
  }

  printResults() {
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);

    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.testResults.errors.forEach(({ test, error }) => {
        console.log(`  ${test}: ${error}`);
      });
    }

    console.log('\n🎯 WebSocket Latency Target: <100ms');
    console.log('🔒 Connection Stability Target: 99.9%');
    console.log('📡 Real-time Update Frequency: 60 seconds');
  }

  // Load test for concurrent connections
  async runLoadTest(maxConnections = 100) {
    console.log(`\n⚡ Load Test: ${maxConnections} concurrent connections`);

    const startTime = Date.now();
    const connections = [];
    let connectedCount = 0;
    let errors = 0;

    for (let i = 0; i < maxConnections; i++) {
      const token = this.generateTestToken();
      const socket = io(this.serverUrl, {
        auth: { token }
      });

      connections.push(socket);

      socket.on('connect', () => {
        connectedCount++;
        if (connectedCount % 10 === 0) {
          console.log(`📡 Connected ${connectedCount}/${maxConnections} clients`);
        }

        if (connectedCount === maxConnections) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const avgTime = duration / maxConnections;

          console.log(`✅ Load test completed in ${duration}ms`);
          console.log(`📈 Average connection time: ${avgTime.toFixed(2)}ms`);
          console.log(`❌ Connection errors: ${errors}`);

          // Disconnect all connections
          connections.forEach(s => s.disconnect());
        }
      });

      socket.on('connect_error', () => {
        errors++;
      });
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new WebSocketTest();

  // Check for command line arguments
  const args = process.argv.slice(2);

  if (args.includes('--load')) {
    const maxConnections = parseInt(args[1]) || 100;
    test.runLoadTest(maxConnections);
  } else {
    test.runTests();
  }
}

module.exports = WebSocketTest;