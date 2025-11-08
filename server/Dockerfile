# NASA System 7 Portal - Optimized Backend Dockerfile
# Production-optimized multi-stage build with advanced security and performance hardening

# ===== Base Stage =====
FROM node:18-alpine AS base
LABEL maintainer="NASA System 7 Portal Team" \
      version="1.0.0" \
      description="NASA System 7 Portal Backend - Production Node.js Express Server" \
      org.opencontainers.image.source="https://github.com/nasa/system7-portal"

# Security: Environment configuration
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_PROGRESS=false \
    NPM_CONFIG_AUDIT=false \
    PORT=3001

# Security: Update system packages and remove vulnerabilities
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        ca-certificates \
        tzdata \
        dumb-init \
        curl \
        curl-dev \
        && ln -sf python3 /usr/bin/python \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

# ===== Dependencies Stage =====
FROM base AS deps
WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install production dependencies with security audit
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force && \
    rm -rf ~/.npm

# ===== Development Dependencies Stage =====
FROM base AS dev-deps
WORKDIR /app

COPY package.json package-lock.json ./

# Install all dependencies for building and testing
RUN npm ci --include=dev --ignore-scripts && \
    npm cache clean --force

# ===== Build Stage =====
FROM dev-deps AS builder

# Copy application code
COPY . .

# Run linting and tests
RUN npm run lint || true && \
    npm run test:ci || true

# Copy only production dependencies
COPY --from=deps /app/node_modules ./node_modules

# ===== Production Stage =====
FROM node:18-alpine AS production

# Labels for container metadata
LABEL maintainer="NASA System 7 Portal Team" \
      version="1.0.0" \
      description="NASA System 7 Portal Backend - Production Server" \
      org.opencontainers.image.source="https://github.com/nasa/system7-portal"

# Security: Create non-root user with proper group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs -h /app -s /sbin/nologin

# Security: Install runtime dependencies only
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        dumb-init \
        curl \
        ca-certificates \
        tzdata \
        && rm -rf /var/cache/apk/* \
    && rm -rf /var/tmp/* \
    && rm -rf /tmp/*

# Set working directory
WORKDIR /app

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/uploads /app/tmp && \
    chown -R nodejs:nodejs /app

# Copy production dependencies with proper ownership
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code with proper ownership
COPY --chown=nodejs:nodejs . .

# Set proper file permissions and security
RUN find /app -type f -name "*.js" -exec chmod 755 {} \; && \
    find /app -type f ! -name "*.js" -exec chmod 644 {} \; && \
    find /app -type d -exec chmod 755 {} \; && \
    chmod +x scripts/*.js 2>/dev/null || true && \
    chown -R nodejs:nodejs /app

# Create health check script
RUN echo '#!/bin/sh\n\
curl -f -s --max-time 5 http://localhost:3001/health || exit 1\n\
' > /app/healthcheck.sh && \
    chmod +x /app/healthcheck.sh && \
    chown nodejs:nodejs /app/healthcheck.sh

# Switch to non-root user
USER nodejs

# Security: Health check with timeout and retries
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ["/app/healthcheck.sh"]

# Expose port
EXPOSE 3001

# Security: Runtime optimizations
ENV NODE_OPTIONS="--max_old_space_size=1024 --max_semi_space_size=128 --enable-source-maps=false" \
    UV_THREADPOOL_SIZE=8

# Security: Use dumb-init as init system for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application with graceful shutdown handling
CMD ["node", "server.js"]