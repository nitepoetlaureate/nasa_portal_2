const express = require('express');
const promClient = require('prom-client');
const { Pool } = require('pg');
const redis = require('redis');
const http = require('http');

const router = express.Router();

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add a default label to all metrics
register.setDefaultLabels({
  app: 'nasa-system7-server'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Custom Metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const nasaApiRequestDuration = new promClient.Histogram({
  name: 'nasa_api_request_duration_seconds',
  help: 'Duration of NASA API requests in seconds',
  labelNames: ['endpoint', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 15, 30]
});

const nasaApiRequestCounter = new promClient.Counter({
  name: 'nasa_api_requests_total',
  help: 'Total number of NASA API requests',
  labelNames: ['endpoint', 'status']
});

const nasaApiCacheHits = new promClient.Counter({
  name: 'nasa_api_cache_hits_total',
  help: 'Total number of NASA API cache hits',
  labelNames: ['endpoint']
});

const nasaApiCacheMisses = new promClient.Counter({
  name: 'nasa_api_cache_misses_total',
  help: 'Total number of NASA API cache misses',
  labelNames: ['endpoint']
});

const nasaApiRateLimited = new promClient.Counter({
  name: 'nasa_api_rate_limited_total',
  help: 'Total number of NASA API rate limit hits',
  labelNames: ['endpoint']
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections_total',
  help: 'Number of active connections'
});

const databaseConnections = new promClient.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections'
});

const redisConnections = new promClient.Gauge({
  name: 'redis_connections_active',
  help: 'Number of active Redis connections'
});

// Security metrics
const loginAttempts = new promClient.Counter({
  name: 'login_attempts_total',
  help: 'Total number of login attempts',
  labelNames: ['status', 'ip']
});

const sqlInjectionAttempts = new promClient.Counter({
  name: 'sql_injection_attempts_total',
  help: 'Total number of SQL injection attempts',
  labelNames: ['ip', 'endpoint']
});

const xssAttempts = new promClient.Counter({
  name: 'xss_attempts_total',
  help: 'Total number of XSS attempts',
  labelNames: ['ip', 'endpoint']
});

const rateLimitExceeded = new promClient.Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of rate limit violations',
  labelNames: ['ip', 'endpoint']
});

// Business metrics
const pageViews = new promClient.Counter({
  name: 'page_views_total',
  help: 'Total number of page views',
  labelNames: ['page', 'user_agent']
});

const userSessions = new promClient.Counter({
  name: 'user_sessions_total',
  help: 'Total number of user sessions',
  labelNames: ['user_id', 'status']
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestCounter);
register.registerMetric(nasaApiRequestDuration);
register.registerMetric(nasaApiRequestCounter);
register.registerMetric(nasaApiCacheHits);
register.registerMetric(nasaApiCacheMisses);
register.registerMetric(nasaApiRateLimited);
register.registerMetric(activeConnections);
register.registerMetric(databaseConnections);
register.registerMetric(redisConnections);
register.registerMetric(loginAttempts);
register.registerMetric(sqlInjectionAttempts);
register.registerMetric(xssAttempts);
register.registerMetric(rateLimitExceeded);
register.registerMetric(pageViews);
register.registerMetric(userSessions);

// Middleware to track HTTP metrics
function metricsMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);

    httpRequestCounter
      .labels(req.method, route, res.statusCode)
      .inc();
  });

  next();
}

