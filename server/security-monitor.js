/**
 * NASA System 7 Portal - Security Monitoring System
 * Real-time security monitoring and threat detection
 */

const EventEmitter = require('events');
const winston = require('winston');
const { performance } = require('perf_hooks');

class SecurityMonitor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      alertThresholds: {
        failedLogins: 5,           // Failed login attempts per minute
        suspiciousIPs: 10,          // Requests from suspicious IP per minute
        tokenAbuse: 20,             // Token usage anomalies per minute
        bruteForceWindow: 60000,    // 1 minute window for detection
        sessionHijacking: 3,        // Session anomalies per minute
      },
      monitoring: {
        enabled: true,
        logLevel: 'info',
        metricsRetention: 24 * 60 * 60 * 1000, // 24 hours
        alertCooldown: 5 * 60 * 1000,           // 5 minutes between alerts
      },
      ...options
    };

    this.metrics = {
      authentication: {
        totalAttempts: 0,
        successfulLogins: 0,
        failedLogins: 0,
        mfaAttempts: 0,
        oauthAttempts: 0,
        passwordResets: 0,
        accountLockouts: 0,
      },
      security: {
        suspiciousActivities: 0,
        blockedRequests: 0,
        rateLimitHits: 0,
        tokenBlacklistHits: 0,
        ipBlocklistHits: 0,
      },
      performance: {
        averageResponseTime: 0,
        slowRequests: 0,
        errorRate: 0,
      },
      sessions: {
        activeSessions: 0,
        expiredSessions: 0,
        concurrentSessions: 0,
        suspiciousSessions: 0,
      }
    };

    this.alerts = new Map();
    this.suspiciousIPs = new Map();
    this.blockedIPs = new Set();
    this.lastAlertTimes = new Map();

    this.setupLogger();
    this.startMetricsCollection();
  }

  setupLogger() {
    this.logger = winston.createLogger({
      level: this.options.monitoring.logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.prettyPrint()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({
          filename: 'logs/security.log',
          maxSize: '10m',
          maxFiles: 5
        })
      ]
    });
  }

  startMetricsCollection() {
    if (!this.options.monitoring.enabled) return;

    // Clean up old metrics periodically
    setInterval(() => {
      this.cleanupOldMetrics();
    }, this.options.monitoring.metricsRetention);

    // Emit metrics updates
    setInterval(() => {
      this.emit('metrics', this.getMetrics());
    }, 30000); // Every 30 seconds
  }

  // Authentication event monitoring
  recordAuthenticationAttempt(event) {
    const { type, success, userId, ip, userAgent, provider } = event;

    this.metrics.authentication.totalAttempts++;

    if (success) {
      this.metrics.authentication.successfulLogins++;
      this.logger.info('Successful authentication', {
        type,
        userId,
        ip,
        userAgent,
        provider,
        timestamp: new Date().toISOString()
      });
    } else {
      this.metrics.authentication.failedLogins++;
      this.handleFailedLogin(event);

      this.logger.warn('Failed authentication attempt', {
        type,
        userId,
        ip,
        userAgent,
        provider,
        timestamp: new Date().toISOString()
      });
    }

    // Check for brute force attacks
    this.detectBruteForceAttack(ip);
  }

  recordMFAAttempt(event) {
    const { userId, success, ip, token } = event;

    this.metrics.authentication.mfaAttempts++;

    if (success) {
      this.logger.info('MFA verification successful', {
        userId,
        ip,
        timestamp: new Date().toISOString()
      });
    } else {
      this.logger.warn('MFA verification failed', {
        userId,
        ip,
        timestamp: new Date().toISOString()
      });

      this.detectSuspiciousActivity(userId, 'mfa_failure', ip);
    }
  }

  recordOAuthAttempt(event) {
    const { provider, success, userId, ip } = event;

    this.metrics.authentication.oauthAttempts++;

    this.logger.info('OAuth authentication attempt', {
      provider,
      success,
      userId,
      ip,
      timestamp: new Date().toISOString()
    });
  }

  recordPasswordReset(event) {
    const { email, ip, success } = event;

    this.metrics.authentication.passwordResets++;

    if (success) {
      this.logger.info('Password reset requested', {
        email,
        ip,
        timestamp: new Date().toISOString()
      });
    } else {
      this.logger.warn('Password reset failed', {
        email,
        ip,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Security event monitoring
  recordSecurityEvent(event) {
    const { type, severity, ip, userId, details } = event;

    this.metrics.security.suspiciousActivities++;

    this.logger.warn('Security event detected', {
      type,
      severity,
      ip,
      userId,
      details,
      timestamp: new Date().toISOString()
    });

    if (severity === 'high' || severity === 'critical') {
      this.triggerSecurityAlert(event);
    }

    // Update suspicious IP tracking
    if (ip) {
      this.trackSuspiciousIP(ip, event);
    }
  }

  recordRateLimitHit(event) {
    const { ip, endpoint, limit } = event;

    this.metrics.security.rateLimitHits++;

    this.logger.info('Rate limit exceeded', {
      ip,
      endpoint,
      limit,
      timestamp: new Date().toISOString()
    });

    this.detectSuspiciousActivity(null, 'rate_limit', ip);
  }

  recordTokenEvent(event) {
    const { type, tokenId, userId, ip, reason } = event;

    if (type === 'blacklist') {
      this.metrics.security.tokenBlacklistHits++;

      this.logger.warn('Token blacklisted', {
        tokenId,
        userId,
        ip,
        reason,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Session monitoring
  recordSessionEvent(event) {
    const { type, sessionId, userId, ip, userAgent } = event;

    switch (type) {
      case 'create':
        this.metrics.sessions.activeSessions++;
        break;
      case 'destroy':
        this.metrics.sessions.activeSessions--;
        break;
      case 'expire':
        this.metrics.sessions.expiredSessions++;
        break;
      case 'suspicious':
        this.metrics.sessions.suspiciousSessions++;
        this.detectSuspiciousActivity(userId, 'session_anomaly', ip);
        break;
    }

    this.logger.debug('Session event', {
      type,
      sessionId,
      userId,
      ip,
      timestamp: new Date().toISOString()
    });
  }

  // Performance monitoring
  recordPerformanceMetric(event) {
    const { endpoint, responseTime, statusCode, ip } = event;

    // Update average response time
    this.updateAverageResponseTime(responseTime);

    if (responseTime > 1000) { // Slow request threshold
      this.metrics.performance.slowRequests++;
    }

    if (statusCode >= 400) {
      this.updateErrorRate();
    }

    // Detect performance anomalies
    if (responseTime > 5000) { // Very slow request
      this.recordSecurityEvent({
        type: 'performance_anomaly',
        severity: 'medium',
        ip,
        details: `Slow response time: ${responseTime}ms for ${endpoint}`
      });
    }
  }

  // Threat detection methods
  handleFailedLogin(event) {
    const { ip, email, userAgent } = event;
    const key = `failed_login:${ip}`;

    if (!this.alerts.has(key)) {
      this.alerts.set(key, {
        count: 0,
        firstOccurrence: Date.now(),
        lastOccurrence: Date.now()
      });
    }

    const alert = this.alerts.get(key);
    alert.count++;
    alert.lastOccurrence = Date.now();

    // Check if threshold exceeded
    if (alert.count >= this.options.alertThresholds.failedLogins) {
      this.triggerSecurityAlert({
        type: 'brute_force_attack',
        severity: 'high',
        ip,
        details: `${alert.count} failed login attempts from ${ip}`,
        metadata: {
          email,
          userAgent,
          timeWindow: alert.lastOccurrence - alert.firstOccurrence
        }
      });
    }
  }

  detectBruteForceAttack(ip) {
    const key = `brute_force:${ip}`;
    const window = this.options.alertThresholds.bruteForceWindow;

    if (!this.alerts.has(key)) {
      this.alerts.set(key, {
        attempts: [],
        window
      });
    }

    const alert = this.alerts.get(key);
    const now = Date.now();

    // Clean old attempts outside the window
    alert.attempts = alert.attempts.filter(time => now - time < window);
    alert.attempts.push(now);

    if (alert.attempts.length >= this.options.alertThresholds.failedLogins) {
      this.blockIP(ip, 'brute_force_attack', 60 * 60 * 1000); // Block for 1 hour

      this.triggerSecurityAlert({
        type: 'brute_force_attack_detected',
        severity: 'critical',
        ip,
        details: `Brute force attack detected from ${ip}: ${alert.attempts.length} attempts in ${window}ms`
      });
    }
  }

  detectSuspiciousActivity(userId, activityType, ip) {
    const key = `suspicious:${userId || ip}:${activityType}`;

    if (!this.alerts.has(key)) {
      this.alerts.set(key, {
        count: 0,
        firstOccurrence: Date.now()
      });
    }

    const alert = this.alerts.get(key);
    alert.count++;

    // Trigger alert based on activity type and threshold
    const thresholds = {
      mfa_failure: 3,
      session_anomaly: 2,
      rate_limit: 10,
      token_abuse: 5
    };

    if (alert.count >= thresholds[activityType]) {
      this.triggerSecurityAlert({
        type: 'suspicious_activity',
        severity: 'medium',
        userId,
        ip,
        details: `Suspicious ${activityType} detected: ${alert.count} occurrences`,
        metadata: {
          activityType,
          timeWindow: Date.now() - alert.firstOccurrence
        }
      });
    }
  }

  trackSuspiciousIP(ip, event) {
    if (!this.suspiciousIPs.has(ip)) {
      this.suspiciousIPs.set(ip, {
        events: [],
        score: 0,
        firstSeen: Date.now()
      });
    }

    const ipData = this.suspiciousIPs.get(ip);
    ipData.events.push({
      type: event.type,
      timestamp: Date.now(),
      severity: event.severity
    });

    // Update IP risk score
    const severityScores = { low: 1, medium: 5, high: 10, critical: 20 };
    ipData.score += severityScores[event.severity] || 1;

    // Block high-risk IPs
    if (ipData.score >= 50) {
      this.blockIP(ip, 'high_risk_score', 24 * 60 * 60 * 1000); // Block for 24 hours
    }
  }

  blockIP(ip, reason, duration = 60 * 60 * 1000) {
    this.blockedIPs.add(ip);
    this.metrics.security.ipBlocklistHits++;

    this.logger.warn('IP blocked', {
      ip,
      reason,
      duration,
      timestamp: new Date().toISOString()
    });

    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      this.logger.info('IP unblocked', { ip, reason });
    }, duration);

    this.emit('ip_blocked', { ip, reason, duration });
  }

  triggerSecurityAlert(event) {
    const alertKey = `${event.type}:${event.ip || event.userId}`;
    const now = Date.now();
    const lastAlert = this.lastAlertTimes.get(alertKey);

    // Check alert cooldown
    if (lastAlert && now - lastAlert < this.options.monitoring.alertCooldown) {
      return; // Skip to prevent alert spam
    }

    this.lastAlertTimes.set(alertKey, now);

    const alert = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event
    };

    this.logger.error('Security alert triggered', alert);
    this.emit('security_alert', alert);

    // Send notifications for critical alerts
    if (event.severity === 'critical') {
      this.sendCriticalAlert(alert);
    }
  }

  sendCriticalAlert(alert) {
    // Implementation for sending critical alerts
    // Could integrate with email, Slack, PagerDuty, etc.
    console.error('🚨 CRITICAL SECURITY ALERT:', alert);
  }

  // Utility methods
  updateAverageResponseTime(responseTime) {
    const alpha = 0.1; // Smoothing factor
    this.metrics.performance.averageResponseTime =
      this.metrics.performance.averageResponseTime * (1 - alpha) + responseTime * alpha;
  }

  updateErrorRate() {
    const alpha = 0.1;
    this.metrics.performance.errorRate =
      this.metrics.performance.errorRate * (1 - alpha) + alpha;
  }

  cleanupOldMetrics() {
    const cutoff = Date.now() - this.options.monitoring.metricsRetention;

    // Clean old alerts
    for (const [key, alert] of this.alerts) {
      if (alert.lastOccurrence && alert.lastOccurrence < cutoff) {
        this.alerts.delete(key);
      }
    }

    // Clean old suspicious IP data
    for (const [ip, data] of this.suspiciousIPs) {
      if (data.firstSeen && data.firstSeen < cutoff) {
        this.suspiciousIPs.delete(ip);
      }
    }
  }

  // Public API methods
  getMetrics() {
    return {
      ...this.metrics,
      activeAlerts: this.alerts.size,
      blockedIPs: this.blockedIPs.size,
      suspiciousIPs: this.suspiciousIPs.size,
      timestamp: new Date().toISOString()
    };
  }

  getSecurityStatus() {
    const metrics = this.getMetrics();
    const riskScore = this.calculateRiskScore(metrics);

    return {
      status: riskScore < 30 ? 'secure' : riskScore < 70 ? 'warning' : 'critical',
      riskScore,
      metrics,
      recommendations: this.generateRecommendations(riskScore)
    };
  }

  calculateRiskScore(metrics) {
    let score = 0;

    // Authentication risks
    const failRate = metrics.authentication.failedLogins / Math.max(metrics.authentication.totalAttempts, 1);
    score += failRate * 30;

    // Security event risks
    score += metrics.security.suspiciousActivities * 2;
    score += metrics.security.rateLimitHits * 1;

    // Session risks
    const suspiciousSessionRate = metrics.sessions.suspiciousSessions / Math.max(metrics.sessions.activeSessions, 1);
    score += suspiciousSessionRate * 20;

    // Performance risks
    score += metrics.performance.slowRequests * 0.5;
    score += metrics.performance.errorRate * 10;

    return Math.min(100, Math.round(score));
  }

  generateRecommendations(riskScore) {
    const recommendations = [];

    if (riskScore > 70) {
      recommendations.push('Immediate security investigation required');
      recommendations.push('Consider blocking high-risk IP ranges');
      recommendations.push('Enable additional authentication factors');
    } else if (riskScore > 30) {
      recommendations.push('Monitor security events closely');
      recommendations.push('Review authentication logs');
      recommendations.push('Consider tightening rate limits');
    } else {
      recommendations.push('Continue normal security monitoring');
      recommendations.push('Regular security audits recommended');
    }

    return recommendations;
  }

  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  isIPSuspicious(ip) {
    return this.suspiciousIPs.has(ip) && this.suspiciousIPs.get(ip).score > 20;
  }

  // Middleware integration
  expressMiddleware() {
    return (req, res, next) => {
      const startTime = performance.now();
      const ip = req.ip || req.connection.remoteAddress;

      // Check if IP is blocked
      if (this.isIPBlocked(ip)) {
        this.recordSecurityEvent({
          type: 'blocked_request',
          severity: 'medium',
          ip,
          details: 'Request from blocked IP'
        });
        return res.status(403).json({ error: 'Access denied' });
      }

      // Record request start
      res.on('finish', () => {
        const responseTime = performance.now() - startTime;

        this.recordPerformanceMetric({
          endpoint: req.path,
          responseTime,
          statusCode: res.statusCode,
          ip
        });
      });

      next();
    };
  }
}

module.exports = SecurityMonitor;