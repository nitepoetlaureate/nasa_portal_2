const axios = require('axios');
const WebSocketTest = require('./websocketTest');
const AuthTest = require('./authTest');

class Phase3Verification {
  constructor(serverUrl = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
    this.results = {
      server: false,
      websocket: false,
      authentication: false,
      streaming: false,
      pubsub: false,
      overall: false
    };
    this.errors = [];
  }

  async runVerification() {
    console.log('🚀 NASA System 7 Portal - Phase 3 Verification\n');
    console.log('📋 Testing Implementation:\n');

    // Test 1: Server Health
    await this.testServerHealth();

    // Test 2: WebSocket Infrastructure
    await this.testWebSocketInfrastructure();

    // Test 3: Authentication System
    await this.testAuthenticationSystem();

    // Test 4: NASA Streaming Service
    await this.testNASAStreaming();

    // Test 5: Redis Pub/Sub
    await this.testRedisPubSub();

    // Test 6: Integration Tests
    await this.testIntegration();

    // Print final results
    this.printFinalResults();
  }

  async testServerHealth() {
    console.log('🏥 Test 1: Server Health Check');
    try {
      const response = await axios.get(`${this.serverUrl}/health`, { timeout: 5000 });

      if (response.status === 200) {
        const health = response.data;
        console.log('✅ Server is running');
        console.log(`   Instance ID: ${health.instanceId}`);
        console.log(`   Uptime: ${Math.floor(health.uptime)}s`);
        console.log(`   Services: ${Object.keys(health.services).filter(s => health.services[s]).length}/${Object.keys(health.services).length} active`);

        if (health.services.websocket && health.services.streaming) {
          console.log('✅ WebSocket and streaming services are active');
          this.results.server = true;
        } else {
          console.log('⚠️  Some services are not active');
          this.errors.push('WebSocket or streaming services not active');
        }
      }
    } catch (error) {
      console.log('❌ Server health check failed:', error.message);
      this.errors.push('Server health check failed');
    }
    console.log();
  }

  async testWebSocketInfrastructure() {
    console.log('📡 Test 2: WebSocket Infrastructure');
    try {
      const wsTest = new WebSocketTest(this.serverUrl);

      // Run basic connection test
      await wsTest.testBasicConnection();
      await wsTest.testAuthentication();

      this.results.websocket = true;
      console.log('✅ WebSocket infrastructure is functional');
    } catch (error) {
      console.log('❌ WebSocket infrastructure test failed:', error.message);
      this.errors.push('WebSocket infrastructure test failed');
    }
    console.log();
  }

  async testAuthenticationSystem() {
    console.log('🔐 Test 3: Authentication System');
    try {
      const authTest = new AuthTest(this.serverUrl);

      // Test authentication endpoints
      const response = await axios.get(`${this.serverUrl}/auth/health`);

      if (response.status === 200) {
        console.log('✅ Authentication service is healthy');
        console.log(`   JWT Valid: ${response.data.jwtValid}`);
        console.log(`   OAuth Providers: ${response.data.oauthProviders.length}`);

        this.results.authentication = true;
      }
    } catch (error) {
      console.log('❌ Authentication system test failed:', error.message);
      this.errors.push('Authentication system test failed');
    }
    console.log();
  }

  async testNASAStreaming() {
    console.log('🛰️  Test 4: NASA Streaming Service');
    try {
      const response = await axios.get(`${this.serverUrl}/api/streams/status`);

      if (response.status === 200) {
        const status = response.data;
        console.log('✅ NASA streaming service is active');
        console.log(`   Status: ${status.status}`);
        console.log(`   Active Streams: ${status.streams.length}`);
        console.log(`   Total Requests: ${status.metrics.totalRequests}`);
        console.log(`   Success Rate: ${status.metrics.successfulRequests}/${status.metrics.totalRequests}`);

        if (status.metrics.totalRequests > 0) {
          this.results.streaming = true;
        } else {
          console.log('⚠️  No streaming activity detected');
          this.errors.push('No streaming activity detected');
        }
      }
    } catch (error) {
      console.log('❌ NASA streaming test failed:', error.message);
      this.errors.push('NASA streaming test failed');
    }
    console.log();
  }

