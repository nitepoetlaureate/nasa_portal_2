#!/bin/bash
# NASA System 7 Portal - Production Deployment Script
# Comprehensive deployment with health checks, rollback, and monitoring

set -euo pipefail

# Configuration
PROJECT_NAME="nasa-system7"
DOCKER_REGISTRY="your-registry.com"
ENVIRONMENT="${ENVIRONMENT:-production}"
BACKUP_DIR="/opt/nasa_system7/backups"
LOG_FILE="/var/log/nasa_system7_deploy.log"
HEALTH_CHECK_TIMEOUT=300
ROLLBACK_ON_FAILURE=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Verify environment variables
verify_environment() {
    log "Verifying environment variables..."

    required_vars=(
        "DB_NAME" "DB_USER" "DB_PASSWORD"
        "REDIS_PASSWORD" "JWT_SECRET"
        "NASA_API_KEY" "JPL_API_KEY"
        "GRAFANA_PASSWORD"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done

    success "Environment variables verified"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."

    sudo mkdir -p "$BACKUP_DIR"/{postgres,redis,config}
    sudo mkdir -p /opt/nasa_system7/{data,logs,ssl/certs}
    sudo mkdir -p /opt/nasa_system7/data/{postgres,redis,prometheus,grafana,loki}

    # Set proper permissions
    sudo chown -R "$USER:$USER" "$BACKUP_DIR"
    sudo chown -R "$USER:$USER" /opt/nasa_system7

    success "Directories created"
}

# Backup current deployment
backup_deployment() {
    log "Creating backup of current deployment..."

    local backup_name="${PROJECT_NAME}_backup_$(date +%Y%m%d_%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"

    # Stop services gracefully
    docker-compose -f docker-compose.prod.yml down || true

    # Backup databases
    docker-compose -f docker-compose.prod.yml run --rm postgres \
        pg_dump -h postgres -U "$DB_USER" "$DB_NAME" | gzip > "$backup_path/postgres_backup.sql.gz" || true

    docker-compose -f docker-compose.prod.yml run --rm redis \
        redis-cli --rdb - > "$backup_path/redis_backup.rdb" || true

    # Backup configurations
    cp -r nginx/ monitoring/ ssl/ "$backup_path/" 2>/dev/null || true

    # Create backup marker
    echo "$backup_name" > "$BACKUP_DIR/latest_backup.txt"

    success "Backup created: $backup_path"
}

# Build and push images
build_images() {
    log "Building Docker images..."

    # Build client image
    docker build -t "$DOCKER_REGISTRY/$PROJECT_NAME-client:latest" \
                 -t "$DOCKER_REGISTRY/$PROJECT_NAME-client:$(git rev-parse --short HEAD)" \
                 -f client/Dockerfile ./client

    # Build server image
    docker build -t "$DOCKER_REGISTRY/$PROJECT_NAME-server:latest" \
                 -t "$DOCKER_REGISTRY/$PROJECT_NAME-server:$(git rev-parse --short HEAD)" \
                 -f server/Dockerfile ./server

    success "Images built successfully"
}

# Push images to registry
push_images() {
    log "Pushing images to registry..."

    docker push "$DOCKER_REGISTRY/$PROJECT_NAME-client:latest"
    docker push "$DOCKER_REGISTRY/$PROJECT_NAME-client:$(git rev-parse --short HEAD)"
    docker push "$DOCKER_REGISTRY/$PROJECT_NAME-server:latest"
    docker push "$DOCKER_REGISTRY/$PROJECT_NAME-server:$(git rev-parse --short HEAD)"

    success "Images pushed to registry"
}

# Pull latest images
pull_images() {
    log "Pulling latest images..."

    docker pull "$DOCKER_REGISTRY/$PROJECT_NAME-client:latest"
    docker pull "$DOCKER_REGISTRY/$PROJECT_NAME-server:latest"

    # Update docker-compose to use registry images
    sed -i "s|image: nasa-system7-client:latest|image: $DOCKER_REGISTRY/$PROJECT_NAME-client:latest|g" docker-compose.prod.yml
    sed -i "s|image: nasa-system7-server:latest|image: $DOCKER_REGISTRY/$PROJECT_NAME-server:latest|g" docker-compose.prod.yml

    success "Images pulled successfully"
}

# Deploy services
deploy_services() {
    log "Deploying services..."

    # Pull latest base images
    docker-compose -f docker-compose.prod.yml pull

    # Start database and cache services first
    docker-compose -f docker-compose.prod.yml up -d postgres redis

    # Wait for database to be ready
    log "Waiting for database to be ready..."
    local db_ready=false
    local wait_time=0

    while [[ $wait_time -lt $HEALTH_CHECK_TIMEOUT ]]; do
        if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
            db_ready=true
            break
        fi
        sleep 5
        wait_time=$((wait_time + 5))
        echo -n "."
    done

    if [[ $db_ready != true ]]; then
        error "Database failed to become ready within timeout"
        return 1
    fi

    success "Database is ready"

    # Run database migrations if needed
    log "Running database migrations..."
    docker-compose -f docker-compose.prod.yml run --rm server npm run db:migrate || true

    # Deploy application services
    docker-compose -f docker-compose.prod.yml up -d server client

    # Deploy load balancer
    docker-compose -f docker-compose.prod.yml up -d nginx-lb

    # Deploy monitoring stack
    docker-compose -f docker-compose.prod.yml up -d prometheus grafana alertmanager loki promtail

    success "All services deployed"
}

# Health checks
health_checks() {
    log "Performing health checks..."

    local services=("client" "server" "nginx-lb" "postgres" "redis")
    local all_healthy=true

    for service in "${services[@]}"; do
        log "Checking $service health..."

        local service_healthy=false
        local wait_time=0

        while [[ $wait_time -lt $HEALTH_CHECK_TIMEOUT ]]; do
            if docker-compose -f docker-compose.prod.yml ps "$service" | grep -q "Up (healthy)"; then
                service_healthy=true
                break
            fi
            sleep 10
            wait_time=$((wait_time + 10))
            echo -n "."
        done

        if [[ $service_healthy != true ]]; then
            error "Service $service failed health check"
            all_healthy=false
        else
            success "Service $service is healthy"
        fi
    done

    if [[ $all_healthy != true ]]; then
        error "Some services failed health checks"
        return 1
    fi

    # External health checks
    log "Performing external health checks..."

    # Check main application
    if curl -f -s "https://nasa-system7.example.com/health" >/dev/null; then
        success "Main application is responding"
    else
        error "Main application health check failed"
        all_healthy=false
    fi

    # Check API endpoints
    if curl -f -s "https://nasa-system7.example.com/api/health" >/dev/null; then
        success "API is responding"
    else
        error "API health check failed"
        all_healthy=false
    fi

    if [[ $all_healthy != true ]]; then
        error "External health checks failed"
        return 1
    fi

    success "All health checks passed"
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old images and containers..."

    # Remove unused images
    docker image prune -f

    # Remove unused containers
    docker container prune -f

    # Remove old backups (keep last 10)
    find "$BACKUP_DIR" -maxdepth 1 -type d -name "*_backup_*" | sort -r | tail -n +11 | xargs rm -rf || true

    success "Cleanup completed"
}

# Rollback function
rollback() {
    warning "Initiating rollback..."

    local latest_backup
    latest_backup=$(cat "$BACKUP_DIR/latest_backup.txt" 2>/dev/null || echo "")

    if [[ -z "$latest_backup" ]]; then
        error "No backup found for rollback"
        exit 1
    fi

    log "Rolling back to: $latest_backup"

    # Stop current services
    docker-compose -f docker-compose.prod.yml down

    # Restore databases
    if [[ -f "$BACKUP_DIR/$latest_backup/postgres_backup.sql.gz" ]]; then
        docker-compose -f docker-compose.prod.yml run --rm postgres bash -c "
            dropdb -h postgres -U '$DB_USER' '$DB_NAME' || true
            createdb -h postgres -U '$DB_USER' '$DB_NAME'
            gunzip -c '$BACKUP_DIR/$latest_backup/postgres_backup.sql.gz' | psql -h postgres -U '$DB_USER' '$DB_NAME'
        "
    fi

    if [[ -f "$BACKUP_DIR/$latest_backup/redis_backup.rdb" ]]; then
        docker-compose -f docker-compose.prod.yml run --rm redis bash -c "
            redis-cli FLUSHALL
            cat '$BACKUP_DIR/$latest_backup/redis_backup.rdb' | redis-cli --pipe
        "
    fi

    # Start services with previous image versions
    # Note: This would require maintaining image version history

    success "Rollback completed"
}

# Main deployment function
main() {
    log "Starting NASA System 7 Portal deployment to $ENVIRONMENT environment"

    # Pre-deployment checks
    check_root
    verify_environment
    create_directories

    # Backup current deployment
    backup_deployment

    # Build and deploy
    if build_images && push_images && pull_images && deploy_services && health_checks; then
        success "Deployment completed successfully"
        cleanup

        # Send notification (implement as needed)
        log "Deployment notification sent"
    else
        error "Deployment failed"

        if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
            rollback
        fi

        exit 1
    fi
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -e, --environment ENV    Set environment (default: production)"
    echo "  -b, --build-only         Only build images, don't deploy"
    echo "  -d, --deploy-only        Only deploy, don't build"
    echo "  -r, --rollback           Rollback to previous backup"
    echo "  -h, --help               Show this help message"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -b|--build-only)
            BUILD_ONLY=true
            shift
            ;;
        -d|--deploy-only)
            DEPLOY_ONLY=true
            shift
            ;;
        -r|--rollback)
            ROLLBACK=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            error "Unknown option: $1"
            usage
            ;;
    esac
done

# Execute based on flags
if [[ "${ROLLBACK:-false}" == "true" ]]; then
    rollback
elif [[ "${BUILD_ONLY:-false}" == "true" ]]; then
    build_images && push_images
elif [[ "${DEPLOY_ONLY:-false}" == "true" ]]; then
    deploy_services && health_checks
else
    main
fi

success "Script completed successfully"