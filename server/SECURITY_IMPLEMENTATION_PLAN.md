# NASA System 7 Portal - Security Implementation Plan

**Priority:** CRITICAL
**Timeline:** 2-4 weeks for production readiness
**Owner:** Security Engineering Team

## Executive Summary

This implementation plan addresses the critical security vulnerabilities identified in the security assessment. The plan provides specific code changes, configuration updates, and architectural improvements required to achieve enterprise-grade security.

## Phase 1: Critical Security Fixes (24-48 hours)

### 1.1 Environment Configuration

**Issue:** Missing critical environment variables causing authentication failures

**Action:** Configure required environment variables

```bash
# Create .env.production file
cat > .env.production << 'EOF'
# JWT Configuration
JWT_SECRET=<REPLACE_WITH_32+_CHAR_RANDOM_STRING>
JWT_REFRESH_SECRET=<REPLACE_WITH_32+_CHAR_RANDOM_STRING>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OAuth Configuration
GOOGLE_CLIENT_ID=<REPLACE_WITH_GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<REPLACE_WITH_GOOGLE_CLIENT_SECRET>
GOOGLE_REDIRECT_URI=https://nasa-system7-portal.com/auth/google/callback

GITHUB_CLIENT_ID=<REPLACE_WITH_GITHUB_CLIENT_ID>
GITHUB_CLIENT_SECRET=<REPLACE_WITH_GITHUB_CLIENT_SECRET>
GITHUB_REDIRECT_URI=https://nasa-system7-portal.com/auth/github/callback

NASA_CLIENT_ID=<REPLACE_WITH_NASA_SSO_CLIENT_ID>
NASA_CLIENT_SECRET=<REPLACE_WITH_NASA_SSO_CLIENT_SECRET>
NASA_REDIRECT_URI=https://nasa-system7-portal.com/auth/nasa/callback

# Security Configuration
SESSION_SECRET=<REPLACE_WITH_32+_CHAR_RANDOM_STRING>
BASE_URL=https://nasa-system7-portal.com
FRONTEND_URL=https://nasa-system7-portal.com

# Cache Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<REPLACE_WITH_REDIS_PASSWORD>
EOF
```

### 1.2 Security Headers Implementation

**File:** `/server/server.js`

**Action:** Enhance security headers configuration

```javascript
// Replace lines 38-49 with enhanced security configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-eval'"], // Temporary for development
      styleSrc: ["'self'", "'unsafe-inline'"], // Temporary for System 7 CSS
      imgSrc: ["'self'", "data:", "https://api.nasa.gov", "https://images.nasa.gov"],
      connectSrc: ["'self'", "https://api.nasa.gov", "https://accounts.google.com", "https://github.com"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      childSrc: ["'none'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false,
  crossOriginEmbedderPolicy: false, // Disable for NASA API compatibility
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-Download-Options', 'noopen');

  // Remove server header
  res.removeHeader('Server');

  next();
});
```

### 1.3 Enhanced Rate Limiting

**File:** `/server/middleware/security.js`

**Action:** Implement comprehensive rate limiting

