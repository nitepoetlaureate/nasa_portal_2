# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NASA System 7 Portal is a nostalgic web application that brings NASA's vast collection of space data to life through an authentic Apple System 7 interface. This monorepo consists of a React frontend (built with Vite) and Node.js/Express backend with PostgreSQL database integration.

## Development Commands

### Monorepo Package Management
- `npm run install-all` - Install dependencies for root, client, and server
- `npm install` - Install root dependencies
- `cd client && npm install` - Install client dependencies
- `cd server && npm install` - Install server dependencies

### Development Servers
- `npm run dev` - Start both client and server concurrently (root level)
- `npm run client` - Start Vite React client only (port 3000)
- `npm run server` - Start Express server only (port 3001)
- `cd client && npm start` - Alternative client start (uses Vite)
- `cd client && npm run dev` - Vite development server with hot reload
- `cd server && npm run dev` - Server with nodemon for auto-restart

### Build Commands
- `npm run build` - Build React client for production
- `cd client && npm run build` - Build client in client directory
- `cd client && npm run analyze` - Analyze client bundle size

### Testing Commands
- `npm run test` - Run tests in current directory
- `cd client && npm test` - Run client tests (Vitest + React Testing Library)
- `cd client && npm run test:watch` - Run client tests in watch mode
- `cd client && npm run test:coverage` - Run client tests with coverage report
- `cd client && npm run test:e2e` - Run Cypress end-to-end tests
- `cd client && npm run test:ci` - Run CI tests without watch
- `cd server && npm test` - Run server tests (Jest + Supertest)
- `cd server && npm run test:integration` - Run API integration tests
- `cd server && npm run test:coverage` - Server tests with coverage

### Code Quality Commands
- `npm run lint` - Run ESLint in current directory
- `cd client && npm run lint` - Lint client code
- `cd server && npm run lint` - Lint server code
- `cd client && npm run format` - Format client code with Prettier

### Database Commands
- `cd server && npm run db:init` - Initialize database with schema
- `cd server && npm run db:migrate` - Run database migrations
- `cd server && npm run db:seed` - Seed with sample NASA data

### Redis Cache Commands
- `cd server && npm run cache:test` - Test Redis cache performance
- `cd server && npm run cache:stats` - View cache statistics
- `cd server && npm run cache:monitor` - Real-time cache monitoring
- `cd server && npm run cache:clear` - Clear all cache entries
- `cd server && npm run cache:list` - List all cache keys

### Performance Monitoring Commands
- `cd server && npm run performance:test` - Run performance benchmarks
- `cd server && npm run performance:load` - Load testing simulation
- `cd server && npm run monitor` - Real-time performance monitoring

### Docker Commands
- `docker-compose up` - Start development environment
- `docker-compose -f docker-compose.prod.yml up` - Start production environment
- `docker-compose -f docker-compose.monitoring.yml up` - Start monitoring stack
- `docker-compose down` - Stop all services

### Monitoring Stack Access
- **Grafana Dashboard**: http://localhost:3000 (admin/nasa2023)
- **Prometheus Metrics**: http://localhost:9090
- **AlertManager**: http://localhost:9093

## Technology Stack

### Frontend (client/)
- **React 18.2.0** - UI library with hooks and functional components
- **Vite 5.0** - Fast build tool and development server
- **@tanstack/react-query v5** - Server state management and caching
- **React Router DOM** - Client-side routing
- **Vitest** - Modern testing framework with Vite integration
- **D3.js** - Data visualization for space data
- **Framer Motion** - Animation library
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API calls

### Backend (server/)
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logger
- **Compression** - Response compression middleware

### NASA API Integration
- **APOD API** - Astronomy Picture of the Day
- **NeoWs** - Near-Earth Object Web Service
- **DONKI** - Space weather alerts and notifications
- **EPIC** - Earth Polychromatic Imaging Camera
- **Mars Rover Photos** - Mars surface imagery

### Testing Framework
- **Vitest** - Modern JavaScript testing framework (client)
- **@vitest/coverage-v8** - Code coverage with v8 provider
- **React Testing Library** - React component testing
- **Cypress** - End-to-end testing
- **Jest** - JavaScript testing framework (server)
- **Supertest** - HTTP endpoint testing

