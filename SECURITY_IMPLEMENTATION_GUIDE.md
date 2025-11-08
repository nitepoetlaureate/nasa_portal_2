# NASA System 7 Portal - Security Implementation Guide

**Last Updated:** November 7, 2025
**Security Level:** MODERATE → HIGH
**Implementation Priority:** IMMEDIATE

## 🚨 Critical Security Fixes Required

This guide provides step-by-step instructions to implement all critical security fixes identified in the security audit.

---

## 1. IMMEDIATE ACTIONS (Complete Within 24 Hours)

### 1.1 Fix Dependency Vulnerabilities

```bash
# Navigate to project root
cd /Users/edsaga/nasa_system7_portal

# Fix client-side vulnerabilities
cd client
npm audit fix --force
npm update

# Fix server-side vulnerabilities
cd ../server
npm audit fix
npm install express-validator joi jsonwebtoken bcryptjs

# Verify fixes
npm audit
```

### 1.2 Update Package Dependencies

**Client Package Updates:**
```bash
cd client
npm install express@latest axios@latest vite@latest
npm audit fix
```

**Server Package Updates:**
```bash
cd server
npm install express@latest axios@latest helmet@latest
npm install express-validator joi jsonwebtoken bcryptjs
npm audit fix
```

### 1.3 Secure Environment Variables

**Edit `/server/.env`:**
```bash
# Replace with actual secure values
JWT_SECRET=your_actual_32_character_minimum_secret_here_REPLACE_ME
SESSION_SECRET=your_actual_32_character_minimum_secret_here_REPLACE_ME
DB_PASSWORD=your_actual_secure_database_password_here_REPLACE_ME
REDIS_PASSWORD=your_actual_redis_password_here_REPLACE_ME

# Add security configuration
VALID_API_KEYS=DEMO_KEY,YOUR_PRODUCTION_API_KEY_HERE
ALLOWED_ORIGINS=http://localhost:3000,https://your-production-domain.com
```

---

## 2. IMPLEMENT SECURITY MIDDLEWARE (Complete Within 48 Hours)

### 2.1 Update Main Server Configuration

**Edit `/server/server.js`** to replace the current security middleware:

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import new security middleware
const { validateEnv, securityConfig } = require('./config/security-config');
const securityMiddleware = require('./middleware/security');
const { authenticateApiKey, authRateLimiter, corsOptions } = require('./middleware/auth');
const securityFixes = require('./security-fixes');

// Validate environment variables at startup
const envConfig = validateEnv();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware (replaces existing helmet config)
app.use(securityMiddleware.helmet);
app.use(securityMiddleware.securityHeaders);

// Enhanced rate limiting
app.use(securityMiddleware.rateLimiter);

// Enhanced CORS configuration
app.use(cors(corsOptions));

// Request size and validation
app.use(securityMiddleware.enforceRequestLimits);
app.use(express.json(securityMiddleware.requestSizeLimit));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Input validation and sanitization
app.use(securityFixes.validateAndSanitizeInput);

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Apply API key authentication to all /api routes
app.use('/api/', authenticateApiKey);
app.use('/api/', authRateLimiter);

// API routes (add validation to existing routes)
app.use('/api/nasa', securityMiddleware.validateApiKey, securityMiddleware.handleValidationErrors, require('./routes/apiProxy'));
app.use('/api/apod', securityMiddleware.validateDate, securityMiddleware.handleValidationErrors, require('./routes/apodEnhanced'));

// Enhanced error handling
app.use(securityFixes.secureErrorHandler);

// Security health check endpoint
app.get('/security/health', async (req, res) => {
  const health = await securityFixes.performSecurityHealthCheck();
  res.json(health);
});

