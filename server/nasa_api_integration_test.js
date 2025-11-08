#!/usr/bin/env node

/**
 * COMPREHENSIVE NASA API INTEGRATION TEST SUITE
 *
 * This script tests all NASA API integrations systematically:
 * 1. APOD (Astronomy Picture of the Day)
 * 2. NeoWs (Near-Earth Object Web Service)
 * 3. DONKI (Space Weather Alerts)
 * 4. EPIC (Earth Polychromatic Imaging Camera)
 * 5. Mars Rover Photos
 * 6. Enhanced API endpoints
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
const NASA_API_URL = 'https://api.nasa.gov';
const SERVER_URL = 'http://localhost:3001';
const TEST_RESULTS_FILE = path.join(__dirname, 'nasa_api_test_results.json');

// Test Configuration
const TEST_CONFIG = {
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableDetailedLogging: true
};

// Test Results Structure
const testResults = {
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    startTime: new Date().toISOString(),
    endTime: null,
    duration: 0
  },
  categories: {
    apod: { name: 'APOD API', tests: [] },
    neo: { name: 'Near-Earth Objects API', tests: [] },
    mars: { name: 'Mars Rover Photos API', tests: [] },
    epic: { name: 'EPIC Earth Imagery API', tests: [] },
    donki: { name: 'Space Weather (DONKI) API', tests: [] },
    enhanced: { name: 'Enhanced API Endpoints', tests: [] },
    proxy: { name: 'NASA API Proxy', tests: [] }
  },
  performance: {
    fastestEndpoint: null,
    slowestEndpoint: null,
    averageResponseTime: 0,
    cacheHitRate: 0
  },
  errors: [],
  recommendations: []
};

// Helper Functions
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
}

function measureResponseTime(startTime) {
  return Date.now() - startTime;
}

function createTestResult(name, category, description = '') {
  return {
    name,
    category,
    description,
    status: 'pending',
    responseTime: 0,
    cacheStatus: 'N/A',
    error: null,
    details: {},
    timestamp: new Date().toISOString()
  };
}

async function makeRequest(url, config = {}) {
  const startTime = Date.now();

  try {
    const response = await axios({
      url,
      method: config.method || 'GET',
      data: config.data,
      params: {
        api_key: NASA_API_KEY,
        ...config.params
      },
      timeout: TEST_CONFIG.timeout,
      headers: {
        'User-Agent': 'NASA-System7-Portal-Test/1.0',
        ...config.headers
      }
    });

    return {
      success: true,
      status: response.status,
      data: response.data,
      responseTime: measureResponseTime(startTime),
      headers: response.headers
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.message,
      responseTime: measureResponseTime(startTime),
      details: error.response?.data
    };
  }
}

// NASA API Test Functions
async function testAPOD() {
  log('Testing APOD API...');

  const tests = [
    {
      name: 'APOD - Today',
      description: 'Get today\'s Astronomy Picture of the Day',
      url: `${NASA_API_URL}/planetary/apod`,
      validate: (result) => {
        if (!result.success) return false;
        const data = result.data;
        return data.title && data.explanation && data.url && data.date;
      }
    },
    {
      name: 'APOD - Specific Date',
      description: 'Get APOD for a specific date',
      url: `${NASA_API_URL}/planetary/apod`,
      params: { date: '2024-01-01' },
      validate: (result) => {
        if (!result.success) return false;
        const data = result.data;
        return data.date === '2024-01-01' && data.title;
      }
    },
    {
      name: 'APOD - Date Range',
      description: 'Get APOD for a date range',
      url: `${NASA_API_URL}/planetary/apod`,
      params: { start_date: '2024-01-01', end_date: '2024-01-03' },
      validate: (result) => {
        if (!result.success) return false;
        return Array.isArray(result.data) && result.data.length > 0;
      }
    }
  ];

  for (const test of tests) {
    const testResult = createTestResult(test.name, 'apod', test.description);

    try {
      const result = await makeRequest(test.url, { params: test.params });
      testResult.responseTime = result.responseTime;
      testResult.status = result.success ? 'passed' : 'failed';

      if (result.success) {
        testResult.details = {
          title: result.data.title || 'N/A',
          date: result.data.date || 'N/A',
          mediaType: result.data.media_type || 'N/A',
          url: result.data.url || 'N/A'
        };

        if (test.validate && !test.validate(result)) {
          testResult.status = 'failed';
          testResult.error = 'Response validation failed';
        }
      } else {
        testResult.error = result.error;
        testResult.details = { status: result.status, errorDetails: result.details };
      }
    } catch (error) {
      testResult.status = 'failed';
      testResult.error = error.message;
    }

    testResults.categories.apod.tests.push(testResult);
    log(`  ${testResult.status.toUpperCase()}: ${test.name} (${testResult.responseTime}ms)`);
  }
}

async function testNeoWs() {
  log('Testing Near-Earth Object Web Service...');

  const tests = [
    {
      name: 'NeoWs - Feed This Week',
      description: 'Get NEO feed for the current week',
      url: `${NASA_API_URL}/neo/rest/v1/feed`,
      params: {
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      },
      validate: (result) => {
        if (!result.success) return false;
        const data = result.data;
        return data.element_count >= 0 && data.near_earth_objects;
      }
    },
    {
      name: 'NeoWs - Browse',
      description: 'Browse NEOs',
      url: `${NASA_API_URL}/neo/rest/v1/neo/browse`,
      validate: (result) => {
        if (!result.success) return false;
        const data = result.data;
        return data.page && data.near_earth_objects && Array.isArray(data.near_earth_objects);
      }
    }
  ];

  for (const test of tests) {
    const testResult = createTestResult(test.name, 'neo', test.description);

    try {
      const result = await makeRequest(test.url, { params: test.params });
      testResult.responseTime = result.responseTime;
      testResult.status = result.success ? 'passed' : 'failed';

      if (result.success) {
        testResult.details = {
          elementCount: result.data.element_count || result.data.page?.total_elements || 0,
          links: result.data.links ? Object.keys(result.data.links).length : 0
        };

        if (test.validate && !test.validate(result)) {
          testResult.status = 'failed';
          testResult.error = 'Response validation failed';
        }
      } else {
        testResult.error = result.error;
        testResult.details = { status: result.status, errorDetails: result.details };
      }
    } catch (error) {
      testResult.status = 'failed';
      testResult.error = error.message;
    }

    testResults.categories.neo.tests.push(testResult);
    log(`  ${testResult.status.toUpperCase()}: ${test.name} (${testResult.responseTime}ms)`);
  }
}

async function testMarsRover() {
  log('Testing Mars Rover Photos API...');

  const tests = [
    {
      name: 'Mars Rover - Curiosity Latest Photos',
      description: 'Get latest photos from Curiosity rover',
      url: `${NASA_API_URL}/mars-photos/api/v1/rovers/curiosity/latest_photos`,
      validate: (result) => {
        if (!result.success) return false;
        const data = result.data;
        return data.latest_photos && Array.isArray(data.latest_photos);
      }
    },
    {
      name: 'Mars Rover - Curiosity Photos by Sol',
      description: 'Get Curiosity photos for specific sol',
      url: `${NASA_API_URL}/mars-photos/api/v1/rovers/curiosity/photos`,
      params: { sol: 1000 },
      validate: (result) => {
        if (!result.success) return false;
        const data = result.data;
        return data.photos && Array.isArray(data.photos);
      }
    },
    {
      name: 'Mars Rover - All Rovers',
      description: 'Get information about all Mars rovers',
      url: `${NASA_API_URL}/mars-photos/api/v1/rovers`,
      validate: (result) => {
        if (!result.success) return false;
        const data = result.data;
        return data.rovers && Array.isArray(data.rovers);
      }
    }
  ];

  for (const test of tests) {
    const testResult = createTestResult(test.name, 'mars', test.description);

    try {
      const result = await makeRequest(test.url, { params: test.params });
      testResult.responseTime = result.responseTime;
      testResult.status = result.success ? 'passed' : 'failed';

      if (result.success) {
        const photosKey = test.name.includes('Latest') ? 'latest_photos' : 'photos';
        const roversKey = test.name.includes('All Rovers') ? 'rovers' : null;

        testResult.details = {
          photoCount: result.data[photosKey]?.length || 0,
          roverCount: result.data[roversKey]?.length || 0,
          sol: result.data[photosKey]?.[0]?.sol || 'N/A'
        };

        if (test.validate && !test.validate(result)) {
          testResult.status = 'failed';
          testResult.error = 'Response validation failed';
        }
      } else {
        testResult.error = result.error;
        testResult.details = { status: result.status, errorDetails: result.details };
      }
    } catch (error) {
      testResult.status = 'failed';
      testResult.error = error.message;
    }

    testResults.categories.mars.tests.push(testResult);
    log(`  ${testResult.status.toUpperCase()}: ${test.name} (${testResult.responseTime}ms)`);
  }
}

async function testEPIC() {
  log('Testing EPIC Earth Imagery API...');

  const tests = [
    {
      name: 'EPIC - Recent Natural Images',
      description: 'Get recent natural color Earth images',
      url: `${NASA_API_URL}/EPIC/api/natural/images`,
      validate: (result) => {
        if (!result.success) return false;
        return Array.isArray(result.data);
      }
    },
    {
      name: 'EPIC - Recent Enhanced Images',
      description: 'Get recent enhanced Earth images',
      url: `${NASA_API_URL}/EPIC/api/enhanced/images`,
      validate: (result) => {
        if (!result.success) return false;
        return Array.isArray(result.data);
      }
    }
  ];

  for (const test of tests) {
    const testResult = createTestResult(test.name, 'epic', test.description);

    try {
      const result = await makeRequest(test.url);
      testResult.responseTime = result.responseTime;
      testResult.status = result.success ? 'passed' : 'failed';

      if (result.success) {
        testResult.details = {
          imageCount: Array.isArray(result.data) ? result.data.length : 0,
          latestDate: result.data[0]?.date || 'N/A'
        };

        if (test.validate && !test.validate(result)) {
          testResult.status = 'failed';
          testResult.error = 'Response validation failed';
        }
      } else {
        testResult.error = result.error;
        testResult.details = { status: result.status, errorDetails: result.details };
      }
    } catch (error) {
      testResult.status = 'failed';
      testResult.error = error.message;
    }

    testResults.categories.epic.tests.push(testResult);
    log(`  ${testResult.status.toUpperCase()}: ${test.name} (${testResult.responseTime}ms)`);
  }
}

async function testDONKI() {
  log('Testing Space Weather (DONKI) API...');

  const tests = [
    {
      name: 'DONKI - Coronal Mass Ejection',
      description: 'Get Coronal Mass Ejection data',
      url: `${NASA_API_URL}/DONKI/CMEAnalysis`,
      params: { startDate: '2024-01-01', endDate: '2024-01-31' },
      validate: (result) => {
        if (!result.success) return false;
        return Array.isArray(result.data);
      }
    },
    {
      name: 'DONKI - Geomagnetic Storms',
      description: 'Get geomagnetic storm data',
      url: `${NASA_API_URL}/DONKI/GST`,
      params: { startDate: '2024-01-01', endDate: '2024-01-31' },
      validate: (result) => {
        if (!result.success) return false;
        return Array.isArray(result.data);
      }
    },
    {
      name: 'DONKI - Solar Flares',
      description: 'Get solar flare data',
      url: `${NASA_API_URL}/DONKI/FLR`,
      params: { startDate: '2024-01-01', endDate: '2024-01-31' },
      validate: (result) => {
        if (!result.success) return false;
        return Array.isArray(result.data);
      }
    }
  ];

  for (const test of tests) {
    const testResult = createTestResult(test.name, 'donki', test.description);

    try {
      const result = await makeRequest(test.url, { params: test.params });
      testResult.responseTime = result.responseTime;
      testResult.status = result.success ? 'passed' : 'failed';

      if (result.success) {
        testResult.details = {
          eventCount: Array.isArray(result.data) ? result.data.length : 0,
          dataType: result.data[0] ? Object.keys(result.data[0]).join(', ') : 'N/A'
        };

        if (test.validate && !test.validate(result)) {
          testResult.status = 'failed';
          testResult.error = 'Response validation failed';
        }
      } else {
        testResult.error = result.error;
        testResult.details = { status: result.status, errorDetails: result.details };
      }
    } catch (error) {
      testResult.status = 'failed';
      testResult.error = error.message;
    }

    testResults.categories.donki.tests.push(testResult);
    log(`  ${testResult.status.toUpperCase()}: ${test.name} (${testResult.responseTime}ms)`);
  }
}

async function testProxyEndpoints() {
  log('Testing NASA API Proxy Endpoints...');

  const tests = [
    {
      name: 'Proxy Health Check',
      description: 'Test server health endpoint',
      url: `${SERVER_URL}/health`,
      isProxy: false
    },
    {
      name: 'Proxy - APOD',
      description: 'Test APOD proxy endpoint',
      url: `${SERVER_URL}/api/nasa/planetary/apod`
    },
    {
      name: 'Proxy - NEO Feed',
      description: 'Test NEO feed proxy endpoint',
      url: `${SERVER_URL}/api/nasa/neo/rest/v1/feed`,
      params: {
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      }
    },
    {
      name: 'Proxy - Mars Rover',
      description: 'Test Mars Rover proxy endpoint',
      url: `${SERVER_URL}/api/nasa/mars-photos/api/v1/rovers/curiosity/latest_photos`
    },
    {
      name: 'Proxy - EPIC',
      description: 'Test EPIC proxy endpoint',
      url: `${SERVER_URL}/api/nasa/EPIC/api/natural/images`
    }
  ];

  for (const test of tests) {
    const testResult = createTestResult(test.name, 'proxy', test.description);

    try {
      const config = test.params ? { params: test.params } : {};
      const result = await makeRequest(test.url, config);
      testResult.responseTime = result.responseTime;
      testResult.cacheStatus = result.headers['x-cache'] || 'N/A';

      if (test.isProxy || result.success) {
        testResult.status = 'passed';
        testResult.details = {
          status: result.status,
          cacheHit: testResult.cacheStatus !== 'N/A'
        };
      } else {
        testResult.status = 'failed';
        testResult.error = result.error || 'Server not running';
        testResult.details = { status: result.status, errorDetails: result.details };
      }
    } catch (error) {
      testResult.status = 'failed';
      testResult.error = error.message;
    }

    testResults.categories.proxy.tests.push(testResult);
    log(`  ${testResult.status.toUpperCase()}: ${test.name} (${testResult.responseTime}ms) [Cache: ${testResult.cacheStatus}]`);
  }
}

async function testEnhancedEndpoints() {
  log('Testing Enhanced API Endpoints...');

  const tests = [
    {
      name: 'Enhanced APOD - Today',
      description: 'Test enhanced APOD endpoint',
      url: `${SERVER_URL}/api/apod/enhanced/${new Date().toISOString().split('T')[0]}`,
      validate: (result) => {
        if (!result.success) return false;
        return result.data.title && result.data.enhanced;
      }
    },
    {
      name: 'Enhanced NEO - Statistics',
      description: 'Test enhanced NEO statistics endpoint',
      url: `${SERVER_URL}/api/neo/enhanced/statistics`,
      validate: (result) => {
        if (!result.success) return false;
        return result.data.success && result.data.data;
      }
    },
    {
      name: 'Enhanced NEO - Close Approaches',
      description: 'Test enhanced close approaches endpoint',
      url: `${SERVER_URL}/api/neo/enhanced/close-approaches`,
      params: {
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      },
      validate: (result) => {
        if (!result.success) return false;
        return result.data.success && Array.isArray(result.data.data);
      }
    }
  ];

  for (const test of tests) {
    const testResult = createTestResult(test.name, 'enhanced', test.description);

    try {
      const config = test.params ? { params: test.params } : {};
      const result = await makeRequest(test.url, config);
      testResult.responseTime = result.responseTime;
      testResult.cacheStatus = result.headers['x-cache'] || 'N/A';

      if (result.success) {
        testResult.status = 'passed';
        testResult.details = {
          enhanced: true,
          cacheHit: testResult.cacheStatus !== 'N/A',
          dataType: typeof result.data
        };

        if (test.validate && !test.validate(result)) {
          testResult.status = 'failed';
          testResult.error = 'Response validation failed';
        }
      } else {
        testResult.status = 'failed';
        testResult.error = result.error;
        testResult.details = { status: result.status, errorDetails: result.details };
      }
    } catch (error) {
      testResult.status = 'failed';
      testResult.error = error.message;
    }

    testResults.categories.enhanced.tests.push(testResult);
    log(`  ${testResult.status.toUpperCase()}: ${test.name} (${testResult.responseTime}ms) [Cache: ${testResult.cacheStatus}]`);
  }
}

// Analysis Functions
function calculateSummary() {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let responseTimes = [];
  let cacheHits = 0;
  let cacheRequests = 0;

  Object.values(testResults.categories).forEach(category => {
    category.tests.forEach(test => {
      totalTests++;
      if (test.status === 'passed') passedTests++;
      else if (test.status === 'failed') failedTests++;

      if (test.responseTime > 0) {
        responseTimes.push(test.responseTime);
      }

      if (test.cacheStatus !== 'N/A') {
        cacheRequests++;
        if (test.cacheStatus.includes('HIT')) {
          cacheHits++;
        }
      }
    });
  });

  testResults.summary = {
    ...testResults.summary,
    totalTests,
    passed: passedTests,
    failed: failedTests,
    skipped: 0,
    endTime: new Date().toISOString(),
    duration: new Date(testResults.summary.endTime).getTime() - new Date(testResults.summary.startTime).getTime()
  };

  testResults.performance = {
    fastestEndpoint: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
    slowestEndpoint: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
    averageResponseTime: responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0,
    cacheHitRate: cacheRequests > 0 ? Math.round((cacheHits / cacheRequests) * 100) : 0
  };
}

function generateRecommendations() {
  const recommendations = [];

  // Performance recommendations
  if (testResults.performance.averageResponseTime > 2000) {
    recommendations.push({
      type: 'performance',
      severity: 'medium',
      title: 'High Average Response Time',
      description: `Average response time is ${testResults.performance.averageResponseTime}ms. Consider implementing caching or optimizing API calls.`
    });
  }

  if (testResults.performance.cacheHitRate < 50) {
    recommendations.push({
      type: 'performance',
      severity: 'low',
      title: 'Low Cache Hit Rate',
      description: `Cache hit rate is ${testResults.performance.cacheHitRate}%. Review caching strategy.`
    });
  }

  // Error analysis
  Object.values(testResults.categories).forEach(category => {
    const failedTests = category.tests.filter(test => test.status === 'failed');
    if (failedTests.length > 0) {
      failedTests.forEach(test => {
        recommendations.push({
          type: 'error',
          severity: 'high',
          title: `Failed Test: ${test.name}`,
          description: `Test failed with error: ${test.error || 'Unknown error'}`,
          category: category.name
        });
      });
    }
  });

  testResults.recommendations = recommendations;
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 NASA SYSTEM 7 PORTAL - COMPREHENSIVE API INTEGRATION TEST REPORT');
  console.log('='.repeat(80));

  // Summary
  console.log('\n📊 TEST SUMMARY:');
  console.log(`Total Tests: ${testResults.summary.totalTests}`);
  console.log(`Passed: ${testResults.summary.passed} ✅`);
  console.log(`Failed: ${testResults.summary.failed} ❌`);
  console.log(`Success Rate: ${Math.round((testResults.summary.passed / testResults.summary.totalTests) * 100)}%`);
  console.log(`Duration: ${Math.round(testResults.summary.duration / 1000)}s`);

  // Performance Summary
  console.log('\n⚡ PERFORMANCE SUMMARY:');
  console.log(`Average Response Time: ${testResults.performance.averageResponseTime}ms`);
  console.log(`Fastest Endpoint: ${testResults.performance.fastestEndpoint}ms`);
  console.log(`Slowest Endpoint: ${testResults.performance.slowestEndpoint}ms`);
  console.log(`Cache Hit Rate: ${testResults.performance.cacheHitRate}%`);

  // Category Results
  console.log('\n📋 CATEGORY RESULTS:');
  Object.values(testResults.categories).forEach(category => {
    const passed = category.tests.filter(test => test.status === 'passed').length;
    const total = category.tests.length;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    console.log(`\n  ${category.name}:`);
    console.log(`    ${passed}/${total} tests passed (${successRate}%)`);

    category.tests.forEach(test => {
      const status = test.status === 'passed' ? '✅' : '❌';
      const time = test.responseTime > 0 ? ` (${test.responseTime}ms)` : '';
      const cache = test.cacheStatus !== 'N/A' ? ` [${test.cacheStatus}]` : '';
      console.log(`    ${status} ${test.name}${time}${cache}`);

      if (test.status === 'failed') {
        console.log(`      Error: ${test.error}`);
      }
    });
  });

  // Recommendations
  if (testResults.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    testResults.recommendations.forEach((rec, index) => {
      const severity = rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '🟡' : '🟢';
      console.log(`\n  ${index + 1}. ${severity} ${rec.title}`);
      console.log(`     ${rec.description}`);
      if (rec.category) {
        console.log(`     Category: ${rec.category}`);
      }
    });
  }

  // Conclusion
  const overallSuccess = testResults.summary.failed === 0;
  console.log('\n' + '='.repeat(80));
  console.log(`🎯 OVERALL RESULT: ${overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('='.repeat(80));

  if (overallSuccess) {
    console.log('\n🌟 EXCELLENT! All NASA API integrations are working correctly.');
    console.log('   The NASA System 7 Portal is ready for production deployment.');
  } else {
    console.log('\n⚠️  ISSUES FOUND: Some NASA API integrations need attention.');
    console.log('   Please review the failed tests and implement the recommended fixes.');
  }
}

// Save Results to File
function saveResults() {
  try {
    fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));
    console.log(`\n💾 Detailed results saved to: ${TEST_RESULTS_FILE}`);
  } catch (error) {
    console.log(`\n❌ Failed to save results: ${error.message}`);
  }
}

// Main Test Execution
async function runComprehensiveTests() {
  console.log('🚀 Starting NASA API Integration Tests...');
  console.log(`📅 Test started at: ${testResults.summary.startTime}`);
  console.log(`🔑 Using API Key: ${NASA_API_KEY === 'DEMO_KEY' ? 'DEMO_KEY (Rate Limited)' : 'Custom Key'}`);
  console.log(`⏱️  Request timeout: ${TEST_CONFIG.timeout}ms\n`);

  try {
    // Run all test categories
    await testAPOD();
    await testNeoWs();
    await testMarsRover();
    await testEPIC();
    await testDONKI();
    await testProxyEndpoints();
    await testEnhancedEndpoints();

    // Calculate results
    calculateSummary();
    generateRecommendations();

    // Generate and save report
    generateReport();
    saveResults();

    // Exit with appropriate code
    process.exit(testResults.summary.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runComprehensiveTests();
}

module.exports = {
  runComprehensiveTests,
  testResults,
  TEST_CONFIG
};