### Code Quality Tools
- **ESLint** - JavaScript/TypeScript linter
- **Prettier** - Code formatter
- **Husky** - Git hooks (configured in individual packages)

### Development Tools
- **Concurrently** - Run multiple npm scripts simultaneously
- **Nodemon** - Auto-restart Node.js server during development
- **Vite Bundle Analyzer** - Bundle size optimization
- **Docker Compose** - Container orchestration for development
- **PostCSS** - CSS processing with Tailwind
- **Autoprefixer** - CSS vendor prefixing

## 🎯 Phase 2 Completion Status (November 2025)

### ✅ Major Achievements
- **Comprehensive Testing Infrastructure**: 117 test cases implemented with Vitest and React Testing Library
- **Production Build Optimization**: Successful Vite builds with optimized bundle sizes and code splitting
- **Performance Enhancement**: Redis caching achieving 99.8% performance improvement (442ms → 1ms)
- **Database Integration**: PostgreSQL with connection pooling, migrations, and seeding
- **Monitoring Stack**: Prometheus metrics and Grafana dashboards for observability
- **Security Hardening**: Enhanced CORS, input validation, and security headers
- **API Proxy Enhancement**: Improved error handling and comprehensive logging
- **Documentation Updates**: Complete API documentation and development guides

### 📊 Current Test Status
- **Total Tests**: 117 test cases across frontend components
- **Passing Tests**: 58 (49.6% success rate)
- **Test Suites**: 10 total (7 passing, 3 failing)
- **Coverage**: v8 provider with detailed reporting enabled
- **Build Tests**: All production build tests passing

### 🛠️ Technical Infrastructure
- **Build System**: Vite 5.0 with hot reload and production optimization
- **Bundle Analysis**: Optimized bundles with code splitting
  - `vendor.js`: 141KB (gzipped: 45KB)
  - `index.js`: 97KB (gzipped: 24KB)
  - `viz.js`: 139KB (gzipped: 47KB)
- **Testing Framework**: Vitest + React Testing Library + jsdom
- **Backend Testing**: Jest + Supertest for API endpoints
- **Performance Monitoring**: Redis cache statistics and database query performance
- **Development Environment**: Docker Compose with monitoring stack

### ⚠️ Known Issues & Phase 3 Tasks
- Some test suites have mocking configuration issues (3 failing test files)
- Minor JSX warnings in build output (non-critical)
- NASA API rate limiting handled gracefully in production
- **Phase 3 Focus**: Test coverage improvement, authentication, real-time features

### 🚀 Development Workflow (Phase 2 Complete)
1. **Setup**: `npm run install-all` installs all dependencies
2. **Development**: `npm run dev` starts both client and server
3. **Testing**: `npm run test:ci` for CI testing, `npm run test:coverage` for coverage reports
4. **Building**: `npm run build` creates production-ready bundles
5. **Monitoring**: Access Grafana dashboards for performance metrics
6. **Database**: PostgreSQL and Redis connections automatically established

### 🎨 System 7 UI Implementation
- **Authentic Design**: Chicago, Geneva, and Monaco fonts properly implemented
- **Window Management**: Draggable, resizable windows with proper z-index handling
- **Retro Aesthetics**: Faithful recreation of System 7 platinum interface
- **Modern Performance**: Smooth animations powered by Framer Motion
- **Responsive Design**: System 7 aesthetic adapted for modern devices

## Project Structure Guidelines

### Monorepo Organization
```
nasa-system7-portal/
├── client/                    # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   └── system7/     # System 7 themed components
│   │   ├── pages/           # Page components and routes
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API calls and NASA data services
│   │   ├── utils/           # Utility functions
│   │   ├── assets/          # Static assets and icons
│   │   ├── styles/          # Global styles and System 7 CSS
│   │   └── tests/           # Test files
│   ├── public/              # Public static files
│   └── package.json         # Frontend dependencies
├── server/                   # Node.js/Express backend
│   ├── routes/              # API route definitions
│   ├── middleware/          # Express middleware
│   ├── services/            # Business logic and NASA API integration
│   ├── models/              # Database models and schemas
│   ├── config/              # Configuration files
│   ├── scripts/             # Database scripts and utilities
│   ├── tests/               # Server tests
│   └── package.json         # Backend dependencies
├── docker-compose.yml        # Development container setup
├── package.json             # Root package.json for monorepo scripts
└── README.md                # Project documentation
```