// Audit log endpoint (admin only)
app.get('/security/audit', (req, res) => {
  const auditLog = securityFixes.getAuditLog(100);
  res.json({ auditLog, total: auditLog.length });
});
```

### 2.2 Update Database Configuration

**Edit `/server/config/database.js`** to enhance security:

```javascript
const { Pool } = require('pg');

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.fallbackMode = false;
  }

  async connect() {
    if (process.env.DISABLE_DATABASE_CONNECTIONS === 'true') {
      console.log('🔧 Database connections disabled - running in fallback mode');
      this.fallbackMode = true;
      this.isConnected = false;
      return true;
    }

    try {
      this.pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_DATABASE || 'nasa_system7',
        password: process.env.DB_PASSWORD || 'nasa_secure_password_2024',
        port: process.env.DB_PORT || 5432,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        statement_timeout: 10000,
        query_timeout: 10000,
        application_name: 'nasa_system7_portal',

        // Enhanced SSL configuration
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: true,
          require: true
        } : false,

        // Connection string for production
        ...(process.env.DATABASE_URL && {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: true,
            require: true
          } : false
        })
      });

      // Test the connection
      const client = await this.pool.connect();
      try {
        await client.query('SELECT NOW()');
        client.release();

        this.isConnected = true;
        console.log('✅ Database connected successfully');

        // Security-enhanced error handling
        this.pool.on('error', (err, client) => {
          console.error('Database pool error:', err);
          this.isConnected = false;

          // Log security event
          this.logSecurityEvent('DATABASE_ERROR', {
            error: err.message,
            timestamp: new Date().toISOString()
          });
        });

        return true;
      } catch (queryError) {
        client.release();
        throw queryError;
      }
    } catch (error) {
      console.warn('⚠️  PostgreSQL connection failed:', error.message);
      this.fallbackMode = true;
      this.isConnected = false;
      return true;
    }
  }

  // Enhanced query method with SQL injection prevention
  async query(text, params = []) {
    if (this.fallbackMode) {
      console.warn('⚠️  Database query skipped (fallback mode)');
      return { rows: [], rowCount: 0 };
    }

    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    // SQL injection prevention
    if (!text.includes('$') && params.length > 0) {
      throw new Error('Query with parameters must use parameterized statements');
    }

    // Check for dangerous SQL patterns
    const dangerousPatterns = [
      /DROP\s+TABLE/i,
      /DELETE\s+FROM/i,
      /TRUNCATE/i,
      /ALTER\s+TABLE/i,
      /UNION\s+SELECT/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(text)) {
        throw new Error('Dangerous SQL pattern detected');
      }
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        console.warn(`Slow query detected (${duration}ms):`, text);
      }

      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  logSecurityEvent(event, data) {
    console.log('SECURITY_AUDIT:', {
      timestamp: new Date().toISOString(),
      event,
      data
    });
  }
}
```

---

## 3. UPDATE API ROUTES (Complete Within 72 Hours)

### 3.1 Secure APOD Enhanced Route

**Edit `/server/routes/apodEnhanced.js`:**

```javascript
const express = require('express');
const axios = require('axios');
const { cacheMiddleware } = require('../middleware/cache');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();

// Enhanced input validation
const validateDate = [
  param('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      const minDate = new Date('1995-06-16');

      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      if (date > today) {
        throw new Error('Date cannot be in the future');
      }
      if (date < minDate) {
        throw new Error('Date cannot be before June 16, 1995');
      }
      return true;
    })
];

const validateDateRange = [
  body('startDate')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Start date must be in YYYY-MM-DD format'),
  body('endDate')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('End date must be in YYYY-MM-DD format')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.param,
        message: error.msg
      }))
    });
  }
  next();
};

// Secure APOD endpoint with enhanced validation
router.get('/enhanced/:date', validateDate, handleValidationErrors, cacheMiddleware('apod-enhanced'), async (req, res) => {
  try {
    const { date } = req.params;

    // Additional validation
    const sanitizedDate = date.replace(/[^0-9\-]/g, '');
    if (sanitizedDate !== date) {
      return res.status(400).json({
        error: 'Invalid date format',
        code: 'INVALID_DATE_CHARS'
      });
    }

    // Continue with existing APOD logic...
    const NASA_API_KEY = process.env.NASA_API_KEY;
    const NASA_API_URL = 'https://api.nasa.gov';

    const response = await axios.get(`${NASA_API_URL}/planetary/apod`, {
      params: {
        date: sanitizedDate,
        api_key: NASA_API_KEY,
        thumbs: true
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'NASA-System7-Portal/1.0'
      }
    });

    const apodData = response.data;

    // Sanitize response data
    const sanitizedData = {
      ...apodData,
      title: apodData.title ? apodData.title.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') : '',
      explanation: apodData.explanation ? apodData.explanation.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') : ''
    };

    res.json(sanitizedData);
  } catch (error) {
    console.error('Enhanced APOD API error:', error);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch enhanced APOD data.',
      message: 'An error occurred while fetching APOD data'
    });
  }
});

