const { createTestApp, testHelpers } = require('./test-helper');
const analyticsService = require('../services/analyticsService');

// Mock analytics service
jest.mock('../services/analyticsService');

describe('Analytics API Routes', () => {
  let app;

  beforeAll(async () => {
    // Create isolated test app
    app = createTestApp();
  });

  afterAll(async () => {
    // Cleanup is handled by test helper
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/analytics/consent', () => {
    it('should record valid consent', async () => {
      const mockConsent = {
        consentId: 'test-consent-123',
        consentGranted: true,
        consentData: {
          categories: {
            essential: true,
            performance: true,
            functional: false,
            marketing: false
          }
        }
      };

      analyticsService.recordConsent.mockResolvedValue({
        consent_id: 'test-consent-123',
        consent_granted: true,
        created_at: new Date()
      });

      const response = await request(app)
        .post('/api/analytics/consent')
        .send(mockConsent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.consent.id).toBe('test-consent-123');
      expect(analyticsService.recordConsent).toHaveBeenCalledWith(
        expect.objectContaining({
          consentId: 'test-consent-123',
          consentGranted: true
        })
      );
    });

    it('should reject invalid consent data', async () => {
      const invalidConsent = {
        consentId: 'invalid-id', // Not a valid UUID
        consentGranted: 'not-a-boolean' // Should be boolean
      };

      const response = await request(app)
        .post('/api/analytics/consent')
        .send(invalidConsent)
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should handle consent recording errors', async () => {
      const mockConsent = {
        consentId: 'test-consent-123',
        consentGranted: true,
        consentData: { categories: { essential: true } }
      };

      analyticsService.recordConsent.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/analytics/consent')
        .send(mockConsent)
        .expect(500);

      expect(response.body.error).toBe('Failed to record consent');
    });
  });

  describe('GET /api/analytics/consent/:consentId/check', () => {
    it('should check consent status for valid category', async () => {
      analyticsService.hasConsent.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/analytics/consent/test-consent-123/check?category=performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.consentId).toBe('test-consent-123');
      expect(response.body.category).toBe('performance');
      expect(response.body.hasConsent).toBe(true);
      expect(analyticsService.hasConsent).toHaveBeenCalledWith(
        'test-consent-123',
        'performance'
      );
    });

    it('should return false for consent without permission', async () => {
      analyticsService.hasConsent.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/analytics/consent/test-consent-123/check?category=marketing')
        .expect(200);

      expect(response.body.hasConsent).toBe(false);
    });

    it('should handle invalid category parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/consent/test-consent-123/check?category=invalid')
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/analytics/events', () => {
    it('should track valid events with consent', async () => {
      const mockEvent = {
        consentId: 'test-consent-123',
        sessionId: 'test-session-456',
        eventType: 'user_interaction',
        eventCategory: 'functional',
        eventAction: 'button_click',
        eventLabel: 'Test Button',
        eventValue: 1,
        pageUrl: 'https://nasa.portal.com/test'
      };

      analyticsService.trackEvent.mockResolvedValue({
        success: true,
        eventId: 'test-event-789'
      });

      const response = await request(app)
        .post('/api/analytics/events')
        .send(mockEvent)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.eventId).toBe('test-event-789');
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          consentId: 'test-consent-123',
          eventType: 'user_interaction'
        })
      );
    });

    it('should reject events without consent', async () => {
      const mockEvent = {
        consentId: 'test-consent-123',
        sessionId: 'test-session-456',
        eventType: 'user_interaction',
        eventCategory: 'marketing',
        eventAction: 'ad_click'
      };

      analyticsService.trackEvent.mockResolvedValue({
        success: false,
        reason: 'no_consent'
      });

      const response = await request(app)
        .post('/api/analytics/events')
        .send(mockEvent)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.reason).toBe('no_consent');
    });

    it('should validate event data', async () => {
      const invalidEvent = {
        consentId: 'invalid-id',
        sessionId: 123, // Should be string
        eventType: '', // Should not be empty
        eventCategory: '', // Should not be empty
        eventAction: '', // Should not be empty
        eventValue: 'not-a-number' // Should be numeric
      };

      const response = await request(app)
        .post('/api/analytics/events')
        .send(invalidEvent)
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/analytics/page-view', () => {
    it('should track page views with consent', async () => {
      const mockPageView = {
        consentId: 'test-consent-123',
        sessionId: 'test-session-456',
        pageUrl: 'https://nasa.portal.com/apod',
        pageTitle: 'Astronomy Picture of the Day'
      };

      analyticsService.trackPageView.mockResolvedValue({
        success: true,
        viewId: 'test-view-789'
      });

      const response = await request(app)
        .post('/api/analytics/page-view')
        .send(mockPageView)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.viewId).toBe('test-view-789');
      expect(analyticsService.trackPageView).toHaveBeenCalledWith(
        expect.objectContaining({
          pageUrl: 'https://nasa.portal.com/apod'
        })
      );
    });

    it('should validate page URLs', async () => {
      const invalidPageView = {
        consentId: 'test-consent-123',
        sessionId: 'test-session-456',
        pageUrl: 'not-a-valid-url'
      };

      const response = await request(app)
        .post('/api/analytics/page-view')
        .send(invalidPageView)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/analytics/nasa-api-usage', () => {
    it('should track NASA API usage', async () => {
      const mockApiUsage = {
        consentId: 'test-consent-123',
        sessionId: 'test-session-456',
        endpoint: 'https://api.nasa.gov/planetary/apod',
        method: 'GET',
        responseStatus: 200,
        responseTime: 150,
        responseSize: 1024,
        cacheHit: false
      };

      analyticsService.trackNasaApiUsage.mockResolvedValue({
        success: true,
        usageId: 'test-usage-789'
      });

      const response = await request(app)
        .post('/api/analytics/nasa-api-usage')
        .send(mockApiUsage)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.usageId).toBe('test-usage-789');
      expect(analyticsService.trackNasaApiUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'https://api.nasa.gov/planetary/apod',
          responseTime: 150
        })
      );
    });

    it('should validate HTTP methods', async () => {
      const invalidApiUsage = {
        consentId: 'test-consent-123',
        sessionId: 'test-session-456',
        endpoint: 'https://api.nasa.gov/planetary/apod',
        method: 'INVALID', // Not a valid HTTP method
        responseStatus: 200,
        responseTime: 150
      };

      const response = await request(app)
        .post('/api/analytics/nasa-api-usage')
        .send(invalidApiUsage)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/analytics/performance', () => {
    it('should track performance metrics', async () => {
      const mockMetric = {
        sessionId: 'test-session-456',
        metricType: 'core_web_vitals',
        metricName: 'largest_contentful_paint',
        metricValue: 1200,
        metricUnit: 'ms'
      };

      analyticsService.trackPerformanceMetric.mockResolvedValue({
        success: true,
        metricId: 'test-metric-789'
      });

      const response = await request(app)
        .post('/api/analytics/performance')
        .send(mockMetric)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metricId).toBe('test-metric-789');
      expect(analyticsService.trackPerformanceMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          metricType: 'core_web_vitals',
          metricValue: 1200
        })
      );
    });

    it('should validate metric values', async () => {
      const invalidMetric = {
        sessionId: 'test-session-456',
        metricType: 'core_web_vitals',
        metricName: 'largest_contentful_paint',
        metricValue: 'not-a-number', // Should be numeric
        metricUnit: 'ms'
      };

      const response = await request(app)
        .post('/api/analytics/performance')
        .send(invalidMetric)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/analytics/dashboard', () => {
    it('should return dashboard analytics', async () => {
      const mockDashboardData = [
        {
          event_date: '2024-01-01',
          event_type: 'page_view',
          event_category: 'performance',
          event_count: 100,
          avg_duration_ms: 1500,
          unique_sessions: 50,
          unique_users: 25
        }
      ];

      analyticsService.getDashboardAnalytics.mockResolvedValue(mockDashboardData);

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockDashboardData);
      expect(analyticsService.getDashboardAnalytics).toHaveBeenCalledWith('30d');
    });

    it('should accept custom time range', async () => {
      analyticsService.getDashboardAnalytics.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/analytics/dashboard?timeRange=7d')
        .expect(200);

      expect(analyticsService.getDashboardAnalytics).toHaveBeenCalledWith('7d');
    });

    it('should validate time range format', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard?timeRange=invalid')
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/analytics/nasa-api', () => {
    it('should return NASA API analytics', async () => {
      const mockNasaData = [
        {
          api_endpoint: 'https://api.nasa.gov/planetary/apod',
          request_count: 50,
          avg_response_time: 200,
          cache_hits: 40,
          error_count: 0
        }
      ];

      analyticsService.getNasaApiAnalytics.mockResolvedValue(mockNasaData);

      const response = await request(app)
        .get('/api/analytics/nasa-api')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockNasaData);
      expect(analyticsService.getNasaApiAnalytics).toHaveBeenCalledWith('30d');
    });
  });

  describe('GET /api/analytics/performance', () => {
    it('should return performance metrics', async () => {
      const mockPerformanceData = [
        {
          metric_type: 'core_web_vitals',
          metric_name: 'largest_contentful_paint',
          avg_value: 1200,
          min_value: 800,
          max_value: 2000
        }
      ];

      analyticsService.getPerformanceMetrics.mockResolvedValue(mockPerformanceData);

      const response = await request(app)
        .get('/api/analytics/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPerformanceData);
      expect(analyticsService.getPerformanceMetrics).toHaveBeenCalledWith('7d');
    });
  });

  describe('GDPR/CCPA Compliance', () => {
    describe('GET /api/analytics/export-user-data/:consentId', () => {
      it('should export user data', async () => {
        const mockUserData = {
          consent: [{ consent_id: 'test-consent-123' }],
          events: [{ event_id: 'test-event-456' }],
          pageViews: [{ view_id: 'test-view-789' }],
          apiUsage: [{ usage_id: 'test-usage-012' }],
          performance: [{ metric_id: 'test-metric-345' }]
        };

        analyticsService.exportUserData.mockResolvedValue(mockUserData);

        const response = await request(app)
          .get('/api/analytics/export-user-data/test-consent-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockUserData);
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(analyticsService.exportUserData).toHaveBeenCalledWith('test-consent-123');
      });
    });

    describe('DELETE /api/analytics/user-data/:consentId', () => {
      it('should delete user data', async () => {
        analyticsService.deleteUserData.mockResolvedValue({
          success: true,
          message: 'User data deleted successfully'
        });

        const response = await request(app)
          .delete('/api/analytics/user-data/test-consent-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User data deleted successfully');
        expect(analyticsService.deleteUserData).toHaveBeenCalledWith('test-consent-123');
      });
    });
  });

  describe('Health and Maintenance', () => {
    describe('GET /api/analytics/health', () => {
      it('should return analytics health status', async () => {
        analyticsService.isInitialized = true;
        analyticsService.batchEvents = [];

        const response = await request(app)
          .get('/api/analytics/health')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.analytics.initialized).toBe(true);
        expect(response.body.analytics.batchEventsQueued).toBe(0);
      });
    });

    describe('POST /api/analytics/process-batch', () => {
      it('should process batch events', async () => {
        analyticsService.processBatch.mockResolvedValue();

        const response = await request(app)
          .post('/api/analytics/process-batch')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Batch processing completed');
        expect(analyticsService.processBatch).toHaveBeenCalled();
      });
    });

    describe('POST /api/analytics/cleanup', () => {
      it('should clean up old data', async () => {
        analyticsService.cleanupOldData.mockResolvedValue(100);

        const response = await request(app)
          .post('/api/analytics/cleanup')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.deletedRecords).toBe(100);
        expect(analyticsService.cleanupOldData).toHaveBeenCalled();
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to analytics endpoints', async () => {
      // Make multiple rapid requests
      const requests = Array(101).fill().map(() =>
        request(app).get('/api/analytics/health')
      );

      const responses = await Promise.all(requests);

      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      const rateLimitedResponse = rateLimitedResponses[0];
      expect(rateLimitedResponse.body.error).toContain('Too many analytics requests');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      analyticsService.getDashboardAnalytics.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(500);

      expect(response.body.error).toBe('Failed to get dashboard analytics');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/analytics/events')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/analytics/events')
        .send({})
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateUserIdentifier', () => {
    it('should generate consistent hash for same input', () => {
      const id1 = analyticsService.generateUserIdentifier(
        '192.168.1.1',
        'Mozilla/5.0 Test Browser'
      );
      const id2 = analyticsService.generateUserIdentifier(
        '192.168.1.1',
        'Mozilla/5.0 Test Browser'
      );

      expect(id1).toBe(id2);
      expect(id1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hash
    });

    it('should generate different hashes for different input', () => {
      const id1 = analyticsService.generateUserIdentifier(
        '192.168.1.1',
        'Mozilla/5.0 Test Browser'
      );
      const id2 = analyticsService.generateUserIdentifier(
        '192.168.1.2',
        'Mozilla/5.0 Test Browser'
      );

      expect(id1).not.toBe(id2);
    });

    it('should not include original data in hash', () => {
      const id = analyticsService.generateUserIdentifier(
        '192.168.1.1',
        'Mozilla/5.0 Test Browser'
      );

      expect(id).not.toContain('192.168.1.1');
      expect(id).not.toContain('Mozilla');
    });
  });

  describe('hasConsent', () => {
    it('should return false for unknown consent ID', async () => {
      const result = await analyticsService.hasConsent('unknown-consent-id');
      expect(result).toBe(false);
    });

    it('should cache consent decisions', async () => {
      // Mock database query once
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{
          consent_granted: true,
          expires_at: new Date(Date.now() + 86400000), // Tomorrow
          withdrawn_at: null
        }]
      });

      // This would require mocking the database connection
      // Implementation depends on actual database setup
    });
  });

  describe('parseDeviceInfo', () => {
    it('should extract device information correctly', () => {
      const deviceInfo = {
        deviceType: 'mobile',
        browserName: 'Chrome',
        browserVersion: '120.0',
        osName: 'iOS',
        osVersion: '17.0',
        screenResolution: '390x844',
        viewportSize: '375x812'
      };

      const parsed = analyticsService.parseDeviceInfo(deviceInfo);

      expect(parsed.device_type).toBe('mobile');
      expect(parsed.browser_name).toBe('Chrome');
      expect(parsed.browser_version).toBe('120.0');
    });

    it('should handle missing device information', () => {
      const parsed = analyticsService.parseDeviceInfo(null);
      expect(parsed).toEqual({});
    });
  });

  describe('parseGeoInfo', () => {
    it('should extract geo information correctly', () => {
      const geoInfo = {
        country: 'US',
        region: 'California'
      };

      const parsed = analyticsService.parseGeoInfo(geoInfo);

      expect(parsed.geo_country).toBe('US');
      expect(parsed.geo_region).toBe('California');
    });

    it('should handle missing geo information', () => {
      const parsed = analyticsService.parseGeoInfo(null);
      expect(parsed).toEqual({});
    });
  });
});