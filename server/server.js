require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('passport');

// Import existing routes and middleware
const apiProxyRouter = require('./routes/apiProxy');
const { router: resourceNavigatorRouter, fetchFeaturedItem } = require('./routes/resourceNavigator');
const apodEnhancedRouter = require('./routes/apodEnhanced');
const neoEnhancedRouter = require('./routes/neoEnhanced');
const resourceEnhancedRouter = require('./routes/resourceEnhanced');
const analyticsRouter = require('./routes/analytics');
const { performanceMiddleware, responseTimeMiddleware } = require('./middleware/performance');

// Import new Phase 3 components
const WebSocketServer = require('./websocket/websocketServer');
const authRoutes = require('./auth/authRoutes');
const { getPubSubManager } = require('./redis/pubSubManager');
const NASAStreamingService = require('./services/nasaStreamingService');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Set instance ID for multi-instance support
process.env.INSTANCE_ID = process.env.INSTANCE_ID || `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Initialize Phase 3 services
let pubSubManager = null;
let websocketServer = null;
let nasaStreamingService = null;

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://api.nasa.gov", "https://images.nasa.gov"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://api.nasa.gov"] // Fixed NASA API URL
    }
  }
}));

// Compression middleware for response compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Performance monitoring middleware
app.use(performanceMiddleware);
app.use(responseTimeMiddleware);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Passport for OAuth
app.use(passport.initialize());
require('./auth/passportConfig');

// API routes
app.use('/api/nasa', apiProxyRouter);
app.use('/api/resources', resourceNavigatorRouter);
app.use('/api/apod', apodEnhancedRouter);
app.use('/api/neo', neoEnhancedRouter);
app.use('/api/resources', resourceEnhancedRouter);
app.use('/api/analytics', analyticsRouter);

// Phase 3 Authentication routes
app.use('/auth', authRoutes);

// Real-time streaming endpoints
app.get('/api/streams/status', async (req, res) => {
  try {
    if (!nasaStreamingService) {
      return res.status(503).json({ error: 'Streaming service not initialized' });
    }

    const metrics = nasaStreamingService.getMetrics();
    res.json({
      status: 'active',
      streams: Object.keys(nasaStreamingService.streamConfig),
      metrics,
      instanceId: process.env.INSTANCE_ID
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stream status' });
  }
});

app.post('/api/streams/:dataSource/refresh', async (req, res) => {
  try {
    const { dataSource } = req.params;

    if (!nasaStreamingService) {
      return res.status(503).json({ error: 'Streaming service not initialized' });
    }

    await nasaStreamingService.getLatestData(dataSource, { forceRefresh: true });

    res.json({
      message: `${dataSource} stream refreshed successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to refresh ${dataSource} stream` });
  }
});

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    instanceId: process.env.INSTANCE_ID,
    services: {
      express: true,
      cache: false,
      websocket: false,
      streaming: false,
      pubsub: false
    }
  };

  try {
    // Check cache connection
    const { cache } = require('./middleware/cache');
    health.services.cache = cache.isConnected;

    // Check WebSocket server
    if (websocketServer) {
      health.services.websocket = true;
      health.websocket = websocketServer.getMetrics();
    }

    // Check streaming service
    if (nasaStreamingService) {
      health.services.streaming = true;
      health.streaming = nasaStreamingService.getMetrics();
    }

    // Check Pub/Sub manager
    if (pubSubManager) {
      health.services.pubsub = pubSubManager.isConnected;
    }

    // Check database connection
    const db = require('./config/database');
    health.services.database = !!db.db;

  } catch (error) {
    health.status = 'degraded';
    health.error = error.message;
  }

  res.json(health);
});

// Enhanced metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const { monitor } = require('./middleware/performance');
    const performanceMetrics = monitor.getMetrics();

    const allMetrics = {
      performance: performanceMetrics,
      instance: {
        id: process.env.INSTANCE_ID,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    };

    // Add WebSocket metrics if available
    if (websocketServer) {
      allMetrics.websocket = websocketServer.getMetrics();
    }

    // Add streaming metrics if available
    if (nasaStreamingService) {
      allMetrics.streaming = nasaStreamingService.getMetrics();
    }

    // Add Pub/Sub metrics if available
    if (pubSubManager) {
      allMetrics.pubsub = pubSubManager.getMessageStats();
    }

    res.json(allMetrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h1>🚀 NASA System 7 Portal Backend</h1>
    <p>Status: Running</p>
    <p>Instance: ${process.env.INSTANCE_ID}</p>
    <p>Version: Phase 3.0 - WebSocket & Real-time Streaming</p>
    <ul>
      <li><a href="/health">Health Check</a></li>
      <li><a href="/metrics">Metrics</a></li>
      <li><a href="/auth/health">Auth Health</a></li>
      <li><a href="/api/streams/status">Stream Status</a></li>
    </ul>
  `);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 NASA System 7 Portal Backend listening on port ${PORT}`);
  console.log(`📊 Performance monitoring enabled`);
  console.log(`🔒 Security middleware active`);
  console.log(`🗜️  Compression enabled`);

  // CRITICAL FIX: Skip initialization if disabled
  if (process.env.ENABLE_FALLBACK_MODE === 'true') {
    console.log('🔧 Running in fallback mode - skipping external connections');
    console.log('✅ NASA System 7 Portal Backend started successfully (fallback mode)');
    return;
  }

  // Initialize services with error handling
  try {
    console.log('🔄 Initializing database connection...');
    await require('./config/database').db.connect();
  } catch (dbError) {
    console.warn('⚠️  Database initialization failed:', dbError.message);
    console.log('🔄 Server will continue in limited mode');
  }

  try {
    console.log('🔄 Initializing cache connection...');
    await require('./middleware/cache').cache.connect();
  } catch (cacheError) {
    console.warn('⚠️  Cache initialization failed:', cacheError.message);
    console.log('🔄 Server will continue without caching');
  }

  // Initialize Phase 3 components
  try {
    console.log('🔄 Initializing Pub/Sub manager...');
    pubSubManager = getPubSubManager();
    await pubSubManager.connect();
    console.log('✅ Pub/Sub manager initialized');
  } catch (pubSubError) {
    console.warn('⚠️  Pub/Sub initialization failed:', pubSubError.message);
    console.log('🔄 Server will continue without Pub/Sub');
  }

  try {
    console.log('🔄 Initializing WebSocket server...');
    websocketServer = new WebSocketServer(server);
    console.log('✅ WebSocket server initialized');
  } catch (wsError) {
    console.warn('⚠️  WebSocket server initialization failed:', wsError.message);
    console.log('🔄 Server will continue without WebSocket support');
  }

  try {
    console.log('🔄 Initializing NASA streaming service...');
    nasaStreamingService = new NASAStreamingService();
    await nasaStreamingService.initialize();
    console.log('✅ NASA streaming service initialized');
  } catch (streamError) {
    console.warn('⚠️  NASA streaming service initialization failed:', streamError.message);
    console.log('🔄 Server will continue without real-time streaming');
  }

  // Connect streaming service to WebSocket server
  if (nasaStreamingService && websocketServer) {
    nasaStreamingService.on('streamData', ({ dataSource, data }) => {
      websocketServer.broadcastToRoom(`${dataSource}:subscribers`, 'nasa:data:update', {
        dataSource,
        data,
        timestamp: new Date().toISOString()
      });
    });
  }

  // Fetch featured item with error handling
  try {
    console.log('🔄 Fetching featured dataset...');
    await fetchFeaturedItem();
  } catch (featuredError) {
    console.warn('⚠️  Featured item fetch failed:', featuredError.message);
    console.log('🔄 Server will continue without featured item');
  }

  // Set up graceful shutdown
  process.on('SIGTERM', () => gracefulShutdown());
  process.on('SIGINT', () => gracefulShutdown());

  console.log('✅ NASA System 7 Portal Backend started successfully (Phase 3)');
  console.log(`🌐 Server ready at http://localhost:${PORT}`);
  console.log(`📈 Metrics available at http://localhost:${PORT}/metrics`);
  console.log(`🏥 Health check at http://localhost:${PORT}/health`);
});

// Graceful shutdown function
async function gracefulShutdown() {
  console.log('\n🛑 Initiating graceful shutdown...');

  try {
    // Shutdown streaming service
    if (nasaStreamingService) {
      console.log('🔄 Shutting down NASA streaming service...');
      await nasaStreamingService.shutdown();
    }

    // Shutdown WebSocket server
    if (websocketServer) {
      console.log('🔄 Shutting down WebSocket server...');
      await websocketServer.shutdown();
    }

    // Shutdown Pub/Sub manager
    if (pubSubManager) {
      console.log('🔄 Shutting down Pub/Sub manager...');
      await pubSubManager.shutdown();
    }

    // Close HTTP server
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 30000);

  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error.message);
    process.exit(1);
  }
}
