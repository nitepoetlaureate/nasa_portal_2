# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NASA System 7 Portal is a nostalgic web application that brings NASA's vast collection of space data to life through an authentic Apple System 7 interface. This monorepo consists of a React frontend and Node.js/Express backend with PostgreSQL database integration.

## Development Commands

### Monorepo Package Management
- `npm run install-all` - Install dependencies for root, client, and server
- `npm install` - Install root dependencies
- `cd client && npm install` - Install client dependencies
- `cd server && npm install` - Install server dependencies

### Development Servers
- `npm run dev` - Start both client and server in development mode
- `npm run client` - Start React client only (port 3000)
- `npm run server` - Start Express server only (port 3001)
- `cd client && npm start` - Alternative client start
- `cd server && npm run dev` - Server with nodemon

### Build Commands
- `npm run build` - Build React client for production
- `cd client && npm run build` - Build client in client directory
- `cd client && npm run analyze` - Analyze client bundle size

### Testing Commands
- `npm run test` - Run tests in current directory
- `cd client && npm test` - Run client tests (Jest + React Testing Library)
- `cd client && npm run test:e2e` - Run Cypress end-to-end tests
- `cd server && npm test` - Run server tests (Jest + Supertest)
- `cd server && npm run test:integration` - Run API integration tests
- `cd server && npm run test:coverage` - Server tests with coverage

### Code Quality Commands
- `npm run lint` - Run ESLint in current directory
- `cd client && npm run lint` - Lint client code
- `cd server && npm run lint` - Lint server code
- `cd client && npm run format` - Format client code with Prettier

### Database Commands
- `cd server && npm run db:init` - Initialize database
- `cd server && npm run db:migrate` - Run migrations
- `cd server && npm run db:seed` - Seed with sample NASA data

### Docker Commands
- `docker-compose up` - Start all services with Docker
- `docker-compose down` - Stop Docker services

## Technology Stack

### Frontend (client/)
- **React 18.2.0** - UI library with hooks and functional components
- **React Router DOM** - Client-side routing
- **React Query** - Server state management and caching
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
- **Jest** - JavaScript testing framework (client + server)
- **React Testing Library** - React component testing
- **Cypress** - End-to-end testing
- **Supertest** - HTTP endpoint testing

### Code Quality Tools
- **ESLint** - JavaScript/TypeScript linter
- **Prettier** - Code formatter
- **Husky** - Git hooks (configured in individual packages)

### Development Tools
- **Concurrently** - Run multiple npm scripts simultaneously
- **Nodemon** - Auto-restart Node.js server during development
- **Webpack Bundle Analyzer** - Bundle size optimization
- **Docker Compose** - Container orchestration for development

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
- **Files**: Use kebab-case for file names (`user-profile.component.ts`)
- **Components**: Use PascalCase for component names (`UserProfile`)
- **Functions**: Use camelCase for function names (`getUserData`)
- **Constants**: Use UPPER_SNAKE_CASE for constants (`API_BASE_URL`)
- **Types/Interfaces**: Use PascalCase with descriptive names (`UserData`, `ApiResponse`)

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
1. Use `npm run dev` to start both client and server
2. Run `cd client && npm run lint` and `cd server && npm run lint` frequently
3. Write tests for new NASA API integrations
4. Use conventional commit messages (feat, fix, docs, etc.)
5. Test System 7 UI components across different viewport sizes
6. Verify NASA API rate limit compliance

### Before Committing
1. Run full test suite: `cd client && npm test && cd ../server && npm test`
2. Check linting in both packages: `npm run lint` in client/ and server/
3. Verify System 7 UI components match design specifications
4. Test NASA API integrations with mocked data
5. Build client: `cd client && npm run build`
6. Run E2E tests: `cd client && npm run test:e2e`