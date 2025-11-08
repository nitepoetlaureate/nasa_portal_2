# Environment Variables Reference

This document provides comprehensive information about all environment variables used in the NASA System 7 Portal application.

## Overview

The application uses environment variables to configure both frontend and backend services. Variables are separated into client-side and server-side configurations for security and maintainability.

## Frontend Environment Variables

### File Location
```
client/.env.example    # Template file
client/.env            # Actual configuration (DO NOT commit)
```

### Application Settings

#### Basic Configuration
```env
# React Application Settings
REACT_APP_NODE_ENV=development
PORT=3000
```

**Description:**
- `REACT_APP_NODE_ENV`: Sets the React environment mode
- `PORT`: Development server port (overrides Vite default)

**Default Values:**
- `REACT_APP_NODE_ENV`: development
- `PORT`: 3000

#### API Configuration
```env
# API Endpoints
REACT_APP_API_BASE_URL=http://localhost:3001/api
REACT_APP_NASA_API_URL=https://api.nasa.gov
REACT_APP_JPL_BASE_URL=https://ssd.jpl.nasa.gov/api/v1
```

**Description:**
- `REACT_APP_API_BASE_URL`: Local backend API base URL
- `REACT_APP_NASA_API_URL`: NASA Open APIs base URL
- `REACT_APP_JPL_BASE_URL`: JPL Solar System Dynamics API base URL

**Notes:**
- All API calls are proxied through the local backend
- Direct NASA API calls are never made from the client for security

#### NASA API Configuration
```env
# NASA API Configuration
REACT_APP_NASA_API_KEY=DEMO_KEY
REACT_APP_ENABLE_CACHING=true
REACT_APP_CACHE_DURATION=3600000
```

**Description:**
- `REACT_APP_NASA_API_KEY`: Demo NASA API key (production key is server-side only)
- `REACT_APP_ENABLE_CACHING`: Enable/disable client-side caching
- `REACT_APP_CACHE_DURATION`: Cache duration in milliseconds

**Default Values:**
- `REACT_APP_NASA_API_KEY`: DEMO_KEY
- `REACT_APP_ENABLE_CACHING`: true
- `REACT_APP_CACHE_DURATION`: 3600000 (1 hour)

#### Application Features
```env
# Application Features
REACT_APP_ENABLE_PERFORMANCE_MONITORING=true
REACT_APP_ENABLE_BUNDLE_ANALYZER=false
REACT_APP_ENABLE_ERROR_BOUNDARIES=true
REACT_APP_ENABLE_ANALYTICS=false
```

**Description:**
- `REACT_APP_ENABLE_PERFORMANCE_MONITORING`: Enable performance monitoring
- `REACT_APP_ENABLE_BUNDLE_ANALYZER`: Enable bundle size analysis
- `REACT_APP_ENABLE_ERROR_BOUNDARIES`: Enable React error boundaries
- `REACT_APP_ENABLE_ANALYTICS`: Enable analytics tracking

**Default Values:**
- `REACT_APP_ENABLE_PERFORMANCE_MONITORING`: true
- `REACT_APP_ENABLE_BUNDLE_ANALYZER`: false
- `REACT_APP_ENABLE_ERROR_BOUNDARIES`: true
- `REACT_APP_ENABLE_ANALYTICS`: false

#### UI/UX Settings
```env
# UI/UX Settings
REACT_APP_THEME=system7
REACT_APP_ENABLE_ANIMATIONS=true
REACT_APP_ENABLE_SOUNDS=true
REACT_APP_DEFAULT_LANGUAGE=en
```

**Description:**
- `REACT_APP_THEME`: UI theme (system7, modern, etc.)
- `REACT_APP_ENABLE_ANIMATIONS`: Enable Framer Motion animations
- `REACT_APP_ENABLE_SOUNDS`: Enable system sounds
- `REACT_APP_DEFAULT_LANGUAGE`: Default application language

**Available Options:**
- `REACT_APP_THEME`: system7, modern, dark, light
- `REACT_APP_DEFAULT_LANGUAGE`: en, es, fr, de, ja, zh

#### Development Settings
```env
# Development Settings
REACT_APP_ENABLE_MOCK_DATA=false
REACT_APP_ENABLE_DEBUG_MODE=true
REACT_APP_LOG_LEVEL=info
```

**Description:**
- `REACT_APP_ENABLE_MOCK_DATA`: Enable mock data for offline development
- `REACT_APP_ENABLE_DEBUG_MODE`: Enable debug console logs
- `REACT_APP_LOG_LEVEL`: Logging verbosity level

