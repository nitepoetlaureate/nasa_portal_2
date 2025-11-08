#!/usr/bin/env node

/**
 * Focused NASA API Integration Test Suite
 *
 * This script tests the actual working NASA API endpoints with better error handling
 * and detailed diagnostics.
 */

const axios = require('axios');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3001';
const NASA_API_KEY = 'DEMO_KEY';
const TEST_TIMEOUT = 10000;

// Test results storage
const testResults = {
    timestamp: new Date().toISOString(),
    tests: {}
};

// Helper function to measure response time
async function measureRequest(url, description, method = 'GET', data = null) {
    const startTime = Date.now();
    try {
        const config = {
            method,
            url,
            timeout: TEST_TIMEOUT,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        return {
            success: true,
            responseTime,
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            description
        };
    } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        return {
            success: false,
            responseTime,
            status: error.response?.status || 0,
            statusText: error.response?.statusText || 'Network Error',
            error: error.message,
            description,
            errorDetails: {
                config: error.config?.url || 'Unknown URL',
                response: error.response?.data,
                code: error.code,
                isAxiosError: error.isAxiosError
            }
        };
    }
}

// Test basic NASA proxy endpoints
async function testNASAProxy() {
    console.log('🚀 Testing NASA Proxy Endpoints...');

    const tests = [
        {
            url: `${BASE_URL}/api/nasa/planetary/apod?api_key=${NASA_API_KEY}`,
            description: 'APOD Today'
        },
        {
            url: `${BASE_URL}/api/nasa/planetary/apod?api_key=${NASA_API_KEY}&date=2024-01-01`,
            description: 'APOD Specific Date'
        },
        {
            url: `${BASE_URL}/api/nasa/neo/rest/v1/feed?api_key=${NASA_API_KEY}`,
            description: 'NeoWs Feed'
        },
        {
            url: `${BASE_URL}/api/nasa/DONKI/CME?api_key=${NASA_API_KEY}&startDate=2024-01-01&endDate=2024-01-07`,
            description: 'DONKI CME'
        },
        {
            url: `${BASE_URL}/api/nasa/EPIC/api/natural/images?api_key=${NASA_API_KEY}`,
            description: 'EPIC Natural Images'
        },
        {
            url: `${BASE_URL}/api/nasa/mars-photos/api/v1/rovers/curiosity/photos?earth_date=2024-01-01&api_key=${NASA_API_KEY}`,
            description: 'Mars Rover Curiosity'
        }
    ];

    const results = {};
    for (const test of tests) {
        console.log(`  📡 Testing: ${test.description}`);
        results[test.description] = await measureRequest(test.url, test.description);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting delay
    }

    testResults.tests.nasaProxy = results;
    console.log('✅ NASA Proxy tests completed');
    return results;
}

// Test enhanced endpoints
async function testEnhancedEndpoints() {
    console.log('🚀 Testing Enhanced Endpoints...');

    const tests = [
        {
            url: `${BASE_URL}/api/apod/enhanced/2024-01-01`,
            description: 'Enhanced APOD'
        },
        {
            url: `${BASE_URL}/api/neo/enhanced/2024-01-01`,
            description: 'Enhanced NeoWs'
        }
    ];

    const results = {};
    for (const test of tests) {
        console.log(`  📡 Testing: ${test.description}`);
        results[test.description] = await measureRequest(test.url, test.description);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Enhanced endpoints need more time
    }

    testResults.tests.enhanced = results;
    console.log('✅ Enhanced Endpoint tests completed');
    return results;
}

// Test cache performance
async function testCachePerformance() {
    console.log('🚀 Testing Cache Performance...');

    const results = {};

    // Test APOD cache
    console.log('  🔄 Testing APOD Cache...');
    const apodUrl = `${BASE_URL}/api/nasa/planetary/apod?api_key=${NASA_API_KEY}`;

    // First request (cache miss)
    const firstRequest = await measureRequest(apodUrl, 'APOD Cache - First Request');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Second request (cache hit)
    const secondRequest = await measureRequest(apodUrl, 'APOD Cache - Second Request');

    results.apod = {
        firstRequest,
        secondRequest,
        isFaster: secondRequest.responseTime < firstRequest.responseTime,
        improvement: firstRequest.responseTime > secondRequest.responseTime ?
            ((firstRequest.responseTime - secondRequest.responseTime) / firstRequest.responseTime * 100).toFixed(1) : 0
    };

    testResults.tests.cache = results;
    console.log('✅ Cache Performance tests completed');
    return results;
}

// Test server health
async function testServerHealth() {
    console.log('🚀 Testing Server Health...');

    const healthTests = [
        { url: `${BASE_URL}/health`, description: 'Health Check' },
        { url: `${BASE_URL}/metrics`, description: 'Metrics' },
        { url: `${BASE_URL}/api/streams/status`, description: 'Stream Status' }
    ];

    const results = {};
    for (const test of healthTests) {
        results[test.description] = await measureRequest(test.url, test.description);
    }

    testResults.tests.health = results;
    console.log('✅ Server Health tests completed');
    return results;
}

