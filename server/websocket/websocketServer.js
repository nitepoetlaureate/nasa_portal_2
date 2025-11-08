const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { cache } = require('../middleware/cache');
const { authenticateToken } = require('../middleware/auth');

class WebSocketServer {
  constructor(httpServer, options = {}) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      ...options
    });

    this.connectedClients = new Map();
    this.subscriptionRooms = new Map();
    this.nasaDataStreams = new Map();
    this.clientMetrics = {
      totalConnections: 0,
      activeConnections: 0,
      messagesPerSecond: 0,
      latencyHistory: []
    };

    this.initializeMiddleware();
    this.initializeHandlers();
    this.initializeNASAStreams();
    this.startMetricsCollection();
  }

  initializeMiddleware() {
    // Authentication middleware for Socket.IO
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role || 'user';

        // Check MFA if required
        if (process.env.REQUIRE_MFA === 'true' && !decoded.mfaVerified) {
          return next(new Error('Multi-factor authentication required'));
        }

        // Rate limiting per user
        const rateLimitKey = `ws:rate_limit:${socket.userId}`;
        const currentRequests = await cache.get(rateLimitKey) || 0;

        if (currentRequests >= 100) { // 100 messages per minute
          return next(new Error('Rate limit exceeded'));
        }

        await cache.set(rateLimitKey, currentRequests + 1, 60);
        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error.message);
        next(new Error('Authentication failed'));
      }
    });
  }

  initializeHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);

      // Connection management
      socket.on('disconnect', () => this.handleDisconnection(socket));
      socket.on('ping', () => this.handlePing(socket));

      // NASA data subscriptions
      socket.on('subscribe:nasa:apod', (data) => this.handleAPODSubscription(socket, data));
      socket.on('subscribe:nasa:neo', (data) => this.handleNEOSubscription(socket, data));
      socket.on('subscribe:nasa:donki', (data) => this.handleDONKISubscription(socket, data));
      socket.on('subscribe:nasa:iss', (data) => this.handleISSSubscription(socket, data));
      socket.on('subscribe:nasa:epic', (data) => this.handleEPICSubscription(socket, data));

      // Unsubscribe from data streams
      socket.on('unsubscribe:nasa:apod', () => this.handleAPODUnsubscription(socket));
      socket.on('unsubscribe:nasa:neo', () => this.handleNEOUnsubscription(socket));
      socket.on('unsubscribe:nasa:donki', () => this.handleDONKIUnsubscription(socket));
      socket.on('unsubscribe:nasa:iss', () => this.handleISSUnsubscription(socket));
      socket.on('unsubscribe:nasa:epic', () => this.handleEPICUnsubscription(socket));

      // Real-time queries
      socket.on('query:nasa:latest', (data) => this.handleLatestQuery(socket, data));
      socket.on('query:nasa:search', (data) => this.handleSearchQuery(socket, data));

      // Session management
      socket.on('session:heartbeat', (data) => this.handleSessionHeartbeat(socket, data));
      socket.on('session:extend', (data) => this.handleSessionExtension(socket, data));
    });
  }

  async handleConnection(socket) {
    const clientInfo = {
      socketId: socket.id,
      userId: socket.userId,
      userRole: socket.userRole,
      connectedAt: new Date(),
      lastActivity: new Date(),
      subscriptions: new Set(),
      messageCount: 0,
      latency: 0
    };

    this.connectedClients.set(socket.id, clientInfo);
    this.clientMetrics.totalConnections++;
    this.clientMetrics.activeConnections++;

    console.log(`WebSocket client connected: ${socket.id} (User: ${socket.userId})`);

    // Send welcome message with client info
    socket.emit('connected', {
      clientId: socket.id,
      serverTime: new Date().toISOString(),
      availableStreams: ['apod', 'neo', 'donki', 'iss', 'epic'],
      subscriptionLimits: {
        maxSubscriptions: 10,
        maxQueriesPerMinute: 60
      }
    });

    // Store session in Redis for multi-instance support
    await cache.set(`ws:session:${socket.id}`, clientInfo, 3600);
  }

  async handleDisconnection(socket) {
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo) {
      console.log(`WebSocket client disconnected: ${socket.id} (User: ${socket.userId})`);

      // Clean up subscriptions
      for (const subscription of clientInfo.subscriptions) {
        this.leaveSubscriptionRoom(socket, subscription);
      }

      this.connectedClients.delete(socket.id);
      this.clientMetrics.activeConnections--;

      // Remove from Redis
      await cache.del(`ws:session:${socket.id}`);
    }
  }

  handlePing(socket) {
    const startTime = Date.now();
    socket.emit('pong', { timestamp: startTime });

    // Calculate latency when pong is received
    socket.once('pong_response', (data) => {
      const latency = Date.now() - data.timestamp;
      const clientInfo = this.connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.latency = latency;
        clientInfo.lastActivity = new Date();
      }
    });
  }

  // NASA APOD Real-time Stream
  async handleAPODSubscription(socket, data) {
    try {
      const clientInfo = this.connectedClients.get(socket.id);
      if (!clientInfo) return;

      if (clientInfo.subscriptions.size >= 10) {
        socket.emit('error', { message: 'Maximum subscription limit reached' });
        return;
      }

      const room = `apod:${data.date || 'today'}`;
      socket.join(room);
      clientInfo.subscriptions.add(room);

      // Send current APOD data immediately
      const apodData = await this.getAPODData(data.date);
      socket.emit('nasa:apod:update', apodData);

      // Set up periodic updates (every 24 hours for APOD)
      if (!this.nasaDataStreams.has('apod')) {
        this.nasaDataStreams.set('apod', setInterval(async () => {
          const updatedData = await this.getAPODData();
          this.io.to('apod:today').emit('nasa:apod:update', updatedData);
        }, 24 * 60 * 60 * 1000)); // 24 hours
      }

      socket.emit('subscribed', { stream: 'apod', room });
      console.log(`Client ${socket.id} subscribed to APOD stream`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to subscribe to APOD stream', error: error.message });
    }
  }

  // NASA NEO Real-time Stream
  async handleNEOSubscription(socket, data) {
    try {
      const clientInfo = this.connectedClients.get(socket.id);
      if (!clientInfo) return;

      if (clientInfo.subscriptions.size >= 10) {
        socket.emit('error', { message: 'Maximum subscription limit reached' });
        return;
      }

      const room = `neo:${data.feedDate || 'today'}`;
      socket.join(room);
      clientInfo.subscriptions.add(room);

      // Send current NEO data immediately
      const neoData = await this.getNEOData(data.feedDate);
      socket.emit('nasa:neo:update', neoData);

      // Set up periodic updates (every hour for NEO data)
      if (!this.nasaDataStreams.has('neo')) {
        this.nasaDataStreams.set('neo', setInterval(async () => {
          const updatedData = await this.getNEOData();
          this.io.to('neo:today').emit('nasa:neo:update', updatedData);
        }, 60 * 60 * 1000)); // 1 hour
      }

      socket.emit('subscribed', { stream: 'neo', room });
      console.log(`Client ${socket.id} subscribed to NEO stream`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to subscribe to NEO stream', error: error.message });
    }
  }

  // NASA DONKI Real-time Stream
  async handleDONKISubscription(socket, data) {
    try {
      const clientInfo = this.connectedClients.get(socket.id);
      if (!clientInfo) return;

      if (clientInfo.subscriptions.size >= 10) {
        socket.emit('error', { message: 'Maximum subscription limit reached' });
        return;
      }

      const room = `donki:${data.type || 'all'}`;
      socket.join(room);
      clientInfo.subscriptions.add(room);

      // Send current DONKI data immediately
      const donkiData = await this.getDONKIData(data.type, data.startDate, data.endDate);
      socket.emit('nasa:donki:update', donkiData);

      // Set up frequent updates for space weather (every 5 minutes)
      if (!this.nasaDataStreams.has('donki')) {
        this.nasaDataStreams.set('donki', setInterval(async () => {
          const updatedData = await this.getDONKIData();
          this.io.to('donki:all').emit('nasa:donki:update', updatedData);
        }, 5 * 60 * 1000)); // 5 minutes
      }

      socket.emit('subscribed', { stream: 'donki', room });
      console.log(`Client ${socket.id} subscribed to DONKI stream`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to subscribe to DONKI stream', error: error.message });
    }
  }

  // NASA ISS Real-time Stream
  async handleISSSubscription(socket, data) {
    try {
      const clientInfo = this.connectedClients.get(socket.id);
      if (!clientInfo) return;

      if (clientInfo.subscriptions.size >= 10) {
        socket.emit('error', { message: 'Maximum subscription limit reached' });
        return;
      }

      const room = 'iss:tracking';
      socket.join(room);
      clientInfo.subscriptions.add(room);

      // Send current ISS data immediately
      const issData = await this.getISSData();
      socket.emit('nasa:iss:update', issData);

      // Set up frequent updates for ISS tracking (every 30 seconds)
      if (!this.nasaDataStreams.has('iss')) {
        this.nasaDataStreams.set('iss', setInterval(async () => {
          const updatedData = await this.getISSData();
          this.io.to('iss:tracking').emit('nasa:iss:update', updatedData);
        }, 30 * 1000)); // 30 seconds
      }

      socket.emit('subscribed', { stream: 'iss', room });
      console.log(`Client ${socket.id} subscribed to ISS tracking stream`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to subscribe to ISS stream', error: error.message });
    }
  }

  // NASA EPIC Real-time Stream
  async handleEPICSubscription(socket, data) {
    try {
      const clientInfo = this.connectedClients.get(socket.id);
      if (!clientInfo) return;

      if (clientInfo.subscriptions.size >= 10) {
        socket.emit('error', { message: 'Maximum subscription limit reached' });
        return;
      }

      const room = `epic:${data.type || 'natural'}`;
      socket.join(room);
      clientInfo.subscriptions.add(room);

      // Send current EPIC data immediately
      const epicData = await this.getEPICData(data.type);
      socket.emit('nasa:epic:update', epicData);

      // Set up periodic updates for EPIC images (every hour)
      if (!this.nasaDataStreams.has('epic')) {
        this.nasaDataStreams.set('epic', setInterval(async () => {
          const updatedData = await this.getEPICData();
          this.io.to('epic:natural').emit('nasa:epic:update', updatedData);
        }, 60 * 60 * 1000)); // 1 hour
      }

      socket.emit('subscribed', { stream: 'epic', room });
      console.log(`Client ${socket.id} subscribed to EPIC stream`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to subscribe to EPIC stream', error: error.message });
    }
  }

  // Unsubscription handlers
  handleAPODUnsubscription(socket) {
    this.leaveSubscriptionRoom(socket, 'apod:today');
  }

  handleNEOUnsubscription(socket) {
    this.leaveSubscriptionRoom(socket, 'neo:today');
  }

  handleDONKIUnsubscription(socket) {
    this.leaveSubscriptionRoom(socket, 'donki:all');
  }

  handleISSUnsubscription(socket) {
    this.leaveSubscriptionRoom(socket, 'iss:tracking');
  }

  handleEPICUnsubscription(socket) {
    this.leaveSubscriptionRoom(socket, 'epic:natural');
  }

  async leaveSubscriptionRoom(socket, room) {
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo && clientInfo.subscriptions.has(room)) {
      socket.leave(room);
      clientInfo.subscriptions.delete(room);
      socket.emit('unsubscribed', { stream: room.split(':')[0] });
      console.log(`Client ${socket.id} unsubscribed from ${room}`);
    }
  }

  // Real-time query handlers
  async handleLatestQuery(socket, data) {
    try {
      const { type } = data;
      let result;

      switch (type) {
        case 'apod':
          result = await this.getAPODData();
          break;
        case 'neo':
          result = await this.getNEOData();
          break;
        case 'donki':
          result = await this.getDONKIData();
          break;
        case 'iss':
          result = await this.getISSData();
          break;
        case 'epic':
          result = await this.getEPICData();
          break;
        default:
          throw new Error(`Unknown data type: ${type}`);
      }

      socket.emit('query:result', { type, data: result, timestamp: new Date().toISOString() });
    } catch (error) {
      socket.emit('query:error', { message: error.message, query: data });
    }
  }

  async handleSearchQuery(socket, data) {
    try {
      const { type, query } = data;
      let result;

      // Implement search functionality for different NASA data types
      // This would integrate with existing search endpoints
      result = await this.searchNASAData(type, query);

      socket.emit('search:result', { type, query, data: result, timestamp: new Date().toISOString() });
    } catch (error) {
      socket.emit('search:error', { message: error.message, query: data });
    }
  }

  // Session management handlers
  async handleSessionHeartbeat(socket, data) {
    const clientInfo = this.connectedClients.get(socket.id);
    if (clientInfo) {
      clientInfo.lastActivity = new Date();
      await cache.set(`ws:session:${socket.id}`, clientInfo, 3600);
      socket.emit('session:heartbeat:response', { timestamp: new Date().toISOString() });
    }
  }

  async handleSessionExtension(socket, data) {
    try {
      // Extend JWT token if valid
      const token = data.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });

      // Issue new token with extended expiration
      const newToken = jwt.sign(
        { id: decoded.id, email: decoded.email, role: decoded.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      socket.emit('session:extended', { token: newToken, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
    } catch (error) {
      socket.emit('session:error', { message: 'Failed to extend session' });
    }
  }

  // NASA data fetching methods (integration with existing services)
  async getAPODData(date) {
    const cacheKey = `apod:${date || 'today'}`;
    let data = await cache.get(cacheKey);

    if (!data) {
      // Fetch from NASA API
      const axios = require('axios');
      const apiKey = process.env.NASA_API_KEY;
      const url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}${date ? `&date=${date}` : ''}`;

      const response = await axios.get(url);
      data = response.data;
      await cache.set(cacheKey, data, 86400); // Cache for 24 hours
    }

    return data;
  }

  async getNEOData(feedDate) {
    const cacheKey = `neo:${feedDate || 'today'}`;
    let data = await cache.get(cacheKey);

    if (!data) {
      const axios = require('axios');
      const apiKey = process.env.NASA_API_KEY;
      const url = `https://api.nasa.gov/neo/rest/v1/feed?api_key=${apiKey}${feedDate ? `&start_date=${feedDate}&end_date=${feedDate}` : ''}`;

      const response = await axios.get(url);
      data = response.data;
      await cache.set(cacheKey, data, 1800); // Cache for 30 minutes
    }

    return data;
  }

  async getDONKIData(type, startDate, endDate) {
    const cacheKey = `donki:${type || 'all'}:${startDate || 'default'}:${endDate || 'default'}`;
    let data = await cache.get(cacheKey);

    if (!data) {
      const axios = require('axios');
      const apiKey = process.env.NASA_API_KEY;
      let url = `https://api.nasa.gov/DONKI/`;

      if (type) {
        url += `${type}?api_key=${apiKey}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      }

      const response = await axios.get(url);
      data = response.data;
      await cache.set(cacheKey, data, 300); // Cache for 5 minutes
    }

    return data;
  }

  async getISSData() {
    const cacheKey = 'iss:current';
    let data = await cache.get(cacheKey);

    if (!data) {
      // Use Open Notify API for ISS position
      const axios = require('axios');
      const response = await axios.get('http://api.open-notify.org/iss-now.json');
      data = response.data;
      await cache.set(cacheKey, data, 30); // Cache for 30 seconds
    }

    return data;
  }

  async getEPICData(type) {
    const cacheKey = `epic:${type || 'natural'}`;
    let data = await cache.get(cacheKey);

    if (!data) {
      const axios = require('axios');
      const apiKey = process.env.NASA_API_KEY;
      const url = `https://api.nasa.gov/EPIC/api/${type || 'natural'}/images?api_key=${apiKey}`;

      const response = await axios.get(url);
      data = response.data;
      await cache.set(cacheKey, data, 3600); // Cache for 1 hour
    }

    return data;
  }

  initializeNASAStreams() {
    // Initialize all NASA data streams
    console.log('Initializing NASA real-time data streams...');

    // Start with high-frequency streams
    if (!this.nasaDataStreams.has('iss')) {
      this.nasaDataStreams.set('iss', setInterval(async () => {
        try {
          const data = await this.getISSData();
          this.io.to('iss:tracking').emit('nasa:iss:update', data);
        } catch (error) {
          console.error('ISS stream update error:', error.message);
        }
      }, 30 * 1000));
    }
  }

  startMetricsCollection() {
    setInterval(() => {
      this.calculateMetrics();
    }, 1000); // Update metrics every second
  }

  calculateMetrics() {
    let totalMessages = 0;
    let totalLatency = 0;
    let activeClients = 0;

    for (const [socketId, clientInfo] of this.connectedClients) {
      totalMessages += clientInfo.messageCount;
      totalLatency += clientInfo.latency;
      if (Date.now() - clientInfo.lastActivity.getTime() < 30000) {
        activeClients++;
      }
    }

    this.clientMetrics.activeConnections = activeClients;
    this.clientMetrics.messagesPerSecond = totalMessages;
    this.clientMetrics.averageLatency = activeClients > 0 ? totalLatency / activeClients : 0;

    // Store metrics in Redis for monitoring
    cache.set('ws:metrics', this.clientMetrics, 60);
  }

  // Redis pub/sub for multi-instance scaling
  async initializePubSub() {
    const subscriber = cache.client.duplicate();
    await subscriber.connect();

    await subscriber.subscribe('ws:broadcast', (message) => {
      const { type, room, data } = JSON.parse(message);
      this.io.to(room).emit(type, data);
    });

    console.log('WebSocket pub/sub initialized for multi-instance scaling');
  }

  async broadcastToRoom(room, event, data) {
    // Publish to Redis for multi-instance broadcasting
    if (cache.client) {
      await cache.client.publish('ws:broadcast', JSON.stringify({
        type: event,
        room,
        data
      }));
    }

    // Also emit locally
    this.io.to(room).emit(event, data);
  }

  getMetrics() {
    return {
      ...this.clientMetrics,
      connectedClients: this.connectedClients.size,
      activeStreams: this.nasaDataStreams.size
    };
  }

  async shutdown() {
    console.log('Shutting down WebSocket server...');

    // Clear all intervals
    for (const [name, interval] of this.nasaDataStreams) {
      clearInterval(interval);
    }

    // Disconnect all clients
    this.io.emit('server:shutdown', { message: 'Server is shutting down' });
    this.io.close();

    console.log('WebSocket server shutdown complete');
  }
}

module.exports = WebSocketServer;