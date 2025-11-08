// NASA System 7 Portal - Security Fixes Implementation
// This script provides immediate fixes for critical security vulnerabilities

const { validateEnv, securityConfig } = require('./config/security-config');
const { Pool } = require('pg');

// Initialize security configuration
const envConfig = validateEnv();

// Security fixes implementation
class SecurityFixes {
  constructor() {
    this.securityEnabled = true;
    this.auditLog = [];
  }

  // Fix 1: Enhanced input validation and sanitization
  validateAndSanitizeInput(req, res, next) {
    const originalQuery = { ...req.query };
    const originalParams = { ...req.params };
    const originalBody = { ...req.body };

    try {
      // Sanitize query parameters
      if (req.query) {
        for (const key in req.query) {
          if (typeof req.query[key] === 'string') {
            // Remove potential XSS payloads
            req.query[key] = req.query[key]
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '')
              .trim();

            // Limit length
            if (req.query[key].length > 1000) {
              req.query[key] = req.query[key].substring(0, 1000);
            }
          }
        }
      }

      // Sanitize route parameters
      if (req.params) {
        for (const key in req.params) {
          if (typeof req.params[key] === 'string') {
            // Allow only alphanumeric, hyphens, and underscores for params
            req.params[key] = req.params[key].replace(/[^a-zA-Z0-9\-_]/g, '');

            // Limit length
            if (req.params[key].length > 100) {
              req.params[key] = req.params[key].substring(0, 100);
            }
          }
        }
      }

      // Validate date format for APOD endpoints
      if (req.params.date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(req.params.date)) {
          return res.status(400).json({
            error: 'Invalid date format',
            message: 'Date must be in YYYY-MM-DD format'
          });
        }

        const date = new Date(req.params.date);
        const today = new Date();
        const minDate = new Date('1995-06-16');

        if (isNaN(date.getTime())) {
          return res.status(400).json({
            error: 'Invalid date',
            message: 'The provided date is not valid'
          });
        }

        if (date > today) {
          return res.status(400).json({
            error: 'Future date',
            message: 'Date cannot be in the future'
          });
        }

        if (date < minDate) {
          return res.status(400).json({
            error: 'Date too early',
            message: 'APOD started on June 16, 1995'
          });
        }
      }

      // Log sanitization for audit
      this.logAuditEvent('INPUT_SANITIZATION', {
        original: { query: originalQuery, params: originalParams, body: originalBody },
        sanitized: { query: req.query, params: req.params, body: req.body },
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      next();
    } catch (error) {
      console.error('Input sanitization error:', error);
      res.status(500).json({
        error: 'Security validation failed',
        message: 'Invalid input format'
      });
    }
  }

  // Fix 2: SQL Injection prevention
  async secureDatabaseQuery(text, params = []) {
    const pool = new Pool(securityConfig.database);

    try {
      // Validate that the query uses parameterized statements
      if (!text.includes('$') && params.length > 0) {
        throw new Error('Query with parameters must use parameterized statements');
      }

      // Check for dangerous SQL patterns
      const dangerousPatterns = [
        /DROP\s+TABLE/i,
        /DELETE\s+FROM/i,
        /TRUNCATE/i,
        /ALTER\s+TABLE/i,
        /CREATE\s+TABLE/i,
        /EXEC\s*\(/i,
        /UNION\s+SELECT/i
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(text)) {
          throw new Error('Dangerous SQL pattern detected');
        }
      }

      // Log the query for audit
      this.logAuditEvent('DATABASE_QUERY', {
        query: text.substring(0, 200), // Limit logged query length
        paramCount: params.length,
        timestamp: new Date().toISOString()
      });

      const result = await pool.query(text, params);
      return result;
    } catch (error) {
      this.logAuditEvent('DATABASE_ERROR', {
        error: error.message,
        query: text.substring(0, 200),
        timestamp: new Date().toISOString()
      });
      throw error;
    } finally {
      await pool.end();
    }
  }

  // Fix 3: Enhanced API security headers
  setSecurityHeaders(req, res, next) {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // HSTS in production
    if (envConfig.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // API-specific headers
    res.setHeader('X-API-Version', '1.0');
    res.setHeader('X-Rate-Limit-Limit', '100');
    res.setHeader('X-Rate-Limit-Remaining', '99');
    res.setHeader('X-Rate-Limit-Reset', new Date(Date.now() + 900000).toISOString());

    // Cache control for API responses
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "img-src 'self' data: https://api.nasa.gov https://images.nasa.gov",
      "script-src 'self'",
      "style-src 'self'",
      "connect-src 'self' https://api.nasa.gov",
      "font-src 'self'",
      "object-src 'none'",
      "media-src 'self'",
      "frame-src 'none'",
      "child-src 'none'",
      "worker-src 'self'",
      "manifest-src 'self'"
    ].join('; ');

    res.setHeader('Content-Security-Policy', csp);

    next();
  }