**Available Options:**
- `REACT_APP_LOG_LEVEL`: error, warn, info, debug, trace

#### Build Settings
```env
# Build Settings
GENERATE_SOURCEMAP=true
INLINE_RUNTIME_CHUNK=false
IMAGE_INLINE_SIZE_LIMIT=10000
```

**Description:**
- `GENERATE_SOURCEMAP`: Generate source maps for debugging
- `INLINE_RUNTIME_CHUNK`: Inline runtime chunk in HTML
- `IMAGE_INLINE_SIZE_LIMIT`: Maximum image size for inlining (bytes)

**Default Values:**
- `GENERATE_SOURCEMAP`: true in development, false in production
- `INLINE_RUNTIME_CHUNK`: false
- `IMAGE_INLINE_SIZE_LIMIT`: 10000

#### Service Worker Settings
```env
# Service Worker
REACT_APP_ENABLE_SERVICE_WORKER=false
REACT_APP_OFFLINE_MODE=false
```

**Description:**
- `REACT_APP_ENABLE_SERVICE_WORKER`: Enable service worker for PWA functionality
- `REACT_APP_OFFLINE_MODE`: Enable offline capabilities

#### External Services
```env
# External Services
REACT_APP_GOOGLE_ANALYTICS_ID=
REACT_APP_SENTRY_DSN=
REACT_APP_SENTRY_ORG=
```

**Description:**
- `REACT_APP_GOOGLE_ANALYTICS_ID`: Google Analytics tracking ID
- `REACT_APP_SENTRY_DSN`: Sentry error reporting DSN
- `REACT_APP_SENTRY_ORG`: Sentry organization slug

## Backend Environment Variables

### File Location
```
server/.env.example    # Template file
server/.env            # Actual configuration (DO NOT commit)
```

### Server Configuration
```env
# Server Configuration
PORT=3001
NODE_ENV=development
```

**Description:**
- `PORT`: Backend server port
- `NODE_ENV`: Node.js environment mode

**Default Values:**
- `PORT`: 3001
- `NODE_ENV`: development

### Database Configuration
```env
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=nasa_system7
DB_PASSWORD=your_database_password
DB_PORT=5432
DATABASE_URL=
DISABLE_DATABASE_CONNECTIONS=false
```

**Description:**
- `DB_USER`: PostgreSQL username
- `DB_HOST`: Database host
- `DB_DATABASE`: Database name
- `DB_PASSWORD`: Database password
- `DB_PORT`: PostgreSQL port
- `DATABASE_URL`: Full database connection string (overrides individual settings)
- `DISABLE_DATABASE_CONNECTIONS`: Disable database connections for testing

**Default Values:**
- `DB_USER`: postgres
- `DB_HOST`: localhost
- `DB_DATABASE`: nasa_system7
- `DB_PASSWORD`: nasa_secure_password_2024
- `DB_PORT`: 5432
- `DISABLE_DATABASE_CONNECTIONS`: false

### NASA API Configuration
```env
# NASA API Configuration
NASA_API_KEY=your_nasa_api_key_here
NASA_API_URL=https://api.nasa.gov
JPL_API_URL=https://ssd-api.jpl.nasa.gov
```

**Description:**
- `NASA_API_KEY`: Your NASA Open API key (required for production)
- `NASA_API_URL`: NASA Open APIs base URL
- `JPL_API_URL`: JPL Solar System Dynamics API base URL

