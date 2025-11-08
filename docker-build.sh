#!/bin/bash
# NASA System 7 Portal - Optimized Docker Build Script
# Production-ready container builds with security scanning and optimization

set -euo pipefail

# Configuration
PROJECT_NAME="nasa-system7"
REGISTRY=${DOCKER_REGISTRY:-"ghcr.io"}
VERSION=${BUILD_VERSION:-"latest"}
BUILD_CONTEXT=$(pwd)
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

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

# Build function
build_service() {
    local service=$1
    local dockerfile=$2
    local context=$3
    local target=${4:-"production"}

    log_info "Building ${service} service..."

    # Build arguments
    local build_args=(
        "--build-arg" "BUILD_DATE=${BUILD_DATE}"
        "--build-arg" "GIT_COMMIT=${GIT_COMMIT}"
        "--build-arg" "GIT_BRANCH=${GIT_BRANCH}"
        "--build-arg" "VERSION=${VERSION}"
        "--build-arg" "NODE_ENV=production"
    )

    # Build command
    if docker build \
        --file "${dockerfile}" \
        --target "${target}" \
        --tag "${REGISTRY}/${PROJECT_NAME}-${service}:${VERSION}" \
        --tag "${REGISTRY}/${PROJECT_NAME}-${service}:latest" \
        "${build_args[@]}" \
        "${context}"; then
        log_success "${service} built successfully"
        return 0
    else
        log_error "Failed to build ${service}"
        return 1
    fi
}

# Security scan function
security_scan() {
    local image=$1

    log_info "Running security scan on ${image}..."

    # Check if Trivy is available
    if command -v trivy >/dev/null 2>&1; then
        if trivy image --exit-code 1 --severity HIGH,CRITICAL "${image}"; then
            log_success "Security scan passed for ${image}"
            return 0
        else
            log_warning "Security scan found issues in ${image}"
            return 1
        fi
    else
        log_warning "Trivy not found, skipping security scan"
        return 0
    fi
}

# Size optimization function
optimize_image() {
    local image=$1

    log_info "Optimizing image size for ${image}..."

    # Get image size
    local size=$(docker images "${image}" --format "{{.Size}}" | head -1)
    log_info "Image size: ${size}"

    # Export and re-import to optimize layers (optional)
    if [[ "${OPTIMIZE_IMAGES:-false}" == "true" ]]; then
        local temp_file=$(mktemp)
        log_info "Exporting and re-importing ${image} for optimization..."
        docker save "${image}" | docker import - "${image}-optimized"
        docker tag "${image}-optimized" "${image}"
        rm -f "${temp_file}"
        log_success "Image optimization completed"
    fi
}

# Push function
push_image() {
    local image=$1

    if [[ "${PUSH_TO_REGISTRY:-false}" == "true" ]]; then
        log_info "Pushing ${image} to registry..."
        if docker push "${image}"; then
            log_success "Image pushed successfully"
        else
            log_error "Failed to push image"
            return 1
        fi
    else
        log_info "Skipping registry push (PUSH_TO_REGISTRY=false)"
    fi
}

# Pre-build checks
pre_build_checks() {
    log_info "Running pre-build checks..."

    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    # Check available disk space
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local required_space=2097152 # 2GB in KB

    if [[ ${available_space} -lt ${required_space} ]]; then
        log_warning "Low disk space: ${available_space}KB available, ${required_space}KB recommended"
    fi

    # Clean up previous builds if requested
    if [[ "${CLEAN_BUILD:-false}" == "true" ]]; then
        log_info "Cleaning up previous builds..."
        docker system prune -f
    fi

    log_success "Pre-build checks completed"
}

# Main build process
main() {
    log_info "Starting NASA System 7 Portal Docker build process..."
    log_info "Version: ${VERSION}"
    log_info "Registry: ${REGISTRY}"
    log_info "Build Date: ${BUILD_DATE}"
    log_info "Git Commit: ${GIT_COMMIT}"

    # Pre-build checks
    pre_build_checks

    # Create build output directory
    mkdir -p build-logs

    # Build client
    if build_service "client" "client/Dockerfile" "client"; then
        client_image="${REGISTRY}/${PROJECT_NAME}-client:${VERSION}"
        security_scan "${client_image}" || true
        optimize_image "${client_image}"
        push_image "${client_image}"
    else
        log_error "Client build failed"
        exit 1
    fi

    # Build server
    if build_service "server" "server/Dockerfile" "server"; then
        server_image="${REGISTRY}/${PROJECT_NAME}-server:${VERSION}"
        security_scan "${server_image}" || true
        optimize_image "${server_image}"
        push_image "${server_image}"
    else
        log_error "Server build failed"
        exit 1
    fi

    # Generate build manifest
    log_info "Generating build manifest..."
    cat > build-logs/build-manifest-${VERSION}.json << EOF
{
    "project": "${PROJECT_NAME}",
    "version": "${VERSION}",
    "build_date": "${BUILD_DATE}",
    "git_commit": "${GIT_COMMIT}",
    "git_branch": "${GIT_BRANCH}",
    "images": {
        "client": "${client_image}",
        "server": "${server_image}"
    },
    "build_environment": {
        "docker_version": "$(docker --version)",
        "docker_host": "${DOCKER_HOST:-'default'}",
        "builder": "$(hostname)"
    }
}
EOF

    log_success "Build manifest generated: build-logs/build-manifest-${VERSION}.json"

    # Display image summary
    log_info "Build Summary:"
    echo "Client Image: ${client_image}"
    echo "Server Image: ${server_image}"
    echo ""
    docker images | grep "${PROJECT_NAME}"

    log_success "Docker build process completed successfully!"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    # Remove any temporary files or containers
    docker container prune -f >/dev/null 2>&1 || true
}

# Error handling
trap cleanup EXIT

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -v, --version VERSION    Build version (default: latest)"
    echo "  -r, --registry REGISTRY   Docker registry (default: ghcr.io)"
    echo "  -p, --push              Push images to registry"
    echo "  -c, --clean             Clean build environment"
    echo "  -o, --optimize          Optimize image sizes"
    echo "  -h, --help              Show this help"
    echo ""
    echo "Environment variables:"
    echo "  BUILD_VERSION           Build version"
    echo "  DOCKER_REGISTRY         Docker registry"
    echo "  PUSH_TO_REGISTRY        Push to registry (true/false)"
    echo "  CLEAN_BUILD             Clean before build (true/false)"
    echo "  OPTIMIZE_IMAGES         Optimize images (true/false)"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -p|--push)
            export PUSH_TO_REGISTRY=true
            shift
            ;;
        -c|--clean)
            export CLEAN_BUILD=true
            shift
            ;;
        -o|--optimize)
            export OPTIMIZE_IMAGES=true
            shift
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