### Naming Conventions
- **Files**: Use kebab-case for file names (`user-profile.jsx`, `use-user-data.hooks.js`)
- **Components**: Use PascalCase for component names (`UserProfile`)
- **Functions**: Use camelCase for function names (`getUserData`)
- **Constants**: Use UPPER_SNAKE_CASE for constants (`API_BASE_URL`)
- **Types/Interfaces**: Use PascalCase with descriptive names (`UserData`, `ApiResponse`)
- **Config Files**: Use .js/.mjs extensions for ES modules (`vite.config.js`, `vitest.config.mjs`)

## TypeScript Guidelines

### Type Safety
- Enable strict mode in `tsconfig.json`
- Use explicit types for function parameters and return values
- Prefer interfaces over types for object shapes
- Use union types for multiple possible values
- Avoid `any` type - use `unknown` when type is truly unknown

### Best Practices
- Use type guards for runtime type checking
- Leverage utility types (`Partial`, `Pick`, `Omit`, etc.)
- Create custom types for domain-specific data
- Use enums for finite sets of values
- Document complex types with JSDoc comments

## Code Quality Standards

### ESLint Configuration
- Use recommended ESLint rules for JavaScript/TypeScript
- Enable React-specific rules if using React
- Configure import/export rules for consistent module usage
- Set up accessibility rules for inclusive development

### Prettier Configuration
- Use consistent indentation (2 spaces recommended)
- Set maximum line length (80-100 characters)
- Use single quotes for strings
- Add trailing commas for better git diffs

### Testing Standards
- Aim for 80%+ test coverage
- Write unit tests for utilities and business logic
- Use integration tests for component interactions
- Implement e2e tests for critical user flows
- Follow AAA pattern (Arrange, Act, Assert)

## Performance Optimization

### Bundle Optimization
- Use code splitting for large applications
- Implement lazy loading for routes and components
- Optimize images and assets
- Use tree shaking to eliminate dead code
- Analyze bundle size regularly

### Runtime Performance
- Implement proper memoization (React.memo, useMemo, useCallback)
- Use virtualization for large lists
- Optimize re-renders in React applications
- Implement proper error boundaries
- Use web workers for heavy computations

## Security Guidelines

### Dependencies
- Regularly audit dependencies with `npm audit`
- Keep dependencies updated
- Use lock files (`package-lock.json`, `yarn.lock`)
- Avoid dependencies with known vulnerabilities

### Code Security
- Sanitize user inputs
- Use HTTPS for API calls
- Implement proper authentication and authorization
- Store sensitive data securely (environment variables)
- Use Content Security Policy (CSP) headers

## NASA-Specific Development Guidelines

### System 7 UI Development
- Use authentic System 7 design patterns and components
- Implement Chicago, Geneva, and Monaco fonts appropriately
- Create pixel-perfect window chrome with proper drag handles
- Use monochrome color schemes with subtle dithering effects
- Implement classic Mac OS interaction patterns (menus, dialogs, alerts)

### NASA API Integration Best Practices
- Always cache NASA API responses to respect rate limits
- Implement proper error handling for API failures
- Use Redis for frequently accessed space data
- Validate NASA API responses before processing
- Include proper attribution for NASA data and images

### Space Data Visualization
- Optimize D3.js rendering for large astronomical datasets
- Implement efficient data structures for orbital calculations
- Use appropriate coordinate systems (celestial, ecliptic, etc.)
- Include accessibility features for visually impaired users
- Provide clear legends and units for scientific data

### Performance Considerations
- Implement lazy loading for high-resolution space imagery
- Use Web Workers for heavy astronomical calculations
- Optimize bundle size for retro aesthetic constraints
- Implement virtual scrolling for large space object catalogs
- Cache computation results for complex orbital mechanics

## Development Workflow

