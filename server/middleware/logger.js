const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),

  // File transport for errors
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Structured logging middleware
const structuredLogger = (req, res, next) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);

  // Add request ID to request object
  req.requestId = requestId;

  // Log request
  logger.info('HTTP Request', {
    type: 'http_request',
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const duration = Date.now() - start;

    logger.info('HTTP Response', {
      type: 'http_response',
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    // Log error responses at error level
    if (res.statusCode >= 400) {
      logger.error('HTTP Error Response', {
        type: 'http_error',
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        error: chunk ? chunk.toString() : 'No error message',
        timestamp: new Date().toISOString()
      });
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Security event logger
const securityLogger = (event, details = {}) => {
  logger.warn('Security Event', {
    type: 'security',
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Performance logger
const performanceLogger = (operation, duration, details = {}) => {
  logger.info('Performance', {
    type: 'performance',
    operation,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Business event logger
const businessLogger = (event, details = {}) => {
  logger.info('Business Event', {
    type: 'business',
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Error logger with stack trace
const errorLogger = (error, context = {}) => {
  logger.error('Application Error', {
    type: 'error',
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  });
};

// NASA API logger
const nasaApiLogger = (endpoint, status, duration, details = {}) => {
  const level = status === 'success' ? 'info' : 'error';

  logger[level]('NASA API Call', {
    type: 'nasa_api',
    endpoint,
    status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Database query logger
const dbLogger = (query, duration, details = {}) => {
  logger.debug('Database Query', {
    type: 'database',
    query: query.substring(0, 200), // Truncate long queries
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Cache logger
const cacheLogger = (operation, key, hit, details = {}) => {
  logger.debug('Cache Operation', {
    type: 'cache',
    operation, // 'get', 'set', 'del'
    key,
    hit, // true for cache hit, false for miss
    timestamp: new Date().toISOString(),
    ...details
  });
};

// User activity logger
const userActivityLogger = (userId, action, details = {}) => {
  logger.info('User Activity', {
    type: 'user_activity',
    userId,
    action,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// System health logger
const healthLogger = (service, status, details = {}) => {
  const level = status === 'healthy' ? 'info' : 'warn';

  logger[level]('Health Check', {
    type: 'health',
    service,
    status,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Create child logger with context
const createContextLogger = (context) => {
  return logger.child(context);
};

// Log levels for different environments
const getLogLevel = () => {
  switch (process.env.NODE_ENV) {
    case 'production':
      return 'warn';
    case 'test':
      return 'error';
    default:
      return 'debug';
  }
};

// Update logger level based on environment
logger.level = getLogLevel();

module.exports = {
  logger,
  structuredLogger,
  securityLogger,
  performanceLogger,
  businessLogger,
  errorLogger,
  nasaApiLogger,
  dbLogger,
  cacheLogger,
  userActivityLogger,
  healthLogger,
  createContextLogger,
};