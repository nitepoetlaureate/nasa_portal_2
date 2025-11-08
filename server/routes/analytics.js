const express = require('express');
const { body, validationResult, query } = require('express-validator');
const analyticsService = require('../services/analyticsService');
const { performanceMiddleware } = require('../middleware/performance');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many analytics requests, please try again later.' }
});

// Apply rate limiting to all analytics routes
router.use(analyticsLimiter);

// Consent management endpoints
router.post('/consent', [
  body('consentId').isUUID().withMessage('Invalid consent ID'),
  body('consentGranted').isBoolean().withMessage('consentGranted must be boolean'),
  body('consentData').isObject().withMessage('consentData must be object'),
  body('userAgent').optional().isString().withMessage('userAgent must be string'),
  body('ipAddress').optional().isIP().withMessage('Invalid IP address')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      consentId,
      consentGranted,
      consentData,
      userAgent = req.get('User-Agent'),
      ipAddress = req.ip
    } = req.body;

    const userIdentifier = analyticsService.generateUserIdentifier(ipAddress, userAgent);

    const result = await analyticsService.recordConsent({
      consentId,
      userIdentifier,
      consentGranted,
      consentData,
      ipAddress,
      userAgent,
      expiresAt: consentData.expiresAt ? new Date(consentData.expiresAt) : null
    });

    res.json({
      success: true,
      consent: {
        id: result.consent_id,
        granted: result.consent_granted,
        recordedAt: result.created_at
      }
    });
  } catch (error) {
    console.error('Error recording consent:', error);
    res.status(500).json({ error: 'Failed to record consent' });
  }
});

// Check consent status
router.get('/consent/:consentId/check', [
  query('category').optional().isIn(['essential', 'performance', 'functional', 'marketing'])
], async (req, res) => {
  try {
    const { consentId } = req.params;
    const { category = 'essential' } = req.query;

    const hasConsent = await analyticsService.hasConsent(consentId, category);

    res.json({
      success: true,
      consentId,
      category,
      hasConsent
    });
  } catch (error) {
    console.error('Error checking consent:', error);
    res.status(500).json({ error: 'Failed to check consent' });
  }
});