// Health check endpoints
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };

  try {
    // Check database connection
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 1,
      connectionTimeoutMillis: 5000
    });

    const dbResult = await pool.query('SELECT 1 as test');
    await pool.end();

    health.checks.database = {
      status: 'healthy',
      responseTime: dbResult.rowCount > 0 ? 'fast' : 'slow'
    };

    databaseConnections.set(1);
  } catch (error) {
    health.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
    health.status = 'degraded';
    databaseConnections.set(0);
  }

  try {
    // Check Redis connection
    const redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      connectTimeout: 5000
    });

    await redisClient.connect();
    const pong = await redisClient.ping();
    await redisClient.quit();

    health.checks.redis = {
      status: 'healthy',
      response: pong
    };

    redisConnections.set(1);
  } catch (error) {
    health.checks.redis = {
      status: 'unhealthy',
      error: error.message
    };
    health.status = 'degraded';
    redisConnections.set(0);
  }

  try {
    // Check NASA API connectivity
    const axios = require('axios');
    const response = await axios.get('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY', {
      timeout: 5000
    });

    health.checks.nasa_api = {
      status: 'healthy',
      responseTime: response.status === 200 ? 'fast' : 'slow'
    };
  } catch (error) {
    health.checks.nasa_api = {
      status: 'unhealthy',
      error: error.message
    };
    health.status = 'degraded';
  }

  // Memory usage check
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024)
  };

  health.checks.memory = {
    status: memoryUsageMB.heapUsed > 512 ? 'warning' : 'healthy',
    usage: memoryUsageMB,
    threshold: '512MB'
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Readiness probe
router.get('/ready', async (req, res) => {
  try {
    // Check critical dependencies
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 1,
      connectionTimeoutMillis: 3000
    });

    await pool.query('SELECT 1');
    await pool.end();

    const redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      connectTimeout: 3000
    });

    await redisClient.connect();
    await redisClient.ping();
    await redisClient.quit();

    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message
    });
  }
});

// Liveness probe
router.get('/alive', (req, res) => {
  res.status(200).json({
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// Detailed health check for monitoring
router.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {},
    metrics: {}
  };

  try {
    // Database health
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 1
    });

    const dbStart = Date.now();
    const dbResult = await pool.query(`
      SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections
      FROM pg_stat_activity
    `);
    const dbResponseTime = Date.now() - dbStart;

    await pool.end();

    health.checks.database = {
      status: 'healthy',
      responseTime: `${dbResponseTime}ms`,
      connections: dbResult.rows[0]
    };

    // Redis health
    const redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });

    await redisClient.connect();
    const redisStart = Date.now();
    const info = await redisClient.info('memory');
    const redisResponseTime = Date.now() - redisStart;

    health.checks.redis = {
      status: 'healthy',
      responseTime: `${redisResponseTime}ms`,
      info: info.split('\r\n').slice(0, 5) // First few lines of info
    };

    await redisClient.quit();

    // System metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    health.metrics = {
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: `${Math.round(process.uptime())}s`,
      nodeVersion: process.version,
      platform: process.platform
    };

    // Recent error count (you would implement this based on your logging)
    health.metrics.recent_errors = 0; // Placeholder

  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Graceful shutdown monitoring
let shutdownStarted = false;

router.get('/shutdown/status', (req, res) => {
  res.json({
    shutdownStarted,
    shuttingDown: process.env.SHUTTING_DOWN === 'true',
    uptime: process.uptime()
  });
});

function startShutdown() {
  if (!shutdownStarted) {
    shutdownStarted = true;
    process.env.SHUTTING_DOWN = 'true';
    console.log('Graceful shutdown initiated');
  }
}

// Track active connections
const activeConnectionsSet = new Set();

function trackConnection(req, res, next) {
  const connectionId = `${req.ip}-${Date.now()}`;
  activeConnectionsSet.add(connectionId);
  activeConnections.set(activeConnectionsSet.size);

  res.on('finish', () => {
    activeConnectionsSet.delete(connectionId);
    activeConnections.set(activeConnectionsSet.size);
  });

  next();
}

module.exports = {
  router,
  metricsMiddleware,
  trackConnection,
  register,
  startShutdown,
  metrics: {
    httpRequestDuration,
    httpRequestCounter,
    nasaApiRequestDuration,
    nasaApiRequestCounter,
    nasaApiCacheHits,
    nasaApiCacheMisses,
    nasaApiRateLimited,
    loginAttempts,
    sqlInjectionAttempts,
    xssAttempts,
    rateLimitExceeded,
    pageViews,
    userSessions
  }
};