### Before Starting
1. Check Node.js version compatibility (>=14.0.0)
2. Run `npm run install-all` to install all dependencies
3. Set up environment variables for NASA API and database
4. Start PostgreSQL and Redis services
5. Run database migrations: `cd server && npm run db:migrate`

### During Development
1. Use `npm run dev` to start both client and server (Vite dev server)
2. Run `cd client && npm run lint` and `cd server && npm run lint` frequently
3. Write tests for new NASA API integrations with Vitest for client tests
4. Use conventional commit messages (feat, fix, docs, etc.)
5. Test System 7 UI components across different viewport sizes
6. Verify NASA API rate limit compliance
7. Monitor bundle size and performance with Vite's built-in analysis

### Before Committing
1. Run full test suite: `cd client && npm test && cd ../server && npm test`
2. Check linting in both packages: `npm run lint` in client/ and server/
3. Verify System 7 UI components match design specifications
4. Test NASA API integrations with mocked data
5. Build client: `cd client && npm run build`
6. Run E2E tests: `cd client && npm run test:e2e`
7. Check test coverage: `cd client && npm run test:coverage`

## Troubleshooting Guide

### Common Development Issues

#### Vite/Vitest Issues
- **JSX parsing errors**: Ensure test files use `.jsx` extension and `vitest.config.mjs` is configured properly
- **ES Module conflicts**: Check that `package.json` has `"type": "module"` and config files use `.mjs` extension
- **Test discovery**: Verify test files match pattern `**/*.{test,spec}.{js,jsx,ts,tsx}`

#### Database Connection Issues
- **PostgreSQL connection**: Verify database is running and credentials in `.env` are correct
- **Migration failures**: Check if database user has CREATE TABLE permissions
- **Redis connection**: Ensure Redis server is running and port 6379 is accessible

#### Development Server Issues
- **Port conflicts**: Frontend uses 3000, backend uses 3001, monitoring uses 3000 (Grafana), 9090 (Prometheus)
- **Hot reload not working**: Verify Vite configuration and check for conflicting extensions
- **API proxy errors**: Check that backend server is running before starting frontend

#### Performance Issues
- **Slow API responses**: Check Redis cache is working - should see 99.8% improvement
- **Memory leaks**: Monitor with `npm run monitor` and check for increasing memory usage
- **Database query performance**: Use `EXPLAIN ANALYZE` on slow queries

#### Docker Issues
- **Container startup failures**: Check logs with `docker-compose logs [service-name]`
- **Permission issues**: Ensure proper file permissions and avoid running as root
- **Environment variables**: Verify `.env` file is properly configured for container environment

### Development Environment Setup

#### Quick Start with Docker
```bash
# Start complete development stack
docker-compose up -d

# Start with monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Access applications
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Grafana: http://localhost:3000 (admin/nasa2023)
```

#### Manual Development Setup
```bash
# 1. Install dependencies
npm run install-all

# 2. Start services
# Terminal 1: Start backend
cd server && npm run dev

# Terminal 2: Start frontend
cd client && npm run dev

# 3. Optional: Start monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### Testing and Debugging

#### Running Tests
- **Frontend unit tests**: `cd client && npm test`
- **Backend API tests**: `cd server && npm test`
- **Integration tests**: `cd server && npm run test:integration`
- **E2E tests**: `cd client && npm run test:e2e`
- **Coverage reports**: `cd client && npm run test:coverage`

#### Common Test Issues
- **Mock failures**: Check import paths in test files match actual component locations
- **Test environment**: Verify `vitest.config.mjs` and Jest setup are properly configured
- **Database tests**: Ensure test database is properly configured and isolated

### Performance Monitoring

#### Cache Performance
- Expected improvement: 99.8% faster response times (442ms → 1ms)
- Monitor with: `cd server && npm run cache:test`
- View statistics: `cd server && npm run cache:stats`
- Real-time monitoring: `cd server && npm run cache:monitor`

#### System Performance
- Load testing: `cd server && npm run performance:load`
- Continuous monitoring: `cd server && npm run monitor`
- View metrics in Grafana: http://localhost:3000 (admin/nasa2023)