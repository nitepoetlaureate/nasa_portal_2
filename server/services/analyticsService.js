const crypto = require('crypto');
const { db } = require('../config/database');

class AnalyticsService {
  constructor() {
    this.isInitialized = false;
    this.consentCache = new Map(); // Cache consent decisions
    this.batchEvents = []; // Batch events for bulk insert
    this.batchSize = 100;
    this.batchTimeout = null;
    this.init();
  }

  async init() {
    try {
      await this.initializeDatabase();
      this.isInitialized = true;
      console.log('✅ Analytics Service initialized successfully');
    } catch (error) {
      console.error('❌ Analytics Service initialization failed:', error);
      this.isInitialized = false;
    }
  }

  async initializeDatabase() {
    // Initialize analytics schema
    const schemaPath = require('path').join(__dirname, '../database/analytics_schema.sql');
    const fs = require('fs');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema in transaction
    await db.transaction(async (client) => {
      const statements = schema.split(';').filter(stmt => stmt.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await client.query(statement);
        }
      }
    });
  }

  // Privacy-compliant user identifier generation
  generateUserIdentifier(ipAddress, userAgent) {
    const hash = crypto.createHash('sha256');
    hash.update(`${ipAddress}:${userAgent}:${process.env.ANALYTICS_SALT || 'nasa_system7_salt'}`);
    return hash.digest('hex');
  }

  // Consent management
  async recordConsent(consentData) {
    const {
      consentId,
      userIdentifier,
      consentGranted,
      consentData: consentDetails,
      ipAddress,
      userAgent,
      expiresAt
    } = consentData;

    try {
      const query = `
        INSERT INTO analytics_consent (
          consent_id, user_identifier, consent_granted, consent_data,
          ip_address, user_agent, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (consent_id)
        DO UPDATE SET
          consent_granted = EXCLUDED.consent_granted,
          consent_data = EXCLUDED.consent_data,
          updated_at = CURRENT_TIMESTAMP,
          withdrawn_at = CASE
            WHEN EXCLUDED.consent_granted = FALSE THEN CURRENT_TIMESTAMP
            ELSE analytics_consent.withdrawn_at
          END
        RETURNING *
      `;

      const result = await db.query(query, [
        consentId,
        userIdentifier,
        consentGranted,
        JSON.stringify(consentDetails),
        ipAddress,
        userAgent,
        expiresAt
      ]);

      // Update cache
      this.consentCache.set(consentId, {
        granted: consentGranted,
        expiresAt,
        withdrawnAt: consentGranted ? null : new Date()
      });

      return result.rows[0];
    } catch (error) {
      console.error('Error recording consent:', error);
      throw error;
    }
  }

  // Check consent status
  async hasConsent(consentId, eventCategory = 'essential') {
    // Check cache first
    if (this.consentCache.has(consentId)) {
      const cached = this.consentCache.get(consentId);
      if (cached.expiresAt && cached.expiresAt > new Date() && !cached.withdrawnAt) {
        return cached.granted;
      }
    }

    try {
      const query = `
        SELECT consent_granted, expires_at, withdrawn_at, consent_data
        FROM analytics_consent
        WHERE consent_id = $1
      `;

      const result = await db.query(query, [consentId]);

      if (result.rows.length === 0) {
        return false; // No consent record = no consent
      }

      const consent = result.rows[0];
      const isValid = consent.consent_granted &&
                     (!consent.expires_at || consent.expires_at > new Date()) &&
                     !consent.withdrawn_at;

      // Check specific category consent
      if (isValid && consent.consent_data) {
        const consentData = consent.consent_data;
        const categoryConsent = consentData.categories?.[eventCategory];
        if (categoryConsent !== undefined) {
          return categoryConsent;
        }
      }

      // Update cache
      this.consentCache.set(consentId, {
        granted: isValid,
        expiresAt: consent.expires_at,
        withdrawnAt: consent.withdrawn_at
      });

      return isValid;
    } catch (error) {
      console.error('Error checking consent:', error);
      return false; // Default to no consent on error
    }
  }

  // Track user event with consent
  async trackEvent(eventData) {
    const {
      consentId,
      sessionId,
      eventType,
      eventCategory,
      eventAction,
      eventLabel,
      eventValue,
      pageUrl,
      pageTitle,
      referrerUrl,
      duration,
      metadata,
      deviceInfo,
      geoInfo
    } = eventData;

    // Check consent before tracking
    if (!await this.hasConsent(consentId, eventCategory)) {
      return { success: false, reason: 'no_consent' };
    }

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const event = {
      event_id: eventId,
      consent_id: consentId,
      session_id: sessionId,
      event_type: eventType,
      event_category: eventCategory,
      event_action: eventAction,
      event_label: eventLabel,
      event_value: eventValue,
      page_url: pageUrl,
      page_title: pageTitle,
      referrer_url: referrerUrl,
      duration_ms: duration,
      timestamp: new Date(),
      metadata: JSON.stringify(metadata || {}),
      ...this.parseDeviceInfo(deviceInfo),
      ...this.parseGeoInfo(geoInfo)
    };

    // Add to batch for bulk insert
    this.batchEvents.push(event);

    // Process batch if full
    if (this.batchEvents.length >= this.batchSize) {
      await this.processBatch();
    } else {
      this.scheduleBatchProcessing();
    }

    return { success: true, eventId };
  }

  // Track page views
  async trackPageView(pageData) {
    const {
      consentId,
      sessionId,
      pageUrl,
      pageTitle,
      referrerUrl,
      deviceInfo
    } = pageData;

    if (!await this.hasConsent(consentId, 'page_view')) {
      return { success: false, reason: 'no_consent' };
    }

    const viewId = `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO page_views (
        view_id, consent_id, session_id, page_url, page_title,
        referrer_url, entry_timestamp, viewport_size, device_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    try {
      await db.query(query, [
        viewId,
        consentId,
        sessionId,
        pageUrl,
        pageTitle,
        referrerUrl,
        new Date(),
        deviceInfo?.viewport,
        deviceInfo?.deviceType
      ]);

      return { success: true, viewId };
    } catch (error) {
      console.error('Error tracking page view:', error);
      return { success: false, error: error.message };
    }
  }

  // Track NASA API usage
  async trackNasaApiUsage(apiData) {
    const {
      consentId,
      sessionId,
      endpoint,
      method,
      requestParams,
      responseStatus,
      responseTime,
      responseSize,
      cacheHit,
      errorMessage,
      userAgent,
      ipAddress
    } = apiData;

    if (!await this.hasConsent(consentId, 'performance')) {
      return { success: false, reason: 'no_consent' };
    }

    const usageId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO nasa_api_usage (
        usage_id, consent_id, session_id, api_endpoint, api_method,
        request_params, response_status, response_time_ms, response_size_bytes,
        cache_hit, error_message, timestamp, user_agent, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `;

    try {
      await db.query(query, [
        usageId,
        consentId,
        sessionId,
        endpoint,
        method,
        JSON.stringify(requestParams || {}),
        responseStatus,
        responseTime,
        responseSize,
        cacheHit,
        errorMessage,
        new Date(),
        userAgent,
        ipAddress
      ]);

      return { success: true, usageId };
    } catch (error) {
      console.error('Error tracking API usage:', error);
      return { success: false, error: error.message };
    }
  }

  // Track performance metrics
  async trackPerformanceMetric(metricData) {
    const {
      sessionId,
      metricType,
      metricName,
      metricValue,
      metricUnit,
      pageUrl,
      componentName,
      metadata
    } = metricData;

    const metricId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO performance_metrics (
        metric_id, session_id, metric_type, metric_name, metric_value,
        metric_unit, timestamp, page_url, component_name, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    try {
      await db.query(query, [
        metricId,
        sessionId,
        metricType,
        metricName,
        metricValue,
        metricUnit,
        new Date(),
        pageUrl,
        componentName,
        JSON.stringify(metadata || {})
      ]);

      return { success: true, metricId };
    } catch (error) {
      console.error('Error tracking performance metric:', error);
      return { success: false, error: error.message };
    }
  }

  // Process batch of events
  async processBatch() {
    if (this.batchEvents.length === 0) return;

    const events = [...this.batchEvents];
    this.batchEvents = [];

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    try {
      const query = `
        INSERT INTO analytics_events (
          event_id, consent_id, session_id, event_type, event_category,
          event_action, event_label, event_value, page_url, page_title,
          referrer_url, duration_ms, timestamp, metadata, geo_country,
          geo_region, device_type, browser_name, browser_version,
          os_name, os_version, screen_resolution, viewport_size, user_agent
        ) VALUES ${events.map((_, i) =>
          `($${i * 23 + 1}, $${i * 23 + 2}, $${i * 23 + 3}, $${i * 23 + 4}, $${i * 23 + 5}, $${i * 23 + 6}, $${i * 23 + 7}, $${i * 23 + 8}, $${i * 23 + 9}, $${i * 23 + 10}, $${i * 23 + 11}, $${i * 23 + 12}, $${i * 23 + 13}, $${i * 23 + 14}, $${i * 23 + 15}, $${i * 23 + 16}, $${i * 23 + 17}, $${i * 23 + 18}, $${i * 23 + 19}, $${i * 23 + 20}, $${i * 23 + 21}, $${i * 23 + 22}, $${i * 23 + 23})`
        ).join(', ')}
      `;

      const values = events.flatMap(event => [
        event.event_id,
        event.consent_id,
        event.session_id,
        event.event_type,
        event.event_category,
        event.event_action,
        event.event_label,
        event.event_value,
        event.page_url,
        event.page_title,
        event.referrer_url,
        event.duration_ms,
        event.timestamp,
        event.metadata,
        event.geo_country,
        event.geo_region,
        event.device_type,
        event.browser_name,
        event.browser_version,
        event.os_name,
        event.os_version,
        event.screen_resolution,
        event.viewport_size,
        event.user_agent
      ]);

      await db.query(query, values);
      console.log(`✅ Processed batch of ${events.length} analytics events`);
    } catch (error) {
      console.error('Error processing analytics batch:', error);
      // Re-add events to batch for retry
      this.batchEvents.unshift(...events);
    }
  }

  // Schedule batch processing
  scheduleBatchProcessing() {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, 5000); // Process batch after 5 seconds
  }

  // Get analytics data for dashboard
  async getDashboardAnalytics(timeRange = '30d') {
    const days = parseInt(timeRange) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const query = `
        SELECT * FROM dashboard_analytics
        WHERE event_date >= $1
        ORDER BY event_date DESC
      `;

      const result = await db.query(query, [startDate]);
      return result.rows;
    } catch (error) {
      console.error('Error getting dashboard analytics:', error);
      return [];
    }
  }

  // Get NASA API usage analytics
  async getNasaApiAnalytics(timeRange = '30d') {
    const days = parseInt(timeRange) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const query = `
        SELECT
          api_endpoint,
          COUNT(*) as request_count,
          AVG(response_time_ms) as avg_response_time,
          SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) as cache_hits,
          SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as error_count,
          AVG(response_size_bytes) as avg_response_size
        FROM nasa_api_usage
        WHERE timestamp >= $1
        GROUP BY api_endpoint
        ORDER BY request_count DESC
      `;

      const result = await db.query(query, [startDate]);
      return result.rows;
    } catch (error) {
      console.error('Error getting NASA API analytics:', error);
      return [];
    }
  }

  // Get performance metrics
  async getPerformanceMetrics(timeRange = '7d') {
    const days = parseInt(timeRange) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const query = `
        SELECT
          metric_type,
          metric_name,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          COUNT(*) as count,
          DATE_TRUNC('hour', timestamp) as hour
        FROM performance_metrics
        WHERE timestamp >= $1
        GROUP BY metric_type, metric_name, DATE_TRUNC('hour', timestamp)
        ORDER BY hour DESC
      `;

      const result = await db.query(query, [startDate]);
      return result.rows;
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return [];
    }
  }

  // GDPR/CCPA compliance: Export user data
  async exportUserData(consentId) {
    try {
      const queries = {
        consent: 'SELECT * FROM analytics_consent WHERE consent_id = $1',
        events: 'SELECT * FROM analytics_events WHERE consent_id = $1',
        pageViews: 'SELECT * FROM page_views WHERE consent_id = $1',
        apiUsage: 'SELECT * FROM nasa_api_usage WHERE consent_id = $1',
        performance: 'SELECT * FROM performance_metrics WHERE consent_id = $1'
      };

      const userData = {};
      for (const [key, query] of Object.entries(queries)) {
        const result = await db.query(query, [consentId]);
        userData[key] = result.rows;
      }

      return userData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  // GDPR/CCPA compliance: Delete user data
  async deleteUserData(consentId) {
    try {
      const queries = [
        'DELETE FROM analytics_events WHERE consent_id = $1',
        'DELETE FROM page_views WHERE consent_id = $1',
        'DELETE FROM nasa_api_usage WHERE consent_id = $1',
        'DELETE FROM performance_metrics WHERE consent_id = $1',
        'DELETE FROM user_journeys WHERE consent_id = $1',
        'DELETE FROM ab_test_analytics WHERE consent_id = $1',
        'UPDATE analytics_consent SET withdrawn_at = CURRENT_TIMESTAMP WHERE consent_id = $1'
      ];

      await db.transaction(async (client) => {
        for (const query of queries) {
          await client.query(query, [consentId]);
        }
      });

      // Clear cache
      this.consentCache.delete(consentId);

      return { success: true, message: 'User data deleted successfully' };
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }

  // Parse device information
  parseDeviceInfo(deviceInfo) {
    if (!deviceInfo) return {};

    return {
      device_type: deviceInfo.deviceType,
      browser_name: deviceInfo.browserName,
      browser_version: deviceInfo.browserVersion,
      os_name: deviceInfo.osName,
      os_version: deviceInfo.osVersion,
      screen_resolution: deviceInfo.screenResolution,
      viewport_size: deviceInfo.viewportSize,
      user_agent: deviceInfo.userAgent
    };
  }

  // Parse geo information
  parseGeoInfo(geoInfo) {
    if (!geoInfo) return {};

    return {
      geo_country: geoInfo.country,
      geo_region: geoInfo.region
    };
  }

  // Cleanup old data (automated data retention)
  async cleanupOldData() {
    try {
      const query = 'SELECT cleanup_old_analytics_data() as deleted_count';
      const result = await db.query(query);
      return result.rows[0].deleted_count;
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      return 0;
    }
  }
}

module.exports = new AnalyticsService();