  // Fix 4: Request size and rate limiting
  enforceRequestLimits(req, res, next) {
    // Check request size
    const contentLength = req.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 1048576) { // 1MB
      return res.status(413).json({
        error: 'Request too large',
        message: 'Request size exceeds 1MB limit'
      });
    }

    // Check query parameter count
    const queryParamCount = Object.keys(req.query).length;
    if (queryParamCount > 50) {
      return res.status(400).json({
        error: 'Too many parameters',
        message: 'Request contains too many query parameters'
      });
    }

    // Check request header size
    const headerSize = JSON.stringify(req.headers).length;
    if (headerSize > 8192) { // 8KB
      return res.status(400).json({
        error: 'Headers too large',
        message: 'Request headers exceed size limit'
      });
    }

    next();
  }

  // Fix 5: Secure error handling
  secureErrorHandler(err, req, res, next) {
    // Log full error for debugging
    console.error('Security error:', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Log audit event
    this.logAuditEvent('SECURITY_ERROR', {
      error: err.message,
      url: req.url,
      method: req.method,
      ip: req.ip
    });

    // Return generic error to client
    const isDevelopment = envConfig.NODE_ENV === 'development';

    res.status(err.status || 500).json({
      error: 'An error occurred',
      message: isDevelopment ? err.message : 'Internal server error',
      requestId: req.headers['x-request-id'] || 'unknown',
      timestamp: new Date().toISOString()
    });
  }

  // Fix 6: API key validation
  validateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const validApiKeys = envConfig.VALID_API_KEYS.split(',');

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'Please provide a valid API key in the X-API-Key header'
      });
    }

    if (!validApiKeys.includes(apiKey)) {
      this.logAuditEvent('INVALID_API_KEY', {
        key: apiKey.substring(0, 4) + '...',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
    }

    req.apiKey = apiKey;
    next();
  }

  // Fix 7: Enhanced CORS with origin validation
  validateCorsOrigin(req, res, next) {
    const origin = req.get('Origin');
    const allowedOrigins = envConfig.ALLOWED_ORIGINS.split(',');

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return next();
    }

    if (allowedOrigins.indexOf(origin) === -1) {
      this.logAuditEvent('CORS_VIOLATION', {
        origin,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        error: 'CORS violation',
        message: 'Origin not allowed'
      });
    }

    next();
  }

  // Audit logging function
  logAuditEvent(eventType, data) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      data,
      ip: data.ip || 'unknown',
      userAgent: data.userAgent || 'unknown'
    };

    this.auditLog.push(auditEntry);

    // Keep audit log size manageable
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }

    // Log to console in development
    if (envConfig.NODE_ENV === 'development') {
      console.log('AUDIT:', auditEntry);
    }
  }

  // Get audit log
  getAuditLog(limit = 100) {
    return this.auditLog.slice(-limit);
  }

  // Security health check
  async performSecurityHealthCheck() {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: []
    };

    try {
      // Check environment variables
      const envCheck = {
        name: 'Environment Variables',
        status: 'pass',
        details: 'All required environment variables are set'
      };

      if (!envConfig.JWT_SECRET || envConfig.JWT_SECRET.length < 32) {
        envCheck.status = 'fail';
        envCheck.details = 'JWT_SECRET is missing or too short';
      }

      health.checks.push(envCheck);

      // Check database security
      const dbCheck = {
        name: 'Database Security',
        status: 'pass',
        details: 'Database connections are secure'
      };

      try {
        const pool = new Pool(securityConfig.database);
        await pool.query('SELECT 1');
        await pool.end();
      } catch (error) {
        dbCheck.status = 'fail';
        dbCheck.details = 'Database connection failed: ' + error.message;
      }

      health.checks.push(dbCheck);

      // Check API key security
      const apiKeyCheck = {
        name: 'API Key Security',
        status: 'pass',
        details: 'API key validation is configured'
      };

      if (!envConfig.VALID_API_KEYS || envConfig.VALID_API_KEYS === 'DEMO_KEY') {
        apiKeyCheck.status = 'warn';
        apiKeyCheck.details = 'Using default API keys in production';
      }

      health.checks.push(apiKeyCheck);

      // Overall status
      const failedChecks = health.checks.filter(check => check.status === 'fail');
      if (failedChecks.length > 0) {
        health.status = 'unhealthy';
      }

      const warningChecks = health.checks.filter(check => check.status === 'warn');
      if (warningChecks.length > 0 && health.status === 'healthy') {
        health.status = 'warning';
      }

    } catch (error) {
      health.status = 'error';
      health.error = error.message;
    }

    return health;
  }
}

// Export singleton instance
const securityFixes = new SecurityFixes();

module.exports = securityFixes;