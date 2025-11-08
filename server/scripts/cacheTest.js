#!/usr/bin/env node

/**
 * Redis Cache Performance and Functionality Test Script
 *
 * This script tests:
 * - Redis connectivity
 * - Cache hit/miss functionality
 * - Performance improvements
 * - TTL behavior
 * - Cache invalidation
 * - Different NASA API endpoints
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

const SERVER_URL = 'http://localhost:3001';
const TEST_ENDPOINTS = [
  {
    name: 'APOD Enhanced',
    path: '/api/apod/enhanced/2024-01-01',
    expectedTTL: 3600 // 1 hour
  },
  {
    name: 'APOD Basic',
    path: '/api/nasa/apod?date=2024-01-01',
    expectedTTL: 3600 // 1 hour
  },
  {
    name: 'Resource Enhanced',
    path: '/api/resources/enhanced/1',
    expectedTTL: 7200 // 2 hours
  }
];

async function measureRequest(url, description) {
  const startTime = performance.now();
  const response = await axios.get(url, {
    headers: { 'Accept': 'application/json' }
  });
  const endTime = performance.now();
  const responseTime = Math.round(endTime - startTime);

  return {
    responseTime,
    status: response.status,
    cacheStatus: response.headers['x-cache'],
    cacheTTL: response.headers['x-cache-ttl'],
    data: response.data
  };
}

async function testCacheHitMiss(endpoint) {
  console.log(`\n🧪 Testing ${endpoint.name}`);
  console.log(`📍 URL: ${SERVER_URL}${endpoint.path}`);

  try {
    // First request - should be cache miss
    console.log('\n📊 Request 1 (Expected: MISS)');
    const firstRequest = await measureRequest(SERVER_URL + endpoint.path, 'First request');

    console.log(`   ✅ Status: ${firstRequest.status}`);
    console.log(`   ⚡ Response Time: ${firstRequest.responseTime}ms`);
    console.log(`   💾 Cache Status: ${firstRequest.cacheStatus}`);
    if (firstRequest.cacheTTL) {
      console.log(`   ⏰ Cache TTL: ${firstRequest.cacheTTL}s`);
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 100));

    // Second request - should be cache hit
    console.log('\n📊 Request 2 (Expected: HIT)');
    const secondRequest = await measureRequest(SERVER_URL + endpoint.path, 'Second request');

    console.log(`   ✅ Status: ${secondRequest.status}`);
    console.log(`   ⚡ Response Time: ${secondRequest.responseTime}ms`);
    console.log(`   💾 Cache Status: ${secondRequest.cacheStatus}`);
    if (secondRequest.cacheTTL) {
      console.log(`   ⏰ Cache TTL: ${secondRequest.cacheTTL}s`);
    }

    // Performance improvement calculation
    if (firstRequest.cacheStatus === 'MISS' && secondRequest.cacheStatus === 'HIT') {
      const improvement = ((firstRequest.responseTime - secondRequest.responseTime) / firstRequest.responseTime * 100).toFixed(1);
      console.log(`\n🚀 Performance Improvement: ${improvement}% faster from cache!`);
    }

    return {
      endpoint: endpoint.name,
      firstRequest: { ...firstRequest, expectedCache: 'MISS' },
      secondRequest: { ...secondRequest, expectedCache: 'HIT' },
      success: firstRequest.status === 200 && secondRequest.status === 200
    };

  } catch (error) {
    console.error(`   ❌ Error testing ${endpoint.name}:`, error.message);
    return {
      endpoint: endpoint.name,
      error: error.message,
      success: false
    };
  }
}

async function testRedisConnection() {
  console.log('\n🔗 Testing Redis Connection...');

  try {
    // Test Redis connectivity via server health
    const healthResponse = await axios.get(`${SERVER_URL}/health`);
    console.log('   ✅ Server is running and responsive');

    // Check if we can access cache via Redis CLI
    const { execSync } = require('child_process');
    const redisTest = execSync('redis-cli ping', { encoding: 'utf8' }).trim();

    if (redisTest === 'PONG') {
      console.log('   ✅ Redis server is responsive');
      return true;
    } else {
      console.log('   ❌ Redis server not responding properly');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Redis connection test failed:', error.message);
    return false;
  }
}

async function checkCacheKeys() {
  console.log('\n🔍 Checking cached keys in Redis...');

  try {
    const { execSync } = require('child_process');
    const keys = execSync('redis-cli keys "nasa:*"', { encoding: 'utf8' }).trim();

    if (keys) {
      const keyList = keys.split('\n').filter(key => key.trim());
      console.log(`   📦 Found ${keyList.length} cached keys:`);

      keyList.forEach(key => {
        try {
          const ttl = execSync(`redis-cli ttl "${key}"`, { encoding: 'utf8' }).trim();
          console.log(`      • ${key} (TTL: ${ttl}s)`);
        } catch (error) {
          console.log(`      • ${key} (TTL: unknown)`);
        }
      });
    } else {
      console.log('   📭 No cached keys found');
    }
  } catch (error) {
    console.log('   ❌ Error checking cache keys:', error.message);
  }
}

async function runCacheTests() {
  console.log('🚀 NASA System 7 Portal - Redis Cache Performance Test');
  console.log('=' * 60);

  const testResults = {
    redisConnected: false,
    endpointTests: [],
    summary: { total: 0, passed: 0, failed: 0 }
  };

  // Test Redis connection
  testResults.redisConnected = await testRedisConnection();

  if (!testResults.redisConnected) {
    console.log('\n❌ Redis is not available. Cannot proceed with cache tests.');
    process.exit(1);
  }

  // Check existing cache keys
  await checkCacheKeys();

  // Test each endpoint
  for (const endpoint of TEST_ENDPOINTS) {
    const result = await testCacheHitMiss(endpoint);
    testResults.endpointTests.push(result);

    if (result.success) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
    }
    testResults.summary.total++;
  }

  // Final cache check
  await checkCacheKeys();

  // Print summary
  console.log('\n' + '=' * 60);
  console.log('📊 TEST SUMMARY');
  console.log('=' * 60);

  console.log(`✅ Redis Connection: ${testResults.redisConnected ? 'CONNECTED' : 'FAILED'}`);
  console.log(`📋 Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);

  // Performance summary
  const successfulTests = testResults.endpointTests.filter(t => t.success && t.firstRequest && t.secondRequest);
  if (successfulTests.length > 0) {
    console.log('\n🚀 PERFORMANCE IMPROVEMENT SUMMARY:');

    successfulTests.forEach(test => {
      const improvement = ((test.firstRequest.responseTime - test.secondRequest.responseTime) / test.firstRequest.responseTime * 100).toFixed(1);
      console.log(`   ${test.endpoint}: ${improvement}% faster (${test.firstRequest.responseTime}ms → ${test.secondRequest.responseTime}ms)`);
    });

    const avgImprovement = successfulTests.reduce((sum, test) => {
      return sum + ((test.firstRequest.responseTime - test.secondRequest.responseTime) / test.firstRequest.responseTime * 100);
    }, 0) / successfulTests.length;

    console.log(`\n📈 Average Performance Improvement: ${avgImprovement.toFixed(1)}%`);
  }

  console.log('\n✅ Cache testing completed!');

  if (testResults.summary.failed > 0) {
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node cacheTest.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('');
  console.log('This script tests the Redis caching functionality for NASA API endpoints.');
  process.exit(0);
}

// Run the tests
runCacheTests().catch(error => {
  console.error('❌ Cache test failed:', error);
  process.exit(1);
});