# NASA System 7 Portal - Docker Configuration Guide

This document provides comprehensive instructions for building, deploying, and managing the NASA System 7 Portal using Docker containers.

## Overview

The NASA System 7 Portal uses a microservices architecture with the following containerized services:

- **Frontend**: React 18 + Vite application served by NGINX
- **Backend**: Node.js + Express API server
- **Database**: PostgreSQL 15 with optimized configurations
- **Cache**: Redis 7 with persistence and security
- **Load Balancer**: NGINX with SSL termination and security headers
- **Monitoring**: Prometheus, Grafana, Alertmanager stack

## Quick Start

### Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- At least 4GB RAM and 10GB disk space
- Environment variables configured in `.env` file

### Development Environment

```bash
# Clone and setup the repository
git clone <repository-url>
cd nasa_system7_portal

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Start development services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Environment

```bash
# Build optimized production images
./docker-build.sh --version v1.0.0 --push

# Deploy to production
sudo ./deploy.sh --environment production --version v1.0.0

# Health check
./scripts/health-check.sh --environment production
```

## Dockerfile Optimizations

### Frontend Dockerfile Features

- **Multi-stage build**: Separate build and runtime stages
- **Security hardening**: Non-root user, minimal dependencies
- **Performance optimizations**: Gzip/Brotli compression, asset minification
- **Caching**: Proper layer caching and asset optimization
- **Health checks**: Built-in health monitoring

### Backend Dockerfile Features

- **Multi-stage build**: Production-only dependencies
- **Security features**: Non-root user, read-only filesystem where possible
- **Performance tuning**: Node.js optimizations, memory limits
- **Health monitoring**: Custom health check scripts
- **Graceful shutdown**: Proper signal handling

## Docker Compose Configurations

### Development (`docker-compose.yml`)

- Hot reload enabled for both frontend and backend
- Development database with seeded data
- Debug tools (Adminer, Redis Commander)
- Mount volumes for live code editing
- Relaxed security settings for easier debugging

### Production (`docker-compose.prod.yml`)

- Production-optimized configurations
- Security hardening (no root user, read-only containers)
- Resource limits and monitoring
- Health checks and restart policies
- SSL/TLS termination
- Backup and persistence

### Optimized Production (`docker-compose.optimized.yml`)

- Advanced performance tuning
- High availability configurations
- Enhanced monitoring and logging
- Auto-scaling support
- Advanced security features

## Environment Variables

### Required Variables

```bash
# Database
DB_NAME=nasa_system7
DB_USER=nasa_user
DB_PASSWORD=your_secure_password

# Redis
REDIS_PASSWORD=your_redis_password

# Application
JWT_SECRET=your_jwt_secret_key
NASA_API_KEY=your_nasa_api_key
JPL_API_KEY=your_jpl_api_key

# Monitoring
GRAFANA_PASSWORD=your_grafana_password

# SSL (production)
DOMAIN=nasa-system7.example.com
SSL_CERT_PATH=/path/to/cert
SSL_KEY_PATH=/path/to/key
```

### Optional Variables

```bash
# Performance
NODE_OPTIONS=--max_old_space_size=1024
UV_THREADPOOL_SIZE=8

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Build and Deployment Scripts

### Docker Build Script (`docker-build.sh`)

Automated building with security scanning:

```bash
# Basic build
./docker-build.sh

# With custom version and registry
./docker-build.sh --version v1.0.0 --registry ghcr.io

# Build and push to registry
./docker-build.sh --version v1.0.0 --push

# Clean build with optimization
./docker-build.sh --clean --optimize --version v1.0.0
```

Features:
- Multi-stage optimized builds
- Security scanning with Trivy
- Image size optimization
- Registry pushing
- Build manifest generation

### Deployment Script (`deploy.sh`)

Production deployment with zero-downtime:

```bash
# Deploy to production
sudo ./deploy.sh --environment production --version v1.0.0

# Deploy with custom compose file
sudo ./deploy.sh --file docker-compose.optimized.yml

# Rollback to previous version
sudo ./deploy.sh --rollback
```

Features:
- Automated backups
- Zero-downtime deployment
- Health checks and monitoring
- Rollback capabilities
- Cleanup and optimization

### Health Check Script (`scripts/health-check.sh`)

Comprehensive health monitoring:

```bash
# Basic health check
./scripts/health-check.sh

# Production environment check
./scripts/health-check.sh --environment production

# Custom timeout and retries
./scripts/health-check.sh --timeout 60 --retries 5
```

Checks:
- Service health endpoints
- Database connectivity
- Cache performance
- System resources
- SSL certificates (production)

## Performance Optimizations

### Frontend Optimizations

- **Asset Compression**: Gzip and Brotli compression
- **Browser Caching**: Long-term caching with cache busting
- **CDN Support**: Ready for CDN integration
- **Image Optimization**: WebP support and lazy loading
- **Bundle Splitting**: Optimized JavaScript chunks

### Backend Optimizations

- **Connection Pooling**: Database and Redis connection pools
- **Memory Management**: Optimized Node.js memory usage
- **Rate Limiting**: Request rate limiting and DDoS protection
- **Caching**: Multi-level caching strategy
- **Compression**: Response compression for APIs

