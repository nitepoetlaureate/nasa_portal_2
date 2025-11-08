#!/bin/bash

# NASA System 7 Portal - Enhanced Production Deployment Script
# Production-ready deployment with comprehensive CI/CD integration and monitoring

set -euo pipefail

# Script configuration
SCRIPT_NAME="NASA System 7 Portal Deployment"
SCRIPT_VERSION="2.0.0"
LOG_FILE="/var/log/nasa-system7-deploy.log"
BACKUP_DIR="/backup/nasa-system7"
HEALTH_CHECK_TIMEOUT=300
ROLLBACK_THRESHOLD=3

# Default configuration
APP_NAME="nasa-system7-portal"
DOCKER_REGISTRY="ghcr.io"
VERSION=${1:-latest}
ENVIRONMENT=${2:-production}
BACKUP_RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        error "Docker is not running. Please start Docker first."
        exit 1
    fi

    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        error "docker-compose is not installed or not in PATH"
        exit 1
    fi

    # Check if we have access to the registry
    if ! docker pull $DOCKER_REGISTRY/$APP_NAME-server:$VERSION > /dev/null 2>&1; then
        error "Cannot pull images from registry. Please check your credentials."
        exit 1
    fi

    # Check if required environment variables are set
    required_vars=("DB_HOST" "DB_NAME" "DB_USER" "DB_PASSWORD" "REDIS_HOST")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            error "Environment variable $var is not set"
            exit 1
        fi
    done

    success "All prerequisites checked"
}

# Function to backup current deployment
backup_deployment() {
    log "Creating backup of current deployment..."

    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"

    # Backup database
    if command -v pg_dump &> /dev/null; then
        log "Backing up database..."
        PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > "$backup_dir/database.sql"

        # Compress the backup
        gzip "$backup_dir/database.sql"
        success "Database backup created at $backup_dir/database.sql.gz"
    else
        warning "pg_dump not found, skipping database backup"
    fi

    # Backup current docker-compose configuration
    if [ -f docker-compose.yml ]; then
        cp docker-compose.yml "$backup_dir/docker-compose.yml"
    fi

    # Store current version info
    echo "$CURRENT_VERSION" > "$backup_dir/previous_version.txt"

    success "Backup completed: $backup_dir"
}

# Function to perform database migrations
run_migrations() {
    log "Running database migrations..."

    # Use a temporary container to run migrations
    docker run --rm \
        --network "$(basename $(pwd))_default" \
        -e DB_HOST=$DB_HOST \
        -e DB_NAME=$DB_NAME \
        -e DB_USER=$DB_USER \
        -e DB_PASSWORD=$DB_PASSWORD \
        $DOCKER_REGISTRY/$APP_NAME-server:$VERSION \
        npm run db:migrate

    success "Database migrations completed"
}

# Function to perform health checks
health_check() {
    local url=$1
    local timeout=$2
    local start_time=$(date +%s)

    log "Performing health check for $url..."

    while [ $(($(date +%s) - start_time)) -lt $timeout ]; do
        if curl -f -s "$url" > /dev/null; then
            success "Health check passed for $url"
            return 0
        fi

        sleep 5
    done

    error "Health check failed for $url after $timeout seconds"
    return 1
}

# Function to deploy new version
deploy_new_version() {
    log "Deploying new version: $VERSION"

    # Update docker-compose.yml with new image versions
    sed -i.bak "s|image: $DOCKER_REGISTRY/$APP_NAME-.*:.*|image: $DOCKER_REGISTRY/$APP_NAME-\${SERVICE}:$VERSION|g" docker-compose.yml

    # Pull new images
    log "Pulling new Docker images..."
    docker-compose pull

    # Start new services
    log "Starting new services..."
    docker-compose up -d --no-deps server client

    # Wait for services to be healthy
    sleep 30

    # Perform health checks
    health_check "http://localhost:3000/health" $HEALTH_CHECK_TIMEOUT
    health_check "http://localhost:3001/health" $HEALTH_CHECK_TIMEOUT

    success "New version deployed successfully"
}