```javascript
// Add to securityMiddleware object
enhancedRateLimiters: {
  // Strict rate limiting for authentication
  authRateLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      error: 'Too many authentication attempts',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `auth:${req.ip}:${req.body.email || 'unknown'}`,
    skipSuccessfulRequests: false,
    onLimitReached: (req, res) => {
      console.warn(`Rate limit exceeded for auth from ${req.ip}`);
      // Log security event
      req.app.locals.securityMonitor?.recordSecurityEvent({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        ip: req.ip,
        details: `Authentication rate limit exceeded`
      });
    }
  }),

  // Registration rate limiting
  registrationRateLimiter: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour per IP
    message: {
      error: 'Too many registration attempts',
      retryAfter: '1 hour'
    },
    keyGenerator: (req) => `register:${req.ip}`,
    onLimitReached: (req, res) => {
      req.app.locals.securityMonitor?.recordSecurityEvent({
        type: 'registration_abuse',
        severity: 'high',
        ip: req.ip,
        details: 'Registration rate limit exceeded'
      });
    }
  }),

  // Password reset rate limiting
  passwordResetRateLimiter: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password resets per hour per email
    message: {
      error: 'Too many password reset attempts',
      retryAfter: '1 hour'
    },
    keyGenerator: (req) => `reset:${req.body.email || req.ip}`,
    onLimitReached: (req, res) => {
      req.app.locals.securityMonitor?.recordSecurityEvent({
        type: 'password_reset_abuse',
        severity: 'high',
        ip: req.ip,
        details: 'Password reset rate limit exceeded'
      });
    }
  }),

  // General API rate limiting
  apiRateLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      error: 'Too many API requests',
      retryAfter: '15 minutes'
    },
    keyGenerator: (req) => `api:${req.ip}`,
    onLimitReached: (req, res) => {
      req.app.locals.securityMonitor?.recordSecurityEvent({
        type: 'api_abuse',
        severity: 'low',
        ip: req.ip,
        details: 'API rate limit exceeded'
      });
    }
  })
}
```

### 1.4 Cache Service Fix

**File:** `/server/middleware/cache.js`

**Action:** Fix cache integration issues

```javascript
// Add proper error handling and reconnection logic
class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect() {
    try {
      const redis = require('redis');
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            this.reconnectAttempts++;
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
              console.error('Redis connection failed after max attempts');
              return new Error('Redis connection failed');
            }
            return Math.min(options.attempt * 100, 3000);
          }
          return null;
        }
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('Redis connected successfully');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        console.error('Redis connection error:', err);
      });

      this.client.on('end', () => {
        this.isConnected = false;
        console.log('Redis connection ended');
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      return false;
    }
  }

  async set(key, value, ttlSeconds = 3600) {
    if (!this.isConnected) return false;
    try {
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      await this.client.setEx(key, ttlSeconds, value);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    try {
      const value = await this.client.get(key);
      if (value) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async del(key) {
    if (!this.isConnected) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }
}

// Export singleton instance
const cache = new CacheService();
module.exports = { cache, CacheService };
```

## Phase 2: Authentication System Enhancement (Week 1)

### 2.1 Enhanced Authentication Service

**File:** `/server/auth/authService.js`

**Action:** Fix authentication service with proper error handling

