const EventEmitter = require('events');
const axios = require('axios');
const { cache } = require('../middleware/cache');
const { getPubSubManager } = require('../redis/pubSubManager');

class NASAStreamingService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.apiKey = process.env.NASA_API_KEY;
    this.baseUrl = 'https://api.nasa.gov';
    this.pubSub = getPubSubManager();

    this.streamConfig = {
      apod: {
        interval: 24 * 60 * 60 * 1000, // 24 hours
        cacheTTL: 24 * 60 * 60, // 24 hours
        enabled: true
      },
      neo: {
        interval: 60 * 60 * 1000, // 1 hour
        cacheTTL: 30 * 60, // 30 minutes
        enabled: true
      },
      donki: {
        interval: 5 * 60 * 1000, // 5 minutes
        cacheTTL: 5 * 60, // 5 minutes
        enabled: true
      },
      iss: {
        interval: 30 * 1000, // 30 seconds
        cacheTTL: 30, // 30 seconds
        enabled: true,
        altUrl: 'http://api.open-notify.org'
      },
      epic: {
        interval: 60 * 60 * 1000, // 1 hour
        cacheTTL: 60 * 60, // 1 hour
        enabled: true
      }
    };

    this.streams = new Map();
    this.lastUpdates = new Map();
    this.errorCounts = new Map();
    this.isRunning = false;

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      dataUpdates: 0,
      lastUpdate: null,
      averageResponseTime: 0
    };
  }

  async initialize() {
    try {
      console.log('🚀 Initializing NASA Streaming Service...');

      // Set up Pub/Sub event handlers
      this.setupPubSubHandlers();

      // Initialize all data streams
      await this.initializeStreams();

      this.isRunning = true;
      this.startMetricsCollection();

      console.log('✅ NASA Streaming Service initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize NASA Streaming Service:', error.message);
      this.emit('error', error);
    }
  }

  setupPubSubHandlers() {
    // Listen for cache invalidation requests
    this.pubSub.on('message', async (data) => {
      if (data.channel === 'nasa:cache:invalidate') {
        await this.handleCacheInvalidation(data.message);
      }
    });

    // Listen for stream configuration updates
    this.pubSub.on('message', async (data) => {
      if (data.channel === 'nasa:stream:config') {
        this.handleStreamConfigUpdate(data.message);
      }
    });
  }

  async handleCacheInvalidation(message) {
    try {
      const { dataSource, pattern } = message;

      if (dataSource && this.streams.has(dataSource)) {
        // Force refresh of specific data source
        console.log(`🔄 Force refreshing ${dataSource} data due to cache invalidation`);
        await this.fetchAndStream(dataSource);
      } else if (pattern) {
        // Invalidate cached data matching pattern
        await cache.invalidatePattern(pattern);
      }
    } catch (error) {
      console.error('Error handling cache invalidation:', error.message);
    }
  }

  handleStreamConfigUpdate(message) {
    try {
      const { dataSource, config } = message;

      if (dataSource && this.streamConfig[dataSource]) {
        // Update stream configuration
        Object.assign(this.streamConfig[dataSource], config);

        // Restart the stream if it's currently running
        if (this.streams.has(dataSource)) {
          this.stopStream(dataSource);
          this.startStream(dataSource);
        }

        console.log(`📡 Updated stream configuration for ${dataSource}`);
      }
    } catch (error) {
      console.error('Error handling stream config update:', error.message);
    }
  }

  async initializeStreams() {
    const streamPromises = [];

    for (const [dataSource, config] of Object.entries(this.streamConfig)) {
      if (config.enabled) {
        streamPromises.push(this.startStream(dataSource));
      }
    }

    await Promise.allSettled(streamPromises);
  }

  async startStream(dataSource) {
    try {
      if (this.streams.has(dataSource)) {
        console.warn(`Stream ${dataSource} is already running`);
        return;
      }

      const config = this.streamConfig[dataSource];
      if (!config.enabled) {
        console.log(`Stream ${dataSource} is disabled, skipping`);
        return;
      }

      // Initial data fetch
      await this.fetchAndStream(dataSource);

      // Set up periodic updates
      const interval = setInterval(async () => {
        await this.fetchAndStream(dataSource);
      }, config.interval);

      this.streams.set(dataSource, interval);
      console.log(`📡 Started ${dataSource} stream (interval: ${config.interval}ms)`);

    } catch (error) {
      console.error(`Error starting ${dataSource} stream:`, error.message);
      this.handleStreamError(dataSource, error);
    }
  }

  stopStream(dataSource) {
    const interval = this.streams.get(dataSource);
    if (interval) {
      clearInterval(interval);
      this.streams.delete(dataSource);
      console.log(`⏹️ Stopped ${dataSource} stream`);
    }
  }

  async fetchAndStream(dataSource) {
    const startTime = Date.now();

    try {
      let data;

      switch (dataSource) {
        case 'apod':
          data = await this.fetchAPOD();
          break;
        case 'neo':
          data = await this.fetchNEO();
          break;
        case 'donki':
          data = await this.fetchDONKI();
          break;
        case 'iss':
          data = await this.fetchISS();
          break;
        case 'epic':
          data = await this.fetchEPIC();
          break;
        default:
          throw new Error(`Unknown data source: ${dataSource}`);
      }

      // Cache the data
      await this.cacheData(dataSource, data);

      // Stream the data via WebSocket
      await this.streamData(dataSource, data);

      // Publish to Pub/Sub for multi-instance support
      await this.pubSub.publishNASADataUpdate(dataSource, data);

      // Update metrics
      this.updateMetrics(true, Date.now() - startTime);
      this.lastUpdates.set(dataSource, new Date());

      this.emit('dataUpdate', { dataSource, data, timestamp: new Date() });

    } catch (error) {
      console.error(`Error fetching ${dataSource} data:`, error.message);
      this.handleStreamError(dataSource, error);
      this.updateMetrics(false, Date.now() - startTime);
    }
  }

  async fetchAPOD() {
    const cacheKey = 'nasa:apod:current';
    let data = await cache.get(cacheKey);

    if (!data) {
      const url = `${this.baseUrl}/planetary/apod?api_key=${this.apiKey}`;
      const response = await axios.get(url, { timeout: 10000 });
      data = response.data;
    }

    return data;
  }

  async fetchNEO() {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `nasa:neo:${today}`;
    let data = await cache.get(cacheKey);

    if (!data) {
      const url = `${this.baseUrl}/neo/rest/v1/feed?api_key=${this.apiKey}&start_date=${today}&end_date=${today}`;
      const response = await axios.get(url, { timeout: 15000 });
      data = response.data;
    }

    return data;
  }

  async fetchDONKI() {
    const cacheKey = 'nasa:donki:coronal_mass_ejection';
    let data = await cache.get(cacheKey);

    if (!data) {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const url = `${this.baseUrl}/DONKI/CMEAnalysis?api_key=${this.apiKey}&startDate=${startDate}&endDate=${endDate}`;
      const response = await axios.get(url, { timeout: 10000 });
      data = response.data;
    }

    return data;
  }

  async fetchISS() {
    const cacheKey = 'nasa:iss:current';
    let data = await cache.get(cacheKey);

    if (!data) {
      // Use Open Notify API for ISS position
      const url = `${this.streamConfig.iss.altUrl}/iss-now.json`;
      const response = await axios.get(url, { timeout: 5000 });
      data = response.data;
    }

    return data;
  }

  async fetchEPIC() {
    const cacheKey = 'nasa:epic:latest:natural';
    let data = await cache.get(cacheKey);

    if (!data) {
      const url = `${this.baseUrl}/EPIC/api/natural/images?api_key=${this.apiKey}`;
      const response = await axios.get(url, { timeout: 10000 });
      data = response.data.slice(0, 10); // Get latest 10 images
    }

    return data;
  }

  async cacheData(dataSource, data) {
    try {
      const config = this.streamConfig[dataSource];
      const cacheKey = `nasa:${dataSource}:current`;

      await cache.set(cacheKey, data, config.cacheTTL);
    } catch (error) {
      console.error(`Error caching ${dataSource} data:`, error.message);
    }
  }

  async streamData(dataSource, data) {
    try {
      // This would be handled by the WebSocket server
      // The WebSocket server would listen for 'nasaDataUpdate' events from Pub/Sub
      this.emit('streamData', { dataSource, data });
    } catch (error) {
      console.error(`Error streaming ${dataSource} data:`, error.message);
    }
  }

  handleStreamError(dataSource, error) {
    const errorCount = this.errorCounts.get(dataSource) || 0;
    this.errorCounts.set(dataSource, errorCount + 1);

    console.error(`Stream ${dataSource} error (count: ${errorCount + 1}):`, error.message);

    // Implement backoff strategy for repeated errors
    if (errorCount >= 3) {
      console.warn(`🚨 Disabling ${dataSource} stream due to repeated errors`);
      this.stopStream(dataSource);

      // Schedule restart after delay
      setTimeout(() => {
        console.log(`🔄 Attempting to restart ${dataSource} stream`);
        this.errorCounts.set(dataSource, 0);
        this.startStream(dataSource);
      }, 5 * 60 * 1000); // 5 minutes
    }

    this.emit('streamError', { dataSource, error, errorCount: errorCount + 1 });
  }

  // Real-time data fetching for WebSocket clients
  async getLatestData(dataSource, options = {}) {
    try {
      const cacheKey = options.cacheKey || `nasa:${dataSource}:current`;
      let data = await cache.get(cacheKey);

      if (!data || options.forceRefresh) {
        data = await this.fetchAndStream(dataSource);
      }

      return {
        data,
        source: 'stream',
        lastUpdate: this.lastUpdates.get(dataSource),
        nextUpdate: this.getNextUpdateTime(dataSource)
      };
    } catch (error) {
      console.error(`Error getting latest ${dataSource} data:`, error.message);
      throw error;
    }
  }

  async getHistoricalData(dataSource, params) {
    try {
      let data;
      const cacheKey = `nasa:${dataSource}:historical:${JSON.stringify(params)}`;

      data = await cache.get(cacheKey);

      if (!data) {
        switch (dataSource) {
          case 'apod':
            data = await this.fetchHistoricalAPOD(params);
            break;
          case 'neo':
            data = await this.fetchHistoricalNEO(params);
            break;
          case 'donki':
            data = await this.fetchHistoricalDONKI(params);
            break;
          case 'epic':
            data = await this.fetchHistoricalEPIC(params);
            break;
          default:
            throw new Error(`Historical data not available for ${dataSource}`);
        }

        await cache.set(cacheKey, data, 24 * 60 * 60); // Cache for 24 hours
      }

      return data;
    } catch (error) {
      console.error(`Error fetching historical ${dataSource} data:`, error.message);
      throw error;
    }
  }

  async fetchHistoricalAPOD(params) {
    const { startDate, endDate } = params;
    const dates = this.generateDateRange(startDate, endDate);
    const promises = dates.map(date => this.fetchAPODForDate(date));
    return await Promise.all(promises);
  }

  async fetchAPODForDate(date) {
    const url = `${this.baseUrl}/planetary/apod?api_key=${this.apiKey}&date=${date}`;
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  }

  async fetchHistoricalNEO(params) {
    const { startDate, endDate } = params;
    const url = `${this.baseUrl}/neo/rest/v1/feed?api_key=${this.apiKey}&start_date=${startDate}&end_date=${endDate}`;
    const response = await axios.get(url, { timeout: 15000 });
    return response.data;
  }

  async fetchHistoricalDONKI(params) {
    const { startDate, endDate, eventType } = params;
    const url = `${this.baseUrl}/DONKI/${eventType}?api_key=${this.apiKey}&startDate=${startDate}&endDate=${endDate}`;
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  }

  async fetchHistoricalEPIC(params) {
    const { date, type = 'natural' } = params;
    const url = `${this.baseUrl}/EPIC/api/${type}/date/${date}?api_key=${this.apiKey}`;
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  }

  generateDateRange(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
  }

  getNextUpdateTime(dataSource) {
    const lastUpdate = this.lastUpdates.get(dataSource);
    const interval = this.streamConfig[dataSource]?.interval;

    if (lastUpdate && interval) {
      return new Date(lastUpdate.getTime() + interval);
    }

    return null;
  }

  updateMetrics(success, responseTime) {
    this.metrics.totalRequests++;

    if (success) {
      this.metrics.successfulRequests++;
      this.metrics.dataUpdates++;
      this.metrics.lastUpdate = new Date();
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time
    const totalResponseTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime;
    this.metrics.averageResponseTime = totalResponseTime / this.metrics.totalRequests;
  }

  startMetricsCollection() {
    setInterval(() => {
      this.emit('metrics', this.getMetrics());
    }, 60000); // Emit metrics every minute
  }

  getMetrics() {
    return {
      ...this.metrics,
      activeStreams: this.streams.size,
      lastUpdates: Object.fromEntries(this.lastUpdates),
      errorCounts: Object.fromEntries(this.errorCounts),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  // Stream control methods
  async enableStream(dataSource) {
    if (this.streamConfig[dataSource]) {
      this.streamConfig[dataSource].enabled = true;
      if (!this.streams.has(dataSource)) {
        await this.startStream(dataSource);
      }
    }
  }

  async disableStream(dataSource) {
    if (this.streamConfig[dataSource]) {
      this.streamConfig[dataSource].enabled = false;
      this.stopStream(dataSource);
    }
  }

  async updateStreamConfig(dataSource, config) {
    if (this.streamConfig[dataSource]) {
      Object.assign(this.streamConfig[dataSource], config);

      // Broadcast config update to other instances
      await this.pubSub.publish('nasa:stream:config', {
        dataSource,
        config,
        source: process.env.INSTANCE_ID
      });

      if (this.streams.has(dataSource)) {
        this.stopStream(dataSource);
        await this.startStream(dataSource);
      }
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down NASA Streaming Service...');

    this.isRunning = false;

    // Stop all streams
    for (const dataSource of this.streams.keys()) {
      this.stopStream(dataSource);
    }

    // Clear caches
    this.lastUpdates.clear();
    this.errorCounts.clear();

    console.log('✅ NASA Streaming Service shut down successfully');
    this.emit('shutdown');
  }
}

module.exports = NASAStreamingService;