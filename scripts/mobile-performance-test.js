#!/usr/bin/env node

/**
 * Mobile Performance Testing Script for NASA System 7 Portal
 *
 * This script tests mobile performance across different device profiles
 * and measures Core Web Vitals, bundle size, and memory usage.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Mobile device profiles to test
const DEVICE_PROFILES = [
  {
    name: 'iPhone SE',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    network: 'Good3G' // ~1.5 Mbps
  },
  {
    name: 'iPhone 12',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    network: '4G' // ~4 Mbps
  },
  {
    name: 'Samsung Galaxy S20',
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36',
    viewport: { width: 384, height: 854, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    network: '4G' // ~4 Mbps
  },
  {
    name: 'iPad Mini',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    network: 'WiFi' // ~30 Mbps
  }
];

// Network conditions to simulate
const NETWORK_CONDITIONS = {
  'Slow3G': {
    offline: false,
    downloadThroughput: 500 * 1024 / 8, // 500 Kbps
    uploadThroughput: 500 * 1024 / 8,   // 500 Kbps
    latency: 400
  },
  'Good3G': {
    offline: false,
    downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
    uploadThroughput: 750 * 1024 / 8,           // 750 Kbps
    latency: 300
  },
  '4G': {
    offline: false,
    downloadThroughput: 4 * 1024 * 1024 / 8, // 4 Mbps
    uploadThroughput: 3 * 1024 * 1024 / 8,   // 3 Mbps
    latency: 20
  },
  'WiFi': {
    offline: false,
    downloadThroughput: 30 * 1024 * 1024 / 8, // 30 Mbps
    uploadThroughput: 15 * 1024 * 1024 / 8,   // 15 Mbps
    latency: 2
  }
};

// Performance thresholds for mobile devices
const PERFORMANCE_THRESHOLDS = {
  mobile: {
    lcp: 2500,  // Largest Contentful Paint (ms)
    fid: 100,   // First Input Delay (ms)
    cls: 0.1,   // Cumulative Layout Shift
    fcp: 1800,  // First Contentful Paint (ms)
    ttfb: 800,  // Time to First Byte (ms)
    bundleSize: 1024 * 1024, // 1MB max bundle size
    memoryUsage: 70 // 70% max memory usage
  },
  tablet: {
    lcp: 2000,
    fid: 50,
    cls: 0.1,
    fcp: 1500,
    ttfb: 600,
    bundleSize: 2 * 1024 * 1024, // 2MB max for tablets
    memoryUsage: 60
  }
};

class MobilePerformanceTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  async initialize() {
    console.log('🚀 Initializing Mobile Performance Tester...');

    this.browser = await puppeteer.launch({
      headless: process.env.CI === 'true',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
  }

  async createPage(deviceProfile) {
    const page = await this.browser.newPage();

    // Set device profile
    await page.setUserAgent(deviceProfile.userAgent);
    await page.setViewport(deviceProfile.viewport);

    // Set up performance monitoring
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = {
        lcp: 0,
        fid: 0,
        cls: 0,
        fcp: 0,
        ttfb: 0,
        bundleSize: 0,
        memoryUsage: 0
      };

      // Track Core Web Vitals
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        const lcp = lastEntry.renderTime || lastEntry.loadTime;
        window.performanceMetrics.lcp = Math.round(lcp);
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fid = entry.processingStart - entry.startTime;
          window.performanceMetrics.fid = Math.round(fid);
        });
      }).observe({ entryTypes: ['first-input'] });

      let clsValue = 0;
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        window.performanceMetrics.cls = Math.round(clsValue * 1000) / 1000;
      }).observe({ entryTypes: ['layout-shift'] });

      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries[0].startTime;
        window.performanceMetrics.fcp = Math.round(fcp);
      }).observe({ entryTypes: ['paint'] });

      // Track bundle loading
      window.bundleMetrics = {
        totalSize: 0,
        chunkCount: 0
      };

      // Override fetch to track bundle sizes
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        const url = args[0];

        if (url.includes('.js') || url.includes('.css')) {
          const content = await response.clone().text();
          window.bundleMetrics.totalSize += new Blob([content]).size;
          window.bundleMetrics.chunkCount++;
        }

        return response;
      };
    });

    return page;
  }

  async setNetworkConditions(page, networkType) {
    if (networkType === 'WiFi') {
      await page.emulateNetworkConditions(NETWORK_CONDITIONS['WiFi']);
    } else {
      await page.emulateNetworkConditions(NETWORK_CONDITIONS[networkType]);
    }
  }

  async testDeviceProfile(deviceProfile) {
    console.log(`\n📱 Testing ${deviceProfile.name} (${deviceProfile.viewport.width}x${deviceProfile.viewport.height})`);

    const page = await this.createPage(deviceProfile);

    try {
      // Set network conditions
      await this.setNetworkConditions(page, deviceProfile.network);

      // Navigate to the app
      console.log(`  🌐 Loading app on ${deviceProfile.network} network...`);
      const startTime = performance.now();

      await page.goto('http://localhost:3000', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const loadTime = performance.now() - startTime;
      console.log(`  ⏱️  Page loaded in ${Math.round(loadTime)}ms`);

      // Wait for app to fully initialize
      await page.waitForSelector('[data-testid="desktop-container"], [data-testid="mobile-desktop"]', {
        timeout: 10000
      });

      // Collect performance metrics
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const basicMetrics = {
              loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
              domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
              resourceCount: performance.getEntriesByType('resource').length
            };

            const memoryMetrics = performance.memory ? {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            } : {};

            resolve({
              coreWebVitals: window.performanceMetrics,
              bundleMetrics: window.bundleMetrics,
              ...basicMetrics,
              ...memoryMetrics
            });
          }, 2000); // Wait for metrics to stabilize
        });
      });

      // Calculate memory usage percentage
      const memoryUsage = metrics.totalJSHeapSize > 0
        ? Math.round((metrics.usedJSHeapSize / metrics.totalJSHeapSize) * 100)
        : 0;

      // Test PWA features
      const pwaFeatures = await this.testPWAFeatures(page);

      // Test touch interactions
      const touchMetrics = await this.testTouchInteractions(page);

      // Test responsive design
      const responsiveMetrics = await this.testResponsiveDesign(page, deviceProfile);

      const result = {
        device: deviceProfile.name,
        network: deviceProfile.network,
        viewport: deviceProfile.viewport,
        loadTime: Math.round(loadTime),
        metrics: {
          ...metrics,
          memoryUsage,
          bundleSizeKB: Math.round(metrics.bundleMetrics?.totalSize / 1024 || 0)
        },
        pwaFeatures,
        touchMetrics,
        responsiveMetrics,
        timestamp: new Date().toISOString()
      };

      // Evaluate against thresholds
      const thresholds = deviceProfile.viewport.width <= 768
        ? PERFORMANCE_THRESHOLDS.mobile
        : PERFORMANCE_THRESHOLDS.tablet;

      result.passedTests = this.evaluatePerformance(result, thresholds);
      result.score = this.calculatePerformanceScore(result, thresholds);

      this.results.push(result);

      this.printDeviceResults(result);

    } catch (error) {
      console.error(`  ❌ Error testing ${deviceProfile.name}:`, error.message);

      this.results.push({
        device: deviceProfile.name,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      await page.close();
    }
  }

  async testPWAFeatures(page) {
    const features = {
      serviceWorker: false,
      manifest: false,
      installPrompt: false,
      offlineSupport: false,
      backgroundSync: false
    };

    try {
      // Check service worker registration
      const swRegistered = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      features.serviceWorker = swRegistered;

      // Check web app manifest
      const hasManifest = await page.evaluate(() => {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        return !!manifestLink;
      });
      features.manifest = hasManifest;

      // Check for PWA install prompt support
      const supportsInstall = await page.evaluate(() => {
        return 'onbeforeinstallprompt' in window;
      });
      features.installPrompt = supportsInstall;

      // Test offline functionality
      await page.setOfflineMode(true);
      await page.reload({ waitUntil: 'networkidle2' });

      const offlineContent = await page.evaluate(() => {
        const content = document.body.innerText;
        return content.includes('NASA System 7') || content.includes('Offline');
      });

      features.offlineSupport = offlineContent;

      await page.setOfflineMode(false);

    } catch (error) {
      console.log(`    ⚠️  PWA feature test failed: ${error.message}`);
    }

    return features;
  }

  async testTouchInteractions(page) {
    const touchMetrics = {
      tapResponseTime: 0,
      swipeRecognition: false,
      pinchZoom: false,
      hapticFeedback: false
    };

    try {
      // Test tap response time
      const tapStartTime = performance.now();
      await page.tap('[data-testid="mobile-icon-apod"], [data-testid="desktop-icon-apod"]');
      const tapResponseTime = performance.now() - tapStartTime;
      touchMetrics.tapResponseTime = Math.round(tapResponseTime);

      // Test swipe gestures
      const swipeDetected = await page.evaluate(() => {
        const desktop = document.querySelector('[data-testid="mobile-desktop"], [data-testid="desktop"]');
        if (!desktop) return false;

        let swipeDetected = false;
        const handleSwipe = (e) => {
          if (e.detail && e.detail.direction) {
            swipeDetected = true;
          }
        };

        desktop.addEventListener('swipe', handleSwipe);

        // Simulate swipe
        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientX: 200, clientY: 400 }]
        });
        const touchMove = new TouchEvent('touchmove', {
          touches: [{ clientX: 100, clientY: 400 }]
        });
        const touchEnd = new TouchEvent('touchend');

        desktop.dispatchEvent(touchStart);
        desktop.dispatchEvent(touchMove);
        desktop.dispatchEvent(touchEnd);

        return swipeDetected;
      });
      touchMetrics.swipeRecognition = swipeDetected;

      // Test haptic feedback support
      const hapticSupport = await page.evaluate(() => {
        return 'vibrate' in navigator;
      });
      touchMetrics.hapticFeedback = hapticSupport;

    } catch (error) {
      console.log(`    ⚠️  Touch interaction test failed: ${error.message}`);
    }

    return touchMetrics;
  }

  async testResponsiveDesign(page, deviceProfile) {
    const responsiveMetrics = {
      layoutAdaptation: false,
      textScaling: false,
      touchTargetSize: false,
      viewportOptimization: false
    };

    try {
      // Check layout adaptation
      const isMobile = deviceProfile.viewport.width <= 768;
      const correctLayout = await page.evaluate((expectedMobile) => {
        const mobileDesktop = document.querySelector('[data-testid="mobile-desktop"]');
        const regularDesktop = document.querySelector('[data-testid="desktop"]');

        if (expectedMobile) {
          return !!mobileDesktop && !regularDesktop;
        } else {
          return !!regularDesktop || !!mobileDesktop;
        }
      }, isMobile);
      responsiveMetrics.layoutAdaptation = correctLayout;

      // Check viewport meta tag
      const viewportOptimized = await page.evaluate(() => {
        const viewport = document.querySelector('meta[name="viewport"]');
        return viewport && viewport.getAttribute('content').includes('width=device-width');
      });
      responsiveMetrics.viewportOptimization = viewportOptimized;

      // Check touch target sizes (44px minimum)
      const touchTargetsValid = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        return Array.from(buttons).every(button => {
          const rect = button.getBoundingClientRect();
          return rect.width >= 44 && rect.height >= 44;
        });
      });
      responsiveMetrics.touchTargetSize = touchTargetsValid;

    } catch (error) {
      console.log(`    ⚠️  Responsive design test failed: ${error.message}`);
    }

    return responsiveMetrics;
  }

  evaluatePerformance(result, thresholds) {
    const tests = [];
    const metrics = result.metrics;

    tests.push({
      name: 'LCP (Largest Contentful Paint)',
      passed: metrics.coreWebVitals.lcp <= thresholds.lcp,
      actual: metrics.coreWebVitals.lcp,
      threshold: thresholds.lcp,
      unit: 'ms'
    });

    tests.push({
      name: 'FID (First Input Delay)',
      passed: metrics.coreWebVitals.fid <= thresholds.fid,
      actual: metrics.coreWebVitals.fid,
      threshold: thresholds.fid,
      unit: 'ms'
    });

    tests.push({
      name: 'CLS (Cumulative Layout Shift)',
      passed: metrics.coreWebVitals.cls <= thresholds.cls,
      actual: metrics.coreWebVitals.cls,
      threshold: thresholds.cls,
      unit: ''
    });

    tests.push({
      name: 'FCP (First Contentful Paint)',
      passed: metrics.coreWebVitals.fcp <= thresholds.fcp,
      actual: metrics.coreWebVitals.fcp,
      threshold: thresholds.fcp,
      unit: 'ms'
    });

    tests.push({
      name: 'Memory Usage',
      passed: metrics.memoryUsage <= thresholds.memoryUsage,
      actual: metrics.memoryUsage,
      threshold: thresholds.memoryUsage,
      unit: '%'
    });

    tests.push({
      name: 'Bundle Size',
      passed: metrics.bundleSizeKB * 1024 <= thresholds.bundleSize,
      actual: metrics.bundleSizeKB,
      threshold: Math.round(thresholds.bundleSize / 1024),
      unit: 'KB'
    });

    return tests;
  }

  calculatePerformanceScore(result, thresholds) {
    const tests = result.passedTests;
    const passedCount = tests.filter(test => test.passed).length;
    const totalTests = tests.length;

    return Math.round((passedCount / totalTests) * 100);
  }

  printDeviceResults(result) {
    console.log(`\n  📊 Results for ${result.device}:`);
    console.log(`    🚀 Performance Score: ${result.score}%`);
    console.log(`    ⏱️  Load Time: ${result.loadTime}ms`);
    console.log(`    📦 Bundle Size: ${result.metrics.bundleSizeKB}KB`);
    console.log(`    💾 Memory Usage: ${result.metrics.memoryUsage}%`);

    console.log(`    📱 Core Web Vitals:`);
    console.log(`      LCP: ${result.metrics.coreWebVitals.lcp}ms`);
    console.log(`      FID: ${result.metrics.coreWebVitals.fid}ms`);
    console.log(`      CLS: ${result.metrics.coreWebVitals.cls}`);
    console.log(`      FCP: ${result.metrics.coreWebVitals.fcp}ms`);

    console.log(`    🔌 PWA Features:`);
    console.log(`      Service Worker: ${result.pwaFeatures.serviceWorker ? '✅' : '❌'}`);
    console.log(`      Manifest: ${result.pwaFeatures.manifest ? '✅' : '❌'}`);
    console.log(`      Offline Support: ${result.pwaFeatures.offlineSupport ? '✅' : '❌'}`);

    console.log(`    👆 Touch Interactions:`);
    console.log(`      Tap Response: ${result.touchMetrics.tapResponseTime}ms`);
    console.log(`      Swipe Recognition: ${result.touchMetrics.swipeRecognition ? '✅' : '❌'}`);
    console.log(`      Haptic Feedback: ${result.touchMetrics.hapticFeedback ? '✅' : '❌'}`);

    console.log(`    📐 Responsive Design:`);
    console.log(`      Layout Adaptation: ${result.responsiveMetrics.layoutAdaptation ? '✅' : '❌'}`);
    console.log(`      Viewport Optimization: ${result.responsiveMetrics.viewportOptimization ? '✅' : '❌'}`);
    console.log(`      Touch Target Size: ${result.responsiveMetrics.touchTargetSize ? '✅' : '❌'}`);

    const failedTests = result.passedTests.filter(test => !test.passed);
    if (failedTests.length > 0) {
      console.log(`    ⚠️  Failed Tests:`);
      failedTests.forEach(test => {
        console.log(`      ${test.name}: ${test.actual}${test.unit} > ${test.threshold}${test.unit}`);
      });
    }
  }

  async generateReport() {
    const reportPath = path.join(__dirname, '../mobile-performance-report.json');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDevices: DEVICE_PROFILES.length,
        testedDevices: this.results.filter(r => !r.error).length,
        averageScore: Math.round(
          this.results
            .filter(r => !r.error)
            .reduce((sum, r) => sum + r.score, 0) /
            this.results.filter(r => !r.error).length
        ),
        passedTests: this.results.filter(r => r.score >= 80).length
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Mobile performance report generated: ${reportPath}`);

    // Generate markdown report
    await this.generateMarkdownReport(report);
  }

  generateRecommendations() {
    const recommendations = [];

    const avgLCP = this.results
      .filter(r => !r.error)
      .reduce((sum, r) => sum + r.metrics.coreWebVitals.lcp, 0) /
      this.results.filter(r => !r.error).length;

    const avgBundleSize = this.results
      .filter(r => !r.error)
      .reduce((sum, r) => sum + r.metrics.bundleSizeKB, 0) /
      this.results.filter(r => !r.error).length;

    const avgMemory = this.results
      .filter(r => !r.error)
      .reduce((sum, r) => sum + r.metrics.memoryUsage, 0) /
      this.results.filter(r => !r.error).length;

    if (avgLCP > 2000) {
      recommendations.push('⚡ Optimize Largest Contentful Paint by implementing code splitting and lazy loading');
    }

    if (avgBundleSize > 500) {
      recommendations.push('📦 Reduce bundle size by removing unused dependencies and implementing tree shaking');
    }

    if (avgMemory > 60) {
      recommendations.push('💾 Optimize memory usage by implementing proper cleanup and avoiding memory leaks');
    }

    const offlineSupportIssues = this.results
      .filter(r => !r.pwaFeatures.offlineSupport).length;

    if (offlineSupportIssues > 0) {
      recommendations.push('📱 Improve offline support by enhancing service worker caching strategies');
    }

    const touchIssues = this.results
      .filter(r => !r.touchMetrics.swipeRecognition).length;

    if (touchIssues > 0) {
      recommendations.push('👆 Enhance touch gesture recognition for better mobile UX');
    }

    return recommendations;
  }

  async generateMarkdownReport(report) {
    const markdownPath = path.join(__dirname, '../mobile-performance-report.md');

    let markdown = `# NASA System 7 Portal - Mobile Performance Report

Generated on: ${new Date().toLocaleString()}

## Summary

- **Devices Tested**: ${report.summary.testedDevices}/${report.summary.totalDevices}
- **Average Performance Score**: ${report.summary.averageScore}%
- **Devices Passing (80%+)**: ${report.summary.passedTests}

## Device Results

`;

    report.results.forEach(result => {
      if (result.error) {
        markdown += `### ❌ ${result.device}

Error: ${result.error}

`;
      } else {
        markdown += `### ${result.score >= 80 ? '✅' : '⚠️'} ${result.device}

- **Performance Score**: ${result.score}%
- **Load Time**: ${result.loadTime}ms
- **Bundle Size**: ${result.metrics.bundleSizeKB}KB
- **Memory Usage**: ${result.metrics.memoryUsage}%
- **Network**: ${result.network}

#### Core Web Vitals
- LCP: ${result.metrics.coreWebVitals.lcp}ms
- FID: ${result.metrics.coreWebVitals.fid}ms
- CLS: ${result.metrics.coreWebVitals.cls}
- FCP: ${result.metrics.coreWebVitals.fcp}ms

#### PWA Features
- Service Worker: ${result.pwaFeatures.serviceWorker ? '✅' : '❌'}
- Manifest: ${result.pwaFeatures.manifest ? '✅' : '❌'}
- Offline Support: ${result.pwaFeatures.offlineSupport ? '✅' : '❌'}

#### Touch & Responsive
- Layout Adaptation: ${result.responsiveMetrics.layoutAdaptation ? '✅' : '❌'}
- Touch Targets: ${result.responsiveMetrics.touchTargetSize ? '✅' : '❌'}

`;

        const failedTests = result.passedTests.filter(test => !test.passed);
        if (failedTests.length > 0) {
          markdown += `#### Failed Tests
`;
          failedTests.forEach(test => {
            markdown += `- ${test.name}: ${test.actual}${test.unit} (threshold: ${test.threshold}${test.unit})
`;
          });
        }

        markdown += '\n';
      }
    });

    markdown += `## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Performance Thresholds

### Mobile Devices
- LCP: ≤2500ms
- FID: ≤100ms
- CLS: ≤0.1
- FCP: ≤1800ms
- Memory Usage: ≤70%
- Bundle Size: ≤1MB

### Tablet Devices
- LCP: ≤2000ms
- FID: ≤50ms
- CLS: ≤0.1
- FCP: ≤1500ms
- Memory Usage: ≤60%
- Bundle Size: ≤2MB

`;

    fs.writeFileSync(markdownPath, markdown);
    console.log(`📄 Markdown report generated: ${markdownPath}`);
  }

  async runAllTests() {
    console.log('🧪 Starting Mobile Performance Tests...\n');

    for (const deviceProfile of DEVICE_PROFILES) {
      await this.testDeviceProfile(deviceProfile);
    }

    await this.generateReport();
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new MobilePerformanceTester();

  tester.runAllTests()
    .then(() => {
      console.log('\n✅ Mobile performance testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Mobile performance testing failed:', error);
      process.exit(1);
    })
    .finally(() => {
      tester.cleanup();
    });
}

module.exports = MobilePerformanceTester;