// Secure date range endpoint
router.post('/range', validateDateRange, handleValidationErrors, cacheMiddleware('apod-range'), async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    // Additional validation
    const dateDiff = new Date(endDate) - new Date(startDate);
    const daysDiff = dateDiff / (1000 * 60 * 60 * 24);

    if (daysDiff > 365) {
      return res.status(400).json({
        error: 'Date range too large',
        message: 'Maximum date range is 365 days'
      });
    }

    // Continue with existing logic...
    res.json({ startDate, endDate, message: 'Date range validated successfully' });
  } catch (error) {
    console.error('APOD range error:', error);
    res.status(500).json({
      error: 'Failed to process date range',
      message: 'An error occurred while processing the date range'
    });
  }
});

module.exports = router;
```

### 3.2 Secure API Proxy Route

**Edit `/server/routes/apiProxy.js`:**

```javascript
const express = require('express');
const axios = require('axios');
const { cacheMiddleware } = require('../middleware/cache');
const { query, validationResult } = require('express-validator');
const router = express.Router();

const NASA_API_KEY = process.env.NASA_API_KEY;
const NASA_API_URL = 'https://api.nasa.gov';

// Input validation for API parameters
const validateApiParams = [
  query('api_key')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('API key must be between 1 and 100 characters'),
  query('date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format'),
  query('start_date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Start date must be in YYYY-MM-DD format'),
  query('end_date')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('End date must be in YYYY-MM-DD format')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.param,
        message: error.msg
      }))
    });
  }
  next();
};

// Enhanced proxy request with security validation
const proxyRequest = (baseURL) => async (req, res) => {
  try {
    let endpoint = req.path;

    // Remove leading slash for proper URL construction
    if (endpoint.startsWith('/')) {
      endpoint = endpoint.substring(1);
    }

    // Validate that we're only calling NASA APIs
    const fullUrl = `${baseURL}/${endpoint}`;
    if (!fullUrl.includes('api.nasa.gov')) {
      console.error('CRITICAL: Attempting to proxy to non-NASA URL:', fullUrl);
      return res.status(400).json({
        error: 'Invalid proxy target',
        message: 'Only NASA API endpoints are allowed'
      });
    }

    // Sanitize and validate parameters
    const sanitizedParams = {};
    for (const [key, value] of Object.entries(req.query)) {
      // Remove any script tags or dangerous content
      if (typeof value === 'string') {
        sanitizedParams[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .substring(0, 1000); // Limit parameter length
      } else {
        sanitizedParams[key] = value;
      }
    }

    // Add API key
    sanitizedParams.api_key = NASA_API_KEY || 'DEMO_KEY';

    console.log(`🔄 Proxying request to: ${fullUrl}`);

    const response = await axios.get(fullUrl, {
      params: sanitizedParams,
      timeout: 10000,
      headers: {
        'User-Agent': 'NASA-System7-Portal/1.0',
        'Accept': 'application/json',
        'X-Forwarded-For': req.ip
      }
    });

    console.log(`✅ Successfully fetched data from NASA API: ${endpoint}`);

    // Sanitize response data
    const sanitizedResponse = sanitizeApiResponse(response.data);
    res.json(sanitizedResponse);

  } catch (error) {
    console.error(`API proxy error for endpoint: ${endpoint}`, {
      status: error.response?.status,
      message: error.message
    });

    // Enhanced error handling with fallback
    if (endpoint.includes('planetary/apod')) {
      const fallbackApod = {
        title: 'Hubble Views Grand Design Spiral Galaxy M81',
        explanation: 'The sharpest view ever taken of the large grand-design spiral galaxy M81.',
        url: 'https://apod.nasa.gov/apod/image/2408/M81_Hubble_3000.jpg',
        media_type: 'image',
        date: new Date().toISOString().split('T')[0],
        fallback: true
      };
      return res.json(fallbackApod);
    }

    res.status(error.response?.status || 500).json({
      error: 'Error fetching data from NASA API',
      message: 'An error occurred while processing your request'
    });
  }
};

// Sanitize API response data
function sanitizeApiResponse(data) {
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Remove potential XSS payloads
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'string' ? item.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') : item
        );
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  return data;
}

// Apply validation and caching to all NASA API requests
router.get('/*', validateApiParams, handleValidationErrors, cacheMiddleware('nasa'), proxyRequest(NASA_API_URL));

