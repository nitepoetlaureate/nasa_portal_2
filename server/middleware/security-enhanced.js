const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

/**
 * Security Middleware Module
 * Implements comprehensive security controls for NASA System 7 Portal
 */

// CSRF Protection Middleware
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const validateCSRFToken = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'Request blocked for security reasons'
    });
  }

  next();
};

// Rate limiting configuration
const createStrictRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Rate limit exceeded',
      message: message || 'Too many requests, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  });
};

// Different rate limiters for different endpoint types
const rateLimiters = {
  // General API rate limiting
  general: createStrictRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests
    'Too many API requests, please try again later.'
  ),

  // Strict rate limiting for sensitive operations
  strict: createStrictRateLimiter(
    60 * 1000, // 1 minute
    10, // 10 requests
    'Too many sensitive operations, please try again later.'
  ),

  // Rate limiting for authentication endpoints
  auth: createStrictRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts
    'Too many authentication attempts, please try again later.'
  ),

  // Rate limiting for public NASA API endpoints
  public: createStrictRateLimiter(
    60 * 1000, // 1 minute
    60, // 60 requests
    'Too many NASA API requests, please try again later.'
  )
};

// Input validation middleware
const validateInput = (req, res, next) => {
  // Check for common attack patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /@import/i,
    /vbscript:/gi,
    /data:(?!image\/)/gi
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          return false;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const key in value) {
        if (!checkValue(value[key])) {
          return false;
        }
      }
    }
    return true;
  };

  // Check query parameters
  for (const key in req.query) {
    if (!checkValue(req.query[key])) {
      return res.status(400).json({
        error: 'Invalid input detected',
        message: 'Request contains potentially malicious content'
      });
    }
  }

  // Check request body
  for (const key in req.body) {
    if (!checkValue(req.body[key])) {
      return res.status(400).json({
        error: 'Invalid input detected',
        message: 'Request contains potentially malicious content'
      });
    }
  }

  next();
};

// Request size limiting
const requestSizeLimit = (maxSize = '1mb') => {
  return (req, res, next) => {
    const contentLength = req.headers['content-length'];

    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);

      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json({
          error: 'Request too large',
          message: `Request size exceeds maximum allowed size of ${maxSize}`
        });
      }
    }

    next();
  };
};

const parseSize = (size) => {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
  if (!match) return 1024 * 1024; // Default to 1MB

  return parseInt(match[1]) * units[match[2]];
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Additional security headers beyond helmet
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Content Security Policy with nonce for dynamic content
  const nonce = crypto.randomBytes(16).toString('base64');
  req.cspNonce = nonce;

  // Custom CSP for better security
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'nonce-" + nonce + "'",
    "style-src 'self' 'nonce-" + nonce + "'",
    "img-src 'self' data: https://api.nasa.gov https://images.nasa.gov",
    "connect-src 'self' https://api.nasa.gov",
    "font-src 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "frame-src 'none'",
    "child-src 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "upgrade-insecure-requests"
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);

  // Remove server information
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');

  next();
};

// IP blacklist middleware (for basic protection)
const blockedIPs = new Set(); // Can be populated from database or file
const ipBlacklist = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

  if (blockedIPs.has(clientIP)) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address has been blocked'
    });
  }

  next();
};

// Request logging for security monitoring
const securityLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const method = req.method;
  const url = req.url;

  console.log(`[SECURITY] ${timestamp} - ${method} ${url} - IP: ${clientIP} - UA: ${userAgent}`);

  // Log suspicious activities
  const suspiciousIndicators = [
    userAgent.includes('sqlmap'),
    userAgent.includes('nikto'),
    userAgent.includes('nmap'),
    url.includes('../'),
    url.includes('%2e%2e%2f'),
    url.includes('union+select'),
    url.includes('or+1=1')
  ];

  if (suspiciousIndicators.some(indicator => indicator)) {
    console.warn(`[SUSPICIOUS] ${timestamp} - Potential attack detected: ${method} ${url} - IP: ${clientIP} - UA: ${userAgent}`);
  }

  next();
};

// HTTP Parameter Pollution protection
const preventParameterPollution = (req, res, next) => {
  // Convert arrays to single values for security-sensitive parameters
  const securityParams = ['id', 'user', 'password', 'token', 'key', 'secret'];

  for (const param of securityParams) {
    if (Array.isArray(req.query[param])) {
      req.query[param] = req.query[param][0]; // Take first value
    }
    if (Array.isArray(req.body[param])) {
      req.body[param] = req.body[param][0]; // Take first value
    }
  }

  next();
};

module.exports = {
  generateCSRFToken,
  validateCSRFToken,
  rateLimiters,
  validateInput,
  requestSizeLimit,
  securityHeaders,
  ipBlacklist,
  securityLogger,
  preventParameterPollution
};