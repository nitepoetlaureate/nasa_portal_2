import { v4 as uuidv4 } from 'uuid';

class AnalyticsClient {
  constructor() {
    this.consentId = null;
    this.sessionId = null;
    this.isInitialized = false;
    this.consentSettings = {
      essential: true, // Always required
      performance: false,
      functional: false,
      marketing: false
    };
    this.eventQueue = [];
    this.queueTimeout = null;
    this.baseUrl = '/api/analytics';
    this.deviceInfo = this.getDeviceInfo();

    this.init();
  }

  async init() {
    try {
      // Initialize session ID
      this.sessionId = this.getSessionId();

      // Load consent settings
      await this.loadConsentSettings();

      // Process queued events
      this.processQueue();

      // Track initial page view
      if (this.consentSettings.performance) {
        this.trackPageView();
      }

      // Set up event listeners
      this.setupEventListeners();

      // Track performance metrics
      if (this.consentSettings.performance) {
        this.trackPerformanceMetrics();
      }

      this.isInitialized = true;
      console.log('✅ Analytics Client initialized');
    } catch (error) {
      console.error('❌ Analytics Client initialization failed:', error);
    }
  }

  // Get or create session ID
  getSessionId() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  // Get consent ID
  getConsentId() {
    let consentId = localStorage.getItem('analytics_consent_id');
    if (!consentId) {
      consentId = uuidv4();
      localStorage.setItem('analytics_consent_id', consentId);
    }
    return consentId;
  }

  // Load consent settings from localStorage
  async loadConsentSettings() {
    try {
      const stored = localStorage.getItem('analytics_consent');
      if (stored) {
        this.consentSettings = { ...this.consentSettings, ...JSON.parse(stored) };
      }

      this.consentId = this.getConsentId();

      // Record consent if we have settings
      if (Object.values(this.consentSettings).some(v => v !== false)) {
        await this.recordConsent();
      }
    } catch (error) {
      console.error('Error loading consent settings:', error);
    }
  }

