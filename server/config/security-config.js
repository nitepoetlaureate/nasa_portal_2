const Joi = require('joi');

// Environment variable validation schema
const envSchema = Joi.object({
  // Application settings
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),

  // Database configuration
  DB_DATABASE: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().min(16).required(),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DATABASE_URL: Joi.string().uri(),
  DISABLE_DATABASE_CONNECTIONS: Joi.boolean().default(false),

  // Redis configuration
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().min(16),
  DISABLE_CACHE_CONNECTION: Joi.boolean().default(false),

  // API Keys
  NASA_API_KEY: Joi.string().min(1).required(),
  JPL_API_KEY: Joi.string().min(1),

  // Security settings
  JWT_SECRET: Joi.string().min(32).required(),
  SESSION_SECRET: Joi.string().min(32).required(),
  VALID_API_KEYS: Joi.string().default('DEMO_KEY'),

  // CORS settings
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000,https://localhost:3000'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // Performance settings
  COMPRESSION_THRESHOLD: Joi.number().default(1024),
  DISABLE_FALLBACK_MODE: Joi.boolean().default(false),

  // Monitoring
  ENABLE_PERFORMANCE_MONITORING: Joi.boolean().default(true),
  ENABLE_QUERY_LOGGING: Joi.boolean().default(false),
  ENABLE_AUDIT_LOG: Joi.boolean().default(true),

  // Development settings
  ENABLE_CORS: Joi.boolean().default(true),
  ENABLE_MORGAN_LOGGING: Joi.boolean().default(true),
  ENABLE_ERROR_STACK_TRACES: Joi.boolean().default(false)
}).unknown(true);

// Validate environment variables
const validateEnv = () => {
  const { error, value } = envSchema.validate(process.env, {
    allowUnknown: true,
    stripUnknown: false
  });

  if (error) {
    console.error('❌ Environment variable validation failed:');
    error.details.forEach(detail => {
      console.error(`  - ${detail.message}`);
    });
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully');

  // Log warnings for development vs production mismatches
  if (value.NODE_ENV === 'production') {
    if (value.JWT_SECRET.includes('your_') || value.SESSION_SECRET.includes('your_')) {
      console.warn('⚠️  Default secrets detected in production!');
    }
    if (value.DB_PASSWORD.includes('your_')) {
      console.warn('⚠️  Default database password detected in production!');
    }
    if (value.ENABLE_ERROR_STACK_TRACES) {
      console.warn('⚠️  Error stack traces enabled in production - consider disabling for security');
    }
  }

  return value;
};

// Security configuration object
const securityConfig = {
  // Database security
  database: {
    ssl: {
      require: process.env.NODE_ENV === 'production',
      rejectUnauthorized: false // Should be true in production with valid cert
    },
    connectionTimeoutMillis: 2000,
    statement_timeout: 10000,
    query_timeout: 10000,
    idleTimeoutMillis: 30000,
    max: 20
  },

  // Session security
  session: {
    name: 'nasa-s7-session',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict'
    }
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '1h',
    issuer: 'nasa-system7-portal',
    audience: 'nasa-system7-users'
  },

  // API security
  api: {
    requestTimeout: 10000,
    maxRequestSize: '1mb',
    maxResponseSize: '10mb',
    enableCompression: true,
    compressionThreshold: 1024
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // CORS configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
  },

  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://api.nasa.gov", "https://images.nasa.gov"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.nasa.gov"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      childSrc: ["'none'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"]
    }
  },

  // Audit logging
  audit: {
    enabled: process.env.ENABLE_AUDIT_LOG === 'true',
    logLevel: 'info',
    includeRequestBody: false,
    includeResponseBody: false,
    sensitiveFields: ['password', 'token', 'secret', 'key']
  }
};

// Security headers configuration
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': process.env.NODE_ENV === 'production'
    ? 'max-age=31536000; includeSubDomains; preload'
    : null,
  'Content-Security-Policy': null, // Set by helmet
  'X-Download-Options': 'noopen',
  'X-Permitted-Cross-Domain-Policies': 'none'
};

module.exports = {
  validateEnv,
  securityConfig,
  securityHeaders
};