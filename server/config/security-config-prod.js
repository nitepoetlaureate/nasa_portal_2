/**
 * NASA System 7 Portal - Production Security Configuration
 * Comprehensive security middleware and policies for production deployment
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss');

/**
 * Production Security Configuration
 */
const productionSecurityConfig = {
  // Rate limiting configuration
  rateLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
      // Skip rate limiting for health checks and metrics
      return req.path === '/health' || req.path === '/metrics';
    }
  }),

  // Strict rate limiting for NASA API endpoints
  nasaApiRateLimiter: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Limit to 30 NASA API requests per minute
    message: {
      error: 'NASA API rate limit exceeded',
      retryAfter: '1 minute'
    },
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip;
    }
  }),

  // Authentication rate limiting
  authRateLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit to 5 auth attempts per 15 minutes
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    },
    skipSuccessfulRequests: true
  }),

  // Helmet security headers
  helmetConfig: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https://apod.nasa.gov", "https://api.nasa.gov"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://api.nasa.gov"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    ieNoOpen: true,
    xssFilter: true
  }),

  // CORS configuration for production
  corsConfig: cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        'https://nasa-system7.example.com',
        'https://www.nasa-system7.example.com',
        'https://staging.nasa-system7.example.com'
      ];

      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400 // 24 hours
  }),

  // Request size limits
  requestLimits: {
    json: { limit: '10mb' },
    urlencoded: { limit: '10mb', extended: true },
    text: { limit: '10mb' }
  },

  // Custom security middleware
  customSecurity: {
    // Remove MongoDB operator injection
    mongoSanitize: mongoSanitize({
      replaceWith: '_'
    }),

    // Prevent HTTP Parameter Pollution
    hpp: hpp({
      whitelist: [
        'sort', 'fields', 'page', 'limit', 'skip',
        'category', 'tags', 'date', 'status'
      ]
    }),

    // Custom XSS protection
    xssProtection: (req, res, next) => {
      const sanitizeInput = (obj) => {
        if (typeof obj === 'string') {
          return xss(obj);
        }
        if (Array.isArray(obj)) {
          return obj.map(sanitizeInput);
        }
        if (obj && typeof obj === 'object') {
          const sanitized = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              sanitized[key] = sanitizeInput(obj[key]);
            }
          }
          return sanitized;
        }
        return obj;
      };

      if (req.body) req.body = sanitizeInput(req.body);
      if (req.query) req.query = sanitizeInput(req.query);
      if (req.params) req.params = sanitizeInput(req.params);

      next();
    }
  },

  // Security headers middleware
  securityHeaders: (req, res, next) => {
    // Remove server header
    res.removeHeader('Server');

    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), ' +
      'magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=()'
    );

    // Cache control for sensitive endpoints
    if (req.path.startsWith('/auth') || req.path.startsWith('/admin')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  },

  // IP filtering middleware
  ipFilter: (req, res, next) => {
    // List of blocked IPs (can be loaded from database/config)
    const blockedIPs = [
      // Add malicious IPs here
    ];

    const clientIP = req.ip || req.connection.remoteAddress;

    if (blockedIPs.includes(clientIP)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address has been blocked due to suspicious activity'
      });
    }

    next();
  },

  // Request logging for security
  securityLogger: (req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const method = req.method;
    const url = req.url;

    // Log suspicious requests
    if (url.includes('..') || url.includes('%2e%2e') || url.includes('<script')) {
      console.warn(`[SECURITY WARNING] ${timestamp} - Suspicious request from ${ip}: ${method} ${url} - ${userAgent}`);
    }

    // Log NASA API requests
    if (url.startsWith('/api/nasa/')) {
      console.log(`[NASA API] ${timestamp} - ${ip} - ${method} ${url}`);
    }

    next();
  },

  // File upload security
  fileUploadSecurity: {
    allowedMimeTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'text/plain', 'text/csv', 'application/json'
    ],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.txt', '.csv', '.json'],
    scanFiles: true, // Enable virus scanning if available
    sanitizeFilenames: true
  }
};

/**
 * Apply all security middleware
 */
function applySecurityMiddleware(app) {
  // Apply security headers first
  app.use(productionSecurityConfig.securityHeaders);

  // Apply helmet
  app.use(productionSecurityConfig.helmetConfig);

  // Apply CORS
  app.use(productionSecurityConfig.corsConfig);

  // Apply custom security middleware
  app.use(productionSecurityConfig.customSecurity.xssProtection);
  app.use(productionSecurityConfig.customSecurity.mongoSanitize);
  app.use(productionSecurityConfig.customSecurity.hpp);

  // Apply IP filtering
  app.use(productionSecurityConfig.ipFilter);

  // Apply security logging
  app.use(productionSecurityConfig.securityLogger);

  // Apply rate limiting
  app.use(productionSecurityConfig.rateLimiter);

  // Apply specific rate limiting
  app.use('/api/nasa/', productionSecurityConfig.nasaApiRateLimiter);
  app.use('/auth/', productionSecurityConfig.authRateLimiter);
  app.use('/api/auth/', productionSecurityConfig.authRateLimiter);

  // Apply request size limits
  app.use(express.json(productionSecurityConfig.requestLimits.json));
  app.use(express.urlencoded(productionSecurityConfig.requestLimits.urlencoded));

  console.log('✅ Production security middleware applied successfully');
}

module.exports = {
  productionSecurityConfig,
  applySecurityMiddleware
};