**How to Get NASA API Key:**
1. Visit [https://api.nasa.gov](https://api.nasa.gov)
2. Sign up with your email
3. Receive API key via email
4. Add key to `.env` file

### Redis Configuration
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Description:**
- `REDIS_HOST`: Redis server host
- `REDIS_PORT`: Redis server port
- `REDIS_PASSWORD`: Redis password (if required)
- `REDIS_DB`: Redis database number

**Default Values:**
- `REDIS_HOST`: localhost
- `REDIS_PORT`: 6379
- `REDIS_PASSWORD`: (empty)
- `REDIS_DB`: 0

### Security Configuration
```env
# Security Configuration
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_SECRET=your_session_secret_here
```

**Description:**
- `CORS_ORIGIN`: Allowed CORS origin for frontend
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window
- `SESSION_SECRET`: Secret for session management

**Default Values:**
- `CORS_ORIGIN`: http://localhost:3000
- `RATE_LIMIT_WINDOW_MS`: 900000 (15 minutes)
- `RATE_LIMIT_MAX_REQUESTS`: 100

### Performance Configuration
```env
# Performance Configuration
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_REQUEST_LOGGING=true
COMPRESSION_ENABLED=true
MAX_REQUEST_SIZE=10485760
```

**Description:**
- `ENABLE_PERFORMANCE_MONITORING`: Enable performance metrics collection
- `ENABLE_REQUEST_LOGGING`: Enable HTTP request logging
- `COMPRESSION_ENABLED`: Enable response compression
- `MAX_REQUEST_SIZE`: Maximum request body size in bytes

**Default Values:**
- `ENABLE_PERFORMANCE_MONITORING`: true
- `ENABLE_REQUEST_LOGGING`: true
- `COMPRESSION_ENABLED`: true
- `MAX_REQUEST_SIZE`: 10485760 (10MB)

### Fallback Mode Configuration
```env
# Fallback Mode Configuration
ENABLE_FALLBACK_MODE=false
DISABLE_DATABASE_CONNECTIONS=false
DISABLE_CACHE_CONNECTIONS=false
```

**Description:**
- `ENABLE_FALLBACK_MODE`: Enable fallback mode for offline development
- `DISABLE_DATABASE_CONNECTIONS`: Disable database connections
- `DISABLE_CACHE_CONNECTIONS`: Disable Redis connections

**Use Cases:**
- Development without database setup
- CI/CD environments with limited dependencies
- Testing scenarios requiring isolation

### Cache Configuration
```env
# Cache Configuration
CACHE_TTL_APOD=3600
CACHE_TTL_NEO=1800
CACHE_TTL_MARS=86400
CACHE_TTL_RESOURCES=21600
```

**Description:**
- `CACHE_TTL_APOD`: APOD cache time-to-live in seconds
- `CACHE_TTL_NEO`: Near-Earth Object cache TTL in seconds
- `CACHE_TTL_MARS`: Mars Rover Photos cache TTL in seconds
- `CACHE_TTL_RESOURCES`: Resources cache TTL in seconds

**Default Values:**
- `CACHE_TTL_APOD`: 3600 (1 hour)
- `CACHE_TTL_NEO`: 1800 (30 minutes)
- `CACHE_TTL_MARS`: 86400 (24 hours)
- `CACHE_TTL_RESOURCES`: 21600 (6 hours)

## Production Environment Variables

### Required Production Variables

#### Backend
```env
NODE_ENV=production
NASA_API_KEY=your_production_nasa_api_key
DB_PASSWORD=your_production_db_password
SESSION_SECRET=your_production_session_secret
CORS_ORIGIN=https://your-domain.com
```

#### Frontend
```env
REACT_APP_NODE_ENV=production
REACT_APP_API_BASE_URL=https://your-api-domain.com/api
REACT_APP_ENABLE_PERFORMANCE_MONITORING=false
REACT_APP_ENABLE_DEBUG_MODE=false
```

### Optional Production Variables

#### Monitoring and Analytics
```env
REACT_APP_GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
REACT_APP_SENTRY_DSN=your_sentry_dsn
REACT_APP_ENABLE_ANALYTICS=true
```

#### CDN and Asset Optimization
```env
REACT_APP_CDN_URL=https://your-cdn.com
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=true
```

## Security Best Practices

### Environment Variable Security

#### 1. Never Commit Environment Files
```bash
# Add to .gitignore
.env
.env.local
.env.production
.env.staging
.env.test
```

#### 2. Use Template Files
- Provide `.env.example` files with documentation
- Include all required variables with example values
- Document sensitive variables clearly

#### 3. Separate Environments
- Use different files for different environments
- Use environment-specific variable naming
- Implement environment validation

#### 4. Key Rotation
- Regularly rotate API keys and secrets
- Use key management services in production
- Implement backup strategies for critical keys

### API Key Management

#### NASA API Key
- Store only server-side in production
- Use HTTPS for all API communications
- Implement rate limiting to prevent abuse
- Monitor API usage for anomalies

#### Database Credentials
- Use strong, unique passwords
- Implement connection pooling
- Use SSL/TLS for database connections
- Regularly rotate database passwords

### CORS Configuration
```env
# Development
CORS_ORIGIN=http://localhost:3000

# Staging
CORS_ORIGIN=https://staging.your-domain.com

# Production
CORS_ORIGIN=https://your-domain.com
```

## Configuration Validation

### Startup Validation
The application validates required environment variables on startup:

```javascript
// Required variables that will cause startup to fail
const REQUIRED_VARS = [
  'NASA_API_KEY',
  'DB_PASSWORD',
  'SESSION_SECRET'
];
```

### Development Mode Validation
```javascript
// Development-specific validations
if (NODE_ENV === 'development') {
  // Warn about missing optional variables
  if (!REDIS_HOST) {
    console.warn('Redis not configured - caching disabled');
  }
}
```

## Environment-Specific Files

### Development Environment
```bash
# client/.env.development
REACT_APP_ENABLE_DEBUG_MODE=true
REACT_APP_ENABLE_PERFORMANCE_MONITORING=true
REACT_APP_LOG_LEVEL=debug

# server/.env.development
NODE_ENV=development
ENABLE_REQUEST_LOGGING=true
DISABLE_DATABASE_CONNECTIONS=false
```

### Staging Environment
```bash
# client/.env.staging
REACT_APP_ENABLE_DEBUG_MODE=false
REACT_APP_ENABLE_PERFORMANCE_MONITORING=true
REACT_APP_LOG_LEVEL=warn

# server/.env.staging
NODE_ENV=production
ENABLE_REQUEST_LOGGING=true
RATE_LIMIT_MAX_REQUESTS=50
```

### Production Environment
```bash
# client/.env.production
REACT_APP_ENABLE_DEBUG_MODE=false
REACT_APP_ENABLE_PERFORMANCE_MONITORING=false
REACT_APP_LOG_LEVEL=error
GENERATE_SOURCEMAP=false

# server/.env.production
NODE_ENV=production
ENABLE_REQUEST_LOGGING=false
RATE_LIMIT_MAX_REQUESTS=1000
```

## Docker Environment Variables

### Docker Compose Configuration
```yaml
version: '3.8'
services:
  client:
    build: ./client
    environment:
      - REACT_APP_API_BASE_URL=http://server:3001/api
      - REACT_APP_ENABLE_DEBUG_MODE=false

  server:
    build: ./server
    environment:
      - NODE_ENV=production
      - DB_HOST=database
      - REDIS_HOST=redis
      - NASA_API_KEY=${NASA_API_KEY}

  database:
    image: postgres:13
    environment:
      - POSTGRES_DB=nasa_system7
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
```

## CI/CD Environment Variables

### GitHub Actions Example
```yaml
env:
  NODE_ENV: test
  NASA_API_KEY: ${{ secrets.NASA_API_KEY }}
  DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  SESSION_SECRET: ${{ secrets.SESSION_SECRET }}
```

### Jenkins Pipeline Example
```groovy
environment {
  NODE_ENV = 'test'
  NASA_API_KEY = credentials('nasa-api-key')
  DB_PASSWORD = credentials('db-password')
  SESSION_SECRET = credentials('session-secret')
}
```

## Troubleshooting

### Common Issues

#### 1. Missing API Key
```
Error: NASA_API_KEY is required
```
**Solution**: Add NASA_API_KEY to server/.env

#### 2. Database Connection Failed
```
Error: Database connection failed
```
**Solution**: Check DB_HOST, DB_PASSWORD, and database server status

#### 3. CORS Issues
```
Error: CORS policy violation
```
**Solution**: Update CORS_ORIGIN environment variable

#### 4. Cache Not Working
```
Warning: Redis connection failed
```
**Solution**: Check REDIS_HOST and REDIS_PORT settings

### Debug Environment Variables

#### Check Variable Loading
```javascript
// In server.js startup
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DB_HOST: process.env.DB_HOST
});
```

#### Validate Required Variables
```javascript
const validateEnvVars = () => {
  const required = ['NASA_API_KEY', 'DB_PASSWORD'];
  const missing = required.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
```

## Migration Guide

### Upgrading from v1.1 to v1.2

#### New Variables
```env
# Performance monitoring
ENABLE_PERFORMANCE_MONITORING=true

# Cache TTL settings
CACHE_TTL_APOD=3600
CACHE_TTL_NEO=1800
CACHE_TTL_RESOURCES=21600
```

#### Deprecated Variables
- `REACT_APP_USE_LEGACY_API` (removed)
- `LEGACY_DB_CONFIG` (removed)

## Reference Documentation

### External Links
- [NASA Open APIs](https://api.nasa.gov)
- [PostgreSQL Environment Variables](https://www.postgresql.org/docs/current/libpq-envars.html)
- [Redis Configuration](https://redis.io/topics/config)
- [Node.js Environment Variables](https://nodejs.org/api/process.html#process_process_env)

### Additional Resources
- [12-Factor App Configuration](https://12factor.net/config)
- [Environment Variables Security](https://owasp.org/www-community/Using_Environment_Variables_Safely)

---

**Last Updated**: January 15, 2024
**Version**: 1.2.0
**Compatibility**: NASA System 7 Portal v1.2+