```javascript
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const crypto = require('crypto');
const { cache } = require('../middleware/cache');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    if (!this.jwtRefreshSecret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }

    this.tokenBlacklist = new Set();
    this.refreshTokens = new Map();
    this.mfaSessions = new Map();
    this.oauthProviders = new Map();

    this.initializeOAuthProviders();
  }

  // Enhanced token generation with proper error handling
  generateAccessToken(user) {
    try {
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role || 'user',
        mfaVerified: user.mfaVerified || false,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID() // JWT ID for blacklist tracking
      };

      return jwt.sign(payload, this.jwtSecret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        issuer: 'nasa-system7-portal',
        audience: 'nasa-system7-users',
        algorithm: 'HS256'
      });
    } catch (error) {
      console.error('Token generation error:', error);
      throw new Error('Failed to generate access token');
    }
  }

  generateRefreshToken(user) {
    try {
      const sessionId = crypto.randomUUID();
      const payload = {
        id: user.id,
        email: user.email,
        type: 'refresh',
        sessionId: sessionId,
        jti: crypto.randomUUID()
      };

      const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: 'nasa-system7-portal',
        audience: 'nasa-system7-users',
        algorithm: 'HS256'
      });

      // Store refresh token metadata
      const tokenMetadata = {
        userId: user.id,
        email: user.email,
        sessionId: sessionId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsed: new Date().toISOString()
      };

      this.refreshTokens.set(sessionId, tokenMetadata);
      cache.set(`refresh_token:${sessionId}`, tokenMetadata, 7 * 24 * 60 * 60);

      return refreshToken;
    } catch (error) {
      console.error('Refresh token generation error:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  // Enhanced MFA implementation
  async generateMFASecret(user) {
    try {
      const secret = speakeasy.generateSecret({
        name: `NASA System 7 Portal (${user.email})`,
        issuer: 'NASA System 7 Portal',
        length: 32
      });

      // Store temporary secret with expiration
      const tempSecretData = {
        secret: secret.base32,
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      };

      await cache.set(`mfa_temp:${user.id}`, tempSecretData, 600);

      return {
        secret: secret.base32,
        qrCodeUrl: speakeasy.otpauthURL({
          secret: secret.base32,
          label: `NASA System 7 Portal (${user.email})`,
          issuer: 'NASA System 7 Portal',
          algorithm: 'SHA1',
          digits: 6,
          period: 30
        }),
        backupCodes: await this.generateBackupCodes(user.id)
      };
    } catch (error) {
      console.error('MFA secret generation error:', error);
      throw new Error('Failed to generate MFA secret');
    }
  }

  async generateBackupCodes(userId) {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }

    await cache.set(`mfa_backup:${userId}`, {
      codes: codes.map(code => ({
        code: code,
        used: false,
        createdAt: new Date().toISOString()
      }))
    }, 365 * 24 * 60 * 60); // 1 year

    return codes;
  }

  // Enhanced session management
  async createSession(user, mfaVerified = false, deviceInfo = {}) {
    try {
      const sessionId = crypto.randomUUID();
      const sessionData = {
        sessionId: sessionId,
        userId: user.id,
        email: user.email,
        role: user.role,
        mfaVerified: mfaVerified,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        deviceInfo: {
          userAgent: deviceInfo.userAgent,
          ip: deviceInfo.ip,
          deviceId: deviceInfo.deviceId || crypto.randomUUID()
        }
      };

      await cache.set(`session:${sessionId}`, sessionData, 24 * 60 * 60);
      await cache.set(`user_session:${user.id}`, sessionId, 24 * 60 * 60);

      return sessionId;
    } catch (error) {
      console.error('Session creation error:', error);
      throw new Error('Failed to create session');
    }
  }

  async validateSession(sessionId, requireMFA = false) {
    try {
      const sessionData = await cache.get(`session:${sessionId}`);
      if (!sessionData) {
        return null;
      }

      // Check expiration
      if (new Date(sessionData.expiresAt) < new Date()) {
        await this.destroySession(sessionId);
        return null;
      }

      // Check MFA requirement
      if (requireMFA && !sessionData.mfaVerified) {
        return null;
      }

      // Update last activity
      sessionData.lastActivity = new Date().toISOString();
      await cache.set(`session:${sessionId}`, sessionData, 24 * 60 * 60);

      return sessionData;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  async destroySession(sessionId) {
    try {
      const sessionData = await cache.get(`session:${sessionId}`);
      if (sessionData) {
        await cache.del(`session:${sessionId}`);
        await cache.del(`user_session:${sessionData.userId}`);
      }
      return true;
    } catch (error) {
      console.error('Session destruction error:', error);
      return false;
    }
  }

  // Enhanced OAuth implementation
  async exchangeOAuthCode(provider, code, state) {
    try {
      const providerConfig = this.oauthProviders.get(provider);
      if (!providerConfig) {
        throw new Error(`Unsupported OAuth provider: ${provider}`);
      }

      // Verify state parameter
      const storedState = await cache.get(`oauth_state:${state}`);
      if (!storedState || storedState.provider !== provider) {
        throw new Error('Invalid OAuth state parameter');
      }

      const axios = require('axios');

      const tokenUrls = {
        google: 'https://oauth2.googleapis.com/token',
        github: 'https://github.com/login/oauth/access_token',
        nasa: process.env.NASA_OAUTH_TOKEN_URL || 'https://auth.nasa.gov/oauth2/token'
      };

      const response = await axios.post(tokenUrls[provider], {
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: providerConfig.redirectUri
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });

      // Clean up state
      await cache.del(`oauth_state:${state}`);

      return response.data;
    } catch (error) {
      console.error(`OAuth token exchange error for ${provider}:`, error.message);
      throw new Error('Failed to exchange authorization code');
    }
  }
}

module.exports = AuthService;
```

