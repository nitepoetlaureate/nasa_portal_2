const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const express = require('express');
const validator = require('express-validator');

// Enhanced security middleware configuration
const securityMiddleware = {
  // Enhanced Helmet configuration
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://api.nasa.gov", "https://images.nasa.gov"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"], // Removed 'unsafe-inline'
        connectSrc: ["'self'", "https://api.nasa.gov"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        childSrc: ["'none'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
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
    permittedCrossDomainPolicies: false
  }),

  // Enhanced rate limiting
  rateLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/metrics';
    }
  }),

  // Strict rate limiting for sensitive endpoints
  strictRateLimiter: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit to 10 requests per minute
    message: {
      error: 'Rate limit exceeded for this endpoint',
      retryAfter: '1 minute'
    }
  }),

  // Request size limiting
  requestSizeLimit: express.json({
    limit: '1mb', // Reduced from 10mb for security
    strict: true
  }),

  // Input validation middleware
  validateDate: [
    validator.param('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format')
      .custom((value) => {
        const date = new Date(value);
        const today = new Date();
        const minDate = new Date('1995-06-16'); // First APOD

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
  ],

  validateApiKey: [
    validator.query('api_key')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('API key must be between 1 and 100 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('API key contains invalid characters')
  ],

  validateQuery: [
    validator.query('q')
      .optional()
      .isLength({ min: 1, max: 500 })
      .withMessage('Query must be between 1 and 500 characters')
      .escape(),

    validator.query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Page must be between 1 and 1000'),

    validator.query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  // Validation result handler
  handleValidationErrors: (req, res, next) => {
    const errors = validator.validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(error => ({
          field: error.param,
          message: error.msg,
          value: error.value
        }))
      });
    }
    next();
  },

  // Security headers for API responses
  securityHeaders: (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  }
};

module.exports = securityMiddleware;