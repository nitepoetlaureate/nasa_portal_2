const { EventEmitter } = require('events');
const { cache } = require('../middleware/cache');

class PubSubManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.publisher = null;
    this.subscriber = null;
    this.isConnected = false;
    this.channels = new Set();
    this.messageQueue = [];
    this.retryAttempts = 0;
    this.maxRetries = options.maxRetries || 10;
    this.retryDelay = options.retryDelay || 1000;
    this.heartbeatInterval = null;

    this.messageStats = {
      messagesPublished: 0,
      messagesReceived: 0,
      messagesFailed: 0,
      lastMessageTime: null,
      channelStats: new Map()
    };
  }

  async connect() {
    try {
      // Create separate Redis clients for pub/sub
      this.publisher = cache.client.duplicate();
      this.subscriber = cache.client.duplicate();

      await Promise.all([
        this.publisher.connect(),
        this.subscriber.connect()
      ]);

      this.setupEventHandlers();
      this.startHeartbeat();

      this.isConnected = true;
      this.retryAttempts = 0;

      console.log('✅ Redis Pub/Sub connected successfully');
      this.emit('connected');

      // Process any queued messages
      this.processMessageQueue();
    } catch (error) {
      console.error('❌ Redis Pub/Sub connection failed:', error.message);
      this.isConnected = false;

      // Implement exponential backoff retry
      if (this.retryAttempts < this.maxRetries) {
        this.retryAttempts++;
        const delay = this.retryDelay * Math.pow(2, this.retryAttempts - 1);

        console.log(`🔄 Retrying Pub/Sub connection in ${delay}ms (attempt ${this.retryAttempts}/${this.maxRetries})`);
        setTimeout(() => this.connect(), delay);
      } else {
        console.error('❌ Max retry attempts reached for Pub/Sub connection');
        this.emit('error', error);
      }
    }
  }

  setupEventHandlers() {
    // Publisher events
    this.publisher.on('error', (error) => {
      console.error('Redis publisher error:', error.message);
      this.messageStats.messagesFailed++;
      this.emit('publisherError', error);
    });

    this.publisher.on('connect', () => {
      console.log('Redis publisher connected');
    });

    // Subscriber events
    this.subscriber.on('error', (error) => {
      console.error('Redis subscriber error:', error.message);
      this.emit('subscriberError', error);
    });

    this.subscriber.on('connect', () => {
      console.log('Redis subscriber connected');
    });

    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });

    this.subscriber.on('ready', () => {
      console.log('Redis subscriber ready');
    });
  }

  async handleMessage(channel, message) {
    try {
      const parsedMessage = JSON.parse(message);
      this.messageStats.messagesReceived++;
      this.messageStats.lastMessageTime = new Date();

      // Update channel statistics
      const channelStats = this.messageStats.channelStats.get(channel) || {
        count: 0,
        lastReceived: null
      };
      channelStats.count++;
      channelStats.lastReceived = new Date();
      this.messageStats.channelStats.set(channel, channelStats);

      // Emit message event
      this.emit('message', {
        channel,
        message: parsedMessage,
        timestamp: new Date(),
        pattern: null
      });

      // Handle system-specific channels
      await this.handleSystemChannels(channel, parsedMessage);

    } catch (error) {
      console.error('Error handling Pub/Sub message:', error.message);
      this.messageStats.messagesFailed++;
      this.emit('messageError', { channel, message, error });
    }
  }

  async handleSystemChannels(channel, message) {
    switch (channel) {
      case 'nasa:system:broadcast':
        // Handle system-wide broadcasts
        this.emit('systemBroadcast', message);
        break;

      case 'nasa:websocket:broadcast':
        // Handle WebSocket broadcasts across instances
        this.emit('websocketBroadcast', message);
        break;

      case 'nasa:cache:invalidate':
        // Handle cache invalidation across instances
        await this.handleCacheInvalidation(message);
        break;

      case 'nasa:user:notification':
        // Handle user notifications
        this.emit('userNotification', message);
        break;

      case 'nasa:data:update':
        // Handle NASA data updates
        this.emit('nasaDataUpdate', message);
        break;

      case 'nasa:system:heartbeat':
        // Handle system heartbeat messages
        this.emit('systemHeartbeat', message);
        break;

      default:
        // Handle custom channels
        this.emit('customChannel', { channel, message });
    }
  }

  async handleCacheInvalidation(message) {
    try {
      const { pattern, keys } = message;

      if (keys && Array.isArray(keys)) {
        // Invalidate specific keys
        for (const key of keys) {
          await cache.del(key);
        }
      } else if (pattern) {
        // Invalidate keys matching pattern
        await cache.invalidatePattern(pattern);
      }

      console.log(`🗑️  Cache invalidation processed: ${pattern || keys.join(', ')}`);
    } catch (error) {
      console.error('Cache invalidation error:', error.message);
    }
  }

  async publish(channel, message, options = {}) {
    try {
      if (!this.isConnected) {
        // Queue message if not connected
        this.messageQueue.push({ channel, message, options, timestamp: new Date() });
        return false;
      }

      const messageData = {
        id: this.generateMessageId(),
        data: message,
        timestamp: new Date().toISOString(),
        source: process.env.INSTANCE_ID || 'unknown',
        priority: options.priority || 'normal',
        ttl: options.ttl || 3600
      };

      const serializedMessage = JSON.stringify(messageData);

      // Add to channel stats
      const channelStats = this.messageStats.channelStats.get(channel) || {
        count: 0,
        lastPublished: null
      };
      channelStats.count++;
      channelStats.lastPublished = new Date();
      this.messageStats.channelStats.set(channel, channelStats);

      await this.publisher.publish(channel, serializedMessage);

      this.messageStats.messagesPublished++;
      this.messageStats.lastMessageTime = new Date();

      return messageData.id;
    } catch (error) {
      console.error('Error publishing message:', error.message);
      this.messageStats.messagesFailed++;

      // Queue message for retry
      if (options.retry !== false) {
        this.messageQueue.push({ channel, message, options, timestamp: new Date() });
      }

      throw error;
    }
  }

  async subscribe(channel, callback) {
    try {
      if (!this.isConnected) {
        console.warn('Cannot subscribe - Pub/Sub not connected');
        return false;
      }

      await this.subscriber.subscribe(channel);
      this.channels.add(channel);

      // Register callback for this channel
      this.on('message', (data) => {
        if (data.channel === channel) {
          callback(data.message, data.channel, data);
        }
      });

      console.log(`📡 Subscribed to channel: ${channel}`);
      return true;
    } catch (error) {
      console.error('Error subscribing to channel:', error.message);
      throw error;
    }
  }

  async unsubscribe(channel) {
    try {
      if (!this.isConnected) {
        return false;
      }

      await this.subscriber.unsubscribe(channel);
      this.channels.delete(channel);

      console.log(`📡 Unsubscribed from channel: ${channel}`);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from channel:', error.message);
      throw error;
    }
  }

  async subscribeToPattern(pattern, callback) {
    try {
      if (!this.isConnected) {
        console.warn('Cannot subscribe to pattern - Pub/Sub not connected');
        return false;
      }

      await this.subscriber.pSubscribe(pattern);
      this.channels.add(`pattern:${pattern}`);

      // Handle pattern messages
      this.subscriber.on('pmessage', (pattern, channel, message) => {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage, channel, pattern);
        } catch (error) {
          console.error('Error handling pattern message:', error.message);
        }
      });

      console.log(`📡 Subscribed to pattern: ${pattern}`);
      return true;
    } catch (error) {
      console.error('Error subscribing to pattern:', error.message);
      throw error;
    }
  }

  async broadcastToInstances(event, data, room = null) {
    try {
      const channel = room ? `nasa:instance:${room}` : 'nasa:instance:broadcast';

      const message = {
        event,
        data,
        room,
        source: process.env.INSTANCE_ID,
        timestamp: new Date().toISOString()
      };

      await this.publish(channel, message);

      console.log(`📢 Broadcasted event '${event}' to instances${room ? ` in room '${room}'` : ''}`);
    } catch (error) {
      console.error('Error broadcasting to instances:', error.message);
      throw error;
    }
  }

  async notifyUser(userId, notification, priority = 'normal') {
    try {
      const channel = `nasa:user:${userId}`;

      const message = {
        type: 'notification',
        notification,
        priority,
        timestamp: new Date().toISOString()
      };

      await this.publish(channel, message, { priority });

      console.log(`🔔 Sent notification to user ${userId}: ${notification.title || 'Untitled'}`);
    } catch (error) {
      console.error('Error sending user notification:', error.message);
      throw error;
    }
  }

  async invalidateCacheAcrossInstances(pattern, keys = null) {
    try {
      const message = {
        pattern,
        keys,
        source: process.env.INSTANCE_ID,
        timestamp: new Date().toISOString()
      };

      await this.publish('nasa:cache:invalidate', message);

      console.log(`🗑️  Cache invalidation broadcast: ${pattern || keys?.join(', ')}`);
    } catch (error) {
      console.error('Error broadcasting cache invalidation:', error.message);
      throw error;
    }
  }

  async publishNASADataUpdate(dataSource, data, updateType = 'incremental') {
    try {
      const channel = `nasa:data:${dataSource}`;

      const message = {
        dataSource,
        data,
        updateType,
        timestamp: new Date().toISOString(),
        source: process.env.INSTANCE_ID
      };

      await this.publish(channel, message);

      console.log(`🛰️  Published NASA data update for ${dataSource} (${updateType})`);
    } catch (error) {
      console.error('Error publishing NASA data update:', error.message);
      throw error;
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const heartbeat = {
          instanceId: process.env.INSTANCE_ID || 'unknown',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          activeConnections: this.channels.size,
          messageStats: this.getMessageStats()
        };

        await this.publish('nasa:system:heartbeat', heartbeat);
      } catch (error) {
        console.error('Error sending heartbeat:', error.message);
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async processMessageQueue() {
    if (this.messageQueue.length === 0) {
      return;
    }

    console.log(`📨 Processing ${this.messageQueue.length} queued messages`);

    const failedMessages = [];

    for (const queuedMessage of this.messageQueue) {
      try {
        await this.publish(queuedMessage.channel, queuedMessage.message, queuedMessage.options);
      } catch (error) {
        console.error('Failed to process queued message:', error.message);
        failedMessages.push(queuedMessage);
      }
    }

    // Keep only failed messages for retry
    this.messageQueue = failedMessages;

    if (failedMessages.length > 0) {
      console.log(`⚠️  ${failedMessages.length} messages failed to process, keeping in queue`);
    }
  }

  generateMessageId() {
    return `${process.env.INSTANCE_ID || 'unknown'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getMessageStats() {
    return {
      ...this.messageStats,
      channelStats: Object.fromEntries(this.messageStats.channelStats),
      queuedMessages: this.messageQueue.length,
      connectedChannels: this.channels.size
    };
  }

  async getSubscribedChannels() {
    return Array.from(this.channels);
  }

  async disconnect() {
    try {
      console.log('🔌 Disconnecting Redis Pub/Sub...');

      this.stopHeartbeat();
      this.isConnected = false;

      if (this.publisher) {
        await this.publisher.quit();
      }

      if (this.subscriber) {
        await this.subscriber.quit();
      }

      this.channels.clear();
      this.messageQueue = [];

      console.log('✅ Redis Pub/Sub disconnected');
      this.emit('disconnected');
    } catch (error) {
      console.error('Error disconnecting Pub/Sub:', error.message);
    }
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🛑 Shutting down Pub/Sub manager...');

    // Process remaining messages
    await this.processMessageQueue();

    // Send shutdown notification
    try {
      await this.publish('nasa:system:shutdown', {
        instanceId: process.env.INSTANCE_ID,
        timestamp: new Date().toISOString(),
        reason: 'graceful_shutdown'
      });
    } catch (error) {
      console.error('Error sending shutdown notification:', error.message);
    }

    await this.disconnect();
  }
}

// Singleton instance
let pubSubManager = null;

const getPubSubManager = (options = {}) => {
  if (!pubSubManager) {
    pubSubManager = new PubSubManager(options);
  }
  return pubSubManager;
};

module.exports = {
  PubSubManager,
  getPubSubManager
};