### 2.2 Enhanced Security Middleware

**File:** `/server/middleware/auth.js`

**Action:** Implement comprehensive authentication middleware

```javascript
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { cache } = require('./cache');

// Enhanced JWT authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'Please provide a valid JWT token'
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await cache.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(403).json({
        error: 'Token revoked',
        message: 'The provided token has been revoked'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'nasa-system7-portal',
      audience: 'nasa-system7-users'
    });

    // Get user data
    const user = await cache.get(`user:${decoded.id}`);
    if (!user) {
      return res.status(403).json({
        error: 'User not found',
        message: 'The token user no longer exists'
      });
    }

    // Check if user is revoked
    const isRevoked = await cache.get(`user_revoked:${user.id}`);
    if (isRevoked) {
      return res.status(403).json({
        error: 'Access revoked',
        message: 'User access has been revoked'
      });
    }

    req.user = { ...user, jti: decoded.jti };
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please refresh your access token'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        error: 'Invalid token',
        message: 'The provided token is not valid'
      });
    } else {
      console.error('Authentication error:', error);
      return res.status(500).json({
        error: 'Authentication failed',
        message: 'An error occurred during authentication'
      });
    }
  }
};

// Session-based authentication middleware
const authenticateSession = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.body.sessionId;

    if (!sessionId) {
      return res.status(401).json({
        error: 'Session required',
        message: 'Please provide a valid session ID'
      });
    }

    const sessionData = await cache.get(`session:${sessionId}`);
    if (!sessionData || new Date(sessionData.expiresAt) < new Date()) {
      return res.status(401).json({
        error: 'Invalid session',
        message: 'The provided session is invalid or expired'
      });
    }

    req.session = sessionData;
    req.sessionId = sessionId;

    next();
  } catch (error) {
    console.error('Session authentication error:', error);
    return res.status(500).json({
      error: 'Session authentication failed',
      message: 'An error occurred during session validation'
    });
  }
};

// MFA requirement middleware
const requireMFA = (options = {}) => {
  return async (req, res, next) => {
    try {
      const { verified = true, bypassForAdmin = false } = options;

      // Check if user has MFA enabled
      if (!req.user.mfaEnabled) {
        if (bypassForAdmin && req.user.role === 'admin') {
          return next();
        }
        return res.status(403).json({
          error: 'MFA required',
          message: 'Please enable multi-factor authentication for your account'
        });
      }

      // Check if MFA is verified
      if (verified && !req.user.mfaVerified) {
        return res.status(403).json({
          error: 'MFA verification required',
          message: 'Please complete multi-factor authentication'
        });
      }

      next();
    } catch (error) {
      console.error('MFA requirement error:', error);
      return res.status(500).json({
        error: 'MFA check failed',
        message: 'An error occurred during MFA verification'
      });
    }
  };
};

// Role-based access control middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please login to access this resource'
        });
      }

      const userRole = req.user.role || 'user';
      const requiredRoles = Array.isArray(roles) ? roles : [roles];

      if (!requiredRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `This resource requires one of the following roles: ${requiredRoles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Role requirement error:', error);
      return res.status(500).json({
        error: 'Authorization failed',
        message: 'An error occurred during authorization'
      });
    }
  };
};

// Enhanced rate limiting middleware
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests',
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Rate limit exceeded',
      message: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skipSuccessfulRequests,
    skipFailedRequests,
    onLimitReached: (req, res) => {
      console.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
    }
  });
};

module.exports = {
  authenticateToken,
  authenticateSession,
  requireMFA,
  requireRole,
  createRateLimiter
};
```

## Phase 3: Advanced Security Features (Week 2-3)

### 3.1 Security Monitoring Integration

**File:** `/server/security-integration.js`

**Action:** Integrate security monitoring system

```javascript
const SecurityMonitor = require('./security-monitor');

// Initialize security monitor
const securityMonitor = new SecurityMonitor({
  alertThresholds: {
    failedLogins: 5,
    suspiciousIPs: 10,
    tokenAbuse: 20,
    bruteForceWindow: 60000,
    sessionHijacking: 3,
  },
  monitoring: {
    enabled: true,
    logLevel: 'info',
    metricsRetention: 24 * 60 * 60 * 1000,
    alertCooldown: 5 * 60 * 1000,
  }
});