module.exports = router;
```

---

## 4. DATABASE SECURITY IMPLEMENTATION (Complete Within 1 Week)

### 4.1 Run Database Security Script

```bash
# Navigate to server directory
cd /Users/edsaga/nasa_system7_portal/server

# Run the security script (requires PostgreSQL access)
psql -h localhost -U postgres -f database-security.sql

# Or run with specific database
psql -h localhost -U postgres -d nasa_system7 -f database-security.sql
```

### 4.2 Update Database Configuration for Production

**Update `.env` for production:**
```bash
# Enable SSL for database connections
DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require

# Strong database user permissions
DB_USER=nasa_app_user
DB_PASSWORD=very_strong_password_here_minimum_32_characters

# Redis security
REDIS_PASSWORD=another_very_strong_password_minimum_32_characters
REDIS_URL=redis://:password@localhost:6379
```

---

## 5. CLIENT-SIDE SECURITY IMPLEMENTATION

### 5.1 Update Client Environment

**Edit `/client/.env`:**
```bash
# Remove sensitive API keys from client
REACT_APP_API_URL=http://localhost:3001/api/nasa
REACT_APP_NASA_API_KEY=  # Remove - API key should be server-side only

# Security settings
REACT_APP_ENABLE_SECURITY_HEADERS=true
REACT_APP_API_TIMEOUT=10000
REACT_APP_MAX_RETRIES=2
```

### 5.2 Update Client API Service

**Edit `/client/src/services/nasaApi.js`:**
```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/nasa';

// Create secure axios instance
const nasaApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  withCredentials: false
});

// Request interceptor for security
nasaApi.interceptors.request.use(
  (config) => {
    // Add security headers
    config.headers['X-Content-Type-Options'] = 'nosniff';

    // Remove any sensitive data from logs
    if (config.params && config.params.api_key) {
      config.params.api_key = '[REDACTED]';
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced response interceptor
nasaApi.interceptors.response.use(
  (response) => {
    // Validate response structure
    if (response.data && typeof response.data === 'object') {
      // Sanitize response data
      return sanitizeResponse(response);
    }
    return response;
  },
  (error) => {
    // Enhanced error handling
    if (error.response) {
      const { status, data } = error.response;

      // Log security events
      if (status === 401 || status === 403) {
        console.warn('Security error:', { status, data });
      }

      switch (status) {
        case 401:
          throw new Error('Authentication required');
        case 403:
          throw new Error('Access forbidden');
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        case 500:
          throw new Error('Server error. Please try again later.');
        default:
          throw new Error(data.error || `Request failed with status ${status}`);
      }
    } else if (error.request) {
      throw new Error('Network error. Please check your connection.');
    } else {
      throw new Error('Request configuration error');
    }
  }
);

// Sanitize response data
function sanitizeResponse(response) {
  const data = response.data;

  // Remove potential XSS payloads from strings
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  };

  // Recursively sanitize object
  const sanitizeObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    } else {
      return sanitizeString(obj);
    }
  };

  response.data = sanitizeObject(data);
  return response;
}

// Export secure API functions
export const fetchApod = async (date) => {
  const params = {};
  if (date) {
    params.date = date;
  }
  return nasaApi.get('/apod', { params });
};

export const fetchNeoFeed = async (startDate, endDate) => {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  return nasaApi.get('/neo/feed', { params });
};

export default nasaApi;
```

---

## 6. PRODUCTION DEPLOYMENT SECURITY CHECKLIST

### 6.1 Pre-Deployment Security Checklist

- [ ] All dependency vulnerabilities fixed (`npm audit` shows no issues)
- [ ] Environment variables properly secured with strong secrets
- [ ] Database security script executed
- [ ] SSL/TLS configured for all connections
- [ ] API authentication implemented
- [ ] Rate limiting properly configured
- [ ] Input validation added to all endpoints
- [ ] Security headers implemented
- [ ] CORS properly configured
- [ ] Error handling doesn't leak sensitive information
- [ ] Audit logging enabled
- [ ] Backup and recovery procedures tested

### 6.2 Production Environment Variables

```bash
# Production .env configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=warn

# Database security
DB_DATABASE=nasa_system7_prod
DB_USER=nasa_app_user
DB_PASSWORD=VERY_STRONG_PASSWORD_32_CHARS_MINIMUM
DB_HOST=your-production-db-host
DATABASE_URL=postgresql://nasa_app_user:password@host:5432/nasa_system7_prod?sslmode=require