### Database Optimizations

- **Connection Tuning**: Optimized PostgreSQL settings
- **Query Optimization**: Indexed queries and efficient schemas
- **Backup Strategy**: Automated backups and point-in-time recovery
- **High Availability**: Ready for replication and failover

## Security Features

### Container Security

- **Non-root Users**: All containers run as non-root users
- **Read-only Filesystems**: Minimized writable paths
- **Security Options**: `no-new-privileges` and seccomp profiles
- **Minimal Base Images**: Alpine Linux for reduced attack surface
- **Dependency Scanning**: Automated vulnerability scanning

### Network Security

- **Internal Networks**: Isolated container networks
- **Firewall Rules**: Restricted port access
- **SSL/TLS**: Encrypted communications
- **Security Headers**: OWASP-recommended headers
- **Rate Limiting**: DDoS protection

### Application Security

- **Environment Variables**: Secure secret management
- **Input Validation**: Request sanitization
- **Authentication**: JWT-based auth with refresh tokens
- **Authorization**: Role-based access control
- **Audit Logging**: Comprehensive security logging

## Monitoring and Logging

### Prometheus Metrics

- **Application Metrics**: Custom business metrics
- **System Metrics**: CPU, memory, disk, network
- **Database Metrics**: Connection pools, query performance
- **Cache Metrics**: Hit rates, memory usage
- **Web Metrics**: Response times, error rates

### Grafana Dashboards

- **System Overview**: Resource utilization
- **Application Performance**: Request metrics
- **Database Health**: PostgreSQL metrics
- **Cache Performance**: Redis metrics
- **Security Events**: Authentication and authorization

### Log Aggregation

- **Structured Logging**: JSON-formatted logs
- **Log Levels**: Debug, info, warn, error
- **Log Rotation**: Automated log rotation
- **Centralized Logging**: Loki integration
- **Alerting**: Configurable alerts for critical events

## Troubleshooting

### Common Issues

1. **Container Won't Start**
   ```bash
   # Check logs
   docker-compose logs <service>

   # Check health status
   docker-compose ps

   # Verify environment variables
   docker-compose config
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connectivity
   docker-compose exec postgres pg_isready -U nasa_user -d nasa_system7

   # Check database logs
   docker-compose logs postgres
   ```

3. **Performance Issues**
   ```bash
   # Check resource usage
   docker stats

   # Analyze disk usage
   docker system df

   # Clean up unused resources
   docker system prune -f
   ```

### Debug Mode

Enable debug logging:

```bash
# Set debug environment
export LOG_LEVEL=debug

# Start with debug output
docker-compose --log-level DEBUG up

# View detailed container information
docker inspect <container_id>
```

## Scaling and High Availability

### Horizontal Scaling

```bash
# Scale specific services
docker-compose up -d --scale server=3 --scale client=2

# Use optimized compose file for production scaling
docker-compose -f docker-compose.optimized.yml up -d
```

### Load Balancing

- **NGINX Load Balancer**: Round-robin with health checks
- **Session Affinity**: Configurable sticky sessions
- **SSL Termination**: Centralized SSL handling
- **Failover**: Automatic service failover

### Database Replication

Ready for PostgreSQL replication:

```yaml
# Example replication configuration
services:
  postgres-master:
    # Primary database configuration
  postgres-replica:
    # Replica database configuration
    depends_on:
      - postgres-master
```

## Backup and Recovery

### Automated Backups

```bash
# Manual backup
docker-compose exec postgres pg_dump -U nasa_user nasa_system7 > backup.sql

# Automated backup script
./scripts/backup.sh
```

### Disaster Recovery

1. **Backup Verification**: Regular backup integrity checks
2. **Point-in-Time Recovery**: PostgreSQL PITR support
3. **Cross-Region Backup**: Optional multi-region backup
4. **Testing**: Regular disaster recovery testing

## CI/CD Integration

### GitHub Actions

```yaml
# Example CI/CD workflow
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build images
        run: ./docker-build.sh --version ${{ github.sha }}
      - name: Deploy to production
        run: ./deploy.sh --version ${{ github.sha }}
```

### Environment Promotion

1. **Development**: Automatic deployments on merge to develop
2. **Staging**: Manual deployments with comprehensive testing
3. **Production**: Manual deployments with approval workflow

## Maintenance

### Regular Maintenance Tasks

```bash
# Weekly maintenance script
./scripts/maintenance.sh

# Container updates
docker-compose pull
docker-compose up -d

# System cleanup
docker system prune -f
docker volume prune -f
```

### Monitoring Maintenance

- **Log Rotation**: Prevent disk space issues
- **Metric Retention**: Configure Prometheus retention policies
- **Alert Testing**: Regular alert verification
- **Backup Testing**: Monthly backup restoration tests

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review container logs
3. Verify environment configuration
4. Check system resources
5. Contact the development team

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server)
- [NGINX Security Best Practices](https://www.nginx.com/blog/nginx-security-best-practices/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)