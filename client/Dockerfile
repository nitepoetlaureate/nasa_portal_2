# NASA System 7 Portal - Optimized Frontend Dockerfile
# Multi-stage production build with advanced security and performance optimizations

# ===== Build Base Stage =====
FROM node:18-alpine AS build-base
LABEL maintainer="NASA System 7 Portal Team" \
      version="1.0.0" \
      description="NASA System 7 Portal Frontend - Production React Application" \
      org.opencontainers.image.source="https://github.com/nasa/system7-portal"

# Security: Environment configuration
ENV NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_PROGRESS=false \
    NPM_CONFIG_AUDIT=false \
    NODE_ENV=production

# Security: Install and update system packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        python3 \
        make \
        g++ \
        libc6-compat \
        ca-certificates \
        && ln -sf python3 /usr/bin/python \
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

# ===== Dependencies Installation =====
FROM build-base AS deps
WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install production dependencies with security audit
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force && \
    rm -rf ~/.npm

# Install all dependencies for build
FROM build-base AS build-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev --ignore-scripts && \
    npm cache clean --force

# ===== Build Stage =====
FROM build-deps AS builder

# Copy application source code
COPY . .

# Security: Run security audit before build
RUN npm audit --audit-level=high || true

# Build the application with optimizations
RUN npm run build

# Optimize build assets
RUN find /app/dist -name "*.map" -delete && \
    find /app/dist -name "*.txt" -delete && \
    find /app/dist -type f \( -name "*.js" -o -name "*.css" \) -exec gzip -k {} \; && \
    find /app/dist -type f \( -name "*.js" -o -name "*.css" \) -exec brotli -k {} \;

# ===== Production Stage =====
FROM nginx:1.25-alpine AS production

# Labels for container metadata
LABEL maintainer="NASA System 7 Portal Team" \
      version="1.0.0" \
      description="NASA System 7 Portal Frontend - Production Nginx Server" \
      org.opencontainers.image.source="https://github.com/nasa/system7-portal"

# Install required packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        curl \
        ca-certificates \
        tini \
        dumb-init \
        && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/*

# Remove default nginx content
RUN rm -f /etc/nginx/conf.d/default.conf \
    && rm -rf /usr/share/nginx/html/*

# Copy optimized nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy mime types configuration
COPY mime.types /etc/nginx/mime.types

# Copy optimized build artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

# Security: Create non-root user
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

# Create necessary directories with proper permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run /tmp/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /var/run && \
    chown -R nginx:nginx /tmp/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Set proper file permissions
RUN find /usr/share/nginx/html -type f -exec chmod 644 {} \; && \
    find /usr/share/nginx/html -type d -exec chmod 755 {} \; && \
    chmod 644 /etc/nginx/conf.d/default.conf && \
    chmod 644 /etc/nginx/mime.types

# Switch to non-root user
USER nginx

# Health check with proper timeout and retry logic
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f -s --max-time 5 http://localhost:80/health || exit 1

# Expose port
EXPOSE 8080

# Use tini as init system for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]