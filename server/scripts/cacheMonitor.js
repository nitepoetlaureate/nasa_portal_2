#!/usr/bin/env node

/**
 * Real-time Cache Performance Monitor
 *
 * This script monitors Redis cache performance in real-time:
 * - Cache hit/miss ratios
 * - Memory usage trends
 * - Response time improvements
 * - Key eviction rates
 */

const { execSync } = require('child_process');
const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';
const MONITOR_INTERVAL = 5000; // 5 seconds
const MAX_SAMPLES = 100; // Keep last 100 samples for trends

class CacheMonitor {
  constructor() {
    this.samples = [];
    this.startTime = Date.now();
    this.isRunning = false;
  }

  async getRedisStats() {
    try {
      const info = execSync('redis-cli info stats', { encoding: 'utf8' });
      const memoryInfo = execSync('redis-cli info memory', { encoding: 'utf8' });

      const stats = {};
      const lines = info.split('\n');
      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          stats[key] = isNaN(value) ? value : parseInt(value);
        }
      });

      const memory = {};
      const memLines = memoryInfo.split('\n');
      memLines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          memory[key] = isNaN(value) ? value : parseInt(value);
        }
      });

      // Get NASA-specific cache info
      const nasaKeys = execSync('redis-cli keys "nasa:*"', { encoding: 'utf8' }).trim();
      const keyCount = execSync('redis-cli dbsize', { encoding: 'utf8' }).trim();

      let nasaCacheCount = 0;
      let activeNasaKeys = 0;
      let expiredNasaKeys = 0;

      if (nasaKeys) {
        const keyList = nasaKeys.split('\n').filter(k => k.trim());
        nasaCacheCount = keyList.length;

        keyList.forEach(key => {
          try {
            const ttl = parseInt(execSync(`redis-cli ttl "${key}"`, { encoding: 'utf8' }).trim());
            if (ttl > 0) {
              activeNasaKeys++;
            } else if (ttl === -2) {
              expiredNasaKeys++;
            }
          } catch (error) {
            // Ignore key errors
          }
        });
      }

      return {
        timestamp: Date.now(),
        redis: {
          totalCommands: stats.total_commands_processed || 0,
          totalConnections: stats.total_connections_received || 0,
          keySpaceHits: stats.keyspace_hits || 0,
          keySpaceMisses: stats.keyspace_misses || 0,
          evictedKeys: stats.evicted_keys || 0,
          expiredKeys: stats.expired_keys || 0
        },
        memory: {
          used: memory.used_memory || 0,
          usedHuman: memory.used_memory_human || '0B',
          peak: memory.used_memory_peak || 0,
          peakHuman: memory.used_memory_peak_human || '0B',
          rss: memory.used_memory_rss || 0,
          rssHuman: memory.used_memory_rss_human || '0B'
        },
        nasa: {
          totalKeys: nasaCacheCount,
          activeKeys: activeNasaKeys,
          expiredKeys: expiredNasaKeys,
          totalDBKeys: parseInt(keyCount) || 0
        }
      };
    } catch (error) {
      console.error('Error getting Redis stats:', error.message);
      return null;
    }
  }

  async testAPIPerformance() {
    const testEndpoints = [
      { name: 'APOD Enhanced', path: '/api/apod/enhanced/2024-01-01' },
      { name: 'Health Check', path: '/health' }
    ];

    const results = [];

    for (const endpoint of testEndpoints) {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${SERVER_URL}${endpoint.path}`, {
          headers: { 'Accept': 'application/json' }
        });
        const endTime = Date.now();

        results.push({
          name: endpoint.name,
          responseTime: endTime - startTime,
          status: response.status,
          cacheStatus: response.headers['x-cache'],
          cacheTTL: response.headers['x-cache-ttl']
        });
      } catch (error) {
        results.push({
          name: endpoint.name,
          responseTime: null,
          status: 'ERROR',
          error: error.message
        });
      }
    }

    return results;
  }

  calculateTrends() {
    if (this.samples.length < 2) {
      return { memory: {}, hits: {}, keys: {} };
    }

    const current = this.samples[this.samples.length - 1];
    const previous = this.samples[Math.max(0, this.samples.length - 10)]; // Compare with 10 samples ago

    return {
      memory: {
        change: current.memory.used - previous.memory.used,
        changePercent: ((current.memory.used - previous.memory.used) / previous.memory.used * 100).toFixed(2)
      },
      hits: {
        hitRate: current.redis.keySpaceHits / (current.redis.keySpaceHits + current.redis.keySpaceMisses) * 100,
        totalHits: current.redis.keySpaceHits - previous.redis.keySpaceHits,
        totalMisses: current.redis.keySpaceMisses - previous.redis.keySpaceMisses
      },
      keys: {
        change: current.nasa.totalKeys - previous.nasa.totalKeys,
        activeRate: current.nasa.totalKeys > 0 ? (current.nasa.activeKeys / current.nasa.totalKeys * 100).toFixed(1) : 0
      }
    };
  }

  formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  async displayStats() {
    const stats = await this.getRedisStats();
    if (!stats) return;

    const apiResults = await this.testAPIPerformance();
    const trends = this.calculateTrends();

    // Clear screen
    console.clear();

    // Header
    console.log('🔍 NASA System 7 Portal - Real-time Cache Monitor');
    console.log('='.repeat(70));
    console.log(`⏰ Last update: ${new Date(stats.timestamp).toLocaleTimeString()}`);
    console.log(`📊 Monitoring for: ${Math.floor((stats.timestamp - this.startTime) / 1000)}s`);

    // Redis Performance
    console.log('\n📈 Redis Performance:');
    console.log(`   Commands processed: ${stats.redis.totalCommands.toLocaleString()}`);
    console.log(`   Cache hits: ${stats.redis.keySpaceHits.toLocaleString()} | Cache misses: ${stats.redis.keySpaceMisses.toLocaleString()}`);

    if (trends.hits.hitRate) {
      const hitRateIcon = trends.hits.hitRate > 80 ? '🟢' : trends.hits.hitRate > 50 ? '🟡' : '🔴';
      console.log(`   Hit rate: ${hitRateIcon} ${trends.hits.hitRate.toFixed(1)}% (${trends.hits.totalHits} hits, ${trends.hits.totalMisses} misses)`);
    }

    console.log(`   Evicted keys: ${stats.redis.evictedKeys} | Expired keys: ${stats.redis.expiredKeys}`);

    // Memory Usage
    console.log('\n💾 Memory Usage:');
    console.log(`   Current: ${this.formatBytes(stats.memory.used)} | Peak: ${this.formatBytes(stats.memory.peak)} | RSS: ${this.formatBytes(stats.memory.rss)}`);

    if (trends.memory.change !== 0) {
      const trendIcon = trends.memory.change > 0 ? '📈' : '📉';
      console.log(`   Change: ${trendIcon} ${trends.memory.changePercent}% (${this.formatBytes(trends.memory.change)})`);
    }

    // NASA Cache Specific
    console.log('\n🚀 NASA Cache Status:');
    console.log(`   Total NASA keys: ${stats.nasa.totalKeys} | Active: ${stats.nasa.activeKeys} | Expired: ${stats.nasa.expiredKeys}`);
    console.log(`   Active rate: ${trends.keys.activeRate}% | Total DB keys: ${stats.nasa.totalDBKeys}`);

    if (trends.keys.change !== 0) {
      console.log(`   Key change: ${trends.keys.change > 0 ? '+' : ''}${trends.keys.change}`);
    }

    // API Performance
    console.log('\n⚡ API Performance Test:');
    apiResults.forEach(result => {
      if (result.status === 'ERROR') {
        console.log(`   ${result.name}: ❌ ${result.error}`);
      } else {
        const cacheIcon = result.cacheStatus === 'HIT' ? '✅' : result.cacheStatus === 'MISS' ? '⭕' : '❓';
        const ttlInfo = result.cacheTTL ? ` (${result.cacheTTL}s)` : '';
        console.log(`   ${result.name}: ${result.responseTime}ms ${cacheIcon} ${result.cacheStatus}${ttlInfo}`);
      }
    });

    // Recent Activity
    console.log('\n📋 Recent Activity (last 10 samples):');
    const recentSamples = this.samples.slice(-10);
    if (recentSamples.length > 0) {
      const avgMemory = recentSamples.reduce((sum, s) => sum + s.memory.used, 0) / recentSamples.length;
      const avgHitRate = recentSamples.reduce((sum, s) => {
        const rate = s.redis.keySpaceHits / (s.redis.keySpaceHits + s.redis.keySpaceMisses);
        return sum + (isNaN(rate) ? 0 : rate);
      }, 0) / recentSamples.length * 100;

      console.log(`   Avg memory: ${this.formatBytes(Math.round(avgMemory))}`);
      console.log(`   Avg hit rate: ${avgHitRate.toFixed(1)}%`);
      console.log(`   Samples: ${recentSamples.length}/${this.samples.length} (max: ${MAX_SAMPLES})`);
    }

    // Controls
    console.log('\n🎮 Controls:');
    console.log('   Press Ctrl+C to stop monitoring');
    console.log('   Run "node cacheManager.js" for detailed cache management');

    console.log('='.repeat(70));
  }

  async start() {
    console.log('🚀 Starting Cache Performance Monitor...');
    console.log('   Monitoring interval:', MONITOR_INTERVAL + 'ms');
    console.log('   Max samples to keep:', MAX_SAMPLES);

    this.isRunning = true;

    // Initial sample
    const initialStats = await this.getRedisStats();
    if (initialStats) {
      this.samples.push(initialStats);
    }

    // Start monitoring loop
    const monitorLoop = async () => {
      if (!this.isRunning) return;

      const stats = await this.getRedisStats();
      if (stats) {
        this.samples.push(stats);

        // Keep only the last MAX_SAMPLES
        if (this.samples.length > MAX_SAMPLES) {
          this.samples.shift();
        }

        await this.displayStats();
      }

      setTimeout(monitorLoop, MONITOR_INTERVAL);
    };

    monitorLoop();
  }

  stop() {
    this.isRunning = false;
    console.log('\n🛑 Cache monitoring stopped.');
    console.log(`📊 Total monitoring time: ${Math.floor((Date.now() - this.startTime) / 1000)}s`);
    console.log(`📈 Samples collected: ${this.samples.length}`);
  }
}

// Handle graceful shutdown
const monitor = new CacheMonitor();

process.on('SIGINT', () => {
  monitor.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  monitor.stop();
  process.exit(0);
});

// Start monitoring
monitor.start().catch(error => {
  console.error('❌ Failed to start cache monitor:', error);
  process.exit(1);
});