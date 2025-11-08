#!/usr/bin/env node

/**
 * PWA Validation Script for NASA System 7 Portal
 *
 * This script validates Progressive Web App compliance and features
 * including service worker, manifest, caching strategies, and offline functionality.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PWAValidator {
  constructor() {
    this.results = {
      manifest: {},
      serviceWorker: {},
      caching: {},
      offline: {},
      accessibility: {},
      performance: {},
      overall: { score: 0, issues: [], recommendations: [] }
    };
  }

  async validateManifest() {
    console.log('📋 Validating Web App Manifest...');

    const manifestPath = path.join(__dirname, '../client/public/manifest.json');

    if (!fs.existsSync(manifestPath)) {
      this.results.manifest.valid = false;
      this.results.manifest.error = 'Manifest file not found';
      return;
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      const requiredFields = ['name', 'short_name', 'start_url', 'display', 'background_color', 'theme_color'];
      const missingFields = requiredFields.filter(field => !manifest[field]);

      this.results.manifest = {
        valid: missingFields.length === 0,
        missingFields,
        hasName: !!manifest.name,
        hasShortName: !!manifest.short_name,
        hasStartUrl: !!manifest.start_url,
        hasDisplay: !!manifest.display,
        hasBackgroundColor: !!manifest.background_color,
        hasThemeColor: !!manifest.theme_color,
        hasOrientation: !!manifest.orientation,
        hasIcons: !!manifest.icons && manifest.icons.length > 0,
        hasShortcuts: !!manifest.shortcuts && manifest.shortcuts.length > 0,
        hasScreenshots: !!manifest.screenshots && manifest.screenshots.length > 0,
        displayMode: manifest.display,
        iconCount: manifest.icons ? manifest.icons.length : 0,
        shortcutCount: manifest.shortcuts ? manifest.shortcuts.length : 0,
        categories: manifest.categories || [],
        data: manifest
      };

      // Validate icon sizes
      if (manifest.icons) {
        const requiredSizes = ['72', '96', '128', '144', '152', '192', '384', '512'];
        const iconSizes = manifest.icons.map(icon => icon.sizes).filter(Boolean);

        this.results.manifest.hasRequiredIconSizes = requiredSizes.every(size =>
          iconSizes.some(sizes => sizes.includes(size))
        );

        this.results.manifest.hasMaskableIcons = manifest.icons.some(icon =>
          icon.purpose && icon.purpose.includes('maskable')
        );
      }

      // Validate shortcuts
      if (manifest.shortcuts) {
        this.results.manifest.shortcutValid = manifest.shortcuts.every(shortcut =>
          shortcut.name && shortcut.url && shortcut.icons && shortcut.icons.length > 0
        );
      }

      console.log(`  ${this.results.manifest.valid ? '✅' : '❌'} Manifest validation complete`);

    } catch (error) {
      this.results.manifest.valid = false;
      this.results.manifest.error = error.message;
      console.log(`  ❌ Manifest validation failed: ${error.message}`);
    }
  }

  async validateServiceWorker() {
    console.log('🔧 Validating Service Worker...');

    const swPath = path.join(__dirname, '../client/public/sw.js');

    if (!fs.existsSync(swPath)) {
      this.results.serviceWorker.valid = false;
      this.results.serviceWorker.error = 'Service worker file not found';
      return;
    }

    try {
      const swContent = fs.readFileSync(swPath, 'utf8');

      // Check for essential service worker features
      const features = {
        hasInstallEvent: swContent.includes('addEventListener(\'install\''),
        hasActivateEvent: swContent.includes('addEventListener(\'activate\''),
        hasFetchEvent: swContent.includes('addEventListener(\'fetch\''),
        hasCacheAPI: swContent.includes('caches.open') && swContent.includes('cache.put'),
        hasSkipWaiting: swContent.includes('skipWaiting()'),
        hasClientsClaim: swContent.includes('clients.claim()'),
        hasCacheCleanup: swContent.includes('caches.delete') || swContent.includes('cacheNames'),
        hasNetworkStrategies: swContent.includes('cache-first') ||
                           swContent.includes('network-first') ||
                           swContent.includes('stale-while-revalidate'),
        hasOfflineFallback: swContent.includes('offline') || swContent.includes('fallback'),
        hasBackgroundSync: swContent.includes('addEventListener(\'sync\''),
        hasPushNotifications: swContent.includes('addEventListener(\'push\''),
        hasPerformanceMonitoring: swContent.includes('performance') || swContent.includes('metrics')
      };

      // Check for NASA-specific caching
      const nasaFeatures = {
        cachesNASAData: swContent.includes('nasa') && swContent.includes('cache'),
        hasAPICaching: swContent.includes('api') && swContent.includes('cache'),
        hasStaleWhileRevalidate: swContent.includes('stale') && swContent.includes('revalidate'),
        handlesNASAEndpoints: swContent.includes('apod') || swContent.includes('neo') || swContent.includes('mars')
      };

      // Analyze cache strategies
      const cacheStrategies = {
        staticCache: swContent.includes('static') && swContent.includes('cache'),
        dynamicCache: swContent.includes('dynamic') && swContent.includes('cache'),
        dataCache: swContent.includes('data') && swContent.includes('cache'),
        versionedCaches: swContent.includes('v1.0.0') || /v\d+\.\d+\.\d+/.test(swContent)
      };

      this.results.serviceWorker = {
        valid: features.hasInstallEvent && features.hasActivateEvent && features.hasFetchEvent && features.hasCacheAPI,
        features,
        nasaFeatures,
        cacheStrategies,
        fileSize: Math.round(swContent.length / 1024), // KB
        lineCount: swContent.split('\n').length,
        hasErrorHandling: swContent.includes('try') && swContent.includes('catch'),
        hasConsoleLogging: swContent.includes('console.log') || swContent.includes('console.warn'),
        hasCacheStats: swContent.includes('cache') && swContent.includes('stats')
      };

      console.log(`  ${this.results.serviceWorker.valid ? '✅' : '❌'} Service worker validation complete`);
      console.log(`  📦 Service worker size: ${this.results.serviceWorker.fileSize}KB`);

    } catch (error) {
      this.results.serviceWorker.valid = false;
      this.results.serviceWorker.error = error.message;
      console.log(`  ❌ Service worker validation failed: ${error.message}`);
    }
  }

  async validateCachingStrategies() {
    console.log('💾 Validating Caching Strategies...');

    try {
      // This would typically be tested with a running server
      // For now, we'll validate the service worker caching logic

      const swPath = path.join(__dirname, '../client/public/sw.js');
      const swContent = fs.readFileSync(swPath, 'utf8');

      const strategies = {
        staticAssets: {
          implemented: swContent.includes('STATIC_CACHE') || swContent.includes('static'),
          strategy: this.detectCachingStrategy(swContent, 'static'),
          assets: this.extractCachedAssets(swContent, 'static')
        },
        nasaData: {
          implemented: swContent.includes('NASA_DATA_CACHE') || swContent.includes('nasa'),
          strategy: this.detectCachingStrategy(swContent, 'nasa'),
          endpoints: this.extractNASAEndpoints(swContent)
        },
        dynamicContent: {
          implemented: swContent.includes('DYNAMIC_CACHE') || swContent.includes('dynamic'),
          strategy: this.detectCachingStrategy(swContent, 'dynamic')
        }
      };

      const validation = {
        hasVersionedCaches: /v\d+\.\d+\.\d+/.test(swContent),
        hasCacheExpiration: swContent.includes('expire') || swContent.includes('ttl'),
        hasCacheLimit: swContent.includes('limit') || swContent.includes('max'),
        hasBackgroundSync: swContent.includes('sync') && swContent.includes('background'),
        handlesCacheErrors: swContent.includes('catch') && swContent.includes('cache'),
        providesOfflineFallbacks: swContent.includes('offline') || swContent.includes('fallback')
      };

      this.results.caching = {
        strategies,
        validation,
        valid: strategies.staticAssets.implemented && strategies.nasaData.implemented &&
                validation.hasVersionedCaches && validation.providesOfflineFallbacks
      };

      console.log(`  ${this.results.caching.valid ? '✅' : '❌'} Caching strategies validation complete`);

    } catch (error) {
      this.results.caching.valid = false;
      this.results.caching.error = error.message;
      console.log(`  ❌ Caching validation failed: ${error.message}`);
    }
  }

  detectCachingStrategy(content, type) {
    if (content.includes('cache-first') || content.includes('Cache First')) return 'cache-first';
    if (content.includes('network-first') || content.includes('Network First')) return 'network-first';
    if (content.includes('stale-while-revalidate') || content.includes('Stale While Revalidate')) return 'stale-while-revalidate';
    if (content.includes('network-only')) return 'network-only';
    if (content.includes('cache-only')) return 'cache-only';
    return 'unknown';
  }

  extractCachedAssets(content, type) {
    if (type === 'static') {
      const staticArrayMatch = content.match(/STATIC_ASSETS\s*=\s*\[([\s\S]*?)\]/);
      if (staticArrayMatch) {
        return staticArrayMatch[1]
          .split(',')
          .map(asset => asset.trim().replace(/['"]/g, ''))
          .filter(asset => asset && !asset.includes('//'));
      }
    }
    return [];
  }

  extractNASAEndpoints(content) {
    const patterns = [
      /api\/apod/g,
      /api\/neo/g,
      /api\/mars/g,
      /api\/donki/g,
      /api\/epic/g
    ];

    return patterns.map(pattern => {
      const matches = content.match(pattern);
      return matches ? matches[0] : null;
    }).filter(Boolean);
  }

  async validateOfflineFunctionality() {
    console.log('📱 Validating Offline Functionality...');

    try {
      // Check service worker offline support
      const swPath = path.join(__dirname, '../client/public/sw.js');
      const swContent = fs.readFileSync(swPath, 'utf8');

      const offlineFeatures = {
        hasOfflineDetection: swContent.includes('offline') || swContent.includes('navigator.onLine'),
        hasOfflinePages: swContent.includes('offline') && swContent.includes('html'),
        hasOfflineImages: swContent.includes('offline') && swContent.includes('image'),
        hasFallbackData: swContent.includes('fallback') && swContent.includes('data'),
        cachesCriticalPages: swContent.includes('/') && swContent.includes('cache'),
        providesOfflineUI: swContent.includes('offline') && swContent.includes('indicator')
      };

      // Check client-side offline handling
      const appPath = path.join(__dirname, '../client/src/App.jsx');
      if (fs.existsSync(appPath)) {
        const appContent = fs.readFileSync(appPath, 'utf8');

        offlineFeatures.hasClientOfflineDetection = appContent.includes('online') || appContent.includes('offline');
        offlineFeatures.hasOfflineUI = appContent.includes('offline') && appContent.includes('indicator');
        offlineFeatures.hasNetworkStatusMonitoring = appContent.includes('addEventListener') &&
                                                   (appContent.includes('online') || appContent.includes('offline'));
      }

      // Check for offline-first design patterns
      const offlineFirst = {
        cachesAppShell: swContent.includes('index.html') && swContent.includes('cache'),
        cachesCriticalAssets: swContent.includes('css') && swContent.includes('js'),
        providesCachedData: swContent.includes('nasa') && swContent.includes('cache'),
        handlesOfflineRequests: swContent.includes('offline') && swContent.includes('response'),
        gracefulDegradation: swContent.includes('catch') && swContent.includes('offline')
      };

      this.results.offline = {
        features: offlineFeatures,
        offlineFirst,
        valid: offlineFeatures.hasOfflineDetection &&
               offlineFeatures.hasOfflinePages &&
               offlineFirst.cachesAppShell &&
               offlineFirst.providesCachedData
      };

      console.log(`  ${this.results.offline.valid ? '✅' : '❌'} Offline functionality validation complete`);

    } catch (error) {
      this.results.offline.valid = false;
      this.results.offline.error = error.message;
      console.log(`  ❌ Offline validation failed: ${error.message}`);
    }
  }

  async validateAccessibility() {
    console.log('♿ Validating PWA Accessibility...');

    try {
      const swPath = path.join(__dirname, '../client/public/sw.js');
      const manifestPath = path.join(__dirname, '../client/public/manifest.json');
      const appPath = path.join(__dirname, '../client/src/App.jsx');

      const checks = {
        manifestHasAccessibleName: false,
        appHasAriaLabels: false,
        appHasKeyboardNavigation: false,
        appHasScreenReaderSupport: false,
        appHasFocusManagement: false,
        hasHighContrastSupport: false,
        hasReducedMotionSupport: false
      };

      // Check manifest
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        checks.manifestHasAccessibleName = !!(manifest.name && manifest.short_name);
      }

      // Check app accessibility
      if (fs.existsSync(appPath)) {
        const appContent = fs.readFileSync(appPath, 'utf8');

        checks.appHasAriaLabels = appContent.includes('aria-') || appContent.includes('ariaLabel');
        checks.appHasKeyboardNavigation = appContent.includes('onKeyDown') || appContent.includes('tabIndex');
        checks.appHasScreenReaderSupport = appContent.includes('aria-live') || appContent.includes('role');
        checks.appHasFocusManagement = appContent.includes('focus') || appContent.includes('onFocus');
      }

      this.results.accessibility = {
        checks,
        valid: checks.manifestHasAccessibleName && checks.appHasAriaLabels && checks.appHasKeyboardNavigation
      };

      console.log(`  ${this.results.accessibility.valid ? '✅' : '❌'} Accessibility validation complete`);

    } catch (error) {
      this.results.accessibility.valid = false;
      this.results.accessibility.error = error.message;
      console.log(`  ❌ Accessibility validation failed: ${error.message}`);
    }
  }

  async validatePerformance() {
    console.log('⚡ Validating PWA Performance...');

    try {
      const checks = {
        hasLazyLoading: false,
        hasCodeSplitting: false,
        hasBundleOptimization: false,
        hasImageOptimization: false,
        hasCachingHeaders: false,
        hasCompressionEnabled: false,
        hasServiceWorkerCaching: false
      };

      // Check vite config for optimization
      const viteConfigPath = path.join(__dirname, '../client/vite.config.js');
      if (fs.existsSync(viteConfigPath)) {
        const viteContent = fs.readFileSync(viteConfigPath, 'utf8');

        checks.hasCodeSplitting = viteContent.includes('manualChunks') || viteContent.includes('split');
        checks.hasBundleOptimization = viteContent.includes('minify') || viteContent.includes('terser');
        checks.hasCompressionEnabled = viteContent.includes('compression') || viteContent.includes('gzip');
      }

      // Check app for lazy loading
      const appPath = path.join(__dirname, '../client/src/App.jsx');
      if (fs.existsSync(appPath)) {
        const appContent = fs.readFileSync(appPath, 'utf8');

        checks.hasLazyLoading = appContent.includes('lazy(') || appContent.includes('Suspense');
        checks.hasServiceWorkerCaching = appContent.includes('serviceWorker') && appContent.includes('register');
      }

      // Check package.json for performance optimizations
      const packagePath = path.join(__dirname, '../client/package.json');
      if (fs.existsSync(packagePath)) {
        const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        checks.hasImageOptimization = !!(packageContent.dependencies?.['sharp'] ||
                                       packageContent.devDependencies?.['sharp'] ||
                                       packageContent.dependencies?.['imagemin']);
      }

      this.results.performance = {
        checks,
        valid: checks.hasCodeSplitting && checks.hasLazyLoading && checks.hasServiceWorkerCaching
      };

      console.log(`  ${this.results.performance.valid ? '✅' : '❌'} Performance validation complete`);

    } catch (error) {
      this.results.performance.valid = false;
      this.results.performance.error = error.message;
      console.log(`  ❌ Performance validation failed: ${error.message}`);
    }
  }

  calculateOverallScore() {
    const scores = {
      manifest: this.results.manifest.valid ? 20 : 0,
      serviceWorker: this.results.serviceWorker.valid ? 20 : 0,
      caching: this.results.caching.valid ? 20 : 0,
      offline: this.results.offline.valid ? 15 : 0,
      accessibility: this.results.accessibility.valid ? 15 : 0,
      performance: this.results.performance.valid ? 10 : 0
    };

    this.results.overall.score = Object.values(scores).reduce((sum, score) => sum + score, 0);
    this.results.overall.issues = this.identifyIssues();
    this.results.overall.recommendations = this.generateRecommendations();

    return this.results.overall.score;
  }

  identifyIssues() {
    const issues = [];

    if (!this.results.manifest.valid) {
      issues.push('Web App Manifest is missing required fields');
    }

    if (!this.results.serviceWorker.valid) {
      issues.push('Service Worker is missing essential event listeners or caching logic');
    }

    if (!this.results.caching.valid) {
      issues.push('Caching strategies are not properly implemented');
    }

    if (!this.results.offline.valid) {
      issues.push('Offline functionality is incomplete');
    }

    if (!this.results.accessibility.valid) {
      issues.push('PWA accessibility features are missing');
    }

    if (!this.results.performance.valid) {
      issues.push('Performance optimizations are not implemented');
    }

    // Specific issues
    if (this.results.manifest.missingFields && this.results.manifest.missingFields.length > 0) {
      issues.push(`Manifest missing fields: ${this.results.manifest.missingFields.join(', ')}`);
    }

    if (!this.results.serviceWorker.features.hasBackgroundSync) {
      issues.push('Background Sync is not implemented');
    }

    if (!this.results.serviceWorker.features.hasPushNotifications) {
      issues.push('Push Notifications are not implemented');
    }

    if (!this.results.caching.strategies.nasaData.implemented) {
      issues.push('NASA API data caching is not implemented');
    }

    return issues;
  }

  generateRecommendations() {
    const recommendations = [];

    if (!this.results.manifest.hasScreenshots) {
      recommendations.push('Add screenshots to the manifest for better app store presentation');
    }

    if (!this.results.manifest.hasShortcuts) {
      recommendations.push('Add app shortcuts to provide quick access to key NASA data features');
    }

    if (!this.results.serviceWorker.features.hasPerformanceMonitoring) {
      recommendations.push('Add performance monitoring to the service worker');
    }

    if (!this.results.serviceWorker.cacheStrategies.versionedCaches) {
      recommendations.push('Implement versioned cache management for better update handling');
    }

    if (!this.results.caching.validation.hasCacheExpiration) {
      recommendations.push('Implement cache expiration policies for NASA data');
    }

    if (!this.results.offline.features.hasClientOfflineDetection) {
      recommendations.push('Add client-side offline detection and UI indicators');
    }

    if (!this.results.accessibility.checks.appHasScreenReaderSupport) {
      recommendations.push('Add ARIA live regions for screen reader announcements');
    }

    if (!this.results.performance.checks.hasImageOptimization) {
      recommendations.push('Add image optimization for NASA space imagery');
    }

    return recommendations;
  }

  printResults() {
    console.log('\n🎯 PWA Validation Results');
    console.log('=============================');
    console.log(`Overall Score: ${this.results.overall.score}/100`);

    console.log('\n📋 Web App Manifest:');
    console.log(`  Status: ${this.results.manifest.valid ? '✅ Valid' : '❌ Invalid'}`);
    if (this.results.manifest.missingFields?.length > 0) {
      console.log(`  Missing fields: ${this.results.manifest.missingFields.join(', ')}`);
    }
    console.log(`  Icons: ${this.results.manifest.iconCount || 0}`);
    console.log(`  Shortcuts: ${this.results.manifest.shortcutCount || 0}`);

    console.log('\n🔧 Service Worker:');
    console.log(`  Status: ${this.results.serviceWorker.valid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`  Size: ${this.results.serviceWorker.fileSize}KB`);
    console.log(`  Install Event: ${this.results.serviceWorker.features.hasInstallEvent ? '✅' : '❌'}`);
    console.log(`  Fetch Event: ${this.results.serviceWorker.features.hasFetchEvent ? '✅' : '❌'}`);
    console.log(`  Cache API: ${this.results.serviceWorker.features.hasCacheAPI ? '✅' : '❌'}`);
    console.log(`  Background Sync: ${this.results.serviceWorker.features.hasBackgroundSync ? '✅' : '❌'}`);
    console.log(`  Push Notifications: ${this.results.serviceWorker.features.hasPushNotifications ? '✅' : '❌'}`);

    console.log('\n💾 Caching Strategies:');
    console.log(`  Status: ${this.results.caching.valid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`  Static Assets: ${this.results.caching.strategies.staticAssets.implemented ? '✅' : '❌'}`);
    console.log(`  NASA Data: ${this.results.caching.strategies.nasaData.implemented ? '✅' : '❌'}`);
    console.log(`  Dynamic Content: ${this.results.caching.strategies.dynamicContent.implemented ? '✅' : '❌'}`);

    console.log('\n📱 Offline Functionality:');
    console.log(`  Status: ${this.results.offline.valid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`  Offline Detection: ${this.results.offline.features.hasOfflineDetection ? '✅' : '❌'}`);
    console.log(`  Offline Pages: ${this.results.offline.features.hasOfflinePages ? '✅' : '❌'}`);
    console.log(`  App Shell Caching: ${this.results.offline.offlineFirst.cachesAppShell ? '✅' : '❌'}`);

    console.log('\n♿ Accessibility:');
    console.log(`  Status: ${this.results.accessibility.valid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`  ARIA Labels: ${this.results.accessibility.checks.appHasAriaLabels ? '✅' : '❌'}`);
    console.log(`  Keyboard Navigation: ${this.results.accessibility.checks.appHasKeyboardNavigation ? '✅' : '❌'}`);
    console.log(`  Screen Reader Support: ${this.results.accessibility.checks.appHasScreenReaderSupport ? '✅' : '❌'}`);

    console.log('\n⚡ Performance:');
    console.log(`  Status: ${this.results.performance.valid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`  Code Splitting: ${this.results.performance.checks.hasCodeSplitting ? '✅' : '❌'}`);
    console.log(`  Lazy Loading: ${this.results.performance.checks.hasLazyLoading ? '✅' : '❌'}`);
    console.log(`  Bundle Optimization: ${this.results.performance.checks.hasBundleOptimization ? '✅' : '❌'}`);

    if (this.results.overall.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      this.results.overall.issues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
    }

    if (this.results.overall.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.overall.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
  }

  async generateReport() {
    const reportPath = path.join(__dirname, '../pwa-validation-report.json');

    const report = {
      timestamp: new Date().toISOString(),
      overall: this.results.overall,
      results: this.results,
      summary: {
        score: this.results.overall.score,
        grade: this.getGrade(this.results.overall.score),
        issuesCount: this.results.overall.issues.length,
        recommendationsCount: this.results.overall.recommendations.length
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 PWA validation report saved: ${reportPath}`);

    // Generate markdown report
    await this.generateMarkdownReport(report);
  }

  getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  async generateMarkdownReport(report) {
    const markdownPath = path.join(__dirname, '../pwa-validation-report.md');

    let markdown = `# NASA System 7 Portal - PWA Validation Report

Generated on: ${new Date().toLocaleString()}

## Overall Score: ${report.overall.score}/100 (Grade: ${report.summary.grade})

### Summary

- **Total Issues**: ${report.summary.issuesCount}
- **Recommendations**: ${report.summary.recommendationsCount}
- **PWA Readiness**: ${report.overall.score >= 80 ? '✅ Ready' : '⚠️ Needs Improvement'}

## Validation Results

### 📋 Web App Manifest - ${report.results.manifest.valid ? '✅ Pass' : '❌ Fail'}

${report.results.manifest.valid ?
  'The web app manifest includes all required fields and is properly configured.' :
  'The web app manifest is missing required fields or has configuration issues.'}

**Details:**
- Required Fields: ${report.results.manifest.valid ? 'Complete' : 'Incomplete'}
- Icons: ${report.results.manifest.iconCount || 0} icons
- Shortcuts: ${report.results.manifest.shortcutCount || 0} shortcuts
- Screenshots: ${report.results.manifest.hasScreenshots ? 'Available' : 'Missing'}

### 🔧 Service Worker - ${report.results.serviceWorker.valid ? '✅ Pass' : '❌ Fail'}

${report.results.serviceWorker.valid ?
  'The service worker properly implements essential PWA features.' :
  'The service worker is missing essential functionality.'}

**Features:**
- Install Event: ${report.results.serviceWorker.features.hasInstallEvent ? '✅' : '❌'}
- Activate Event: ${report.results.serviceWorker.features.hasActivateEvent ? '✅' : '❌'}
- Fetch Event: ${report.results.serviceWorker.features.hasFetchEvent ? '✅' : '❌'}
- Cache API: ${report.results.serviceWorker.features.hasCacheAPI ? '✅' : '❌'}
- Background Sync: ${report.results.serviceWorker.features.hasBackgroundSync ? '✅' : '❌'}
- Push Notifications: ${report.results.serviceWorker.features.hasPushNotifications ? '✅' : '❌'}

### 💾 Caching Strategies - ${report.results.caching.valid ? '✅ Pass' : '❌ Fail'}

${report.results.caching.valid ?
  'Appropriate caching strategies are implemented for different content types.' :
  'Caching strategies need improvement.'}

**Strategy Implementation:**
- Static Assets: ${report.results.caching.strategies.staticAssets.implemented ? '✅' : '❌'}
- NASA Data: ${report.results.caching.strategies.nasaData.implemented ? '✅' : '❌'}
- Dynamic Content: ${report.results.caching.strategies.dynamicContent.implemented ? '✅' : '❌'}

### 📱 Offline Functionality - ${report.results.offline.valid ? '✅ Pass' : '❌ Fail'}

${report.results.offline.valid ?
  'The app provides a good offline experience with cached NASA data.' :
  'Offline functionality needs improvement.'}

**Offline Features:**
- Offline Detection: ${report.results.offline.features.hasOfflineDetection ? '✅' : '❌'}
- Offline Pages: ${report.results.offline.features.hasOfflinePages ? '✅' : '❌'}
- App Shell Caching: ${report.results.offline.offlineFirst.cachesAppShell ? '✅' : '❌'}
- NASA Data Caching: ${report.results.offline.offlineFirst.providesCachedData ? '✅' : '❌'}

### ♿ Accessibility - ${report.results.accessibility.valid ? '✅ Pass' : '❌ Fail'}

${report.results.accessibility.valid ?
  'The PWA includes good accessibility features.' :
  'Accessibility features need improvement.'}

**Accessibility Features:**
- Manifest Accessibility: ${report.results.accessibility.checks.manifestHasAccessibleName ? '✅' : '❌'}
- ARIA Labels: ${report.results.accessibility.checks.appHasAriaLabels ? '✅' : '❌'}
- Keyboard Navigation: ${report.results.accessibility.checks.appHasKeyboardNavigation ? '✅' : '❌'}
- Screen Reader Support: ${report.results.accessibility.checks.appHasScreenReaderSupport ? '✅' : '❌'}

### ⚡ Performance - ${report.results.performance.valid ? '✅ Pass' : '❌ Fail'}

${report.results.performance.valid ?
  'Performance optimizations are well implemented.' :
  'Performance optimizations are needed.'}

**Performance Features:**
- Code Splitting: ${report.results.performance.checks.hasCodeSplitting ? '✅' : '❌'}
- Lazy Loading: ${report.results.performance.checks.hasLazyLoading ? '✅' : '❌'}
- Bundle Optimization: ${report.results.performance.checks.hasBundleOptimization ? '✅' : '❌'}
- Image Optimization: ${report.results.performance.checks.hasImageOptimization ? '✅' : '❌'}

`;

    if (report.overall.issues.length > 0) {
      markdown += '## Issues Found\n\n';
      report.overall.issues.forEach(issue => {
        markdown += `- ${issue}\n`;
      });
      markdown += '\n';
    }

    if (report.overall.recommendations.length > 0) {
      markdown += '## Recommendations\n\n';
      report.overall.recommendations.forEach(rec => {
        markdown += `- ${rec}\n`;
      });
      markdown += '\n';
    }

    markdown += `## PWA Compliance Checklist

- [ ] Web App Manifest is complete and valid
- [ ] Service Worker is registered and functional
- [ ] App works offline with cached content
- [ ] App can be installed on home screen
- [ ] App has proper icons and splash screens
- [ ] App follows responsive design principles
- [ ] App has good performance metrics
- [ ] App is accessible to users with disabilities
- [ ] App provides a good user experience on mobile devices
- [ ] App handles network conditions gracefully

## Next Steps

${report.overall.score >= 80 ?
  '🎉 Your NASA System 7 Portal PWA is ready for production! Consider the recommendations above for further improvements.' :
  '🔧 Address the issues and implement the recommendations above to improve your PWA score and user experience.'}

`;

    fs.writeFileSync(markdownPath, markdown);
    console.log(`📄 Markdown report saved: ${markdownPath}`);
  }

  async runValidation() {
    console.log('🚀 Starting PWA Validation...\n');

    await this.validateManifest();
    await this.validateServiceWorker();
    await this.validateCachingStrategies();
    await this.validateOfflineFunctionality();
    await this.validateAccessibility();
    await this.validatePerformance();

    const score = this.calculateOverallScore();

    this.printResults();
    await this.generateReport();

    console.log(`\n🎯 PWA Validation Complete! Score: ${score}/100`);

    return score;
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new PWAValidator();

  validator.runValidation()
    .then((score) => {
      if (score >= 80) {
        console.log('\n✅ PWA validation passed! Your app is ready for production.');
        process.exit(0);
      } else {
        console.log('\n⚠️  PWA validation completed with issues. See recommendations above.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n❌ PWA validation failed:', error);
      process.exit(1);
    });
}

module.exports = PWAValidator;