# NASA System 7 Portal - Phase 3 Setup Guide

## Overview

Phase 3 implements a comprehensive WebSocket infrastructure, JWT authentication system with OAuth integration, Redis pub/sub for multi-instance scaling, and real-time NASA API data streaming.

## 🚀 New Features

### 1. WebSocket Server Infrastructure
- **Socket.IO integration** with real-time NASA data streaming
- **Connection management** with automatic reconnection and exponential backoff
- **Subscription-based data streams** for APOD, NEO, DONKI, ISS tracking, and EPIC
- **Target latency**: <100ms with 99.9% connection stability

### 2. JWT Authentication System
- **Secure JWT tokens** with access and refresh token strategy
- **Multi-factor authentication (MFA)** support with TOTP
- **OAuth integration** for Google, GitHub, and NASA SSO
- **Session management** with Redis storage
- **Rate limiting** and security protections

### 3. Redis Pub/Sub System
- **Multi-instance scaling** with message broadcasting
- **Cache invalidation** across all instances
- **Real-time data synchronization**
- **Load balancing** support

### 4. NASA API Real-time Streaming
- **APOD (Astronomy Picture of the Day)**: Updates every 24 hours
- **NeoWs (Near-Earth Object Web Service)**: Updates every hour
- **DONKI (Space Weather Alerts)**: Updates every 5 minutes
- **ISS Tracking**: Updates every 30 seconds
- **EPIC (Earth Polychromatic Imaging Camera)**: Updates every hour

## 📋 Prerequisites

- Node.js 14.0.0 or higher
- PostgreSQL 12 or higher
- Redis 6 or higher
- NASA API key (https://api.nasa.gov)
- OAuth credentials (optional, for Google/GitHub login)

## 🛠️ Installation

### 1. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install all dependencies from root
npm run install-all
```

### 2. Environment Configuration

Copy the environment template and configure:

```bash
cp .env.example .env
```

**Required Configuration:**

```env
# Basic Configuration
NODE_ENV=development
PORT=3001
BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/nasa_system7_portal

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT (Generate secure secrets)
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_REFRESH_SECRET=your_super_secret_refresh_key_at_least_32_characters_long

# NASA API
NASA_API_KEY=your_nasa_api_key_from_api.nasa.gov

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
```

### 3. Database Setup

```bash
# Initialize database
cd server
npm run db:init

# Run migrations
npm run db:migrate

# Seed with sample data (optional)
npm run db:seed
```

### 4. Redis Setup

Make sure Redis is running:

```bash
# Start Redis (if using Docker)
docker run -d -p 6379:6379 redis:alpine

# Or start locally
redis-server
```

## 🚀 Starting the Server

### Development Mode

```bash
# Start with auto-restart
cd server
npm run dev

# Start from root (both client and server)
npm run dev
```

### Production Mode

```bash
# Build and start
cd server
npm start

# Or with Docker
docker-compose up -d
```

## 📡 WebSocket API

### Connection

```javascript
import io from 'socket.io-client';

// Connect with JWT token
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your_jwt_token_here'
  }
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});
```

### Subscribe to NASA Data

```javascript
// APOD Subscription
socket.emit('subscribe:nasa:apod', { date: '2023-01-01' });
socket.on('nasa:apod:update', (data) => {
  console.log('APOD data:', data);
});

// NEO Subscription
socket.emit('subscribe:nasa:neo', { feedDate: '2023-01-01' });
socket.on('nasa:neo:update', (data) => {
  console.log('NEO data:', data);
});

// ISS Tracking
socket.emit('subscribe:nasa:iss');
socket.on('nasa:iss:update', (data) => {
  console.log('ISS position:', data);
});
```

### Real-time Queries

```javascript
// Get latest data
socket.emit('query:nasa:latest', { type: 'apod' });
socket.on('query:result', (result) => {
  console.log('Latest data:', result);
});

// Search NASA data
socket.emit('query:nasa:search', { type: 'neo', query: 'asteroid' });
socket.on('search:result', (results) => {
  console.log('Search results:', results);
});
```

## 🔐 Authentication API

### User Registration

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe"
  }'
```