// Track user events
router.post('/events', [
  body('consentId').isUUID().withMessage('Invalid consent ID'),
  body('sessionId').isString().withMessage('sessionId must be string'),
  body('eventType').isString().withMessage('eventType must be string'),
  body('eventCategory').isString().withMessage('eventCategory must be string'),
  body('eventAction').isString().withMessage('eventAction must be string'),
  body('eventLabel').optional().isString().withMessage('eventLabel must be string'),
  body('eventValue').optional().isNumeric().withMessage('eventValue must be numeric'),
  body('pageUrl').optional().isURL().withMessage('Invalid pageUrl'),
  body('duration').optional().isInt({ min: 0 }).withMessage('duration must be positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const eventData = {
      ...req.body,
      deviceInfo: {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }
    };

    const result = await analyticsService.trackEvent(eventData);

    if (result.success) {
      res.json({
        success: true,
        eventId: result.eventId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(403).json({
        success: false,
        reason: result.reason
      });
    }
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Track page views
router.post('/page-view', [
  body('consentId').isUUID().withMessage('Invalid consent ID'),
  body('sessionId').isString().withMessage('sessionId must be string'),
  body('pageUrl').isURL().withMessage('Invalid pageUrl'),
  body('pageTitle').optional().isString().withMessage('pageTitle must be string'),
  body('referrerUrl').optional().isURL().withMessage('Invalid referrerUrl')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const pageData = {
      ...req.body,
      deviceInfo: {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }
    };

    const result = await analyticsService.trackPageView(pageData);

    if (result.success) {
      res.json({
        success: true,
        viewId: result.viewId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(403).json({
        success: false,
        reason: result.reason
      });
    }
  } catch (error) {
    console.error('Error tracking page view:', error);
    res.status(500).json({ error: 'Failed to track page view' });
  }
});

// Track NASA API usage
router.post('/nasa-api-usage', [
  body('consentId').isUUID().withMessage('Invalid consent ID'),
  body('sessionId').isString().withMessage('sessionId must be string'),
  body('endpoint').isString().withMessage('endpoint must be string'),
  body('method').isIn(['GET', 'POST', 'PUT', 'DELETE']).withMessage('Invalid method'),
  body('responseStatus').isInt().withMessage('responseStatus must be integer'),
  body('responseTime').isInt({ min: 0 }).withMessage('responseTime must be positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const apiData = {
      ...req.body,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    };

    const result = await analyticsService.trackNasaApiUsage(apiData);

    if (result.success) {
      res.json({
        success: true,
        usageId: result.usageId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(403).json({
        success: false,
        reason: result.reason
      });
    }
  } catch (error) {
    console.error('Error tracking API usage:', error);
    res.status(500).json({ error: 'Failed to track API usage' });
  }
});

// Track performance metrics
router.post('/performance', [
  body('sessionId').isString().withMessage('sessionId must be string'),
  body('metricType').isString().withMessage('metricType must be string'),
  body('metricName').isString().withMessage('metricName must be string'),
  body('metricValue').isNumeric().withMessage('metricValue must be numeric'),
  body('metricUnit').optional().isString().withMessage('metricUnit must be string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await analyticsService.trackPerformanceMetric(req.body);

    if (result.success) {
      res.json({
        success: true,
        metricId: result.metricId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error tracking performance metric:', error);
    res.status(500).json({ error: 'Failed to track performance metric' });
  }
});

// Get dashboard analytics (protected endpoint)
router.get('/dashboard', [
  query('timeRange').optional().matches(/^\d+d$/).withMessage('Invalid time range format (e.g., 30d)')
], async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;

    // This endpoint should be protected by authentication in production
    const data = await analyticsService.getDashboardAnalytics(timeRange);

    res.json({
      success: true,
      timeRange,
      data,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to get dashboard analytics' });
  }
});

// Get NASA API analytics (protected endpoint)
router.get('/nasa-api', [
  query('timeRange').optional().matches(/^\d+d$/).withMessage('Invalid time range format (e.g., 30d)')
], async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;

    const data = await analyticsService.getNasaApiAnalytics(timeRange);

    res.json({
      success: true,
      timeRange,
      data,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting NASA API analytics:', error);
    res.status(500).json({ error: 'Failed to get NASA API analytics' });
  }
});

// Get performance metrics (protected endpoint)
router.get('/performance', [
  query('timeRange').optional().matches(/^\d+d$/).withMessage('Invalid time range format (e.g., 30d)')
], async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;

    const data = await analyticsService.getPerformanceMetrics(timeRange);

    res.json({
      success: true,
      timeRange,
      data,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

// GDPR/CCPA: Export user data
router.get('/export-user-data/:consentId', async (req, res) => {
  try {
    const { consentId } = req.params;

    const userData = await analyticsService.exportUserData(consentId);

    // Set appropriate headers for data export
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${consentId}.json"`);

    res.json({
      success: true,
      consentId,
      exportedAt: new Date().toISOString(),
      data: userData
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

// GDPR/CCPA: Delete user data
router.delete('/user-data/:consentId', async (req, res) => {
  try {
    const { consentId } = req.params;

    const result = await analyticsService.deleteUserData(consentId);

    res.json({
      success: true,
      consentId,
      deletedAt: new Date().toISOString(),
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting user data:', error);
    res.status(500).json({ error: 'Failed to delete user data' });
  }
});

// Analytics health check
router.get('/health', async (req, res) => {
  try {
    const isInitialized = analyticsService.isInitialized;
    const batchSize = analyticsService.batchEvents.length;

    res.json({
      success: true,
      analytics: {
        initialized: isInitialized,
        batchEventsQueued: batchSize,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Analytics health check failed:', error);
    res.status(500).json({ error: 'Analytics health check failed' });
  }
});

// Manual cleanup endpoint (for maintenance)
router.post('/cleanup', async (req, res) => {
  try {
    // This endpoint should be protected by admin authentication
    const deletedCount = await analyticsService.cleanupOldData();

    res.json({
      success: true,
      deletedRecords: deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup old data' });
  }
});

// Process batch events endpoint (for manual trigger)
router.post('/process-batch', async (req, res) => {
  try {
    await analyticsService.processBatch();

    res.json({
      success: true,
      message: 'Batch processing completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing batch:', error);
    res.status(500).json({ error: 'Failed to process batch' });
  }
});

module.exports = router;