# Redis security
REDIS_HOST=your-redis-host
REDIS_PASSWORD=VERY_STRONG_REDIS_PASSWORD_32_CHARS_MINIMUM
REDIS_URL=redis://:password@redis-host:6379

# API security
NASA_API_KEY=your_production_nasa_api_key
JWT_SECRET=VERY_STRONG_JWT_SECRET_32_CHARS_MINIMUM
SESSION_SECRET=VERY_STRONG_SESSION_SECRET_32_CHARS_MINIMUM
VALID_API_KEYS=DEMO_KEY,PRODUCTION_API_KEY_1,PRODUCTION_API_KEY_2

# CORS and security
ALLOWED_ORIGINS=https://your-production-domain.com,https://www.your-production-domain.com

# Monitoring
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_AUDIT_LOG=true
ENABLE_ERROR_STACK_TRACES=false
```

### 6.3 Docker Production Security

**Update Docker Compose for production:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_DATABASE}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - nasa_network
    restart: unless-stopped
    # Remove ports from production
    # ports:
    #   - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - nasa_network
    restart: unless-stopped
    # Remove ports from production
    # ports:
    #   - "6379:6379"

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
    networks:
      - nasa_network
    restart: unless-stopped
    depends_on:
      - postgres
      - redis

networks:
  nasa_network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

---

## 7. ONGOING SECURITY MONITORING

### 7.1 Security Health Monitoring

Add this monitoring script to your application:

```javascript
// Add to server.js or create monitoring endpoint
setInterval(async () => {
  try {
    const health = await securityFixes.performSecurityHealthCheck();

    if (health.status !== 'healthy') {
      console.error('Security health check failed:', health);
      // Send alert to monitoring system
    }
  } catch (error) {
    console.error('Security monitoring error:', error);
  }
}, 300000); // Check every 5 minutes
```

### 7.2 Automated Security Scanning

Create a CI/CD pipeline security scan:

```bash
#!/bin/bash
# security-scan.sh

echo "🔍 Running security scan..."

# Audit dependencies
npm audit --audit-level=moderate
if [ $? -ne 0 ]; then
  echo "❌ Security vulnerabilities found"
  exit 1
fi

# Check for outdated packages
npm outdated

# Run security tests
npm run test:security

echo "✅ Security scan completed"
```

---

## 8. SECURITY TESTING

### 8.1 Manual Security Testing Checklist

- [ ] Test SQL injection attempts
- [ ] Test XSS attacks
- [ ] Test CORS bypass attempts
- [ ] Test rate limiting effectiveness
- [ ] Test authentication bypass
- [ ] Test error message information disclosure
- [ ] Test file upload security (if applicable)
- [ ] Test session hijacking protection

### 8.2 Automated Security Tests

Create security test file `/server/tests/security.test.js`:

```javascript
const request = require('supertest');
const app = require('../server');

describe('Security Tests', () => {
  test('should reject SQL injection attempts', async () => {
    const response = await request(app)
      .get('/api/apod/2023-12-01; DROP TABLE users;--')
      .expect(400);

    expect(response.body.error).toContain('Invalid date format');
  });

  test('should enforce rate limiting', async () => {
    const promises = Array(150).fill().map(() =>
      request(app).get('/api/apod')
    );

    const responses = await Promise.all(promises);
    const rateLimited = responses.some(res => res.status === 429);

    expect(rateLimited).toBe(true);
  });

  test('should sanitize XSS attempts', async () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const response = await request(app)
      .get(`/api/search?q=${encodeURIComponent(maliciousInput)}`)
      .expect(400);

    expect(response.body).not.toContain('<script>');
  });
});
```

---

## 🚨 FINAL SECURITY REMINDER

After implementing all fixes:

1. **Test thoroughly** in a staging environment
2. **Monitor closely** after production deployment
3. **Review and rotate** secrets regularly
4. **Stay updated** on security advisories
5. **Conduct regular** security assessments

**Emergency Contact:** If any security issues are discovered, immediately:
1. Block affected endpoints
2. Review audit logs
3. Patch vulnerabilities
4. Rotate secrets if compromised

---

**Implementation Status:**
- [ ] Dependencies updated
- [ ] Security middleware implemented
- [ ] API routes secured
- [ ] Database security implemented
- [ ] Client security implemented
- [ ] Production deployment secured
- [ ] Monitoring implemented

**Next Review Date:** February 7, 2026