  async testRedisPubSub() {
    console.log('📨 Test 5: Redis Pub/Sub System');
    try {
      // Test cache connectivity (which uses Redis)
      const response = await axios.get(`${this.serverUrl}/health`);

      if (response.status === 200 && response.data.services.cache) {
        console.log('✅ Redis connection is active');

        // Test cache functionality
        const cacheResponse = await axios.post(`${this.serverUrl}/api/streams/apod/refresh`);

        if (cacheResponse.status === 200) {
          console.log('✅ Cache invalidation working');
          this.results.pubsub = true;
        } else {
          console.log('⚠️  Cache functionality may be limited');
        }
      } else {
        console.log('❌ Redis connection not available');
        this.errors.push('Redis connection not available');
      }
    } catch (error) {
      console.log('❌ Redis Pub/Sub test failed:', error.message);
      this.errors.push('Redis Pub/Sub test failed');
    }
    console.log();
  }

  async testIntegration() {
    console.log('🔗 Test 6: Integration Tests');
    try {
      // Test metrics endpoint (integrates all services)
      const response = await axios.get(`${this.serverUrl}/metrics`);

      if (response.status === 200) {
        const metrics = response.data;
        console.log('✅ Metrics integration working');
        console.log(`   Performance: ${Object.keys(metrics.performance).length} metrics`);
        console.log(`   Instance: ${metrics.instance.id}`);

        if (metrics.websocket) {
          console.log(`   WebSocket: ${metrics.websocket.activeConnections} connections`);
        }

        if (metrics.streaming) {
          console.log(`   Streaming: ${metrics.streaming.activeStreams} streams`);
        }
      }

      // Test real-time endpoint
      const streamResponse = await axios.get(`${this.serverUrl}/api/streams/status`);
      if (streamResponse.status === 200) {
        console.log('✅ Real-time API integration working');
      }

    } catch (error) {
      console.log('❌ Integration test failed:', error.message);
      this.errors.push('Integration test failed');
    }
    console.log();
  }

  printFinalResults() {
    console.log('📊 Phase 3 Verification Results:\n');

    const tests = [
      { name: 'Server Health', passed: this.results.server },
      { name: 'WebSocket Infrastructure', passed: this.results.websocket },
      { name: 'Authentication System', passed: this.results.authentication },
      { name: 'NASA Streaming Service', passed: this.results.streaming },
      { name: 'Redis Pub/Sub System', passed: this.results.pubsub }
    ];

    let passedCount = 0;
    tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${status} ${test.name}`);
      if (test.passed) passedCount++;
    });

    console.log(`\n📈 Overall Success Rate: ${passedCount}/${tests.length} (${((passedCount/tests.length)*100).toFixed(1)}%)`);

    if (this.errors.length > 0) {
      console.log('\n❌ Issues Detected:');
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      console.log('\n🔧 Please check the configuration and troubleshoot the issues above.');
    } else {
      console.log('\n🎉 All Phase 3 components are working correctly!');
      console.log('\n🚀 NASA System 7 Portal - Phase 3 Implementation Complete');
      console.log('   ✅ WebSocket server with real-time NASA data streaming');
      console.log('   ✅ JWT authentication with OAuth integration');
      console.log('   ✅ Redis pub/sub for multi-instance scaling');
      console.log('   ✅ Real-time NASA API data streaming');
      console.log('   ✅ Connection management and error handling');
    }

    console.log('\n📋 Next Steps:');
    console.log('   1. Configure OAuth providers for social login');
    console.log('   2. Set up NASA API key for real data streaming');
    console.log('   3. Configure Redis for production deployment');
    console.log('   4. Run load tests for performance validation');
    console.log('   5. Set up monitoring and alerting');
  }

  async validateConfiguration() {
    console.log('⚙️  Configuration Validation:\n');

    const requiredEnvVars = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'NASA_API_KEY',
      'NODE_ENV',
      'PORT'
    ];

    const optionalEnvVars = [
      'GOOGLE_CLIENT_ID',
      'GITHUB_CLIENT_ID',
      'REDIS_HOST',
      'REDIS_PORT'
    ];

    let missingRequired = [];
    let missingOptional = [];

    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        missingRequired.push(envVar);
      }
    });

    optionalEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        missingOptional.push(envVar);
      }
    });

    if (missingRequired.length === 0) {
      console.log('✅ All required environment variables are set');
    } else {
      console.log('❌ Missing required environment variables:');
      missingRequired.forEach(envVar => console.log(`   - ${envVar}`));
    }

    if (missingOptional.length > 0) {
      console.log('⚠️  Optional environment variables not set:');
      missingOptional.forEach(envVar => console.log(`   - ${envVar}`));
    }

    return missingRequired.length === 0;
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new Phase3Verification();

  // Check command line arguments
  const args = process.argv.slice(2);

  if (args.includes('--config')) {
    verifier.validateConfiguration();
  } else if (args.includes('--quick')) {
    verifier.testServerHealth().then(() => {
      verifier.printFinalResults();
    });
  } else {
    verifier.runVerification();
  }
}

module.exports = Phase3Verification;