// Security event handlers
securityMonitor.on('security_alert', (alert) => {
  console.error('🚨 SECURITY ALERT:', alert);
  // Send to monitoring system
});

securityMonitor.on('ip_blocked', (event) => {
  console.warn('IP Blocked:', event);
  // Update firewall rules if needed
});

// Export for use in other modules
module.exports = securityMonitor;
```

### 3.2 API Security Enhancements

**File:** `/server/api-security.js`

**Action:** Implement comprehensive API security

```javascript
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { authenticateToken, requireRole } = require('./middleware/auth');
const securityMonitor = require('./security-integration');

class APISecurity {
  constructor(app) {
    this.app = app;
    this.setupSecurityMiddleware();
    this.setupAPISecurity();
  }

  setupSecurityMiddleware() {
    // Apply security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https://api.nasa.gov", "https://images.nasa.gov"],
          connectSrc: ["'self'", "https://api.nasa.gov"]
        }
      }
    }));

    // Security monitoring middleware
    this.app.use(securityMonitor.expressMiddleware());

    // API-specific rate limiting
    this.app.use('/api/', rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: { error: 'Too many API requests' }
    }));

    // Authentication endpoints rate limiting
    this.app.use('/auth/', rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: { error: 'Too many authentication attempts' }
    }));
  }

  setupAPISecurity() {
    // Secure all API endpoints
    this.app.use('/api/', authenticateToken);

    // Role-based access control
    this.app.use('/api/admin/', requireRole(['admin']));
    this.app.use('/api/moderator/', requireRole(['admin', 'moderator']));

    // API key authentication for NASA APIs
    this.app.use('/api/nasa/', this.authenticateAPIKey);

    // Request logging for security
    this.app.use('/api/', this.logAPIRequest);
  }

  authenticateAPIKey(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'Please provide a valid NASA API key'
      });
    }

    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || ['DEMO_KEY'];

    if (!validApiKeys.includes(apiKey)) {
      securityMonitor.recordSecurityEvent({
        type: 'invalid_api_key',
        severity: 'medium',
        ip: req.ip,
        details: `Invalid API key used: ${apiKey.substring(0, 8)}...`
      });

      return res.status(403).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
    }

    req.apiKey = apiKey;
    next();
  }

  logAPIRequest(req, res, next) {
    const startTime = Date.now();

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;

      securityMonitor.recordPerformanceMetric({
        endpoint: req.path,
        responseTime,
        statusCode: res.statusCode,
        ip: req.ip
      });
    });

    next();
  }
}

module.exports = APISecurity;
```

## Phase 4: Testing and Validation (Week 3-4)

### 4.1 Comprehensive Security Tests

**Action:** Create and execute security test suite

```bash
# Install security testing dependencies
npm install --save-dev supertest axios speakeasy

# Run security assessment tests
node server/security-assessment-test.js

# Run authentication validation tests
node server/auth-validation-test.js

# Run penetration testing
npm run test:security
```

### 4.2 Load Testing

**File:** `/server/load-test-security.js`

**Action:** Test security under load

```javascript
const axios = require('axios');
const { performance } = require('perf_hooks');

