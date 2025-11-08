const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Simple API key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || ['DEMO_KEY'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      message: 'Please provide a valid API key'
    });
  }

  if (!validApiKeys.includes(apiKey)) {
    return res.status(403).json({
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
  }

  req.apiKey = apiKey;
  next();
};

// JWT token validation middleware (for future user authentication)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      message: 'Please provide a valid JWT token'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'Invalid token',
        message: 'The provided token is not valid or has expired'
      });
    }
    req.user = user;
    next();
  });
};

// Session-based authentication for admin endpoints
const authenticateSession = (req, res, next) => {
  const sessionId = req.headers['x-session-id'];

  if (!sessionId) {
    return res.status(401).json({
      error: 'Session required',
      message: 'Please provide a valid session ID'
    });
  }

  // In production, this would validate against a database or Redis
  // For now, we'll implement a simple check
  if (sessionId.length < 32) {
    return res.status(403).json({
      error: 'Invalid session',
      message: 'The provided session ID is not valid'
    });
  }

  req.sessionId = sessionId;
  next();
};

// Rate limiting for authenticated endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Higher limit for authenticated users
  keyGenerator: (req) => {
    return req.user?.id || req.apiKey || req.ip;
  },
  skip: (req) => {
    // Skip for health checks and metrics
    return req.path === '/health' || req.path === '/metrics';
  }
});

// Rate limiting for public endpoints
const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Lower limit for public users
  keyGenerator: (req) => req.ip
});

// API key rate limiting per key
const apiKeyRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per API key
  keyGenerator: (req) => req.apiKey || req.ip,
  skip: (req) => {
    return req.path === '/health' || req.path === '/metrics';
  }
});

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'This endpoint requires administrator privileges'
    });
  }
  next();
};

// CORS middleware with enhanced security
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://localhost:3000',
      'https://nasa-system7-portal.com'
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
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Session-ID'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
};

module.exports = {
  authenticateApiKey,
  authenticateToken,
  authenticateSession,
  authRateLimiter,
  publicRateLimiter,
  apiKeyRateLimiter,
  requireAdmin,
  corsOptions
};