// Test endpoint discovery
async function testEndpointDiscovery() {
    console.log('🚀 Testing Endpoint Discovery...');

    const discoveryTests = [
        { url: `${BASE_URL}/api/nasa/planetary/apod`, description: 'APOD without params' },
        { url: `${BASE_URL}/api/apod/range`, description: 'APOD Range (POST)', method: 'POST', data: { startDate: '2024-01-01', endDate: '2024-01-07' } }
    ];

    const results = {};
    for (const test of discoveryTests) {
        results[test.description] = await measureRequest(test.url, test.description, test.method, test.data);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    testResults.tests.discovery = results;
    console.log('✅ Endpoint Discovery tests completed');
    return results;
}

// Generate detailed report
function generateDetailedReport() {
    console.log('\n📊 Detailed NASA API Integration Test Report');
    console.log('='.repeat(60));
    console.log(`📅 Test Date: ${testResults.timestamp}`);
    console.log('');

    // Summary statistics
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let totalTime = 0;
    let fastestTime = Infinity;
    let slowestTime = 0;

    Object.values(testResults.tests).forEach(category => {
        Object.values(category).forEach(test => {
            totalTests++;
            if (test.success) {
                passedTests++;
            } else {
                failedTests++;
            }
            if (test.responseTime) {
                totalTime += test.responseTime;
                fastestTime = Math.min(fastestTime, test.responseTime);
                slowestTime = Math.max(slowestTime, test.responseTime);
            }
        });
    });

    console.log('📊 Overall Summary:');
    console.log(`   - Total Tests: ${totalTests}`);
    console.log(`   - Passed: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
    console.log(`   - Failed: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);
    console.log(`   - Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`   - Average Response Time: ${totalTime / totalTests > 0 ? (totalTime / totalTests).toFixed(2) : 0}ms`);
    console.log(`   - Fastest Response: ${fastestTime === Infinity ? 0 : fastestTime}ms`);
    console.log(`   - Slowest Response: ${slowestTime}ms`);
    console.log('');

    // Detailed results by category
    Object.keys(testResults.tests).forEach(categoryName => {
        console.log(`📡 ${categoryName.toUpperCase()} Results:`);
        console.log('-'.repeat(40));

        Object.keys(testResults.tests[categoryName]).forEach(testName => {
            const test = testResults.tests[categoryName][testName];
            const status = test.success ? '✅' : '❌';
            const time = test.responseTime ? ` (${test.responseTime}ms)` : '';
            console.log(`   ${status} ${testName}${time}`);

            if (!test.success) {
                console.log(`      Error: ${test.statusText}`);
                console.log(`      Details: ${test.error}`);
                if (test.errorDetails) {
                    console.log(`      URL: ${test.errorDetails.config}`);
                    if (test.errorDetails.response) {
                        console.log(`      Response: ${JSON.stringify(test.errorDetails.response).substring(0, 100)}...`);
                    }
                }
            } else if (test.data) {
                // Show some data for successful tests
                if (typeof test.data === 'object') {
                    const keys = Object.keys(test.data);
                    console.log(`      Data: ${keys.join(', ')}`);

                    // Show specific data for successful APOD
                    if (test.data.title) {
                        console.log(`      Title: ${test.data.title}`);
                        console.log(`      Date: ${test.data.date}`);
                        console.log(`      Media: ${test.data.media_type}`);
                    }
                }
            }
            console.log('');
        });
    });

    // Cache performance analysis
    if (testResults.tests.cache && testResults.tests.cache.apod) {
        const cacheResults = testResults.tests.cache.apod;
        console.log('🔍 Cache Performance Analysis:');
        console.log(`   - First Request: ${cacheResults.firstRequest.responseTime}ms`);
        console.log(`   - Second Request: ${cacheResults.secondRequest.responseTime}ms`);
        console.log(`   - Performance Improvement: ${cacheResults.improvement}%`);
        console.log(`   - Cache Working: ${cacheResults.isFaster ? 'Yes' : 'No'}`);
        console.log('');
    }

    // Recommendations
    generateRecommendations();

    // Save detailed report
    const reportPath = __dirname + '/nasa_api_focused_test_report.json';
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
}

// Generate recommendations
function generateRecommendations() {
    console.log('💡 Recommendations:');
    console.log('='.repeat(30));

    let failedApiTests = 0;
    let totalApiTests = 0;

    if (testResults.tests.nasaProxy) {
        Object.values(testResults.tests.nasaProxy).forEach(test => {
            totalApiTests++;
            if (!test.success) failedApiTests++;
        });
    }

    const successRate = totalApiTests > 0 ? ((totalApiTests - failedApiTests) / totalApiTests) * 100 : 0;

    if (successRate < 80) {
        console.log('⚠️  API Health Issues:');
        console.log('   - Many API endpoints are returning errors');
        console.log('   - Check NASA API rate limits and key validity');
        console.log('   - Verify proxy middleware configuration');
        console.log('   - Consider implementing fallback data for failed endpoints');
    }

    if (testResults.tests.cache && testResults.tests.cache.apod) {
        const cacheResults = testResults.tests.cache.apod;
        if (!cacheResults.isFaster) {
            console.log('⚠️  Cache Issues:');
            console.log('   - Cache is not improving response times');
            console.log('   - Check Redis connection and configuration');
            console.log('   - Verify cache TTL settings');
        }
    }

    console.log('🔧 General Recommendations:');
    console.log('   - Monitor NASA API rate limits (DEMO_KEY has restrictions)');
    console.log('   - Implement proper error handling and fallback data');
    console.log('   - Add circuit breaker pattern for external API calls');
    console.log('   - Consider implementing async data fetching with retries');
}

// Main test execution
async function runTests() {
    console.log('🚀 Starting Focused NASA API Integration Tests...');
    console.log(`⏰ Test started at: ${new Date().toISOString()}`);
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log(`🔑 NASA API Key: ${NASA_API_KEY}`);
    console.log('');

    try {
        await testNASAProxy();
        await testEnhancedEndpoints();
        await testCachePerformance();
        await testServerHealth();
        await testEndpointDiscovery();

        generateDetailedReport();

    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    }
}

// Execute tests
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, testResults };