  // Update consent settings
  async updateConsent(newSettings) {
    try {
      this.consentSettings = { ...this.consentSettings, ...newSettings };

      // Save to localStorage
      localStorage.setItem('analytics_consent', JSON.stringify(this.consentSettings));

      // Record consent with backend
      await this.recordConsent();

      // Process queued events that now have consent
      this.processQueue();

      // Set up performance tracking if consented
      if (this.consentSettings.performance && !this.performanceObserver) {
        this.trackPerformanceMetrics();
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating consent:', error);
      return { success: false, error: error.message };
    }
  }

  // Record consent with backend
  async recordConsent() {
    try {
      const response = await fetch(`${this.baseUrl}/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          consentId: this.consentId,
          consentGranted: Object.values(this.consentSettings).some(v => v === true),
          consentData: {
            categories: this.consentSettings,
            version: '1.0',
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Consent recording failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error recording consent:', error);
      throw error;
    }
  }

  // Check if we have consent for a category
  hasConsent(category) {
    return this.consentSettings[category] === true;
  }

  // Track event with consent check
  async trackEvent(eventType, eventCategory, eventAction, options = {}) {
    if (!this.hasConsent(eventCategory)) {
      // Queue event for later if no consent yet
      this.queueEvent('event', {
        eventType,
        eventCategory,
        eventAction,
        ...options
      });
      return { success: false, reason: 'no_consent' };
    }

    try {
      const eventData = {
        consentId: this.consentId,
        sessionId: this.sessionId,
        eventType,
        eventCategory,
        eventAction,
        eventLabel: options.label,
        eventValue: options.value,
        pageUrl: window.location.href,
        pageTitle: document.title,
        referrerUrl: document.referrer,
        duration: options.duration,
        metadata: options.metadata || {}
      };

      const response = await fetch(`${this.baseUrl}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error(`Event tracking failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error tracking event:', error);
      return { success: false, error: error.message };
    }
  }

  // Track page view
  async trackPageView() {
    if (!this.hasConsent('performance')) {
      return { success: false, reason: 'no_consent' };
    }

    try {
      const pageData = {
        consentId: this.consentId,
        sessionId: this.sessionId,
        pageUrl: window.location.href,
        pageTitle: document.title,
        referrerUrl: document.referrer,
        deviceInfo: this.deviceInfo
      };

      const response = await fetch(`${this.baseUrl}/page-view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pageData)
      });

      if (!response.ok) {
        throw new Error(`Page view tracking failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error tracking page view:', error);
      return { success: false, error: error.message };
    }
  }

  // Track NASA API usage
  async trackNasaApiUsage(endpoint, method, responseStatus, responseTime, responseSize, cacheHit = false, error = null) {
    if (!this.hasConsent('performance')) {
      return { success: false, reason: 'no_consent' };
    }

    try {
      const apiData = {
        consentId: this.consentId,
        sessionId: this.sessionId,
        endpoint,
        method,
        responseStatus,
        responseTime,
        responseSize,
        cacheHit,
        errorMessage: error
      };

      const response = await fetch(`${this.baseUrl}/nasa-api-usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
      });

      if (!response.ok) {
        throw new Error(`API usage tracking failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error tracking API usage:', error);
      return { success: false, error: error.message };
    }
  }

  // Track performance metrics
  async trackPerformanceMetric(metricType, metricName, metricValue, metricUnit, metadata = {}) {
    if (!this.hasConsent('performance')) {
      return { success: false, reason: 'no_consent' };
    }

    try {
      const metricData = {
        sessionId: this.sessionId,
        metricType,
        metricName,
        metricValue,
        metricUnit,
        pageUrl: window.location.href,
        metadata
      };

      const response = await fetch(`${this.baseUrl}/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metricData)
      });

      if (!response.ok) {
        throw new Error(`Performance metric tracking failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error tracking performance metric:', error);
      return { success: false, error: error.message };
    }
  }

  // Track user interactions
  trackInteraction(element, action, value = null) {
    const eventType = 'user_interaction';
    const eventCategory = 'functional';

    this.trackEvent(eventType, eventCategory, action, {
      label: element,
      value,
      metadata: {
        elementType: element.tagName?.toLowerCase(),
        elementId: element.id,
        elementClass: element.className
      }
    });
  }

  // Track NASA data interactions
  trackNasaInteraction(dataType, action, details = {}) {
    const eventType = 'nasa_interaction';
    const eventCategory = 'functional';

    this.trackEvent(eventType, eventCategory, action, {
      label: dataType,
      value: details.value,
      metadata: {
        dataType,
        ...details
      }
    });
  }

  // Track errors
  trackError(error, context = {}) {
    const eventType = 'error';
    const eventCategory = 'essential'; // Errors are always tracked

    this.trackEvent(eventType, eventCategory, 'javascript_error', {
      label: error.message,
      metadata: {
        stack: error.stack,
        context,
        url: window.location.href
      }
    });
  }

  // Queue event for later processing
  queueEvent(type, data) {
    this.eventQueue.push({ type, data, timestamp: Date.now() });

    // Process queue after a delay
    if (this.queueTimeout) {
      clearTimeout(this.queueTimeout);
    }

    this.queueTimeout = setTimeout(() => {
      this.processQueue();
    }, 5000);
  }

  // Process queued events
  async processQueue() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of events) {
      try {
        if (event.type === 'event') {
          await this.trackEvent(
            event.data.eventType,
            event.data.eventCategory,
            event.data.eventAction,
            event.data
          );
        }
      } catch (error) {
        console.error('Error processing queued event:', error);
      }
    }
  }

  // Get device information
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      deviceType: this.getDeviceType(),
      browserName: this.getBrowserName(),
      browserVersion: this.getBrowserVersion(),
      osName: this.getOSName(),
      osVersion: this.getOSVersion(),
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  getDeviceType() {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  getBrowserVersion() {
    const ua = navigator.userAgent;
    const match = ua.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return match ? match[2] : 'Unknown';
  }

  getOSName() {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  getOSVersion() {
    const ua = navigator.userAgent;
    const match = ua.match(/(Windows NT|Mac OS X|Android|iOS) ([\d._]+)/);
    return match ? match[2].replace(/_/g, '.') : 'Unknown';
  }

  // Set up event listeners
  setupEventListeners() {
    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.trackEvent('page', 'performance', 'page_focus');
      } else {
        this.trackEvent('page', 'performance', 'page_blur');
      }
    });

    // Before unload
    window.addEventListener('beforeunload', () => {
      this.trackEvent('page', 'performance', 'page_unload');
    });

    // Error tracking
    window.addEventListener('error', (event) => {
      this.trackError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(event.reason), {
        type: 'unhandled_promise_rejection'
      });
    });

    // Click tracking (with consent)
    if (this.hasConsent('functional')) {
      document.addEventListener('click', (event) => {
        const element = event.target;
        if (element.dataset.track) {
          this.trackInteraction(element, 'click', element.dataset.trackValue);
        }
      });
    }
  }

  // Track performance metrics
  trackPerformanceMetrics() {
    if (!this.hasConsent('performance')) return;

    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          switch (entry.entryType) {
            case 'navigation':
              this.trackNavigationTiming(entry);
              break;
            case 'paint':
              this.trackPaintTiming(entry);
              break;
            case 'largest-contentful-paint':
              this.trackLCP(entry);
              break;
            case 'first-input':
              this.trackFID(entry);
              break;
            case 'layout-shift':
              this.trackCLS(entry);
              break;
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
    }

    // Track initial page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        this.trackPerformanceMetric('page_load', 'load_time', loadTime, 'ms');
      }, 0);
    });
  }

  trackNavigationTiming(entry) {
    const timing = entry;
    this.trackPerformanceMetric('navigation', 'dns_lookup', timing.domainLookupEnd - timing.domainLookupStart, 'ms');
    this.trackPerformanceMetric('navigation', 'tcp_connect', timing.connectEnd - timing.connectStart, 'ms');
    this.trackPerformanceMetric('navigation', 'request', timing.responseStart - timing.requestStart, 'ms');
    this.trackPerformanceMetric('navigation', 'response', timing.responseEnd - timing.responseStart, 'ms');
    this.trackPerformanceMetric('navigation', 'dom_processing', timing.domContentLoadedEventStart - timing.responseEnd, 'ms');
  }

  trackPaintTiming(entry) {
    this.trackPerformanceMetric('paint', entry.name, entry.startTime, 'ms');
  }

  trackLCP(entry) {
    this.trackPerformanceMetric('core_web_vitals', 'largest_contentful_paint', entry.startTime, 'ms');
  }

  trackFID(entry) {
    this.trackPerformanceMetric('core_web_vitals', 'first_input_delay', entry.processingStart - entry.startTime, 'ms');
  }

  trackCLS(entry) {
    if (!entry.hadRecentInput) {
      this.trackPerformanceMetric('core_web_vitals', 'cumulative_layout_shift', entry.value, 'score');
    }
  }

  // GDPR/CCPA compliance methods
  async exportUserData() {
    try {
      const response = await fetch(`${this.baseUrl}/export-user-data/${this.consentId}`);
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  async deleteUserData() {
    try {
      const response = await fetch(`${this.baseUrl}/user-data/${this.consentId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }

      // Clear local data
      localStorage.removeItem('analytics_consent');
      localStorage.removeItem('analytics_consent_id');
      sessionStorage.removeItem('analytics_session_id');

      return await response.json();
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }

  // Get current consent status
  getConsentStatus() {
    return {
      consentId: this.consentId,
      settings: this.consentSettings,
      hasAnyConsent: Object.values(this.consentSettings).some(v => v === true)
    };
  }
}

// Create singleton instance
const analyticsClient = new AnalyticsClient();

export default analyticsClient;