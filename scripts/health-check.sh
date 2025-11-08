#!/bin/bash
# NASA System 7 Portal - Health Check Script
# Comprehensive health monitoring for all services

set -euo pipefail

# Configuration
COMPOSE_FILE=${COMPOSE_FILE:-"docker-compose.optimized.yml"}
ENVIRONMENT=${ENVIRONMENT:-"production"}
TIMEOUT=${HEALTH_CHECK_TIMEOUT:-"30"}
RETRIES=${HEALTH_CHECK_RETRIES:-"3"}

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Service health check
check_service_health() {
    local service=$1
    local url=$2
    local expected_status=${3:-"200"}

    log_info "Checking ${service} health..."

    local attempt=1
    while [[ ${attempt} -le ${RETRIES} ]]; do
        if curl -f -s --max-time ${TIMEOUT} -o /dev/null -w "%{http_code}" "${url}" | grep -q "${expected_status}"; then
            log_success "${service} is healthy"
            return 0
        else
            log_warning "${service} health check attempt ${attempt}/${RETRIES} failed"
            if [[ ${attempt} -lt ${RETRIES} ]]; then
                sleep 5
            fi
            ((attempt++))
        fi
    done

    log_error "${service} health check failed after ${RETRIES} attempts"
    return 1
}

# Docker container health check
check_container_health() {
    local container=$1

    log_info "Checking container ${container} health..."

    if docker ps --filter "name=${container}" --format "{{.Status}}" | grep -q "healthy"; then
        log_success "Container ${container} is healthy"
        return 0
    else
        log_error "Container ${container} is not healthy"
        docker ps --filter "name=${container}" --format "table {{.Names}}\t{{.Status}}"
        return 1
    fi
}

# Database health check
check_database_health() {
    log_info "Checking PostgreSQL database health..."

    if docker-compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U "${DB_USER:-nasa_user}" -d "${DB_NAME:-nasa_system7}"; then
        log_success "PostgreSQL database is healthy"
        return 0
    else
        log_error "PostgreSQL database health check failed"
        return 1
    fi
}

# Redis health check
check_redis_health() {
    log_info "Checking Redis cache health..."

    if docker-compose -f "${COMPOSE_FILE}" exec -T redis redis-cli ping | grep -q "PONG"; then
        log_success "Redis cache is healthy"
        return 0
    else
        log_error "Redis cache health check failed"
        return 1
    fi
}

# System resources check
check_system_resources() {
    log_info "Checking system resources..."

    # Check disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ ${disk_usage} -gt 80 ]]; then
        log_warning "High disk usage: ${disk_usage}%"
    else
        log_success "Disk usage: ${disk_usage}%"
    fi

    # Check memory usage
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [[ ${memory_usage} -gt 80 ]]; then
        log_warning "High memory usage: ${memory_usage}%"
    else
        log_success "Memory usage: ${memory_usage}%"
    fi

    # Check Docker daemon
    if docker info >/dev/null 2>&1; then
        log_success "Docker daemon is running"
    else
        log_error "Docker daemon is not running"
        return 1
    fi
}

# SSL certificate check
check_ssl_certificates() {
    if [[ "${ENVIRONMENT}" == "production" ]]; then
        log_info "Checking SSL certificates..."

        local domain=${DOMAIN:-"nasa-system7.example.com"}
        if openssl s_client -connect "${domain}:443" -servername "${domain}" </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
            log_success "SSL certificates are valid"
        else
            log_warning "SSL certificate check failed"
        fi
    fi
}

# Generate health report
generate_health_report() {
    local status=$1
    local report_file="health-report-$(date +%Y%m%d-%H%M%S).json"

    log_info "Generating health report..."

    cat > "${report_file}" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "${ENVIRONMENT}",
    "overall_status": "${status}",
    "services": {
        "frontend": "$(curl -f -s --max-time ${TIMEOUT} -o /dev/null -w "%{http_code}" http://localhost:80/health || echo "failed")",
        "backend": "$(curl -f -s --max-time ${TIMEOUT} -o /dev/null -w "%{http_code}" http://localhost:3001/health || echo "failed")",
        "database": "$(docker-compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U "${DB_USER:-nasa_user}" -d "${DB_NAME:-nasa_system7}" >/dev/null 2>&1 && echo "healthy" || echo "unhealthy")",
        "redis": "$(docker-compose -f "${COMPOSE_FILE}" exec -T redis redis-cli ping 2>/dev/null || echo "failed")"
    },
    "containers": $(docker ps --format "[{{.Names}}: {{.Status}}]" | jq -R . | jq -s .),
    "system_resources": {
        "disk_usage": "$(df / | awk 'NR==2 {print $5}')",
        "memory_usage": "$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')%"
    }
}
EOF

    log_success "Health report generated: ${report_file}"
}

# Main health check function
main() {
    log_info "Starting NASA System 7 Portal health check..."
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Compose file: ${COMPOSE_FILE}"

    local overall_status="healthy"

    # Check system resources
    if ! check_system_resources; then
        overall_status="unhealthy"
    fi

    # Check containers
    if ! check_container_health "nasa_system7_client_opt"; then
        overall_status="unhealthy"
    fi

    if ! check_container_health "nasa_system7_server_opt"; then
        overall_status="unhealthy"
    fi

    # Check services
    if ! check_service_health "Frontend" "http://localhost:80/health"; then
        overall_status="unhealthy"
    fi

    if ! check_service_health "Backend" "http://localhost:3001/health"; then
        overall_status="unhealthy"
    fi

    # Check database
    if ! check_database_health; then
        overall_status="unhealthy"
    fi

    # Check Redis
    if ! check_redis_health; then
        overall_status="unhealthy"
    fi

    # Check SSL certificates (production only)
    if [[ "${ENVIRONMENT}" == "production" ]]; then
        check_ssl_certificates || true
    fi

    # Generate report
    generate_health_report "${overall_status}"

    # Final status
    if [[ "${overall_status}" == "healthy" ]]; then
        log_success "All systems are healthy!"
        exit 0
    else
        log_error "Some systems are unhealthy!"
        exit 1
    fi
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -e, --environment ENV   Environment (development/staging/production)"
    echo "  -f, --file FILE         Docker compose file"
    echo "  -t, --timeout SEC       Health check timeout"
    echo "  -r, --retries NUM       Health check retries"
    echo "  -h, --help              Show this help"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -r|--retries)
            RETRIES="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main