# Function to rollback deployment
rollback_deployment() {
    log "Rolling back deployment..."

    local latest_backup=$(ls -t backups/ | head -n1)

    if [ -z "$latest_backup" ]; then
        error "No backup found for rollback"
        exit 1
    fi

    local backup_dir="backups/$latest_backup"

    # Restore docker-compose configuration
    if [ -f "$backup_dir/docker-compose.yml" ]; then
        cp "$backup_dir/docker-compose.yml" docker-compose.yml
    fi

    # Restore previous version
    local previous_version=$(cat "$backup_dir/previous_version.txt")

    if [ -n "$previous_version" ]; then
        log "Rolling back to version: $previous_version"

        # Update docker-compose with previous version
        sed -i "s|image: $DOCKER_REGISTRY/$APP_NAME-.*:.*|image: $DOCKER_REGISTRY/$APP_NAME-\${SERVICE}:$previous_version|g" docker-compose.yml

        # Pull and restart with previous version
        docker-compose pull
        docker-compose up -d

        # Perform health checks
        health_check "http://localhost:3000/health" $HEALTH_CHECK_TIMEOUT
        health_check "http://localhost:3001/health" $HEALTH_CHECK_TIMEOUT

        success "Rollback completed successfully"
    else
        error "Previous version information not found in backup"
        exit 1
    fi
}

# Function to clean up old backups
cleanup_backups() {
    log "Cleaning up old backups (retention: $BACKUP_RETENTION_DAYS days)..."

    find backups/ -type d -mtime +$BACKUP_RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true

    success "Old backups cleaned up"
}

# Function to monitor deployment after rollout
monitor_deployment() {
    log "Monitoring deployment health for $ROLLBACK_THRESHOLD minutes..."

    for i in $(seq 1 $ROLLBACK_THRESHOLD); do
        log "Health check $i/$ROLLBACK_THRESHOLD"

        if ! health_check "http://localhost:3000/health" 30; then
            error "Health check failed during monitoring period"
            warning "Initiating automatic rollback..."
            rollback_deployment
            exit 1
        fi

        # Check error rate
        local error_rate=$(curl -s "http://localhost:3001/metrics" | grep "http_requests_total{status=~\"5..\"}" | awk '{print $2}' || echo "0")

        if [ "$error_rate" -gt 10 ]; then
            error "High error rate detected: $error_rate"
            warning "Initiating automatic rollback..."
            rollback_deployment
            exit 1
        fi

        sleep 60
    done

    success "Deployment monitoring completed successfully"
}

# Function to send notifications
send_notification() {
    local status=$1
    local message=$2

    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local color="good"
        if [ "$status" = "failed" ]; then
            color="danger"
        fi

        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\", \"color\":\"$color\"}" \
            "$SLACK_WEBHOOK_URL" || true
    fi

    # Email notification (if configured)
    if [ -n "${NOTIFICATION_EMAIL:-}" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "NASA System 7 Deployment: $status" "$NOTIFICATION_EMAIL" || true
    fi
}

# Function to display usage
usage() {
    echo "Usage: $0 [VERSION] [ENVIRONMENT]"
    echo ""
    echo "Examples:"
    echo "  $0 latest production"
    echo "  $0 v1.2.3 staging"
    echo ""
    echo "Environment variables:"
    echo "  DB_HOST          - Database host"
    echo "  DB_NAME          - Database name"
    echo "  DB_USER          - Database user"
    echo "  DB_PASSWORD      - Database password"
    echo "  REDIS_HOST       - Redis host"
    echo "  SLACK_WEBHOOK_URL - Slack webhook for notifications (optional)"
    echo "  NOTIFICATION_EMAIL - Email for notifications (optional)"
}

# Main deployment function
main() {
    # Parse command line arguments
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        usage
        exit 0
    fi

    log "Starting NASA System 7 Portal deployment..."
    log "Version: $VERSION"
    log "Environment: $ENVIRONMENT"

    # Get current version (if running)
    CURRENT_VERSION="unknown"
    if docker-compose ps server | grep -q "Up"; then
        CURRENT_VERSION=$(docker-compose ps | grep server | awk '{print $2}' | cut -d':' -f2 || echo "unknown")
    fi

    log "Current version: $CURRENT_VERSION"

    # Execute deployment steps
    check_prerequisites
    backup_deployment
    run_migrations
    deploy_new_version
    monitor_deployment
    cleanup_backups

    success "Deployment completed successfully!"

    # Send success notification
    send_notification "success" "✅ NASA System 7 Portal deployed successfully to $ENVIRONMENT (Version: $VERSION)"
}

# Error handling
trap 'error "Deployment failed at line $LINENO"; send_notification "failed" "❌ NASA System 7 Portal deployment failed at line $LINENO"; exit 1' ERR

# Run main function with all arguments
main "$@"