class SecurityLoadTest {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      securityEvents: 0
    };
  }

  async runLoadTest() {
    console.log('🚀 Starting security load test...');

    const concurrentUsers = 50;
    const requestsPerUser = 10;

    const promises = [];

    for (let user = 0; user < concurrentUsers; user++) {
      promises.push(this.simulateUser(requestsPerUser, user));
    }

    const startTime = performance.now();
    await Promise.all(promises);
    const endTime = performance.now();

    this.generateReport(endTime - startTime);
  }

  async simulateUser(requestCount, userId) {
    for (let i = 0; i < requestCount; i++) {
      try {
        const startTime = performance.now();

        // Simulate different types of requests
        const requestType = i % 4;
        let response;

        switch (requestType) {
          case 0:
            response = await axios.post(`${this.baseUrl}/auth/login`, {
              email: `user${userId}@test.com`,
              password: 'testpassword'
            });
            break;
          case 1:
            response = await axios.get(`${this.baseUrl}/health`);
            break;
          case 2:
            response = await axios.get(`${this.baseUrl}/api/nasa/apod`);
            break;
          case 3:
            response = await axios.post(`${this.baseUrl}/auth/register`, {
              email: `loadtest${userId}${i}@test.com`,
              password: 'LoadTest123!',
              name: `Load Test User ${userId}`
            });
            break;
        }

        const responseTime = performance.now() - startTime;
        this.updateMetrics(responseTime, response.status < 400);

      } catch (error) {
        this.updateMetrics(0, false);
        if (error.response?.status === 429) {
          this.metrics.securityEvents++;
        }
      }
    }
  }

  updateMetrics(responseTime, success) {
    this.metrics.totalRequests++;

    if (success) {
      this.metrics.successfulRequests++;
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime + responseTime) / 2;
    } else {
      this.metrics.failedRequests++;
    }
  }

  generateReport(totalTime) {
    console.log('\n📊 Security Load Test Report');
    console.log('============================');
    console.log(`Total Requests: ${this.metrics.totalRequests}`);
    console.log(`Successful: ${this.metrics.successfulRequests}`);
    console.log(`Failed: ${this.metrics.failedRequests}`);
    console.log(`Success Rate: ${(this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2)}%`);
    console.log(`Average Response Time: ${this.metrics.averageResponseTime.toFixed(2)}ms`);
    console.log(`Security Events: ${this.metrics.securityEvents}`);
    console.log(`Total Test Time: ${totalTime.toFixed(2)}ms`);
    console.log(`Requests/Second: ${(this.metrics.totalRequests / (totalTime / 1000)).toFixed(2)}`);
  }
}

// Run load test if called directly
if (require.main === module) {
  const loadTest = new SecurityLoadTest();
  loadTest.runLoadTest().catch(console.error);
}

module.exports = SecurityLoadTest;
```

## Implementation Checklist

### Phase 1: Critical Fixes (24-48 hours)
- [ ] Configure all environment variables
- [ ] Implement security headers
- [ ] Fix cache service integration
- [ ] Enhance rate limiting
- [ ] Test basic authentication flow

### Phase 2: Authentication Enhancement (Week 1)
- [ ] Fix JWT token management
- [ ] Implement proper MFA flow
- [ ] Enhance session management
- [ ] Fix OAuth integrations
- [ ] Add comprehensive input validation

### Phase 3: Advanced Security (Week 2-3)
- [ ] Implement security monitoring
- [ ] Add API security enhancements
- [ ] Implement threat detection
- [ ] Add security analytics
- [ ] Create security dashboard

### Phase 4: Testing & Validation (Week 3-4)
- [ ] Run comprehensive security tests
- [ ] Perform load testing
- [ ] Conduct penetration testing
- [ ] Validate compliance requirements
- [ ] Prepare production deployment

## Success Criteria

### Security Metrics
- Authentication success rate: >99%
- Zero critical vulnerabilities
- Security assessment score: >90%
- Rate limiting effectiveness: 100%
- MFA adoption rate: >80%

### Performance Metrics
- Authentication response time: <200ms
- System availability: >99.9%
- Security monitoring overhead: <5%
- Load test success rate: >95%

### Compliance Metrics
- GDPR compliance: 100%
- OWASP Top 10 compliance: 100%
- Security logging coverage: 100%
- Incident response time: <15 minutes

## Conclusion

This implementation plan provides a comprehensive roadmap to achieve enterprise-grade security for the NASA System 7 Portal. Following this plan will ensure the system meets NASA's security requirements and is ready for production deployment.

The phased approach allows for systematic implementation while maintaining system availability. Each phase builds upon the previous one, ensuring a solid security foundation before adding advanced features.

Regular security assessments and monitoring will ensure continued security posture improvement and compliance with evolving security standards.