### User Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### Token Refresh

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token_here"
  }'
```

### MFA Setup

```bash
# Generate MFA secret
curl -X POST http://localhost:3001/auth/mfa/setup \
  -H "Authorization: Bearer your_access_token" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id_here"
  }'

# Verify MFA token
curl -X POST http://localhost:3001/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id_here",
    "token": "123456"
  }'
```

## 🧪 Testing

### WebSocket Tests

```bash
# Run WebSocket connection tests
npm run websocket:test

# Run WebSocket load tests
npm run websocket:load -- 100
```

### Authentication Tests

```bash
# Run authentication tests
npm run auth:test

# Run auth load tests
npm run auth:test -- --load 50
```

### NASA Streaming Tests

```bash
# Test NASA API streaming
npm run nasa:stream:test
```

## 📊 Monitoring

### Health Checks

```bash
# Server health
curl http://localhost:3001/health

# Auth service health
curl http://localhost:3001/auth/health

# Stream status
curl http://localhost:3001/api/streams/status
```

### Metrics

```bash
# Comprehensive metrics
curl http://localhost:3001/metrics
```

### Performance Monitoring

```bash
# Start performance monitoring
npm run monitor

# Cache statistics
npm run cache:stats

# Cache monitoring
npm run cache:monitor
```

## 🔧 Configuration Options

### WebSocket Configuration

```env
WEBSOCKET_CORS_ORIGIN=http://localhost:3000
WEBSOCKET_PING_TIMEOUT=60000
WEBSOCKET_PING_INTERVAL=25000
```

### Streaming Intervals

```env
NASA_STREAM_APOD_INTERVAL=86400000    # 24 hours
NASA_STREAM_NEO_INTERVAL=3600000      # 1 hour
NASA_STREAM_DONKI_INTERVAL=300000     # 5 minutes
NASA_STREAM_ISS_INTERVAL=30000        # 30 seconds
NASA_STREAM_EPIC_INTERVAL=3600000     # 1 hour
```

### Authentication Settings

```env
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
REQUIRE_MFA=false
SESSION_TIMEOUT=86400000
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# Start with monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

### Environment-Specific Setup

#### Development
```env
NODE_ENV=development
ENABLE_FALLBACK_MODE=false
ENABLE_DEBUG_ENDPOINTS=true
```

#### Production
```env
NODE_ENV=production
ENABLE_FALLBACK_MODE=false
SSL_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
REQUIRE_MFA=true
```

## 🔒 Security Considerations

1. **JWT Secrets**: Use strong, unique secrets (32+ characters)
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Configure appropriate rate limits
4. **CORS**: Restrict to allowed origins only
5. **MFA**: Enable MFA for enhanced security
6. **Environment Variables**: Never commit secrets to version control

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check JWT token validity
   - Verify CORS configuration
   - Ensure server is running

2. **Authentication Errors**
   - Verify JWT secrets match
   - Check token expiration
   - Validate OAuth configuration

3. **Redis Connection Issues**
   - Ensure Redis is running
   - Check connection parameters
   - Verify firewall settings

4. **NASA API Errors**
   - Valid API key required
   - Check rate limits
   - Verify network connectivity

### Debug Mode

```bash
# Enable debug logging
DEBUG=socket.io:* npm run dev

# Check all services
curl http://localhost:3001/health
```

## 📈 Performance Targets

- **WebSocket Latency**: <100ms
- **Connection Stability**: 99.9%
- **NASA API Updates**: Every 60 seconds
- **Authentication Response**: <500ms
- **Cache Hit Rate**: >95%

## 🤝 Contributing

1. Follow the coding standards in `CLAUDE.md`
2. Run tests before committing
3. Update documentation for new features
4. Use semantic versioning for releases

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review test results
3. Check health endpoints
4. Review logs for error details

---

**NASA System 7 Portal - Phase 3 Implementation Complete** 🚀

Real-time WebSocket infrastructure with secure JWT authentication and NASA API streaming.