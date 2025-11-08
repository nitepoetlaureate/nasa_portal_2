#!/usr/bin/env node

/**
 * Comprehensive NASA API Integration Test Suite
 *
 * This script tests all NASA API integrations including:
 * - APOD (Astronomy Picture of the Day)
 * - NeoWs (Near-Earth Objects)
 * - DONKI (Space Weather)
 * - ISS Tracking
 * - EPIC (Earth Imagery)
 * - Mars Rover Photos
 *
 * It also tests:
 * - API response handling
 * - Error states
 * - Caching mechanisms
 * - Performance metrics
 * - Data processing
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3001';
const NASA_API_KEY = 'DEMO_KEY';
const TEST_TIMEOUT = 10000;

// Test results storage
const testResults = {
    timestamp: new Date().toISOString(),
    summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        apiResponseTimes: [],
        cacheHits: 0,
        cacheMisses: 0
    },
    tests: {}
};

// Helper function to measure response time
async function measureRequest(url, description) {
    const startTime = Date.now();
    try {
        const response = await axios.get(url, { timeout: TEST_TIMEOUT });
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        return {
            success: true,
            responseTime,
            status: response.status,
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
            error: error.message,
            description
        };
    }
}

// Helper function to test cache performance
async function testCachePerformance(url, cacheKey) {
    // First request (should be a cache miss)
    const firstRequest = await measureRequest(url, `Cache test - First request (${cacheKey})`);

    // Second request (should be a cache hit)
    const secondRequest = await measureRequest(url, `Cache test - Second request (${cacheKey})`);

    return {
        firstRequest,
        secondRequest,
        cachePerformance: secondRequest.responseTime < firstRequest.responseTime
    };
}

// Test APOD API
async function testAPODAPI() {
    console.log('🚀 Testing APOD API...');

    const testResults = {
        today: null,
        specificDate: null,
        enhanced: null,
        range: null,
        cache: null
    };

    // Test 1: Today's APOD
    testResults.today = await measureRequest(
        `${BASE_URL}/api/nasa/planetary/apod?api_key=${NASA_API_KEY}`,
        'Today\'s APOD'
    );

    // Test 2: Specific date APOD
    testResults.specificDate = await measureRequest(
        `${BASE_URL}/api/nasa/planetary/apod?api_key=${NASA_API_KEY}&date=2024-01-01`,
        'APOD for specific date (2024-01-01)'
    );

    // Test 3: Enhanced APOD
    testResults.enhanced = await measureRequest(
        `${BASE_URL}/api/apod/enhanced/2024-01-01`,
        'Enhanced APOD endpoint'
    );

    // Test 4: APOD Range
    try {
        const response = await axios.post(`${BASE_URL}/api/apod/range`, {
            startDate: '2024-01-01',
            endDate: '2024-01-07'
        }, { timeout: TEST_TIMEOUT });

        testResults.range = {
            success: true,
            responseTime: 0,
            status: response.status,
            data: response.data,
            description: 'APOD date range'
        };
    } catch (error) {
        testResults.range = {
            success: false,
            responseTime: 0,
            status: error.response?.status || 0,
            error: error.message,
            description: 'APOD date range'
        };
    }

    // Test 5: Cache performance
    testResults.cache = await testCachePerformance(
        `${BASE_URL}/api/nasa/planetary/apod?api_key=${NASA_API_KEY}`,
        'apod'
    );

    // Validate APOD data structure
    if (testResults.today.success) {
        const apod = testResults.today.data;
        const requiredFields = ['title', 'explanation', 'url', 'date'];
        const hasAllFields = requiredFields.every(field => field in apod);

        testResults.today.validStructure = hasAllFields;
        testResults.today.hasMedia = apod.media_type === 'image' || apod.media_type === 'video';
        testResults.today.hasExplanation = apod.explanation && apod.explanation.length > 0;
    }

    console.log('✅ APOD API tests completed');
    return testResults;
}

// Test NeoWs API
async function testNeoWsAPI() {
    console.log('🚀 Testing NeoWs API...');

    const testResults = {
        feed: null,
        feedByDate: null,
        lookup: null,
        browse: null,
        cache: null
    };

    // Test 1: NeoWs Feed
    testResults.feed = await measureRequest(
        `${BASE_URL}/api/nasa/neo/rest/v1/feed?api_key=${NASA_API_KEY}`,
        'NeoWs Feed (today)'
    );

    // Test 2: NeoWs Feed by Date
    testResults.feedByDate = await measureRequest(
        `${BASE_URL}/api/nasa/neo/rest/v1/feed?api_key=${NASA_API_KEY}&start_date=2024-01-01&end_date=2024-01-07`,
        'NeoWs Feed by date range'
    );

    // Test 3: NeoWs Lookup
    testResults.lookup = await measureRequest(
        `${BASE_URL}/api/nasa/neo/rest/v1/lookup?api_key=${NASA_API_KEY}&asteroid_id=3542517`,
        'NeoWs Lookup'
    );

    // Test 4: NeoWs Browse
    testResults.browse = await measureRequest(
        `${BASE_URL}/api/nasa/neo/rest/v1/neo/browse?api_key=${NASA_API_KEY}`,
        'NeoWs Browse'
    );

    // Test 5: Cache performance
    testResults.cache = await testCachePerformance(
        `${BASE_URL}/api/nasa/neo/rest/v1/feed?api_key=${NASA_API_KEY}`,
        'neo'
    );

    // Validate NeoWs data structure
    if (testResults.feed.success) {
        const neoData = testResults.feed.data;
        testResults.feed.hasNearEarthObjects = 'near_earth_objects' in neoData;
        testResults.feed.hasMetadata = neoData.element_count !== undefined;
    }

    console.log('✅ NeoWs API tests completed');
    return testResults;
}

// Test DONKI API
async function testDONKI_API() {
    console.log('🚀 Testing DONKI API...');

    const testResults = {
        cme: null,
        flr: null,
        sep: null,
        gst: null,
        mp: null,
        cache: null
    };

    // Test 1: CME (Coronal Mass Ejection)
    testResults.cme = await measureRequest(
        `${BASE_URL}/api/nasa/DONKI/CME?api_key=${NASA_API_KEY}&startDate=2024-01-01&endDate=2024-01-07`,
        'DONKI CME'
    );

    // Test 2: FLR (Solar Flare)
    testResults.flr = await measureRequest(
        `${BASE_URL}/api/nasa/DONKI/FLR?api_key=${NASA_API_KEY}&startDate=2024-01-01&endDate=2024-01-07`,
        'DONKI FLR'
    );

    // Test 3: SEP (Solar Energetic Particle)
    testResults.sep = await measureRequest(
        `${BASE_URL}/api/nasa/DONKI/SEP?api_key=${NASA_API_KEY}&startDate=2024-01-01&endDate=2024-01-07`,
        'DONKI SEP'
    );

    // Test 4: GST (Geomagnetic Storm)
    testResults.gst = await measureRequest(
        `${BASE_URL}/api/nasa/DONKI/GST?api_key=${NASA_API_KEY}&startDate=2024-01-01&endDate=2024-01-07`,
        'DONKI GST'
    );

    // Test 5: MP (Magnetopause Crossing)
    testResults.mp = await measureRequest(
        `${BASE_URL}/api/nasa/DONKI/MP?api_key=${NASA_API_KEY}&startDate=2024-01-01&endDate=2024-01-07`,
        'DONKI MP'
    );

    // Test 6: Cache performance
    testResults.cache = await testCachePerformance(
        `${BASE_URL}/api/nasa/DONKI/CME?api_key=${NASA_API_KEY}&startDate=2024-01-01&endDate=2024-01-07`,
        'donki'
    );

    console.log('✅ DONKI API tests completed');
    return testResults;
}

// Test ISS API
async function testISS_API() {
    console.log('🚀 Testing ISS API...');

    const testResults = {
        positions: null,
        telemetry: null,
        visibility: null,
        cache: null
    };

    // Test 1: ISS Positions
    testResults.positions = await measureRequest(
        `${BASE_URL}/api/nasa/iss/v1.positions?api_key=${NASA_API_KEY}&lat=40.0&lon=-75.0&alt=100&times=10`,
        'ISS Positions'
    );

    // Test 2: Enhanced ISS tracking (if available)
    testResults.telemetry = await measureRequest(
        `${BASE_URL}/api/iss/telemetry`,
        'ISS Telemetry'
    );

    // Test 3: ISS Visibility
    testResults.visibility = await measureRequest(
        `${BASE_URL}/api/iss/visibility?lat=40.0&lon=-75.0`,
        'ISS Visibility'
    );

    // Test 4: Cache performance
    testResults.cache = await testCachePerformance(
        `${BASE_URL}/api/nasa/iss/v1.positions?api_key=${NASA_API_KEY}&lat=40.0&lon=-75.0&alt=100&times=10`,
        'iss'
    );

    // Validate ISS data structure
    if (testResults.positions.success) {
        const issData = testResults.positions.data;
        testResults.positions.hasPositions = Array.isArray(issData.positionsn);
        testResults.positions.hasMetadata = issData.metadata !== undefined;
    }

    console.log('✅ ISS API tests completed');
    return testResults;
}

// Test EPIC API
async function testEPIC_API() {
    console.log('🚀 Testing EPIC API...');

    const testResults = {
        natural: null,
        naturalDate: null,
        enhanced: null,
        cache: null
    };

    // Test 1: EPIC Natural
    testResults.natural = await measureRequest(
        `${BASE_URL}/api/nasa/EPIC/api/natural/images?api_key=${NASA_API_KEY}`,
        'EPIC Natural Images'
    );

    // Test 2: EPIC Natural by Date
    testResults.naturalDate = await measureRequest(
        `${BASE_URL}/api/nasa/EPIC/api/natural/date/2024-01-01/images?api_key=${NASA_API_KEY}`,
        'EPIC Natural Images by Date'
    );

    // Test 3: Enhanced EPIC
    testResults.enhanced = await measureRequest(
        `${BASE_URL}/api/epic/enhanced/2024-01-01`,
        'Enhanced EPIC'
    );

    // Test 4: Cache performance
    testResults.cache = await testCachePerformance(
        `${BASE_URL}/api/nasa/EPIC/api/natural/images?api_key=${NASA_API_KEY}`,
        'epic'
    );

    // Validate EPIC data structure
    if (testResults.natural.success) {
        const epicData = testResults.natural.data;
        testResults.natural.hasImages = Array.isArray(epicData);
        testResults.natural.hasImageData = epicData.length > 0 && 'image' in epicData[0];
    }

    console.log('✅ EPIC API tests completed');
    return testResults;
}

// Test Mars Rover Photos API
async function testMarsRoverAPI() {
    console.log('🚀 Testing Mars Rover Photos API...');

    const testResults = {
        curiosity: null,
        opportunity: null,
        spirit: null,
        enhanced: null,
        cache: null
    };

    // Test 1: Curiosity Rover
    testResults.curiosity = await measureRequest(
        `${BASE_URL}/api/nasa/mars-photos/api/v1/rovers/curiosity/photos?earth_date=2024-01-01&api_key=${NASA_API_KEY}`,
        'Mars Rover - Curiosity'
    );

    // Test 2: Opportunity Rover
    testResults.opportunity = await measureRequest(
        `${BASE_URL}/api/nasa/mars-photos/api/v1/rovers/opportunity/photos?earth_date=2024-01-01&api_key=${NASA_API_KEY}`,
        'Mars Rover - Opportunity'
    );

    // Test 3: Spirit Rover
    testResults.spirit = await measureRequest(
        `${BASE_URL}/api/nasa/mars-photos/api/v1/rovers/spirit/photos?earth_date=2024-01-01&api_key=${NASA_API_KEY}`,
        'Mars Rover - Spirit'
    );

    // Test 4: Enhanced Mars Rover
    testResults.enhanced = await measureRequest(
        `${BASE_URL}/api/mars/enhanced/curiosity/2024-01-01`,
        'Enhanced Mars Rover'
    );

    // Test 5: Cache performance
    testResults.cache = await testCachePerformance(
        `${BASE_URL}/api/nasa/mars-photos/api/v1/rovers/curiosity/photos?earth_date=2024-01-01&api_key=${NASA_API_KEY}`,
        'mars'
    );

    // Validate Mars Rover data structure
    if (testResults.curiosity.success) {
        const roverData = testResults.curiosity.data;
        testResults.curiosity.hasPhotos = Array.isArray(roverData.photos);
        testResults.curiosity.hasImageData = roverData.photos.length > 0 && 'img_src' in roverData.photos[0];
    }

    console.log('✅ Mars Rover API tests completed');
    return testResults;
}

// Test overall server health and metrics
async function testServerHealth() {
    console.log('🚀 Testing Server Health...');

    const health = await measureRequest(
        `${BASE_URL}/health`,
        'Server Health Check'
    );

    const metrics = await measureRequest(
        `${BASE_URL}/metrics`,
        'Server Metrics'
    );

    const streamStatus = await measureRequest(
        `${BASE_URL}/api/streams/status`,
        'Stream Status'
    );

    return {
        health,
        metrics,
        streamStatus
    };
}

// Main test execution
async function runTests() {
    console.log('🚀 Starting Comprehensive NASA API Integration Tests...');
    console.log(`⏰ Test started at: ${new Date().toISOString()}`);
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log(`🔑 NASA API Key: ${NASA_API_KEY}`);
    console.log('');

    try {
        // Run all API tests
        testResults.tests.apod = await testAPODAPI();
        testResults.tests.neows = await testNeoWsAPI();
        testResults.tests.donki = await testDONKI_API();
        testResults.tests.iss = await testISS_API();
        testResults.tests.epic = await testEPIC_API();
        testResults.tests.mars = await testMarsRoverAPI();
        testResults.tests.server = await testServerHealth();

        // Calculate summary statistics
        testResults.summary.totalTests = Object.keys(testResults.tests).length * 5; // Approximate test count

        // Count passed/failed tests
        Object.keys(testResults.tests).forEach(apiName => {
            const apiTests = testResults.tests[apiName];
            Object.values(apiTests).forEach(test => {
                if (test && typeof test.success === 'boolean') {
                    testResults.summary.totalTests++;
                    if (test.success) {
                        testResults.summary.passedTests++;
                    } else {
                        testResults.summary.failedTests++;
                    }

                    // Track response times
                    if (test.responseTime) {
                        testResults.summary.apiResponseTimes.push(test.responseTime);
                    }
                }
            });
        });

        // Calculate cache performance
        Object.values(testResults.tests).forEach(apiTests => {
            if (apiTests && apiTests.cache) {
                if (apiTests.cache.cachePerformance) {
                    testResults.summary.cacheHits++;
                } else {
                    testResults.summary.cacheMisses++;
                }
            }
        });

        // Generate test report
        generateReport();

    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
    }
}

// Generate test report
function generateReport() {
    console.log('\n📊 NASA API Integration Test Report');
    console.log('='.repeat(50));
    console.log(`📅 Test Date: ${testResults.timestamp}`);
    console.log(`📊 Summary:`);
    console.log(`   - Total Tests: ${testResults.summary.totalTests}`);
    console.log(`   - Passed: ${testResults.summary.passedTests} (${((testResults.summary.passedTests / testResults.summary.totalTests) * 100).toFixed(1)}%)`);
    console.log(`   - Failed: ${testResults.summary.failedTests} (${((testResults.summary.failedTests / testResults.summary.totalTests) * 100).toFixed(1)}%)`);
    console.log(`   - Average Response Time: ${testResults.summary.apiResponseTimes.length > 0 ? (testResults.summary.apiResponseTimes.reduce((a, b) => a + b, 0) / testResults.summary.apiResponseTimes.length).toFixed(2) : 0}ms`);
    console.log(`   - Cache Hit Rate: ${testResults.summary.cacheHits + testResults.summary.cacheMisses > 0 ? ((testResults.summary.cacheHits / (testResults.summary.cacheHits + testResults.summary.cacheMisses)) * 100).toFixed(1) : 0}%`);
    console.log('');

    // Detailed API results
    Object.keys(testResults.tests).forEach(apiName => {
        console.log(`📡 ${apiName.toUpperCase()} API Results:`);
        const apiTests = testResults.tests[apiName];

        Object.keys(apiTests).forEach(testName => {
            const test = apiTests[testName];
            if (test && typeof test.success === 'boolean') {
                const status = test.success ? '✅' : '❌';
                const time = test.responseTime ? ` (${test.responseTime}ms)` : '';
                console.log(`   ${status} ${testName}: ${test.description}${time}`);
            }
        });
        console.log('');
    });

    // Save detailed report
    const reportPath = path.join(__dirname, 'nasa_api_test_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);

    // Performance assessment
    assessPerformance();
}

// Performance assessment
function assessPerformance() {
    console.log('📈 Performance Assessment:');
    console.log('='.repeat(30));

    const avgResponseTime = testResults.summary.apiResponseTimes.length > 0
        ? testResults.summary.apiResponseTimes.reduce((a, b) => a + b, 0) / testResults.summary.apiResponseTimes.length
        : 0;

    const maxResponseTime = Math.max(...testResults.summary.apiResponseTimes);
    const minResponseTime = Math.min(...testResults.summary.apiResponseTimes);

    console.log(`⚡ Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`🎯 Min Response Time: ${minResponseTime}ms`);
    console.log(`⏱️  Max Response Time: ${maxResponseTime}ms`);
    console.log(`📊 Cache Hit Rate: ${testResults.summary.cacheHits + testResults.summary.cacheMisses > 0 ? ((testResults.summary.cacheHits / (testResults.summary.cacheHits + testResults.summary.cacheMisses)) * 100).toFixed(1) : 0}%`);
    console.log('');

    // Performance recommendations
    if (avgResponseTime > 1000) {
        console.log('⚠️  Performance Alert: High average response time detected');
        console.log('💡 Recommendations:');
        console.log('   - Check Redis cache configuration');
        console.log('   - Consider implementing response caching');
        console.log('   - Optimize API endpoint routing');
    }

    if (testResults.summary.cacheHits / (testResults.summary.cacheHits + testResults.summary.cacheMisses) < 0.8) {
        console.log('⚠️  Cache Alert: Low cache hit rate detected');
        console.log('💡 Recommendations:');
        console.log('   - Review cache TTL settings');
        console.log('   - Implement cache warming strategies');
        console.log('   - Check cache key generation logic');
    }

    console.log('\n🎯 Success Criteria Assessment:');
    const successRate = (testResults.summary.passedTests / testResults.summary.totalTests) * 100;

    if (successRate >= 90) {
        console.log('🟢 EXCELLENT: Success rate above 90%');
    } else if (successRate >= 80) {
        console.log('🟡 GOOD: Success rate above 80%');
    } else if (successRate >= 70) {
        console.log('🟠 MODERATE: Success rate above 70%');
    } else {
        console.log('🔴 POOR: Success rate below 70%');
    }

    console.log(`📊 Final Success Rate: ${successRate.toFixed(1)}%`);
}

// Execute tests
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, testResults };